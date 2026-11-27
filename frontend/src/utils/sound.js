// ==============================================================================
// Motor Híbrido de Sirena y Alarmas COPAI GPS (HTML5 <audio> WAV + Web Audio API)
// Inicialización 100% diferida (lazy) para nunca bloquear el arranque del WebView en Android.
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
    this.oscillator = null;
    this.gainNode = null;
    this.intervalId = null;
    this.vibrateIntervalId = null;
    this.isPlaying = false;
    this.keepAliveEnabled = false;

    this.sirenAudioEl = null;
    this.speedAudioEl = null;
    this.audioElementsInitialized = false;

    this.unlockBound = this._handleUserGestureUnlock.bind(this);
    this._setupGlobalUnlock();
  }

  _ensureHtmlAudioElements() {
    if (this.audioElementsInitialized) return;
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    this.audioElementsInitialized = true;
    try {
      let phase = 0;
      const sampleRate = 12000;
      const sirenUri = createPcmWavDataUri(sampleRate, 1.8, (t) => {
        const cycle = t % 0.6;
        const progress = cycle < 0.3 ? cycle / 0.3 : (0.6 - cycle) / 0.3;
        const freq = 660 + progress * 520;
        phase += (2 * Math.PI * freq) / sampleRate;
        const s1 = Math.sin(phase);
        const s2 = (s1 >= 0 ? 0.35 : -0.35);
        return (s1 + s2) * 0.65;
      });
      if (sirenUri) {
        this.sirenAudioEl = new Audio(sirenUri);
        this.sirenAudioEl.loop = true;
        this.sirenAudioEl.volume = 1.0;
      }

      let speedPhase = 0;
      const speedUri = createPcmWavDataUri(sampleRate, 1.1, (t) => {
        const inPulse1 = t >= 0.0 && t < 0.22;
        const inPulse2 = t >= 0.30 && t < 0.52;
        const inPulse3 = t >= 0.60 && t < 0.98;
        if (!inPulse1 && !inPulse2 && !inPulse3) return 0;
        const freq = inPulse3 ? 1260 : 940;
        speedPhase += (2 * Math.PI * freq) / sampleRate;
        return Math.sin(speedPhase) * 0.75;
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
        }).catch(() => {});
      } else if (this.isPlaying && !this.oscillator) {
        this._startOscillator();
      }

      if (this.isPlaying) {
        this._ensureHtmlAudioElements();
        if (this.sirenAudioEl && this.sirenAudioEl.paused) {
          this.sirenAudioEl.play().catch(() => {});
        }
      }
    } catch {}
  }

  setKeepAlive(enabled) {
    this.keepAliveEnabled = Boolean(enabled);
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
    this._ensureHtmlAudioElements();

    try {
      if (this.sirenAudioEl) {
        this.sirenAudioEl.currentTime = 0;
        this.sirenAudioEl.play().catch(() => {});
      }
    } catch {}

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

  playSpeedBeep() {
    this._ensureHtmlAudioElements();
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
