// Web Audio API emergency siren synthesizer (100% offline, zero external dependency)
class EmergencySiren {
  constructor() {
    this.audioCtx = null;
    this.oscillator = null;
    this.gainNode = null;
    this.intervalId = null;
    this.isPlaying = false;
  }

  start() {
    if (this.isPlaying) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      this.gainNode = this.audioCtx.createGain();
      // Gentle starting volume (0.12) to avoid deafening the operator
      this.gainNode.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      this.gainNode.connect(this.audioCtx.destination);

      this.oscillator = this.audioCtx.createOscillator();
      this.oscillator.type = 'sawtooth';
      this.oscillator.frequency.setValueAtTime(600, this.audioCtx.currentTime);
      this.oscillator.connect(this.gainNode);
      this.oscillator.start();

      let toggle = false;
      this.intervalId = setInterval(() => {
        if (!this.oscillator || !this.audioCtx) return;
        const targetFreq = toggle ? 600 : 950;
        this.oscillator.frequency.linearRampToValueAtTime(targetFreq, this.audioCtx.currentTime + 0.25);
        toggle = !toggle;
      }, 350);

      this.isPlaying = true;
    } catch (e) {
      console.warn("No se pudo iniciar la sirena de audio:", e);
    }
  }

  stop() {
    if (!this.isPlaying) return;
    try {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator.disconnect();
        this.oscillator = null;
      }
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        this.audioCtx.close();
        this.audioCtx = null;
      }
    } catch (e) {
      console.warn("Error deteniendo sirena:", e);
    } finally {
      this.isPlaying = false;
    }
  }
}

export const siren = new EmergencySiren();
