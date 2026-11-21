import { BALL_R, COURT } from './config.js';
import { pointAt, solve, gravity } from './engine/trajectory.js';

const NET_TOP = COURT.netH + BALL_R;
const hitsNet = (px, x, y, z) => ((px < 0) !== (x < 0)) && Math.abs(z) < COURT.halfWid + 0.6 && y < NET_TOP;

// Integra um corpo {pos, vel, curve, g}. Retorna 'net', 'land' ou null.
// "curve" é uma aceleração horizontal constante (efeito da bola).
// "g" escala a gravidade: com velocidade ×s e g = s², a bola faz o MESMO arco,
// só que mais rápido — é assim que o atributo Força age.
export function stepBody(b, dt) {
  const px = b.pos.x;
  b.vel.x += b.curve.x * dt;
  b.vel.z += b.curve.z * dt;
  b.vel.y -= gravity() * (b.g || 1) * dt; // gravidade editável (src/data/trajectories.js)
  b.pos.x += b.vel.x * dt;
  b.pos.y += b.vel.y * dt;
  b.pos.z += b.vel.z * dt;
  const crossed = (px < 0) !== (b.pos.x < 0);
  if (crossed && Math.abs(b.pos.z) < COURT.halfWid + 0.6 && b.pos.y < COURT.netH + BALL_R) {
    const side = px < 0 ? -1 : 1;
    b.pos.x = side * BALL_R;
    b.vel.x *= -0.2;
    b.vel.z *= 0.5;
    b.vel.y = Math.min(b.vel.y, 0) * 0.3;
    b.curve.x = 0;
    b.curve.z = 0;
    return 'net';
  }
  if (b.pos.y <= BALL_R) return 'land';
  return null;
}

export function simulate(pos, vel, curve, g = 1, maxT = 6, dt = 1 / 60) {
  const b = { pos: { ...pos }, vel: { ...vel }, curve: { ...curve }, g };
  const out = [{ t: 0, x: b.pos.x, y: b.pos.y, z: b.pos.z, vy: b.vel.y }];
  for (let t = dt; t < maxT; t += dt) {
    const r = stepBody(b, dt);
    out.push({ t, x: b.pos.x, y: b.pos.y, z: b.pos.z, vy: b.vel.y });
    if (r === 'land') break;
  }
  return out;
}

// Caminho previsto de uma trajetória roteirizada (mesmo formato de simulate): amostras a
// cada 1/60 s até o destino; se bater na rede, o resto é a queda física.
export function sampleScript(sc, dt = 1 / 60) {
  const out = [];
  let prev = pointAt(sc, 0);
  out.push({ t: 0, x: prev.x, y: prev.y, z: prev.z, vy: 0 });
  const rate = sc.rate || 1; // velocidade do golpe (Rápida / Normal / Lenta)
  for (let t = dt; ; t += dt) {
    const tau = Math.min(1, t * rate / sc.T);
    const p = pointAt(sc, tau);
    const vy = (p.y - prev.y) / dt;
    if (hitsNet(prev.x, p.x, p.y, p.z)) {
      const pos = { x: (prev.x < 0 ? -1 : 1) * BALL_R, y: p.y, z: p.z };
      const vel = { x: -(p.x - prev.x) / dt * 0.2, y: Math.min(vy, 0) * 0.3, z: (p.z - prev.z) / dt * 0.5 };
      for (const s of simulate(pos, vel, { x: 0, z: 0 }, 1)) out.push({ ...s, t: s.t + t });
      return out;
    }
    out.push({ t, x: p.x, y: p.y, z: p.z, vy });
    prev = p;
    if (tau >= 1 || p.y <= BALL_R) return out;
  }
}

export class Ball {
  constructor() {
    this.pos = { x: 0, y: 1, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.curve = { x: 0, z: 0 };
    this.live = false;
    this.held = true;
    this.path = [];
    this.t = 0;
    this.rot = 0;
    this.spin = 0;
    this.netHit = false;
    this.deceptive = false;
    this.special = false;
    this.color = null;
  }

  hold(p) {
    this.held = true;
    this.script = null;
    this.live = false;
    this.pos = { ...p };
    this.vel = { x: 0, y: 0, z: 0 };
    this.path = [];
    this.special = false;
    this.color = null;
  }

  // opts.speed: multiplicador de velocidade da trajetória (Força do atleta)
  launch(p, v, curve, opts = {}) {
    const s = opts.speed || 1;
    this.script = null;
    this.held = false;
    this.live = true;
    this.pos = { ...p };
    this.vel = { x: v.x * s, y: v.y * s, z: v.z * s };
    this.curve = curve ? { x: curve.x * s * s, z: curve.z * s * s } : { x: 0, z: 0 };
    this.g = s * s;
    this.netHit = false;
    this.autoRoll = undefined; // sorteio do domínio automático do parceiro (um por batida)
    this.deceptive = !!opts.deceptive;
    this.special = !!opts.special;
    this.color = opts.color || null;
    this.spin = Math.hypot(v.x, v.z) * 2.2 * (v.x >= 0 ? 1 : -1);
    this.recalc();
  }

  // 2.0: trajetória roteirizada por um modelo (src/engine/trajectory.js).
  //   tr = { to: {x,z}, model, apex, launch, bend } · opts.speed = Força (mais forte e mais reto)
  launchPath(p, tr, opts = {}) {
    const s = opts.speed || 1;
    this.held = false;
    this.live = true;
    this.pos = { ...p };
    this.netHit = false;
    this.autoRoll = undefined;
    this.deceptive = !!opts.deceptive;
    this.special = !!opts.special;
    this.color = opts.color || null;
    // física: velocidade de saída que leva à altura máxima e ao destino (Força = mais forte e reto)
    this.script = { ...solve({ ...tr, y1: 0.15 }, p, s, { netClear: NET_TOP + 0.12 }), e: 0 };
    const a = pointAt(this.script, 0), b = pointAt(this.script, (this.script.rate || 1) / 60 / this.script.T);
    this.vel = { x: (b.x - a.x) * 60, y: (b.y - a.y) * 60, z: (b.z - a.z) * 60 };
    this.curve = { x: 0, z: 0 };
    this.g = 1;
    this.spin = Math.hypot(this.vel.x, this.vel.z) * 2.2 * (this.vel.x >= 0 ? 1 : -1);
    this.path = sampleScript(this.script);
    this.t = 0;
  }

  recalc() {
    this.script = null;
    this.path = simulate(this.pos, this.vel, this.curve, this.g || 1);
    this.t = 0;
  }

  // passo da bola roteirizada; bate na rede se o caminho passar abaixo da fita
  stepScript(dt) {
    const sc = this.script;
    const px = this.pos.x;
    sc.e += dt * (sc.rate || 1); // tempo da trajetória: corre mais rápido no golpe "Rápida"
    const tau = sc.e / sc.T;
    const p = pointAt(sc, tau);
    this.vel = { x: (p.x - this.pos.x) / dt, y: (p.y - this.pos.y) / dt, z: (p.z - this.pos.z) / dt };
    if (hitsNet(px, p.x, p.y, p.z)) {
      // vira física: a bola morre na rede e cai
      this.pos = { x: (px < 0 ? -1 : 1) * BALL_R, y: p.y, z: p.z };
      this.vel.x *= -0.2; this.vel.z *= 0.5; this.vel.y = Math.min(this.vel.y, 0) * 0.3;
      return 'net';
    }
    this.pos = p;
    if (tau >= 1 || p.y <= BALL_R) return 'land';
    return null;
  }

  kill() { this.live = false; }

  step(dt) {
    if (this.held) return null;
    this.t += dt;
    if (!this.live) {
      // bola morta quicando na areia (só visual)
      this.vel.y -= gravity() * dt;
      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;
      this.pos.z += this.vel.z * dt;
      if (this.pos.y < BALL_R) {
        this.pos.y = BALL_R;
        this.vel.y = Math.abs(this.vel.y) > 0.6 ? -this.vel.y * 0.35 : 0;
        this.vel.x *= 0.5;
        this.vel.z *= 0.5;
      }
      this.rot += this.spin * dt * 0.2;
      return null;
    }
    const r = this.script ? this.stepScript(dt) : stepBody(this, dt);
    this.rot += this.spin * dt;
    if (r === 'net') {
      this.netHit = true;
      this.recalc();
      return 'net';
    }
    if (r === 'land') {
      this.script = null;
      this.pos.y = BALL_R;
      this.live = false;
      this.vel.y = Math.abs(this.vel.y) * 0.3;
      this.vel.x *= 0.4;
      this.vel.z *= 0.4;
      return 'land';
    }
    return null;
  }

  // Primeiro ponto futuro da trajetória em que a bola desce abaixo de h no lado indicado.
  contactPoint(h, side) {
    for (const s of this.path) {
      if (s.t < this.t) continue;
      if (s.vy < 0 && s.y <= h && s.x * side > 0.2) return s;
    }
    return null;
  }

  landing() {
    return this.path.length ? this.path[this.path.length - 1] : null;
  }
}
