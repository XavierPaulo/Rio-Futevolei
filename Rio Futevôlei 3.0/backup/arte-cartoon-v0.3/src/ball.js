import { G, BALL_R, COURT } from './config.js';

// Integra um corpo {pos, vel, curve, g}. Retorna 'net', 'land' ou null.
// "curve" é uma aceleração horizontal constante (efeito da bola).
// "g" escala a gravidade: com velocidade ×s e g = s², a bola faz o MESMO arco,
// só que mais rápido — é assim que o atributo Força age.
export function stepBody(b, dt) {
  const px = b.pos.x;
  b.vel.x += b.curve.x * dt;
  b.vel.z += b.curve.z * dt;
  b.vel.y -= G * (b.g || 1) * dt;
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

  recalc() {
    this.path = simulate(this.pos, this.vel, this.curve, this.g || 1);
    this.t = 0;
  }

  kill() { this.live = false; }

  step(dt) {
    if (this.held) return null;
    this.t += dt;
    if (!this.live) {
      // bola morta quicando na areia (só visual)
      this.vel.y -= G * dt;
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
    const r = stepBody(this, dt);
    this.rot += this.spin * dt;
    if (r === 'net') {
      this.netHit = true;
      this.recalc();
      return 'net';
    }
    if (r === 'land') {
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
