// Efeitos sonoros sintetizados (placeholder até termos a trilha e os sons finais).
export class Sfx {
  constructor() { this.ctx = null; }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  env(node, t, a, peak, dur) {
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  noiseBurst(dur, freq, type, peak, sweepTo) {
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain(); this.env(g, t, 0.005, peak, dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  tone(freq, dur, type, peak, toFreq, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
    const g = c.createGain(); this.env(g, t, 0.005, peak, dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  onEvent(e) {
    if (!this.ctx) return;
    switch (e.type) {
      case 'hit': {
        const p = Math.min(1, (e.speed || 8) / 20);
        this.tone(200 + p * 60, 0.13, 'sine', 0.5 + p * 0.4, 55);
        this.noiseBurst(0.06, 1400, 'lowpass', 0.25 + p * 0.3);
        break;
      }
      case 'special':
        this.noiseBurst(0.6, 300, 'bandpass', 0.6, 4000);
        this.tone(90, 0.5, 'sawtooth', 0.25, 40);
        break;
      case 'net': this.noiseBurst(0.25, 500, 'lowpass', 0.4); break;
      case 'land': this.noiseBurst(0.18, 700, 'lowpass', 0.5); break;
      case 'dive': this.noiseBurst(0.3, 900, 'lowpass', 0.3, 300); break;
      case 'point':
        this.tone(2600, 0.12, 'square', 0.07);
        this.tone(2900, 0.28, 'square', 0.07, null, 0.13);
        break;
      case 'swap':
        this.tone(2600, 0.1, 'square', 0.07);
        this.tone(2600, 0.1, 'square', 0.07, null, 0.16);
        this.tone(2900, 0.3, 'square', 0.07, null, 0.32);
        break;
      case 'select': this.tone(660, 0.07, 'square', 0.06 * (e.vol ?? 1)); break;
      case 'deny': this.tone(160, 0.15, 'sawtooth', 0.12); break;
      case 'vs':
        this.noiseBurst(0.5, 200, 'bandpass', 0.5, 3000);
        this.tone(110, 0.6, 'sawtooth', 0.2, 55);
        break;
      case 'switch': this.tone(880, 0.06, 'triangle', 0.08); break;
      case 'formation': this.tone(520, 0.08, 'triangle', 0.1); this.tone(780, 0.08, 'triangle', 0.1, null, 0.08); break;
      case 'charge': this.tone(300, 0.25, 'triangle', 0.2, 1200); break;
    }
  }
}
