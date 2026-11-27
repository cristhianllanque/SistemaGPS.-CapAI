// ==============================================================================
// Motor Híbrido de Sirena y Alarmas COPAI GPS (HTML5 <audio> WAV + Web Audio API)
// Diseñado para sonar y vibrar en Android (APK Play Store y Chrome) e iPhone
// incluso con el teléfono bloqueado en el bolsillo o usando otra aplicación.
// ==============================================================================

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
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true);  // AudioFormat = 1 (PCM)
    view.setUint16(22, 1, true);  // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true);  // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample = 16
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
    this.oscillator = null;
    this.gainNode = null;
    this.keepAliveOsc = null;
    this.keepAliveGain = null;
    this.intervalId = null;
    this.vibrateIntervalId = null;
    this.isPlaying = false;
    this.keepAliveEnabled = false;

    this.sirenAudioEl = null;
    this.speedAudioEl = null;
    this.keepAliveAudioEl = null;

    this.unlockBound = this._handleUserGestureUnlock.bind(this);
    this._initHtmlAudioElements();
    this._setupGlobalUnlock();
  }

  _initHtmlAudioElements() {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    try {
      // 1. Sirena de emergencia bitonal de alta potencia (Pánico y Sabotaje)
      let phase = 0;
      const sampleRate = 16000;
      const sirenUri = createPcmWavDataUri(sampleRate, 2.4, (t) => {
        const cycle = t % 0.6;
        const progress = cycle < 0.3 ? cycle / 0.3 : (0.6 - cycle) / 0.3;
        const freq = 660 + progress * 540; // 660 Hz <-> 1200 Hz
        phase += (2 * Math.PI * freq) / sampleRate;
        // Onda rica en armónicos para escucharse fuerte desde el bolsillo
        const s1 = Math.sin(phase);
        const s2 = Math.sin(phase * 2) * 0.45;
        const s3 = (Math.sin(phase) >= 0 ? 0.35 : -0.35);
        return (s1 + s2 + s3) * 0.62;
      });
      if (sirenUri) {
        this.sirenAudioEl = new Audio(sirenUri);
        this.sirenAudioEl.loop = true;
        this.sirenAudioEl.preload = 'auto';
        this.sirenAudioEl.volume = 1.0;
      }

      // 2. Alarma triple de alta visibilidad para Exceso de Velocidad
      let speedPhase = 0;
      const speedUri = createPcmWavDataUri(sampleRate, 1.35, (t) => {
        const inPulse1 = t >= 0.0 && t < 0.25;
        const inPulse2 = t >= 0.35 && t < 0.60;
        const inPulse3 = t >= 0.70 && t < 1.15;
        if (!inPulse1 && !inPulse2 && !inPulse3) return 0;
        const freq = inPulse3 ? 1280 : 960;
        speedPhase += (2 * Math.PI * freq) / sampleRate;
        return (Math.sin(speedPhase) + (Math.sin(speedPhase) >= 0 ? 0.35 : -0.35)) * 0.7;
      });
      if (speedUri) {
        this.speedAudioEl = new Audio(speedUri);
        this.speedAudioEl.loop = false;
        this.speedAudioEl.preload = 'auto';
        this.speedAudioEl.volume = 1.0;
      }

      // 3. Canal silencioso Keep-Alive para evitar que Android duerma el WebView en segundo plano
      const silentUri = createPcmWavDataUri(8000, 1.5, (_t, i) => (i % 2 === 0 ? 0.00004 : -0.00004));
      if (silentUri) {
        this.keepAliveAudioEl = new Audio(silentUri);
        this.keepAliveAudioEl.loop = true;
        this.keepAliveAudioEl.preload = 'auto';
        this.keepAliveAudioEl.volume = 0.01;
      }
    } catch {}
  }

  _getOrCreateContext() {
    const AudioContextClass = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AudioContextClass) return null;
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioContextClass();
    }
    return this.audioCtx;
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
      const ctx = this._getOrCreateContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          if (this.isPlaying && !this.oscillator) {
            this._startOscillator();
          }
          if (this.keepAliveEnabled) {
            this._ensureKeepAliveRunning();
          }
        }).catch(() => {});
      } else {
        if (this.isPlaying && !this.oscillator) {
          this._startOscillator();
        }
        if (this.keepAliveEnabled) {
          this._ensureKeepAliveRunning();
        }
      }

      if (this.isPlaying && this.sirenAudioEl && this.sirenAudioEl.paused) {
        this.sirenAudioEl.play().catch(() => {});
      } else if (this.keepAliveEnabled && this.keepAliveAudioEl && this.keepAliveAudioEl.paused) {
        this.keepAliveAudioEl.play().catch(() => {});
      }
    } catch {}
  }

  setKeepAlive(enabled) {
    this.keepAliveEnabled = Boolean(enabled);
    if (this.keepAliveEnabled) {
      this._ensureKeepAliveRunning();
    } else {
      this._stopKeepAlive();
    }
  }

  _ensureKeepAliveRunning() {
    try {
      if (this.keepAliveAudioEl && this.keepAliveAudioEl.paused) {
        this.keepAliveAudioEl.play().catch(() => {});
      }
      const ctx = this._getOrCreateContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (!this.keepAliveOsc) {
        this.keepAliveGain = ctx.createGain();
        this.keepAliveGain.gain.setValueAtTime(0.00005, ctx.currentTime);
        this.keepAliveGain.connect(ctx.destination);
        this.keepAliveOsc = ctx.createOscillator();
        this.keepAliveOsc.type = 'sine';
        this.keepAliveOsc.frequency.setValueAtTime(20, ctx.currentTime);
        this.keepAliveOsc.connect(this.keepAliveGain);
        this.keepAliveOsc.start();
      }
    } catch {}
  }

  _stopKeepAlive() {
    try {
      if (this.keepAliveAudioEl) {
        this.keepAliveAudioEl.pause();
      }
      if (this.keepAliveOsc) {
        this.keepAliveOsc.stop();
        this.keepAliveOsc.disconnect();
        this.keepAliveOsc = null;
      }
      if (this.keepAliveGain) {
        this.keepAliveGain.disconnect();
        this.keepAliveGain = null;
      }
    } catch {}
  }

  _startOscillator() {
    try {
      const ctx = this._getOrCreateContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      if (this.oscillator) {
        try {
          this.oscillator.stop();
          this.oscillator.disconnect();
        } catch {}
        this.oscillator = null;
      }
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      this.gainNode = ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.45, ctx.currentTime);
      this.gainNode.connect(ctx.destination);

      this.oscillator = ctx.createOscillator();
      this.oscillator.type = 'sawtooth';
      this.oscillator.frequency.setValueAtTime(660, ctx.currentTime);
      this.oscillator.connect(this.gainNode);
      this.oscillator.start();

      let toggle = false;
      this.intervalId = setInterval(() => {
        if (!this.oscillator || !this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        const targetFreq = toggle ? 660 : 1140;
        this.oscillator.frequency.linearRampToValueAtTime(targetFreq, this.audioCtx.currentTime + 0.25);
        toggle = !toggle;
      }, 300);
    } catch (e) {
      console.warn('No se pudo iniciar el oscilador de la sirena:', e);
    }
  }

  start() {
    this.isPlaying = true;

    // 1. Reproducir stream HTML5 <audio> WAV (suena en Android incluso en bolsillo / otra app)
    try {
      if (this.sirenAudioEl) {
        this.sirenAudioEl.currentTime = 0;
        this.sirenAudioEl.play().catch(() => {});
      }
    } catch {}

    // 2. Vibración rítmica continua en Android
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
        }, 1600);
      }
    } catch {}

    // 3. Reproducir también por Web Audio API
    this._startOscillator();
  }

  stop() {
    this.isPlaying = false;
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
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(0);
        }
      } catch {}
      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator.disconnect();
        this.oscillator = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
    } catch (e) {
      console.warn('Error deteniendo sirena:', e);
    }
  }

  // Alarma potente + vibración para alertas de exceso de velocidad (suena en bolsillo y segundo plano)
  playSpeedBeep() {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([450, 120, 450, 120, 650]);
      }
    } catch {}

    try {
      if (this.speedAudioEl) {
        this.speedAudioEl.currentTime = 0;
        this.speedAudioEl.play().catch(() => {});
      }
    } catch {}

    try {
      const ctx = this._getOrCreateContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;

      const playTone = (freq, startOffset, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + startOffset);
        gain.gain.setValueAtTime(0.38, now + startOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + startOffset);
        osc.stop(now + startOffset + duration);
      };

      playTone(920, 0, 0.22);
      playTone(920, 0.28, 0.22);
      playTone(1240, 0.56, 0.36);
    } catch {}
  }
}

export const siren = new EmergencySiren();
