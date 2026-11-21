import { G, P } from './config.js';
import { statMods } from './art/characters.js';
import { landFreeze } from './v5.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Player {
  constructor(char, team, idx, side) {
    this.char = char;
    this.team = team;
    this.idx = idx;
    this.side = side;
    this.mods = statMods(char.stats); // efeitos dos atributos
    this.meter = 0;                  // barra de especial individual
    this.facing = -side; // sempre de frente para a rede
    this.reset(side * 5, 0);
  }

  reset(x, z) {
    this.x = x; this.z = z; this.y = 0;
    this.facing = -this.side;
    this.vx = 0; this.vz = 0; this.vy = 0;
    this.state = 'ground'; // ground | air | dive | down
    this.timer = 0;
    this.hold = null;
    this.holdT = 0;
    this.telegraph = null; // animação de preparação do próximo golpe
    this.swing = null;
    this.fallAfter = 0;
    this.downKind = 'front';
    this.mood = null;
    this.runPhase = 0;
    this.speed = 0;
    this.pushT = 0;        // nota "Ruim": empurrado para trás
    this.boostT = 0;       // nota "Ótimo": próximo toque potencializado
    this.setBonus = null;  // 5.0: levantada perfeita (defesa especial do parceiro) — vale no próximo toque
    this.landT = 0;        // 5.0: parado depois de aterrissar de um pulo (pela agilidade)
  }

  canAct() { return (this.state === 'ground' || this.state === 'air') && this.pushT <= 0 && !(this.landT > 0); }

  jump() {
    if (this.state !== 'ground' || this.landT > 0) return;
    this.state = 'air';
    this.vy = P.jumpV;
  }

  // Carrinho: desliza com os pés na frente e termina deitado de costas.
  dive(dir) {
    const m = Math.hypot(dir.x, dir.z) || 1;
    this.state = 'dive';
    this.timer = P.diveTime;
    this.vx = dir.x / m * P.diveSpeed;
    this.vz = dir.z / m * P.diveSpeed;
    this.hold = null;
    this.telegraph = null;
    this.downKind = 'back';
    if (Math.abs(dir.x / m) > 0.3) this.facing = Math.sign(dir.x); // pés apontam para onde desliza
    this.swing = { kind: 'dive', anim: 'slide', t: 0, hit: false, air: false, aim: { f: 0, l: 0 } };
  }

  // Cai na areia agora (nota "Pior") ou ao aterrissar, se estiver no ar.
  knockDown(time) {
    if (this.state === 'air') { this.fallAfter = Math.max(this.fallAfter, time); return; }
    this.state = 'down';
    this.downKind = 'back';
    this.timer = time;
    this.hold = null;
    this.telegraph = null;
  }

  // Empurrado para trás (nota "Ruim").
  pushBack(dist) {
    const T = 0.28;
    this.pushT = T;
    this.pushV = -this.facing * dist / T;
    this.hold = null;
    this.telegraph = null;
  }

  // Direção para onde os pés alcançam a bola (à frente do corpo, ou à frente do carrinho).
  reachCenter() {
    if (this.state === 'dive') {
      const s = Math.hypot(this.vx, this.vz) || 1;
      return { x: this.x + this.vx / s * 0.55, z: this.z + this.vz / s * 0.55 };
    }
    return { x: this.x + this.facing * 0.15, z: this.z };
  }

  startSwing(kind, btn, aim, anim, air) {
    this.swing = { kind, btn, aim, anim, air, t: 0, hit: false };
  }

  // want = { x, z, mul, speed } direção desejada (ou null para parar)
  update(dt, want) {
    const md = this.mods;
    this.holdT = this.hold || this.telegraph ? this.holdT + dt : 0;
    if (this.boostT > 0) this.boostT -= dt;
    if (this.swing) {
      this.swing.t += dt;
      // Agilidade: quanto maior, mais cedo o atleta fica livre depois da ação
      // shark e bicicleta mantêm a pose até a queda na areia (não voltam à pose de pulo no ar)
      const holdInAir = this.state === 'air' && (this.swing.anim === 'shark' || this.swing.anim === 'bicicleta');
      if (this.swing.kind !== 'dive' && this.swing.t > P.swingTotal * md.recover && !holdInAir) this.swing = null;
    }
    if (this.pushT > 0) {
      this.pushT -= dt;
      this.x += this.pushV * dt;
      want = null;
    }
    switch (this.state) {
      case 'dive':
        this.x += this.vx * dt;
        this.z += this.vz * dt;
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'down';
          this.timer = P.diveRecover * md.recover;
          this.vx = this.vz = 0;
          this.swing = null;
        }
        break;
      case 'down':
        this.timer -= dt;
        if (this.timer <= 0) this.state = 'ground';
        break;
      case 'air': {
        this.vy -= G * dt;
        this.y += this.vy * dt;
        if (want) {
          const s = (want.speed || P.speed) * md.move * (want.mul ?? 1);
          this.vx += clamp(want.x * s - this.vx, -8 * dt, 8 * dt);
          this.vz += clamp(want.z * s - this.vz, -8 * dt, 8 * dt);
        }
        this.x += this.vx * dt;
        this.z += this.vz * dt;
        if (this.y <= 0) {
          this.y = 0;
          this.vy = 0;
          if (this.fallAfter > 0) {
            this.state = 'down';
            this.timer = this.fallAfter * md.recover;
            this.fallAfter = 0;
            this.downKind = 'back';
            this.swing = null;
            this.vx *= 0.3; this.vz *= 0.3;
          } else {
            this.state = 'ground';
            // 5.0: tocou o chão — fica parado um tempo, menor quanto maior a agilidade
            this.landT = landFreeze((this.stats || this.char.stats || {}).agilidade);
            this.vx = 0; this.vz = 0;
          }
        }
        break;
      }
      default: {
        if (this.landT > 0) { this.landT -= dt; want = null; this.vx = 0; this.vz = 0; this.hold = null; }
        const s = want ? (want.speed || P.speed) * md.move * (want.mul ?? 1) : 0;
        const tx = want ? want.x * s : 0, tz = want ? want.z * s : 0;
        const a = P.accel * dt;
        this.vx += clamp(tx - this.vx, -a, a);
        this.vz += clamp(tz - this.vz, -a, a);
        this.x += this.vx * dt;
        this.z += this.vz * dt;
      }
    }
    if (this.state === 'down') { this.vx *= 0.9; this.vz *= 0.9; }
    // ninguém encosta na rede (nem correndo, nem no carrinho, nem no avanço do Escorpião)
    if (this.x * this.side < P.netGap) { this.x = this.side * P.netGap; this.vx = 0; }
    this.x = clamp(this.x, -12.5, 12.5);
    this.z = clamp(this.z, -6.5, 6.5);
    this.speed = Math.hypot(this.vx, this.vz);
    if (this.state === 'ground') this.runPhase += this.speed * dt * 2.1;
  }
}
