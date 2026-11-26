// Web Audio API emergency siren synthesizer (100% offline, zero external dependency, iOS/Android auto-unlock)
class EmergencySiren {
  constructor() {
    this.audioCtx = null;
    this.oscillator = null;
    this.gainNode = null;
    this.intervalId = null;
    this.vibrateIntervalId = null;
    this.isPlaying = false;
    this.unlockBound = this._handleUserGestureUnlock.bind(this);
    this._setupGlobalUnlock();
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
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          if (this.isPlaying && !this.oscillator) {
            this._startOscillator();
          }
        }).catch(() => {});
      } else if (this.isPlaying && !this.oscillator) {
        this._startOscillator();
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
      // Volumen potente y claro (0.35) para escucharse en celular y computadora
      this.gainNode.gain.setValueAtTime(0.35, ctx.currentTime);
      this.gainNode.connect(ctx.destination);

      this.oscillator = ctx.createOscillator();
      this.oscillator.type = 'sawtooth';
      this.oscillator.frequency.setValueAtTime(640, ctx.currentTime);
      this.oscillator.connect(this.gainNode);
      this.oscillator.start();

      let toggle = false;
      this.intervalId = setInterval(() => {
        if (!this.oscillator || !this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        const targetFreq = toggle ? 640 : 1080;
        this.oscillator.frequency.linearRampToValueAtTime(targetFreq, this.audioCtx.currentTime + 0.25);
        toggle = !toggle;
      }, 320);
    } catch (e) {
      console.warn('No se pudo iniciar el oscilador de la sirena:', e);
    }
  }

  start() {
    this.isPlaying = true;
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([500, 120, 500, 120, 700]);
      }
      if (!this.vibrateIntervalId) {
        this.vibrateIntervalId = setInterval(() => {
          if (!this.isPlaying) return;
          try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([450, 120, 550]);
            }
          } catch {}
        }, 1800);
      }
    } catch {}

    this._startOscillator();
  }

  stop() {
    this.isPlaying = false;
    try {
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

  // Sonido corto de notificación (doble tono limpio) para alertas de exceso de velocidad o avisos
  playSpeedBeep() {
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
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + startOffset);
        gain.gain.setValueAtTime(0.28, now + startOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + startOffset);
        osc.stop(now + startOffset + duration);
      };

      playTone(880, 0, 0.16);
      playTone(1174.66, 0.18, 0.24);
    } catch {
      // Ignorar si el navegador aún no tuvo interacción de audio
    }
  }
}

export const siren = new EmergencySiren();
