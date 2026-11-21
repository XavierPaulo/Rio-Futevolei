import { COURT, P, CPU, SPECIAL, POINTS_TO_WIN, SIDE_SWAP_EVERY } from './config.js';
import { Ball } from './ball.js';
import { Player } from './player.js';
import { MOVES, pickMove, tune } from './moves.js';
import { gradeHit, GRADE_METER } from './grade.js';
import { formationSpot, steer, nearest, cpuPlan, cpuUpdate } from './ai.js';

const rand = (a, b) => a + Math.random() * (b - a);
const IDLE = { x: 0, z: 0, pressed: () => false, released: () => false, down: () => false };

// Regras, fluxo da partida e troca de controle.
// Modos:
//   solo   — jogador 1 controla a dupla 0 (um atleta por vez, troca automática) contra a CPU
//   versus — jogador 1 controla a dupla 0 e jogador 2 a dupla 1 (cada um trocando entre seus atletas)
//   coop   — jogador 1 e jogador 2 controlam, cada um, um atleta fixo da dupla 0 contra a CPU
//   demo   — CPU contra CPU (tela de título / testes)
export class Match {
  constructor(rosters, { mode = 'solo' } = {}) {
    this.mode = mode;
    this.demo = mode === 'demo';
    const human = i => (mode === 'versus') || ((mode === 'solo' || mode === 'coop') && i === 0);
    this.teams = [0, 1].map(i => ({
      id: i, side: i === 0 ? -1 : 1, score: 0, meter: 0, touches: 0,
      netIdx: 0, serverIdx: 0, human: human(i),
      pilot: mode === 'coop' && i === 0 ? 'fixed' : 'switch', // fixed = cada atleta tem seu jogador
      name: rosters[i].map(c => c.name).join(' & '),
    }));
    this.cpuTeams = [0, 1].filter(i => !this.teams[i].human);
    this.players = [];
    rosters.forEach((r, ti) => r.forEach((c, pi) => this.players.push(new Player(c, ti, pi, this.teams[ti].side))));
    this.ball = new Ball();
    this.state = 'intro';
    this.timer = 0;
    this.events = [];
    this.timeScale = 1;
    this.slowT = 0;
    this.control = [0, 0]; // atleta controlado em cada dupla "switch"
    this.servingTeam = 0;
    this.server = null;
    this.pendingServe = null;
    this.lastToucher = null;
    this.lastTeam = null;
    this.cpu = { plans: [null, null] };
    this.winner = null;
  }

  teamPlayers(t) { return this.players.filter(p => p.team === t); }
  partnerOf(pl) { return this.players.find(p => p.team === pl.team && p !== pl); }
  controlledOf(ti) { return this.teamPlayers(ti)[this.control[ti]]; }

  // Qual jogador (1 ou 2) pilota este atleta agora; null = IA.
  pilotOf(pl) {
    const t = this.teams[pl.team];
    if (!t.human) return null;
    if (t.pilot === 'fixed') return pl.idx + 1;
    if (this.controlledOf(pl.team) !== pl) return null;
    return this.mode === 'versus' ? pl.team + 1 : 1;
  }
  // Jogadores pilotados agora, com o número do jogador.
  piloted() {
    return this.players.map(pl => ({ pl, n: this.pilotOf(pl) })).filter(x => x.n);
  }
  // Números dos jogadores de uma dupla (para a formação e o botão R).
  teamPilots(ti) {
    const t = this.teams[ti];
    if (!t.human) return [];
    if (t.pilot === 'fixed') return [1, 2];
    return [this.mode === 'versus' ? ti + 1 : 1];
  }
  teamBySide(s) { return this.teams[0].side === s ? 0 : 1; }
  touchNoFor(pl) { return this.lastTeam === pl.team ? this.teams[pl.team].touches + 1 : 1; }
  emit(type, data = {}) { this.events.push({ type, ...data }); }

  begin() { this.resetRally(0); }

  resetRally(st) {
    this.servingTeam = st;
    this.state = 'serve';
    this.timer = 0;
    this.pendingServe = null;
    this.lastToucher = null;
    this.lastTeam = null;
    this.teams.forEach(t => { t.touches = 0; });
    const team = this.teams[st];
    this.server = this.teamPlayers(st)[team.serverIdx];
    for (const pl of this.players) {
      if (pl === this.server) continue;
      const s = formationSpot(this, pl);
      pl.reset(s.x, s.z);
    }
    this.server.reset(team.side * 9.7, this.server.idx === 0 ? -1.2 : 1.2);
    if (team.human && team.pilot === 'switch') this.control[st] = this.server.idx;
    this.ball.hold(this.serveBallPos());
    this.cpu.plans = [null, null];
    this.emit('serve', { team: st });
  }

  serveBallPos() {
    const s = this.server;
    return { x: s.x - s.side * 0.55, y: 0.3, z: s.z + 0.1 };
  }

  aimFrom(dir, pl) {
    const dz = v => (Math.abs(v) < 0.3 ? 0 : v);
    return { f: dz(dir.x * -pl.side), l: dz(dir.z) };
  }

  ctxFor(pl, aim, touchNo) {
    const b = this.ball;
    return {
      p: { ...b.pos }, s: pl.side, partner: this.partnerOf(pl), aim: aim || { f: 0, l: 0 },
      inSpeed: Math.hypot(b.vel.x, b.vel.y, b.vel.z), err: this.teams[pl.team].human ? 0 : CPU.aimErr,
      touchNo, player: pl,
    };
  }

  // ports = { 1: porta do jogador 1, 2: porta do jogador 2 }
  step(dt, ports) {
    this.ports = ports || {};
    if (this.slowT > 0) {
      this.slowT -= dt / Math.max(this.timeScale, 0.05);
      if (this.slowT <= 0) this.timeScale = 1;
    }
    if (this.state === 'serve') this.stepServe(dt);
    else if (this.state === 'rally') this.stepRally(dt);
    else if (this.state === 'point' || this.state === 'over') this.stepPoint(dt);
  }

  portOf(n) { return this.ports[n] || IDLE; }

  // R troca a formação da dupla (qualquer jogador da dupla pode apertar).
  checkFormationKeys() {
    for (const t of this.teams) {
      if (this.teamPilots(t.id).some(n => this.portOf(n).pressed('R'))) this.toggleFormation(t.id);
    }
  }

  // ---------------- saque ----------------
  stepServe(dt) {
    const sv = this.server;
    this.timer += dt;
    for (const pl of this.players) {
      if (pl !== sv) pl.update(dt, steer(pl, formationSpot(this, pl)));
    }
    this.checkFormationKeys();

    if (this.pendingServe) {
      sv.update(dt, null);
      this.pendingServe.t -= dt;
      if (this.pendingServe.t <= 0) this.launchServe();
      else this.ball.hold(this.serveBallPos());
      return;
    }

    const n = this.pilotOf(sv);
    if (n) {
      const input = this.portOf(n);
      sv.update(dt, { x: 0, z: sv.hold ? 0 : input.z, mul: 0.6 });
      sv.x = sv.side * 9.7;
      sv.z = Math.max(-4.2, Math.min(4.2, sv.z));
      if (!sv.hold) {
        if (input.pressed('A')) sv.hold = 'A';
        else if (input.pressed('B')) sv.hold = 'B';
      }
      if (sv.hold && (input.released(sv.hold) || !input.down(sv.hold))) {
        this.startServe(sv, sv.hold, this.aimFrom({ x: input.x, z: input.z }, sv));
        sv.hold = null;
      }
      this.setHoldTelegraph(sv);
    } else {
      sv.update(dt, null);
      sv.telegraph = this.timer > 0.8 ? 'kick' : null;
      if (this.timer > 1.3) this.startServe(sv, Math.random() < 0.5 ? 'A' : 'B', { f: rand(-0.5, 0.8), l: rand(-1, 1) });
    }
    this.ball.hold(this.serveBallPos());
  }

  startServe(sv, btn, aim) {
    sv.startSwing('serve', btn, aim, 'kick', false);
    sv.telegraph = null;
    this.pendingServe = { sv, mv: btn === 'A' ? MOVES.saqueForte : MOVES.saqueColocado, aim, t: 0.13 };
  }

  launchServe() {
    const { sv, mv, aim } = this.pendingServe;
    this.pendingServe = null;
    tune.error = sv.mods.error;
    const res = mv.exec(this.ctxFor(sv, aim, 1));
    tune.error = 1;
    this.ball.launch(this.ball.pos, res.v, res.curve, { speed: sv.mods.speed });
    this.lastToucher = sv;
    this.lastTeam = sv.team;
    this.teams[sv.team].touches = 3; // quem saca não pode tocar de novo
    this.state = 'rally';
    this.emit('hit', { player: sv, move: mv, speed: Math.hypot(res.v.x, res.v.y, res.v.z) });
    this.emit('callout', { text: mv.name, small: true, team: sv.team });
    this.onPathChange();
  }

  toggleFormation(ti) {
    this.teams[ti].netIdx ^= 1;
    this.emit('formation', { team: ti });
  }

  // ---------------- rali ----------------
  stepRally(dt) {
    this.checkFormationKeys();
    for (const t of this.teams) {
      if (!t.human) continue;
      for (const pl of this.teamPlayers(t.id)) {
        const n = this.pilotOf(pl);
        if (n) this.humanInput(pl, this.portOf(n), dt);
        else pl.update(dt, pl.canAct() ? steer(pl, formationSpot(this, pl)) : null);
      }
    }
    for (const ti of this.cpuTeams) cpuUpdate(this, dt, ti);

    const ev = this.ball.step(dt);
    if (ev === 'net') { this.emit('net'); this.onPathChange(); }
    if (ev === 'land') { this.onLand(); return; }

    for (const pl of this.players) {
      if (this.state !== 'rally') break;
      if (this.tryContact(pl)) break;
    }
    if (this.state === 'rally') this.autoPartnerDomain();
    this.updateFacing();
  }

  // Ataque muito rápido em cima do parceiro sem controle: se a bola entra na hitbox
  // dele, ele domina sozinho (peito ou pé, conforme a altura) com 80% de chance.
  autoPartnerDomain() {
    const b = this.ball;
    if (!b.live || b.held) return;
    if (Math.hypot(b.vel.x, b.vel.y, b.vel.z) < P.autoDomSpeed) return;
    for (const t of this.teams) {
      if (!t.human || t.pilot !== 'switch' || this.lastTeam === t.id) continue;
      const pl = this.teamPlayers(t.id).find(p => p !== this.controlledOf(t.id));
      if (!pl || pl.state !== 'ground' || pl.swing) continue;
      for (const id of ['peito', 'pe']) {
        const mv = MOVES[id];
        if (!this.inZone(pl, mv)) continue;
        if (b.autoRoll === undefined) b.autoRoll = Math.random() < P.autoDomChance;
        if (!b.autoRoll) return;
        pl.startSwing('hit', mv.btn, { f: 0, l: 0 }, mv.anim, false);
        if (this.tryContact(pl)) this.emit('auto', { player: pl });
        return;
      }
    }
  }

  // Quem vai dominar ou levantar vira de frente para a bola desde antes do toque
  // (ex.: o jogador da rede se vira para receber o passe que vem do fundo).
  // No 3º toque (ataque) e sem bola vindo, todos olham para a rede.
  updateFacing() {
    for (const t of this.teams) {
      const tps = this.teamPlayers(t.id);
      const plan = this.cpu.plans[t.id];
      const incoming = this.ball.live && this.ball.contactPoint(1.2, t.side);
      let receiver = plan && plan.receiver;
      if (t.human) {
        if (t.pilot === 'switch') receiver = this.controlledOf(t.id);
        else if (incoming) receiver = this.lastTeam === t.id && this.lastToucher ? this.partnerOf(this.lastToucher) : nearest(tps, incoming);
      }
      for (const pl of tps) {
        if (pl.state === 'dive' || pl.state === 'down' || pl.swing) continue; // não gira no meio do golpe
        let face = -pl.side;
        if (pl === receiver && incoming && this.touchNoFor(pl) < 3) {
          const dx = this.ball.pos.x - pl.x;
          if (Math.abs(dx) > 0.35) face = Math.sign(dx);
          else face = pl.facing; // bola por cima: mantém para não ficar girando
        }
        pl.facing = face;
      }
    }
  }

  humanInput(pl, input, dt) {
    const dir = { x: input.x, z: input.z };
    const mag = Math.hypot(dir.x, dir.z);
    if (pl.canAct()) {
      if (!pl.hold && !pl.swing) {
        if (input.pressed('A')) pl.hold = 'A';
        else if (input.pressed('B')) pl.hold = 'B';
      }
      if (pl.hold && (input.released(pl.hold) || !input.down(pl.hold))) {
        this.startHit(pl, pl.hold, this.aimFrom(dir, pl));
        pl.hold = null;
      }
      // △ / U: carrinho na direção do direcional (sem direção: em direção à bola)
      if (input.pressed('D') && pl.state === 'ground' && !pl.swing) {
        let d = dir;
        if (mag < 0.35) {
          const c = this.ball.live ? this.ball.contactPoint(1.0, pl.side) : null;
          d = c ? { x: c.x - pl.x, z: c.z - pl.z } : { x: pl.facing, z: 0 };
        }
        pl.dive(d);
        this.emit('dive', { player: pl });
      }
      if (input.pressed('C')) {
        if (pl.state === 'ground' && !pl.hold && !pl.swing) {
          pl.jump();
        } else if (pl.state === 'air' && pl.meter >= SPECIAL.max && !(pl.swing && pl.swing.kind === 'special')) {
          this.startSpecial(pl, this.aimFrom(dir, pl));
        }
      }
    }
    const mul = pl.hold ? P.holdMul : (pl.swing && pl.state === 'ground' ? 0.25 : 1);
    pl.update(dt, { x: dir.x, z: dir.z, mul });
    this.setHoldTelegraph(pl);
  }

  // Enquanto segura A/B o atleta assume a postura do golpe que vai sair.
  setHoldTelegraph(pl) {
    if (!pl.hold) { pl.telegraph = null; return; }
    if (this.state === 'serve') { pl.telegraph = 'kick'; return; }
    const mv = MOVES[pickMove(pl.hold, pl.state === 'air', Math.min(this.touchNoFor(pl), 3))];
    pl.telegraph = mv.anim;
  }

  startSpecial(pl, aim) {
    const mv = MOVES[pl.char.special];
    pl.hold = null;
    pl.startSwing('special', null, aim, mv.anim, true);
    if (mv.lunge) pl.vx += pl.facing * mv.lunge; // Escorpião: pula para a frente
    this.emit('charge', { player: pl });
  }

  startHit(pl, btn, aim) {
    const air = pl.state === 'air';
    const mv = MOVES[pickMove(btn, air, Math.min(this.touchNoFor(pl), 3))];
    pl.startSwing('hit', btn, aim, mv.anim, air);
  }

  moveFor(pl) {
    const sw = pl.swing;
    if (sw.kind === 'special') return MOVES[pl.char.special];
    if (sw.kind === 'dive') return MOVES.carrinho;
    return MOVES[pickMove(sw.btn, sw.air, Math.min(this.touchNoFor(pl), 3))];
  }

  // A bola está ao alcance deste golpe?
  inZone(pl, mv) {
    const b = this.ball.pos;
    if (!this.ball.live) return false;
    if (b.x * pl.side < -0.7) return false;
    if (this.lastToucher === pl) return false; // mesmo atleta não toca duas vezes seguidas
    // A hitbox maior é só do jogador humano; a CPU usa o alcance "real".
    const human = this.teams[pl.team].human;
    const reach = (mv.reach || P.cpuReach) + (human ? P.reach - P.cpuReach : 0);
    const pad = human ? P.bandPad : 0;
    const rc = pl.reachCenter();
    const dx = b.x - rc.x;
    const dz = (b.z - rc.z) * 0.8;
    if (Math.hypot(dx, dz) > reach) return false;
    const h = b.y - pl.y;
    return h >= mv.band[0] - pad && h <= mv.band[1] + pad;
  }

  tryContact(pl) {
    const sw = pl.swing;
    if (!sw || sw.hit || sw.kind === 'serve') return false;
    const win = sw.kind === 'dive' ? P.diveTime : sw.kind === 'special' ? 0.36 : P.swingWindow;
    if (sw.t > win) return false;
    const mv = this.moveFor(pl);
    if (!this.inZone(pl, mv)) return false;
    sw.hit = true;
    sw.anim = mv.anim;
    const touchNo = this.touchNoFor(pl);
    if (touchNo > 3) { this.fault(pl.team, '4 TOQUES!'); return true; }
    this.performHit(pl, mv, sw.aim, touchNo);
    return true;
  }

  performHit(pl, mv, aim, touchNo) {
    const team = this.teams[pl.team];
    const b = this.ball;
    // o que chegou: base da nota da ação
    const incoming = { speed: Math.hypot(b.vel.x, b.vel.y, b.vel.z), h: b.pos.y - pl.y, net: Math.abs(pl.x), ballY: b.pos.y, touchNo };
    // Ótimo anterior: este toque sai com Força e Precisão potencializadas
    const boosted = pl.boostT > 0;
    pl.boostT = 0;
    tune.error = pl.mods.error * (boosted ? 0.7 : 1);
    const res = mv.exec(this.ctxFor(pl, aim, touchNo));
    tune.error = 1;
    const speed = pl.mods.speed * (boosted ? 1.15 : 1);
    // CPU às vezes pega mal na bola: sai torta, curta, longa ou na rede.
    if (this.cpuTeams.includes(pl.team) && Math.random() < CPU.shank) {
      // mais comum sair longa ou pela lateral do que ir na rede
      res.v.x *= rand(0.95, 1.4);
      res.v.y *= rand(0.88, 1.2);
      res.v.z += (Math.random() < 0.5 ? -1 : 1) * rand(1.2, 3.2);
      this.emit('shank', { player: pl });
    }
    this.ball.launch(this.ball.pos, res.v, res.curve, {
      deceptive: !!res.deceptive, special: !!mv.special, color: mv.special ? pl.char.color : null, speed,
    });
    if (this.lastTeam === pl.team) team.touches++;
    else team.touches = 1;
    this.lastTeam = pl.team;
    this.lastToucher = pl;
    const grade = gradeHit(mv, incoming);
    if (mv.special) {
      pl.meter = 0;
      this.timeScale = 0.3;
      this.slowT = 0.55;
      this.emit('special', { player: pl, move: mv });
    } else {
      pl.meter = Math.min(SPECIAL.max, pl.meter + SPECIAL.perTouch * pl.mods.meter * GRADE_METER[grade]);
      this.emit('callout', { text: mv.name, small: true, team: pl.team });
    }
    if (mv.fall) pl.fallAfter = mv.fall;
    this.applyGrade(pl, grade);
    this.emit('hit', { player: pl, move: mv, speed: Math.hypot(this.ball.vel.x, this.ball.vel.y, this.ball.vel.z) });
    this.onPathChange();
  }

  // Efeito da nota da ação (o Pique define o quanto pesa).
  applyGrade(pl, grade) {
    const sev = pl.mods.severity;
    if (grade === 'pior') pl.knockDown(1.0 * sev);
    else if (grade === 'ruim') pl.pushBack(1.0 * sev);
    else if (grade === 'otimo') pl.boostT = 5 * (2 - sev);
    this.emit('grade', { player: pl, grade });
  }

  // Troca de controle: quando a bola vem para o nosso lado, o jogador controla
  // quem vai receber; depois de um toque nosso, o controle passa para o parceiro.
  onPathChange() {
    for (const t of this.teams) {
      if (!t.human || t.pilot !== 'switch') continue;
      const c = this.ball.contactPoint(1.1, t.side);
      if (!c) continue;
      const tps = this.teamPlayers(t.id);
      const prev = this.control[t.id];
      if (this.lastToucher && this.lastToucher.team === t.id) this.control[t.id] = this.partnerOf(this.lastToucher).idx;
      else this.control[t.id] = nearest(tps, c).idx;
      if (prev !== this.control[t.id]) {
        tps[prev].hold = null;
        tps[prev].telegraph = null;
        this.emit('switch', { player: tps[this.control[t.id]] });
      }
    }
    for (const ti of this.cpuTeams) cpuPlan(this, ti);
  }

  onLand() {
    const b = this.ball.pos;
    const inside = Math.abs(b.x) <= COURT.halfLen + 0.05 && Math.abs(b.z) <= COURT.halfWid + 0.05;
    let loser, reason;
    if (inside) {
      loser = this.teamBySide(b.x < 0 ? -1 : 1);
      reason = this.ball.netHit && loser === this.lastTeam ? 'NA REDE!' : 'PONTO!';
    } else {
      loser = this.lastTeam ?? this.servingTeam;
      reason = 'FORA!';
    }
    this.emit('land', { x: b.x, z: b.z, inside });
    this.awardPoint(1 - loser, reason);
  }

  fault(team, reason) { this.awardPoint(1 - team, reason); }

  awardPoint(w, reason) {
    const t = this.teams[w];
    t.score++;
    for (const p of this.teamPlayers(w)) p.meter = Math.min(SPECIAL.max, p.meter + SPECIAL.perPoint * p.mods.meter);
    if (this.servingTeam !== w) t.serverIdx ^= 1; // rodízio de saque ao recuperar o saque
    this.nextServe = w;
    this.state = 'point';
    this.timer = 0;
    this.ball.kill();
    this.cpu.plans = [null, null];
    this.players.forEach(p => { p.hold = null; p.telegraph = null; p.mood = p.team === w ? 'happy' : 'sad'; });
    this.emit('point', { winner: w, reason });
    const a = this.teams[0].score, b = this.teams[1].score;
    if ((a >= POINTS_TO_WIN || b >= POINTS_TO_WIN) && Math.abs(a - b) >= 2) {
      this.state = 'over';
      this.winner = w;
      this.emit('over', { winner: w });
      return;
    }
    // Regra oficial: a cada 6 pontos disputados (somando as duas duplas), troca de lado.
    this.pendingSwap = (a + b) % SIDE_SWAP_EVERY === 0;
  }

  stepPoint(dt) {
    this.timer += dt;
    this.ball.step(dt);
    for (const pl of this.players) pl.update(dt, null);
    if (this.state !== 'point') return;
    if (this.pendingSwap && this.timer > 1.6) {
      this.pendingSwap = false;
      this.swapping = true;
      this.emit('swap');
    }
    if (this.timer > (this.swapping ? 3.4 : 2.0)) {
      this.players.forEach(p => { p.mood = null; });
      if (this.swapping) { this.swapping = false; this.swapSides(); }
      this.resetRally(this.nextServe);
    }
  }

  swapSides() {
    for (const t of this.teams) t.side *= -1;
    for (const p of this.players) { p.side *= -1; p.facing = -p.side; }
  }
}
