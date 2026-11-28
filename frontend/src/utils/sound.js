// ==============================================================================
// Motor Persistente de Sirena y Alarmas de Bolsillo COPAI GPS (Android & iOS)
// En Android mantiene activo el WebView con pantalla apagada mediante una señal
// PCM ultra-silenciosa (-90 dB, cero zumbido incluso en parlantes externos).
// En PC y iPhone NO mantiene audio de fondo para no mostrar reproductor en el
// Notch / Dynamic Island del iPhone ni generar ruido en parlantes de escritorio.
// ==============================================================================

function isAndroidDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

function createPcmWavDataUri(sampleRate, durationSec, sampleGenerator) {
  try {
    const numSamples = Math.floor(sampleRate * durationSec);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i += 1) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i += 1) {
      const t = i / sampleRate;
      const raw = Math.max(-1, Math.min(1, sampleGenerator(t, i, numSamples)));
      view.setInt16(44 + i * 2, Math.floor(raw * 32760), true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return `data:audio/wav;base64,${window.btoa(binary)}`;
  } catch {
    return null;
  }
}

class EmergencySiren {
  constructor() {
    this.audioCtx = null;
    // Osciladores permanentes pre-iniciados para que puedan sonar en segundo plano
    // sin necesitar un nuevo gesto táctil cuando el teléfono está bloqueado o en otra app
    this.alarmOsc1 = null;
    this.alarmOsc2 = null;
    this.alarmGain = null;
    this.keepAliveOsc = null;
    this.keepAliveGain = null;

    this.intervalId = null;
    this.vibrateIntervalId = null;
    this.speedTimeoutIds = [];
    this.isPlaying = false;
    this.keepAliveEnabled = true;

    this.sirenAudioEl = null;
    this.speedAudioEl = null;
    this.keepAliveAudioEl = null;
    this.audioElementsInitialized = false;

    this.unlockBound = this._handleUserGestureUnlock.bind(this);
    this._setupGlobalUnlock();
  }

  _ensureHtmlAudioElements() {
    if (this.audioElementsInitialized) return;
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    this.audioElementsInitialized = true;

    try {
      const sampleRate = 12000;

      // 1. Señal PCM ultra-silenciosa (-90 dB) SOLO para Android (evita que Android congele
      // el WebView al apagar la pantalla, sin producir ningún zumbido ni activar el Notch en iPhone/PC)
      if (isAndroidDevice()) {
        const keepAliveUri = createPcmWavDataUri(8000, 1.0, (t) => Math.sin(2 * Math.PI * 1 * t) * 0.00005);
        if (keepAliveUri) {
          this.keepAliveAudioEl = new Audio(keepAliveUri);
          this.keepAliveAudioEl.loop = true;
          this.keepAliveAudioEl.volume = 0.01;
        }
      }

      // 2. Sirena de emergencia bitonal de máxima potencia (Pánico y Sabotaje)
      let phase = 0;
      const sirenUri = createPcmWavDataUri(sampleRate, 1.8, (t) => {
        const cycle = t % 0.6;
        const progress = cycle < 0.3 ? cycle / 0.3 : (0.6 - cycle) / 0.3;
        const freq = 660 + progress * 540;
        phase += (2 * Math.PI * freq) / sampleRate;
        const s1 = Math.sin(phase);
        const s2 = (s1 >= 0 ? 0.4 : -0.4);
        return (s1 + s2) * 0.68;
      });
      if (sirenUri) {
        this.sirenAudioEl = new Audio(sirenUri);
        this.sirenAudioEl.loop = true;
        this.sirenAudioEl.volume = 1.0;
      }

      // 3. Alarma triple potente para Exceso de Velocidad
      let speedPhase = 0;
      const speedUri = createPcmWavDataUri(sampleRate, 1.2, (t) => {
        const inPulse1 = t >= 0.0 && t < 0.24;
        const inPulse2 = t >= 0.32 && t < 0.56;
        const inPulse3 = t >= 0.64 && t < 1.08;
        if (!inPulse1 && !inPulse2 && !inPulse3) return 0;
        const freq = inPulse3 ? 1280 : 960;
        speedPhase += (2 * Math.PI * freq) / sampleRate;
        const s1 = Math.sin(speedPhase);
        return (s1 + (s1 >= 0 ? 0.35 : -0.35)) * 0.68;
      });
      if (speedUri) {
        this.speedAudioEl = new Audio(speedUri);
        this.speedAudioEl.loop = false;
        this.speedAudioEl.volume = 1.0;
      }
    } catch {}
  }

  _getOrCreateContext() {
    const AudioContextClass = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AudioContextClass) return null;
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioContextClass();
      this.alarmOsc1 = null;
      this.alarmOsc2 = null;
      this.alarmGain = null;
      this.keepAliveOsc = null;
      this.keepAliveGain = null;
    }
    return this.audioCtx;
  }

  _ensurePersistentAudioGraph() {
    try {
      const ctx = this._getOrCreateContext();
      if (!ctx) return null;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // 1. Oscilador Keep-Alive ultra-silencioso SOLO en Android (0.00002 de ganancia = silencio total en parlantes)
      if (isAndroidDevice() && !this.keepAliveOsc) {
        this.keepAliveGain = ctx.createGain();
        this.keepAliveGain.gain.setValueAtTime(0.00002, ctx.currentTime);
        this.keepAliveGain.connect(ctx.destination);

        this.keepAliveOsc = ctx.createOscillator();
        this.keepAliveOsc.type = 'sine';
        this.keepAliveOsc.frequency.setValueAtTime(1, ctx.currentTime);
        this.keepAliveOsc.connect(this.keepAliveGain);
        this.keepAliveOsc.start();
      }

      // 2. Osciladores de Sirena/Alarma PRE-INICIADOS con ganancia 0 (listos para subir a 0.90 en segundo plano)
      if (!this.alarmOsc1 || !this.alarmGain) {
        this.alarmGain = ctx.createGain();
        this.alarmGain.gain.setValueAtTime(this.isPlaying ? 0.85 : 0.0, ctx.currentTime);
        this.alarmGain.connect(ctx.destination);

        this.alarmOsc1 = ctx.createOscillator();
        this.alarmOsc1.type = 'sawtooth';
        this.alarmOsc1.frequency.setValueAtTime(680, ctx.currentTime);
        this.alarmOsc1.connect(this.alarmGain);
        this.alarmOsc1.start();

        this.alarmOsc2 = ctx.createOscillator();
        this.alarmOsc2.type = 'square';
        this.alarmOsc2.frequency.setValueAtTime(700, ctx.currentTime);
        this.alarmOsc2.connect(this.alarmGain);
        this.alarmOsc2.start();
      }

      return ctx;
    } catch {
      return null;
    }
  }

  _setupGlobalUnlock() {
    if (typeof window === 'undefined') return;
    const events = ['touchstart', 'pointerdown', 'click', 'keydown'];
    events.forEach((evt) => {
      window.addEventListener(evt, this.unlockBound, { passive: true, capture: true });
    });
  }

  _handleUserGestureUnlock() {
    try {
      this._ensureHtmlAudioElements();
      this._ensurePersistentAudioGraph();

      if (isAndroidDevice() && this.keepAliveEnabled && this.keepAliveAudioEl && this.keepAliveAudioEl.paused) {
        this.keepAliveAudioEl.play().catch(() => {});
      }

      if (this.isPlaying && this.sirenAudioEl && this.sirenAudioEl.paused) {
        this.sirenAudioEl.play().catch(() => {});
      }
    } catch {}
  }

  _registerMediaSession() {
    try {
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Protección Satelital en Vivo',
          artist: 'CopAI GPS',
          album: 'Alertas de Seguridad Activas'
        });
      }
    } catch {}
  }

  setKeepAlive(enabled) {
    this.keepAliveEnabled = Boolean(enabled) && isAndroidDevice();
    if (!this.keepAliveEnabled) {
      try {
        if (this.keepAliveAudioEl && !this.keepAliveAudioEl.paused) {
          this.keepAliveAudioEl.pause();
        }
      } catch {}
    } else if (this.audioElementsInitialized) {
      try {
        this._ensurePersistentAudioGraph();
        if (this.keepAliveAudioEl && this.keepAliveAudioEl.paused) {
          this.keepAliveAudioEl.play().catch(() => {});
        }
      } catch {}
    }
  }

  _clearSpeedTimeouts() {
    if (this.speedTimeoutIds.length > 0) {
      this.speedTimeoutIds.forEach((id) => clearTimeout(id));
      this.speedTimeoutIds = [];
    }
  }

  start() {
    this.isPlaying = true;
    this._clearSpeedTimeouts();
    this._ensureHtmlAudioElements();

    // 1. Reproducir HTML5 <audio> WAV de sirena
    try {
      if (this.sirenAudioEl) {
        this.sirenAudioEl.volume = 1.0;
        this.sirenAudioEl.currentTime = 0;
        this.sirenAudioEl.play().catch(() => {});
      }
    } catch {}

    // 2. Activar ganancia máxima en los osciladores pre-iniciados (suena en segundo plano / pantalla bloqueada)
    try {
      const ctx = this._ensurePersistentAudioGraph();
      if (ctx && this.alarmGain && this.alarmOsc1 && this.alarmOsc2) {
        this.alarmGain.gain.cancelScheduledValues(ctx.currentTime);
        this.alarmGain.gain.setValueAtTime(0.85, ctx.currentTime);
        this.alarmOsc1.frequency.setValueAtTime(660, ctx.currentTime);
        this.alarmOsc2.frequency.setValueAtTime(680, ctx.currentTime);

        if (this.intervalId) {
          clearInterval(this.intervalId);
        }
        let toggle = false;
        this.intervalId = setInterval(() => {
          if (!this.isPlaying || !this.audioCtx || !this.alarmOsc1 || !this.alarmOsc2) return;
          if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
          }
          const now = this.audioCtx.currentTime;
          const target1 = toggle ? 660 : 1180;
          const target2 = toggle ? 680 : 1200;
          this.alarmGain.gain.setValueAtTime(0.85, now);
          this.alarmOsc1.frequency.linearRampToValueAtTime(target1, now + 0.24);
          this.alarmOsc2.frequency.linearRampToValueAtTime(target2, now + 0.24);
          toggle = !toggle;
        }, 280);
      }
    } catch {}

    // 3. Vibración rítmica continua en Android
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([600, 140, 600, 140, 850]);
      }
      if (!this.vibrateIntervalId) {
        this.vibrateIntervalId = setInterval(() => {
          if (!this.isPlaying) return;
          try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([550, 140, 650]);
            }
            if (this.sirenAudioEl && this.sirenAudioEl.paused) {
              this.sirenAudioEl.play().catch(() => {});
            }
          } catch {}
        }, 1500);
      }
    } catch {}
  }

  stop() {
    this.isPlaying = false;
    this._clearSpeedTimeouts();
    try {
      if (this.sirenAudioEl) {
        this.sirenAudioEl.pause();
        this.sirenAudioEl.currentTime = 0;
      }
      if (this.speedAudioEl) {
        this.speedAudioEl.pause();
        this.speedAudioEl.currentTime = 0;
      }
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (this.vibrateIntervalId) {
        clearInterval(this.vibrateIntervalId);
        this.vibrateIntervalId = null;
      }
      if (this.audioCtx && this.alarmGain) {
        this.alarmGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
        this.alarmGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);
      }
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(0);
        }
      } catch {}
    } catch (e) {
      console.warn('Error deteniendo sirena:', e);
    }
  }

  // Alarma triple + vibración en segundo plano para Exceso de Velocidad
  playSpeedBeep() {
    this._ensureHtmlAudioElements();

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([450, 120, 450, 120, 650]);
      }
    } catch {}

    try {
      if (this.speedAudioEl) {
        this.speedAudioEl.volume = 1.0;
        this.speedAudioEl.currentTime = 0;
        this.speedAudioEl.play().catch(() => {});
      }
    } catch {}

    // Si no está sonando la sirena continua de pánico/sabotaje, usar los osciladores pre-iniciados
    // para que el exceso de velocidad suene fuerte también con pantalla bloqueada o en otra App
    if (!this.isPlaying) {
      try {
        const ctx = this._ensurePersistentAudioGraph();
        if (ctx && this.alarmGain && this.alarmOsc1 && this.alarmOsc2) {
          this._clearSpeedTimeouts();
          const pulse = (freq, delayMs, durationMs) => {
            const t1 = setTimeout(() => {
              if (this.isPlaying || !this.audioCtx || !this.alarmGain) return;
              const now = this.audioCtx.currentTime;
              this.alarmOsc1.frequency.setValueAtTime(freq, now);
              this.alarmOsc2.frequency.setValueAtTime(freq + 15, now);
              this.alarmGain.gain.setValueAtTime(0.75, now);
            }, delayMs);
            const t2 = setTimeout(() => {
              if (this.isPlaying || !this.audioCtx || !this.alarmGain) return;
              this.alarmGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);
            }, delayMs + durationMs);
            this.speedTimeoutIds.push(t1, t2);
          };

          pulse(960, 0, 220);
          pulse(960, 300, 220);
          pulse(1280, 600, 380);
        }
      } catch {}
    }
  }
}

export const siren = new EmergencySiren();
