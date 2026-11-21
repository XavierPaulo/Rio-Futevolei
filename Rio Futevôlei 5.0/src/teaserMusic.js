// 5.0 Teaser: trilha rock dos anos 80/90 com tempero de ska, sintetizada na hora (WebAudio, nenhum
// arquivo de áudio). Ré maior, 160 BPM, 60 compassos = 1:30. Riff de guitarra na abertura, bateria de rock
// com caixa "estourada" de anos 80, guitarra abafada no verso, power chords distorcidos, solo de guitarra,
// baixo, metais no refrão, guitarra ska no contratempo e eco dub na parte lenta.
// Volumes e andamento em src/data/teaser.js (tela do Teaser).

// ---------- o arranjo (em compassos de 4 tempos) ----------
// Cada parte diz o que toca: bateria (estilo), baixo, ska, rock (power chords), lead (guitarra solo), metais.
export const SECTIONS = [
  { from: 0, to: 4, name: 'Intro', drums: 'intro', bass: 'intro', ska: false, rock: false, lead: 'riff', horns: false },
  { from: 4, to: 12, name: 'Verso', drums: 'rock', bass: 'eighths', ska: false, rock: 'chug', lead: false, horns: false, crash: true },
  { from: 12, to: 20, name: 'Refrão', drums: 'rock', bass: 'eighths', ska: false, rock: true, lead: 'riff', horns: 'riff', crash: true },
  { from: 20, to: 28, name: 'Verso 2', drums: 'rock', bass: 'walk', ska: true, rock: 'chug', lead: false, horns: 'stabs', crash: true },
  { from: 28, to: 32, name: 'Parte lenta', drums: 'half', bass: 'long', ska: 'dub', rock: false, lead: 'long', horns: false, crash: true },
  { from: 32, to: 36, name: 'Subida', drums: 'build', bass: 'eighths', ska: false, rock: 'chug', lead: false, horns: false },
  { from: 36, to: 44, name: 'Refrão 2', drums: 'rock', bass: 'eighths', ska: true, rock: true, lead: 'riff', horns: 'riff', crash: true },
  { from: 44, to: 52, name: 'Solo de guitarra', drums: 'punk', bass: 'eighths', ska: false, rock: true, lead: 'solo', horns: false, crash: true, prog: 'ponte' },
  { from: 52, to: 56, name: 'Refrão final', drums: 'rock', bass: 'eighths', ska: true, rock: true, lead: 'riff', horns: 'riff', crash: true },
  { from: 56, to: 60, name: 'Final', drums: 'stops', bass: 'stops', ska: false, rock: 'stops', lead: 'stops', horns: 'stops', crash: true },
];
export const BARS = 60;
// 5.0: versão de 30 segundos (20 compassos), rock do começo ao fim:
// riff sozinho → pancada → golpes (bateria acelerada) → breque pesado → solo → final
export const SECTIONS_30 = [
  { from: 0, to: 2, name: 'Riff', drums: 'riffIntro', bass: 'intro', ska: false, rock: false, lead: 'riff', horns: false },
  { from: 2, to: 6, name: 'Pancada', drums: 'rock', bass: 'eighths', ska: false, rock: true, lead: 'riff', horns: false, crash: true },
  { from: 6, to: 10, name: 'Golpes', drums: 'punk', bass: 'eighths', ska: false, rock: true, lead: false, horns: 'stabs', crash: true },
  { from: 10, to: 12, name: 'Breque', drums: 'half', bass: 'long', ska: false, rock: 'hits', lead: 'long', horns: false, crash: true },
  { from: 12, to: 18, name: 'Solo', drums: 'rock', bass: 'eighths', ska: false, rock: true, lead: 'solo', horns: false, crash: true, prog: 'ponte' },
  { from: 18, to: 20, name: 'Final', drums: 'stops', bass: 'stops', ska: false, rock: 'stops', lead: 'stops', horns: 'stops', crash: true },
];
export const ARRANGEMENTS = { '90': SECTIONS, '30': SECTIONS_30 };

const PROG = { normal: ['D', 'G', 'A', 'G'], ponte: ['Bm', 'G', 'D', 'A'] };
const CH = { // baixo (raiz), acorde ska (região média), power chord, terça (maior/menor)
  D: { bass: 38, ska: [62, 66, 69], pow: [50, 57, 62], third: 4 },
  G: { bass: 43, ska: [62, 67, 71], pow: [43, 50, 55], third: 4 },
  A: { bass: 45, ska: [61, 64, 69], pow: [45, 52, 57], third: 4 },
  Bm: { bass: 47, ska: [62, 66, 71], pow: [47, 54, 59], third: 3 },
};
// refrão dos metais (4 compassos): [tempo, nota MIDI, duração em tempos]
const RIFF = [
  [[0, 74, 0.5], [0.5, 76, 0.5], [1, 78, 1], [2.5, 76, 0.5], [3, 74, 1]],
  [[0, 79, 0.5], [0.5, 78, 0.5], [1, 76, 1.5], [3, 74, 0.5], [3.5, 71, 0.5]],
  [[0, 73, 0.5], [0.5, 76, 0.5], [1, 81, 1], [2.5, 79, 0.5], [3, 78, 0.75]],
  [[0, 79, 1], [1, 78, 0.5], [1.5, 76, 0.5], [2, 74, 2]],
];
// riff da guitarra (4 compassos, Ré com blues): [tempo, nota MIDI, duração em tempos]
const LEAD = [
  [[0, 62, 0.5], [0.5, 65, 0.5], [1, 67, 0.5], [1.5, 65, 0.5], [2, 62, 1], [3, 60, 0.5], [3.5, 62, 0.5]],
  [[0, 65, 0.5], [0.5, 67, 0.5], [1, 69, 1], [2, 67, 0.5], [2.5, 65, 0.5], [3, 62, 1]],
  [[0, 62, 0.5], [0.5, 65, 0.5], [1, 67, 0.5], [1.5, 65, 0.5], [2, 62, 1], [3, 60, 0.5], [3.5, 62, 0.5]],
  [[0, 69, 0.5], [0.5, 72, 0.5], [1, 74, 1.5], [3, 72, 0.25], [3.25, 74, 0.75]],
];
// solo (8 compassos sobre Si menor): pentatônica, colcheias que viram semicolcheias e sobem no fim
const PENTA = [59, 62, 64, 66, 69, 71, 74, 76, 78, 81, 83];
const SOLO = (() => {
  let seed = 44, idx = 5; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 8 }, (_, bar) => {
    const notes = [], sub = bar < 4 ? 2 : 4;
    for (let i = 0; i < 4 * sub; i++) {
      if (bar < 4 && r() < 0.18) continue; // respiros
      idx = bar >= 6 ? Math.min(PENTA.length - 1, 3 + Math.floor((bar - 6) * 4 + i / 3)) : Math.max(0, Math.min(PENTA.length - 1, idx + Math.round((r() - 0.45) * 3)));
      notes.push([i / sub, PENTA[idx], bar === 7 && i === 4 * sub - 1 ? 1 : 1 / sub]);
    }
    if (bar === 3 || bar === 5) notes.push([3, PENTA[8], 1]); // nota longa com vibrato
    return notes;
  });
})();
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
export const sectionAt = (bar, list = SECTIONS) => list.find(s => bar >= s.from && bar < s.to) || list[list.length - 1];

export class SkaTrack {
  constructor(data = {}, sections = SECTIONS) {
    this.data = data;
    this.sections = sections; this.bars = sections[sections.length - 1].to;
    this.bpm = data.bpm || 160;
    this.beat = 60 / this.bpm;
    this.total = this.bars * 4 * this.beat;
    this.ctx = null; this.bus = null; this.timer = 0; this.t0 = 0; this.playing = false; this.pausedAt = 0;
  }
  get time() { if (!this.ctx) return this.pausedAt; return this.playing ? Math.min(this.total, this.ctx.currentTime - this.t0) : this.pausedAt; }

  ensure() {
    if (this.ctx) return;
    // 24 kHz: som de fita dos anos 90 e metade do trabalho para o computador
    const AC = window.AudioContext || window.webkitAudioContext;
    let ctx; try { ctx = new AC({ sampleRate: 24000 }); } catch (e) { ctx = new AC(); }
    this.ctx = ctx;
    this.out = ctx.createDynamicsCompressor();
    this.out.threshold.value = -18; this.out.ratio.value = 6; this.out.attack.value = 0.003;
    this.master = ctx.createGain(); this.master.gain.value = this.vol('geral') * 0.75;
    this.out.connect(this.master); this.master.connect(ctx.destination);
    const n = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = n;
    const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 14) * 0.9; }
    this.curve = curve;
  }
  vol(k) { const v = (this.data.volumes || {})[k]; return v === undefined ? 0.7 : v; }

  // toca a partir de "at" segundos (precisa de um clique do usuário antes, regra dos navegadores)
  play(at = this.pausedAt) {
    this.ensure();
    this.stopBus();
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume();
    this.bus = ctx.createGain(); this.bus.connect(this.out);
    // eco dub (só a guitarra ska na parte lenta manda sinal para ele)
    this.dub = ctx.createDelay(1); this.dub.delayTime.value = this.beat * 0.75;
    const fb = ctx.createGain(); fb.gain.value = Math.min(0.8, this.data.eco ?? 0.45);
    const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
    this.dub.connect(dl); dl.connect(fb); fb.connect(this.dub); dl.connect(this.bus);
    this.chains();
    at = Math.max(0, Math.min(this.total, at));
    this.t0 = ctx.currentTime + 0.08 - at;
    this.next = Math.ceil(at / this.beat - 1e-6);
    this.playing = true;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  }
  // filtros divididos por instrumento (cada nota só cria o oscilador e o envelope): bem mais leve
  chains() {
    const c = this.ctx, mk = (type, f, q) => { const n = c.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; n.connect(this.bus); return n; };
    this.fx = { hat: mk('highpass', 7500), snare: mk('highpass', 1200), crash: mk('highpass', 4500), bass: mk('lowpass', 520, 3), skank: mk('bandpass', 1900, 0.9) };
    const lp = mk('lowpass', 2600), ws = c.createWaveShaper(); ws.curve = this.curve; ws.connect(lp);
    lp.disconnect(); const out = c.createGain(); out.gain.value = 0.3; lp.connect(out); out.connect(this.bus); this.fx.powerOut = out;
    const pre = c.createGain(); pre.gain.value = 0.5; pre.connect(ws); this.fx.power = pre;
    // guitarra solo: mais ganho, mais agudo e um eco curto de estádio
    const lws = c.createWaveShaper(); lws.curve = this.curve; const llp = c.createBiquadFilter(); llp.type = 'lowpass'; llp.frequency.value = 3800;
    const lpre = c.createGain(); lpre.gain.value = 0.9; lpre.connect(lws); lws.connect(llp);
    const lout = c.createGain(); lout.gain.value = 0.22; llp.connect(lout); lout.connect(this.bus);
    const ld = c.createDelay(1); ld.delayTime.value = this.beat * 0.5; const lfb = c.createGain(); lfb.gain.value = 0.25; const lwet = c.createGain(); lwet.gain.value = 0.3;
    lout.connect(ld); ld.connect(lfb); lfb.connect(ld); ld.connect(lwet); lwet.connect(this.bus);
    this.fx.lead = lpre; this.fx.leadOut = lout;
  }
  pause() { this.pausedAt = this.time; this.playing = false; clearInterval(this.timer); this.stopBus(); }
  stopBus() {
    if (!this.bus) return;
    const b = this.bus, now = this.ctx.currentTime;
    b.gain.setValueAtTime(b.gain.value, now); b.gain.linearRampToValueAtTime(0, now + 0.05);
    setTimeout(() => { try { b.disconnect(); } catch (e) { /* já foi */ } }, 120);
    this.bus = null;
  }
  setVolume(k, v) { (this.data.volumes = this.data.volumes || {})[k] = v; if (k === 'geral' && this.master) this.master.gain.value = v * 0.75; }

  schedule() {
    if (!this.playing) return;
    const ctx = this.ctx, horizon = ctx.currentTime + 0.18;
    while (this.next < this.bars * 4 && this.t0 + this.next * this.beat < horizon) {
      const t = this.t0 + this.next * this.beat;
      if (t > ctx.currentTime - 0.02) this.beatAt(this.next, t);
      this.next++;
    }
    if (this.time >= this.total) { this.playing = false; this.pausedAt = this.total; clearInterval(this.timer); }
  }

  // ---------- instrumentos ----------
  env(g, t, peak, a, d) { peak = Math.max(0.0002, peak); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  gain(v, dest = this.bus) { const g = this.ctx.createGain(); g.gain.value = v; g.connect(dest); return g; }
  osc(type, f, t, dur, dest) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o; }
  noiseAt(t, dur, dest) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur); return s; }

  kick(t, v = 1) {
    const g = this.gain(0, this.bus); const o = this.osc('sine', 150, t, 0.4, g);
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    this.env(g, t, 1.1 * v * this.vol('bateria'), 0.004, 0.3);
  }
  snare(t, v = 1) {
    const g = this.gain(0, this.fx.snare); this.noiseAt(t, 0.25, g); this.env(g, t, 0.55 * v * this.vol('bateria'), 0.002, 0.16);
    const g2 = this.gain(0); this.osc('triangle', 190, t, 0.12, g2); this.env(g2, t, 0.35 * v * this.vol('bateria'), 0.002, 0.08);
    // anos 80: a caixa ganha uma cauda de sala que corta seco (gated reverb)
    const g3 = this.gain(0, this.fx.snare); this.noiseAt(t + 0.01, 0.32, g3);
    g3.gain.setValueAtTime(0.0001, t); g3.gain.linearRampToValueAtTime(0.22 * v * this.vol('bateria'), t + 0.02); g3.gain.setValueAtTime(0.2 * v * this.vol('bateria'), t + 0.24); g3.gain.linearRampToValueAtTime(0.0001, t + 0.3);
  }
  hat(t, open = false, v = 1) {
    const g = this.gain(0, this.fx.hat); this.noiseAt(t, open ? 0.4 : 0.08, g); this.env(g, t, 0.18 * v * this.vol('bateria'), 0.001, open ? 0.3 : 0.04);
  }
  crash(t) {
    const g = this.gain(0, this.fx.crash); this.noiseAt(t, 1.9, g); this.env(g, t, 0.28 * this.vol('bateria'), 0.003, 1.7);
  }
  bassNote(t, m, dur) {
    const g = this.gain(0, this.fx.bass);
    this.osc('sawtooth', hz(m), t, dur, g); this.osc('square', hz(m - 12), t, dur, g);
    const bv = Math.max(0.0002, 0.42 * this.vol('baixo'));
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(bv, t + 0.01);
    g.gain.setValueAtTime(bv, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  skank(t, chord, dub = false) {
    const g = this.gain(0, this.fx.skank);
    if (dub && this.dub) { const s = this.ctx.createGain(); s.gain.value = 0.7; g.connect(s); s.connect(this.dub); }
    for (const m of CH[chord].ska) this.osc('square', hz(m), t, 0.12, g);
    this.env(g, t, 0.16 * this.vol('guitarraSka'), 0.003, 0.09);
  }
  power(t, chord, dur, v = 1) {
    // o envelope vai antes da distorção (que é dividida): o volume sai mais baixo, então compensa
    this.fx.powerOut.gain.value = 0.3 * this.vol('guitarraRock');
    const g = this.gain(0, this.fx.power);
    for (const m of CH[chord].pow) this.osc('sawtooth', hz(m), t, dur, g);
    this.env(g, t, 0.6 * v, 0.004, dur);
  }
  lead(t, m, dur, bend = false) {
    this.fx.leadOut.gain.value = 0.22 * this.vol('guitarraRock');
    const g = this.gain(0, this.fx.lead);
    const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(); lfo.frequency.value = 6; lg.gain.value = dur > this.beat * 0.9 ? 22 : 0; lfo.connect(lg); lfo.start(t + 0.1); lfo.stop(t + dur + 0.05);
    for (const det of [0, 9]) {
      const o = this.osc('sawtooth', hz(m), t, dur, g); o.detune.value = det; lg.connect(o.detune);
      if (bend) { o.detune.setValueAtTime(det - 200, t); o.detune.linearRampToValueAtTime(det, t + 0.08); }
    }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.006); g.gain.setValueAtTime(0.5, t + Math.max(0.01, dur - 0.03)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  horn(t, m, dur) {
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(2600, t + 0.05); lp.frequency.linearRampToValueAtTime(1500, t + dur);
    const g = this.gain(0); lp.connect(g);
    // trompete (dente de serra) + sax uma oitava abaixo (quadrada), com um vibrato só para os dois
    const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 6; lfo.connect(lg); lfo.start(t + 0.12); lfo.stop(t + dur + 0.05);
    for (const [mm, det, type] of [[m, 4, 'sawtooth'], [m - 12, -5, 'square']]) { const o = this.osc(type, hz(mm), t, dur, lp); o.detune.value = det; lg.connect(o.detune); }
    const hv = Math.max(0.0002, 0.13 * this.vol('metais'));
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(hv, t + 0.025);
    g.gain.setValueAtTime(hv, t + Math.max(0.03, dur - 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  riser(t, dur) {
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(6000, t + dur);
    const g = this.gain(0); f.connect(g); this.noiseAt(t, dur, f);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.2 * this.vol('bateria')), t + dur * 0.95); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  // ---------- um tempo da música ----------
  beatAt(i, t) {
    const B = this.beat, bar = Math.floor(i / 4), k = i % 4, S = sectionAt(bar, this.sections), first = bar === S.from && k === 0, rel = bar - S.from, last = S.to - 1;
    const prog = PROG[S.prog || 'normal'], chord = prog[bar % 4];
    const c = CH[chord];
    // ---- bateria
    const d = S.drums;
    if (first && S.crash) this.crash(t);
    if (d === 'intro') {
      if (rel < 2) { if (k === 0) this.kick(t, 0.8); this.hat(t + B / 2, false, 0.6); }
      else if (rel === 2) { if (k % 2 === 0) this.kick(t); else this.snare(t); this.hat(t); this.hat(t + B / 2); }
      else { for (let s = 0; s < 4; s++) this.snare(t + s * B / 4, 0.4 + (k * 4 + s) / 20); if (k === 0) this.kick(t); }
    } else if (d === 'riffIntro') {
      if (bar < last) { if (k === 0) this.kick(t, 0.9); this.hat(t + B / 2, false, 0.5); }
      else { for (let s = 0; s < 4; s++) this.snare(t + s * B / 4, 0.45 + (k * 4 + s) / 18); if (k === 0) this.kick(t); }
    } else if (d === 'ska') {
      if (k === 0 || k === 2) this.kick(t); if (k === 1 || k === 3) this.snare(t);
      this.hat(t, false, 0.7); this.hat(t + B / 2, k === 3, 1);
    } else if (d === 'rock') {
      if (k === 0 || k === 2) this.kick(t); if (k === 2) this.kick(t + B / 2, 0.8); if (k === 1 || k === 3) this.snare(t, 1.1);
      this.hat(t); this.hat(t + B / 2, false, 0.8);
      if (bar % 4 === 3 && k === 3) for (let s = 1; s < 4; s++) this.snare(t + s * B / 4, 0.7);
    } else if (d === 'half') {
      if (k === 0) this.kick(t); if (k === 2) this.snare(t, 1.2); this.hat(t + B / 2, k === 3, 0.6);
    } else if (d === 'build') {
      const sub = rel < 2 ? 2 : 4, n = rel * 4 + k;
      if (rel === 0 && k === 0) this.riser(t, 4 * 4 * B);
      this.kick(t);
      for (let s = 0; s < sub; s++) this.snare(t + s * B / sub, 0.35 + n / 24);
    } else if (d === 'punk') {
      this.kick(t); this.snare(t + B / 2, 1); this.hat(t, false, 0.8); this.hat(t + B / 2, false, 0.8);
    } else if (d === 'stops') {
      if (bar < last) { if (k === 0) { this.kick(t); this.crash(t); this.snare(t, 1.2); } if (bar === last - 1 && k > 0) for (let s = 0; s < 4; s++) this.snare(t + s * B / 4, 0.5 + k / 6); }
      else if (k === 0) { this.kick(t); this.crash(t); }
    }
    // ---- baixo
    const bs = S.bass, root = c.bass;
    if (bs === 'walk') this.bassNote(t, root + [0, c.third, 7, 9][k], B * 0.9);
    else if (bs === 'eighths') { const o = [0, 0, 12, 0, 0, 7, 12, 7]; this.bassNote(t, root + o[k * 2], B * 0.45); this.bassNote(t + B / 2, root + o[k * 2 + 1], B * 0.45); }
    else if (bs === 'long') { if (k === 0) this.bassNote(t, root, B * 3.6); }
    else if (bs === 'intro') { if (bar >= 2) this.bassNote(t, root + [0, c.third, 7, 9][k], B * 0.9); }
    else if (bs === 'stops') { if (k === 0) this.bassNote(t, bar === last ? 38 : root, bar === last ? B * 3.8 : B * 0.5); }
    // ---- guitarra ska (no contratempo)
    if (S.ska === true || (S.ska === 'intro' && bar >= 2)) this.skank(t + B / 2, chord);
    else if (S.ska === 'dub' && (k === 1 || k === 3)) this.skank(t + B / 2, chord, true);
    // ---- guitarra rock
    if (S.rock === true) { this.power(t, chord, B * 0.42, 1); this.power(t + B / 2, chord, B * 0.42, 0.8); }
    else if (S.rock === 'hits' && (k === 0 || k === 2)) this.power(t, chord, B * 1.8, 1.1);
    else if (S.rock === 'chug') { this.power(t, chord, B * 0.16, 0.75); this.power(t + B / 2, chord, B * 0.16, 0.6); if (k === 3) this.power(t + B * 0.75, chord, B * 0.16, 0.6); }
    else if (S.rock === 'stops' && k === 0) this.power(t, bar === last ? 'D' : chord, bar === last ? B * 3.8 : B * 0.6, 1.2);
    // ---- guitarra solo
    const ld = S.lead;
    if (ld === 'riff') { for (const [b0, m, len] of LEAD[rel % 4]) if (Math.floor(b0) === k) this.lead(t + (b0 - k) * B, m + (S.from === 0 ? 0 : 12), len * B * 0.95, b0 === 1 || len >= 1); }
    else if (ld === 'solo') { for (const [b0, m, len] of SOLO[rel % 8]) if (Math.floor(b0) === k) this.lead(t + (b0 - k) * B, m, len * B * 0.95, len >= 1); }
    else if (ld === 'long' && k === 0) this.lead(t, c.ska[2] + 12, B * 3.6, true);
    else if (ld === 'stops' && k === 0) this.lead(t, bar === last ? 74 : c.ska[2] + 12, bar === last ? B * 3.8 : B * 0.5, true);
    // ---- metais
    const hn = S.horns;
    if (hn === 'riff') for (const [b, m, len] of RIFF[(bar - S.from) % 4]) { if (Math.floor(b) === k) this.horn(t + (b - k) * B, m, len * B * 0.95); }
    else if (hn === 'stabs' && bar % 2 === 1 && (k === 1 || k === 3)) this.horn(t + B / 2, c.ska[2] + 12, B * 0.3);
    else if (hn === 'long' && k === 0) this.horn(t, c.ska[2] + 12, B * 3.7);
    else if (hn === 'stops' && k === 0) this.horn(t, bar === last ? 74 : c.ska[2] + 12, bar === last ? B * 3.8 : B * 0.5);
  }
}
