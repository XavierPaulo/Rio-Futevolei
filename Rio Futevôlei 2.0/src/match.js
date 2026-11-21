import { COURT, P, CPU, SPECIAL, POINTS_TO_WIN, SIDE_SWAP_EVERY } from './config.js';
import { Ball } from './ball.js';
import { Player } from './player.js';
import { MOVES, pickMove, tune, MISS_DEFAULT } from './moves.js';
import { gradeHit, GRADE_METER } from './grade.js';
import { cpuParams, DEFAULT_LEVEL } from './difficulty.js';
import { formationSpot, steer, nearest, cpuPlan, cpuUpdate } from './ai.js';
import { KIDS, KIDS_KEYS, kidsZone, kidsTarget, kidsMoveKey, smoothstep } from './kids.js';
import HITBOX from './data/hitbox.js';

const rand = (a, b) => a + Math.random() * (b - a);
const IDLE = { x: 0, z: 0, pressed: () => false, released: () => false, down: () => false };

// Nível padrão da CPU que joga ao lado de um humano (parceiro de time), quando não escolhido.
export const TEAMMATE_LEVEL = 8;

// Regras, fluxo da partida e troca de controle.
// Times de 1, 2 ou 3 atletas (o tamanho vem das listas de atletas). Modos:
//   solo   — jogador 1 no time 0 contra a CPU
//   versus — jogador 1 no time 0 e jogador 2 no time 1
//   coop   — jogadores 1 e 2 no time 0, cada um com um atleta fixo (no 3x3, o 3º fica com a CPU)
//   demo   — CPU contra CPU (tela de título / testes)
// control: { 1: 'team' | 'own', 2: ... } — o que cada jogador controla no solo e no versus:
//   'team' = o time inteiro, um atleta por vez (troca automática para quem vai receber)
//   'own'  = só o 1º atleta escolhido; os outros do time são da CPU
// kids: Kids Mode (src/kids.js) — △ ✕ □ ○ escolhem a metade da quadra (cima, baixo, direita,
//   esquerda da tela); sem pulo, especiais e carrinho; alcance maior e deslize até a bola.
//   Vale em qualquer modo (solo, versus, coop)
// Cada time tem pilot = 'switch' (um jogador trocando entre os atletas) ou 'fixed' (fixed:
// { índice do atleta: número do jogador }; os atletas sem jogador são da CPU).
export class Match {
  // level: nível padrão da CPU adversária (1–12), ver src/difficulty.js
  // levels: nível de cada atleta da CPU, escolhido na seleção: { 0: [nível por atleta], 1: [...] }
  //   (atleta sem nível: adversário = level, parceiro de humano = TEAMMATE_LEVEL)
  // params: parâmetros da CPU prontos para todos (usado na calibração da dificuldade)
  constructor(rosters, { mode = 'solo', level = DEFAULT_LEVEL, params = null, control = {}, levels = {}, kids = false } = {}) {
    this.mode = mode;
    this.kids = !!kids && mode !== 'demo';
    // direção da tela → direção no chão (o jogo liga à câmera); usada no Kids Mode
    this.screenToWorld = (x, z) => ({ x, z });
    this.kidsGlide = null; // Kids Mode: atleta deslizando até a bola antes do toque
    this.cpuParams = params || cpuParams(level);
    this.demo = mode === 'demo';
    this.size = rosters[0].length;
    const pilotFor = i => {
      const n = mode === 'versus' ? i + 1 : (mode === 'solo' || mode === 'coop') && i === 0 ? 1 : 0;
      if (!n) return { human: false, pilot: 'switch', fixed: {} };
      if (mode === 'coop') return { human: true, pilot: 'fixed', fixed: this.size === 1 ? { 0: 1 } : { 0: 1, 1: 2 } };
      if (control[n] === 'own' && this.size > 1) return { human: true, pilot: 'fixed', fixed: { 0: n } };
      return { human: true, pilot: 'switch', fixed: {}, pilots: [n] };
    };
    this.teams = [0, 1].map(i => ({
      id: i, side: i === 0 ? -1 : 1, score: 0, meter: 0, touches: 0,
      netIdx: 0, serverIdx: 0, ...pilotFor(i),
      name: rosters[i].length === 1 ? rosters[i][0].name
        : rosters[i].slice(0, -1).map(c => c.name).join(', ') + ' & ' + rosters[i][rosters[i].length - 1].name,
    }));
    this.players = [];
    rosters.forEach((r, ti) => r.forEach((c, pi) => this.players.push(new Player(c, ti, pi, this.teams[ti].side))));
    // ai = atleta jogado pela CPU (adversário ou parceiro de um humano no controle 'own'/coop)
    for (const pl of this.players) {
      const t = this.teams[pl.team];
      pl.ai = !t.human || (t.pilot === 'fixed' && !t.fixed[pl.idx]);
      if (!pl.ai) continue;
      // cada atleta da CPU joga no seu próprio nível
      const lv = (levels[pl.team] && levels[pl.team][pl.idx]) || (t.human ? TEAMMATE_LEVEL : level);
      pl.level = lv;
      pl.params = params || cpuParams(lv);
    }
    // times com algum atleta da CPU (a CPU planeja a jogada deles)
    this.cpuTeams = [0, 1].filter(i => this.teamPlayers(i).some(p => p.ai));
    this.touchedBy = []; // quem já tocou na posse atual (para o passe ir para quem ainda não tocou)
    this.passTo = null;  // para quem foi o último passe
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
  // Para quem este atleta passa a bola: no 1x1, para ele mesmo; na dupla, para o parceiro;
  // na trinca, para quem ainda não tocou nesta posse, de preferência o mais perto da rede.
  partnerOf(pl) {
    const mates = this.teamPlayers(pl.team).filter(p => p !== pl);
    if (!mates.length) return pl;
    if (mates.length === 1) return mates[0];
    const touched = this.lastTeam === pl.team ? this.touchedBy : [];
    let pool = mates.filter(p => !touched.includes(p));
    if (!pool.length) pool = mates;
    return pool.reduce((a, b) => (Math.abs(a.x) <= Math.abs(b.x) ? a : b));
  }
  // quem deve receber a bola depois do toque deste atleta (o passe escolhido no toque)
  receiverAfter(pl) { return this.passTo && this.passTo.team === pl.team ? this.passTo : this.partnerOf(pl); }
  controlledOf(ti) { return this.teamPlayers(ti)[this.control[ti]]; }
  // parâmetros (nível) do atleta da CPU; para um atleta humano, os padrões da CPU adversária
  paramsOf(pl) { return (pl && pl.params) || this.cpuParams; }

  // Qual jogador (1 ou 2) pilota este atleta agora; null = CPU (ou parceiro sem controle).
  pilotOf(pl) {
    const t = this.teams[pl.team];
    if (!t.human) return null;
    if (t.pilot === 'fixed') return t.fixed[pl.idx] || null;
    if (this.controlledOf(pl.team) !== pl) return null;
    return t.pilots[0];
  }
  // Jogadores pilotados agora, com o número do jogador.
  piloted() {
    return this.players.map(pl => ({ pl, n: this.pilotOf(pl) })).filter(x => x.n);
  }
  // Números dos jogadores de uma dupla (para a formação e o botão R).
  teamPilots(ti) {
    const t = this.teams[ti];
    if (!t.human) return [];
    if (t.pilot === 'fixed') return Object.values(t.fixed);
    return t.pilots;
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
    this.kidsGlide = null;
    this.lastToucher = null;
    this.lastTeam = null;
    this.touchedBy = [];
    this.passTo = null;
    this.teams.forEach(t => { t.touches = 0; });
    const team = this.teams[st];
    this.server = this.teamPlayers(st)[team.serverIdx % this.size];
    for (const pl of this.players) {
      if (pl === this.server) continue;
      const s = formationSpot(this, pl);
      pl.reset(s.x, s.z);
    }
    const serveZ = this.size === 1 ? 0 : [-1.2, 1.2, 0][this.server.idx];
    this.server.reset(team.side * 9.7, serveZ);
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
      inSpeed: Math.hypot(b.vel.x, b.vel.y, b.vel.z), err: pl.ai ? this.paramsOf(pl).aimErr : 0,
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
        // Kids Mode: os 4 botões sacam (cada um para uma metade do campo adversário)
        const key = (this.kids ? KIDS_KEYS : ['A', 'B']).find(k => input.pressed(k));
        if (key) sv.hold = key;
      }
      if (sv.hold && (input.released(sv.hold) || !input.down(sv.hold))) {
        sv.kidsKey = this.kids ? sv.hold : null;
        this.startServe(sv, this.kids ? kidsMoveKey(sv.hold) : sv.hold, this.aimFrom({ x: input.x, z: input.z }, sv));
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
    tune.miss = sv.mods.miss;
    const res = mv.exec(this.ctxFor(sv, aim, 1));
    tune.miss = MISS_DEFAULT;
    this.applyKids(res, sv, sv.kidsKey, true);
    sv.kidsKey = null;
    this.ball.launchPath(this.ball.pos, res.traj, { speed: sv.mods.speed });
    this.lastToucher = sv;
    this.lastTeam = sv.team;
    this.teams[sv.team].touches = 3; // quem saca não pode tocar de novo
    this.state = 'rally';
    this.emit('hit', { player: sv, move: mv, speed: Math.hypot(this.ball.vel.x, this.ball.vel.y, this.ball.vel.z) });
    this.emit('callout', { text: mv.name, small: true, team: sv.team });
    this.onPathChange();
  }

  // R: na dupla troca quem fica na rede; na trinca, passa a vez da rede para o próximo.
  toggleFormation(ti) {
    if (this.size < 2) return;
    this.teams[ti].netIdx = (this.teams[ti].netIdx + 1) % this.size;
    this.emit('formation', { team: ti });
  }

  // ---------------- rali ----------------
  stepRally(dt) {
    this.checkFormationKeys();
    // humanos (e parceiros sem controle no modo 'switch'); os atletas da CPU ficam com cpuUpdate
    for (const pl of this.players) {
      if (pl.ai) continue;
      const n = this.pilotOf(pl);
      if (n) this.humanInput(pl, this.portOf(n), dt);
      else pl.update(dt, pl.canAct() ? steer(pl, formationSpot(this, pl)) : null);
    }
    for (const ti of this.cpuTeams) cpuUpdate(this, dt, ti);

    // Kids Mode: atleta deslizando até a bola (a bola espera; o toque sai no fim do deslize)
    if (this.kidsGlide) { this.stepKidsGlide(dt); this.updateFacing(); return; }

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
      for (const pl of this.teamPlayers(t.id)) {
        if (pl === this.controlledOf(t.id) || pl.state !== 'ground' || pl.swing) continue;
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
        else if (incoming && !receiver) receiver = this.lastTeam === t.id && this.lastToucher ? this.receiverAfter(this.lastToucher) : nearest(tps, incoming);
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
    if (this.kids && pl.canAct()) {
      // Kids Mode: △ ✕ □ ○ batem (cada um para uma metade); sem pulo, carrinho ou especial
      if (!pl.hold && !pl.swing) {
        const key = KIDS_KEYS.find(k => input.pressed(k));
        if (key) pl.hold = key;
      }
      if (pl.hold && (input.released(pl.hold) || !input.down(pl.hold))) {
        this.startHit(pl, kidsMoveKey(pl.hold), { f: 0, l: 0 });
        pl.swing.kidsKey = pl.hold;
        pl.hold = null;
      }
    } else if (pl.canAct()) {
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
    // Do aperto do botão do golpe até o fim dele, o atleta não se locomove: o direcional
    // serve só para mirar. No chão ele para na hora; no ar segue o embalo do pulo, sem controle.
    const locked = pl.hold || (pl.swing && pl.swing.kind !== 'dive');
    if (locked && pl.state === 'ground') { pl.vx = 0; pl.vz = 0; }
    pl.update(dt, locked ? null : { x: dir.x, z: dir.z, mul: 1 });
    this.setHoldTelegraph(pl);
  }

  // Enquanto segura A/B o atleta assume a postura do golpe que vai sair.
  setHoldTelegraph(pl) {
    if (!pl.hold) { pl.telegraph = null; return; }
    if (this.state === 'serve') { pl.telegraph = 'kick'; return; }
    const key = this.kids ? kidsMoveKey(pl.hold) : pl.hold;
    const mv = MOVES[pickMove(key, pl.state === 'air', Math.min(this.touchNoFor(pl), 3))];
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

  // Alcance do toque: o jogador humano tem hitbox maior; a CPU usa o alcance do nível.
  // Golpes com alcance próprio (carrinho, especiais) somam a mesma diferença.
  // 2.0: o alcance do golpe (dados) é o do jogador humano; a CPU tem ele menos a diferença do nível dela
  reachFor(pl, mv) {
    const r = mv.reach || P.reach;
    if (pl.ai) return r - (P.reach - this.paramsOf(pl).reach);
    return this.kids ? r * KIDS.reach : r;
  }
  // Largura da hitbox para os lados: a mesma para todos os golpes (src/data/hitbox.js); a CPU
  // tem menos a diferença do nível dela, como no alcance
  sideReachFor(pl) {
    const s = HITBOX.side;
    if (pl.ai) return Math.max(0.2, s - (P.reach - this.paramsOf(pl).reach));
    return this.kids ? s * KIDS.reach : s;
  }
  // folga de altura da hitbox: só do jogador humano (maior no Kids Mode)
  bandPadFor(pl) { return pl.ai ? 0 : P.bandPad * (this.kids ? KIDS.bandPad : 1); }

  // ---------- Kids Mode ----------
  // metade da quadra que o botão (△ ✕ □ ○) escolhe para este atleta agora
  kidsZoneFor(pl, key, serving = false) {
    return kidsZone({ side: pl.side, key, touchNo: Math.min(this.touchNoFor(pl), 3), serving, toWorld: this.screenToWorld });
  }
  // troca o destino do golpe do jogador pela metade escolhida; toques sem botão (domínio
  // automático) seguem o golpe normal
  applyKids(res, pl, key, serving = false) {
    if (!this.kids || pl.ai || !KIDS_KEYS.includes(key)) return;
    const zone = this.kidsZoneFor(pl, key, serving);
    const t = kidsTarget(zone);
    let x = Math.max(-8.8, Math.min(8.8, t.x));
    // nunca em cima da rede: fica pelo menos a 0,6 m dela, no lado da metade escolhida
    if (Math.abs(x) < 0.6) x = 0.6 * Math.sign(zone.x);
    res.traj.to = { x, z: Math.max(-4.2, Math.min(4.2, t.z)) };
  }
  // Bola na hitbox, mas longe do atleta: ele desliza até ela (interpolação suave) e só então bate.
  // Enquanto isso a bola espera no lugar do contato.
  startKidsGlide(pl, mv, aim, touchNo) {
    const b = this.ball.pos, rc = pl.reachCenter();
    const dx = b.x - rc.x, dz = b.z - rc.z;
    const d = Math.hypot(dx, dz);
    if (d <= KIDS.near) return false;
    // vai até deixar a bola a KIDS.near do ponto de contato, sem passar para o outro lado da rede
    const k = (d - KIDS.near) / d;
    let x1 = pl.x + dx * k;
    if (x1 * pl.side < 0.3) x1 = pl.side * 0.3;
    const dur = Math.max(KIDS.glideMin, Math.min(KIDS.glideMax, (d - KIDS.near) / KIDS.glideSpeed));
    this.kidsGlide = { pl, mv, aim, touchNo, x0: pl.x, z0: pl.z, x1, z1: pl.z + dz * k, t: 0, dur, ball: { ...b } };
    return true;
  }
  stepKidsGlide(dt) {
    const g = this.kidsGlide;
    g.t += dt;
    const u = smoothstep(Math.min(1, g.t / g.dur));
    g.pl.x = g.x0 + (g.x1 - g.x0) * u;
    g.pl.z = g.z0 + (g.z1 - g.z0) * u;
    g.pl.vx = g.pl.vz = 0;
    this.ball.pos = { ...g.ball };
    if (g.t < g.dur) return;
    this.kidsGlide = null;
    this.performHit(g.pl, g.mv, g.aim, g.touchNo);
  }

  // A bola está ao alcance deste golpe?
  inZone(pl, mv) {
    const b = this.ball.pos;
    if (!this.ball.live) return false;
    if (b.x * pl.side < -0.7) return false;
    // Mesmo atleta não toca duas vezes seguidas. No 1x1 pode (até 3 toques), mas só depois
    // que a bola se afasta do pé (0,35 s), para não contar o mesmo golpe duas vezes.
    if (this.lastToucher === pl && (this.size > 1 || this.ball.t < 0.35)) return false;
    // A hitbox maior é só do jogador humano; a CPU usa o alcance "real".
    // elipse: alcance do golpe para frente/trás, largura universal para os lados
    const reach = this.reachFor(pl, mv), side = this.sideReachFor(pl);
    const pad = this.bandPadFor(pl);
    const rc = pl.reachCenter();
    const dx = (b.x - rc.x) / reach;
    const dz = (b.z - rc.z) / side;
    if (dx * dx + dz * dz > 1) return false;
    const h = b.y - pl.y;
    return h >= mv.band[0] - pad && h <= mv.band[1] + pad;
  }

  // Área de contato do golpe em andamento (para desenhar a hitbox); null se não está ativo.
  // (Fica visível durante toda a janela ativa, mesmo depois do contato: a CPU bate
  // no mesmo instante em que começa o golpe.)
  activeHitbox(pl) {
    const sw = pl.swing;
    if (!sw || sw.kind === 'serve') return null;
    const win = sw.kind === 'dive' ? P.diveTime : sw.kind === 'special' ? 0.36 : P.swingWindow;
    if (sw.t > win) return null;
    const mv = this.moveFor(pl);
    const reach = this.reachFor(pl, mv);
    const pad = this.bandPadFor(pl);
    return { reach, side: this.sideReachFor(pl), lo: mv.band[0] - pad, hi: mv.band[1] + pad, c: pl.reachCenter() };
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
    // Kids Mode: bola na hitbox mas longe: o atleta desliza até ela e bate no fim (stepKidsGlide)
    if (this.kids && !pl.ai && this.startKidsGlide(pl, mv, sw.aim, touchNo)) return true;
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
    tune.miss = pl.mods.miss * (boosted ? 0.7 : 1); // Ótimo anterior: 30% mais perto do centro
    const ctx = this.ctxFor(pl, aim, touchNo);
    const res = mv.exec(ctx);
    tune.miss = MISS_DEFAULT;
    if (pl.swing && pl.swing.kind === 'hit') this.applyKids(res, pl, pl.swing.kidsKey);
    // Força (e o bônus da nota Ótimo) encurta o tempo no ar: mesmo caminho, mais rápido
    const speed = pl.mods.speed * (boosted ? 1.15 : 1);
    // CPU às vezes pega mal na bola: sai torta, curta, longa ou na rede.
    if (pl.ai && Math.random() < this.paramsOf(pl).shank) {
      // mais comum sair longa ou pela lateral do que ir na rede
      const tr = res.traj;
      tr.to.x += -pl.side * rand(-0.3, 2.6);
      tr.to.z += (Math.random() < 0.5 ? -1 : 1) * rand(1.2, 3.2);
      tr.apex *= rand(0.85, 1.15);
      this.emit('shank', { player: pl });
    }
    this.ball.launchPath(this.ball.pos, res.traj, {
      deceptive: !!res.deceptive, special: !!mv.special, color: mv.special ? pl.char.color : null, speed,
    });
    if (this.lastTeam === pl.team) { team.touches++; this.touchedBy.push(pl); }
    else { team.touches = 1; this.touchedBy = [pl]; }
    this.lastTeam = pl.team;
    this.lastToucher = pl;
    this.passTo = ctx.partner; // quem deve receber (o alvo do passe deste toque)
    const grade = gradeHit(mv, incoming);
    if (mv.special) {
      pl.meter = 0;
      this.timeScale = 0.3;
      this.slowT = 0.55;
      this.emit('special', { player: pl, move: mv });
    } else {
      // Kids Mode: sem especiais, a barra não enche
      if (!this.kids) pl.meter = Math.min(SPECIAL.max, pl.meter + SPECIAL.perTouch * pl.mods.meter * GRADE_METER[grade]);
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
      if (this.lastToucher && this.lastToucher.team === t.id) this.control[t.id] = this.receiverAfter(this.lastToucher).idx;
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
    if (!this.kids) for (const p of this.teamPlayers(w)) p.meter = Math.min(SPECIAL.max, p.meter + SPECIAL.perPoint * p.mods.meter);
    if (this.servingTeam !== w) t.serverIdx = (t.serverIdx + 1) % this.size; // rodízio de saque ao recuperar o saque
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
