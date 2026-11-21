import { COURT, P, CPU, SPECIAL, POINTS_TO_WIN, SIDE_SWAP_EVERY, BALL_R } from './config.js';
import { Ball } from './ball.js';
import { Player } from './player.js';
import { MOVES, pickMove, tune, MISS_DEFAULT } from './moves.js';
import { gradeHit, GRADE_METER, GRADE_FLOW, timingMiss } from './grade.js';
import { cpuParams, DEFAULT_LEVEL } from './difficulty.js';
import { formationSpot, steer, nearest, cpuPlan, cpuUpdate } from './ai.js';
import { KIDS, KIDS_KEYS, kidsZone, kidsTarget, kidsMoveKey, smoothstep } from './kids.js';
import HITBOX from './data/hitbox.js';
import { TILT, TILT_KEYS, tiltBall, tiltName, tiltAimAt, tiltPoint, tiltSpecial } from './tilt.js';
import { specialsFor } from './v5.js';
import { V5, SLOTS, slotOfKey, costOf, levelFx, typeOfSpecial, normalizeSpecials, zoneBand, zoneBands, zoneAt, zoneMove, specialBand, formations, heightOf } from './v5.js';
import { freshCondition, refreshMods, tickBuffs, consume, MATCH_DRAIN, WEATHER_FX, CONSUMABLES } from './condition.js';

const rand = (a, b) => a + Math.random() * (b - a);
const IDLE = { x: 0, z: 0, pressed: () => false, released: () => false, down: () => false };

// 3.0: especiais decisivos — saem mais rápidos (×) e sempre enganosos (a CPU lê pior)
const SPECIAL_BOOST = { speed: 1.3 };

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
// tilt: Modo Tilt (src/tilt.js) — □ bola rápida e longa, ○ bola alta e precisa, em qualquer toque;
//   segurando o botão a hitbox aparece; a bola entrando nela pausa o jogo para mirar em 360°
// Cada time tem pilot = 'switch' (um jogador trocando entre os atletas) ou 'fixed' (fixed:
// { índice do atleta: número do jogador }; os atletas sem jogador são da CPU).
export class Match {
  // level: nível padrão da CPU adversária (1–12), ver src/difficulty.js
  // levels: nível de cada atleta da CPU, escolhido na seleção: { 0: [nível por atleta], 1: [...] }
  //   (atleta sem nível: adversário = level, parceiro de humano = TEAMMATE_LEVEL)
  // params: parâmetros da CPU prontos para todos (usado na calibração da dificuldade)
  // tiltSpecials: especiais escolhidos na seleção do Modo Tilt { time: [{ attack, defense }] }
  // 4.0: pointsToWin = pontos da partida · weather = climas (['chuva', 'vento', 'sol'], src/condition.js)
  //   drain = fome e sede sobem a cada ponto (Exibição / História) · timeouts = pausas com consumível
  //   por time humano · consumables = consumíveis liberados nas pausas · practice = treino sem placar
  //   (tutorial: a CPU sempre saca) · conds = condições iniciais { time: [cond por atleta] }
  constructor(rosters, { mode = 'solo', level = DEFAULT_LEVEL, params = null, control = {}, levels = {}, kids = false, tilt = false, tiltSpecials = {},
    pointsToWin = POINTS_TO_WIN, weather = [], drain = false, timeouts = 0, consumables = [], practice = false, conds = {}, condScale = 1, gearBuffs = {},
    sets = null, swaps = null, tempos = 0, camp = null, sides = null, ctrl = {}, aim = {} } = {}) {
    this.aim = aim || {}; // 5.0: mira de cada jogador ('direto' | 'giro'; sem valor = o modelo do editor)
    this.mode = mode;
    this.ctrl = ctrl || {}; // 5.0: modo de controle de cada jogador ({ 1: 'classico' | 'novo', … })
    this.kids = !!kids && mode !== 'demo';
    this.tilt = !!tilt && !this.kids && mode !== 'demo';
    this.tiltPause = null; // Modo Tilt: { pl, n, key, mv, touchNo, angle, t } enquanto o jogo está parado para mirar
    // direção da tela → direção no chão (o jogo liga à câmera); usada no Kids Mode
    this.screenToWorld = (x, z) => ({ x, z });
    this.kidsGlide = null; // Kids Mode: atleta deslizando até a bola antes do toque
    this.cpuParams = params || cpuParams(level);
    this.demo = mode === 'demo';
    // 5.0: sets (Modo Campeonato: set único de 18 ou melhor de 3 — 18, 18 e 15) e troca de lado de cada set
    this.setPoints = sets && sets.length ? sets.map(Number) : [pointsToWin];
    this.setSwaps = this.setPoints.map((_, i) => +((swaps || [])[i] || SIDE_SWAP_EVERY));
    this.setNo = 0; this.setsWon = [0, 0]; this.setHistory = [];
    this.pointsToWin = this.setPoints[0];
    this.swapEvery = this.setSwaps[0];
    this.tempos = [tempos, tempos]; // 5.0: tempos técnicos oficiais de cada dupla na partida
    this.camp = camp;               // 5.0: dados da partida do Modo Campeonato (fase, rodada…)
    this.toss = null;               // 5.0: resultado do cara ou coroa { winner, loser }
    this.weather = this.demo ? [] : [...weather];
    this.drain = !!drain && !this.demo;
    this.consumables = [...consumables];
    this.practice = !!practice;
    this.size = rosters[0].length;
    // 5.0: sides = { 0: [jogadores], 1: [...] } — até 4 jogadores (Exibição / Campeonato); com 2 ou mais no
    // mesmo time, cada um fica com um atleta (os que sobram são da CPU)
    const pilotFor = i => {
      if (sides) {
        const ns = sides[i] || [];
        if (!ns.length) return { human: false, pilot: 'switch', fixed: {} };
        if (ns.length > 1) return { human: true, pilot: 'fixed', fixed: Object.fromEntries(ns.slice(0, this.size).map((n, k) => [k, n])) };
        const n = ns[0];
        if (control[n] === 'own' && this.size > 1) return { human: true, pilot: 'fixed', fixed: { 0: n } };
        return { human: true, pilot: 'switch', fixed: {}, pilots: [n] };
      }
      const n = mode === 'versus' ? i + 1 : (mode === 'solo' || mode === 'coop') && i === 0 ? 1 : 0;
      if (!n) return { human: false, pilot: 'switch', fixed: {} };
      if (mode === 'coop') return { human: true, pilot: 'fixed', fixed: this.size === 1 ? { 0: 1 } : { 0: 1, 1: 2 } };
      if (control[n] === 'own' && this.size > 1) return { human: true, pilot: 'fixed', fixed: { 0: n } };
      return { human: true, pilot: 'switch', fixed: {}, pilots: [n] };
    };
    this.teams = [0, 1].map(i => ({
      id: i, side: i === 0 ? -1 : 1, score: 0, meter: 0, touches: 0, timeouts: 0,
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
    // 4.0: condições (fome, sede, forma, marcas) e efeitos temporários de cada atleta; pausas por time
    for (const pl of this.players) {
      pl.cond = freshCondition(conds[pl.team] && conds[pl.team][pl.idx]);
      // equipamentos (Modo História: meias de neoprene) valem a partida toda
      pl.buffs = ((gearBuffs[pl.team] && gearBuffs[pl.team][pl.idx]) || []).map(b => ({ ...b, t: Infinity }));
      pl.condScale = condScale; // Modo História: o quanto as condições pesam (dificuldade)
      refreshMods(pl);
    }
    for (const t of this.teams) t.timeouts = t.human && this.consumables.length ? timeouts : 0;
    // times com algum atleta da CPU (a CPU planeja a jogada deles)
    this.cpuTeams = [0, 1].filter(i => this.teamPlayers(i).some(p => p.ai));
    // Modo Tilt: o especial de ataque e o de defesa de cada atleta (escolhidos na seleção; sem
    // escolha, o próprio especial do atleta quando está na lista, senão o 1º da lista)
    // 5.0: 4 especiais por atleta { a1, a2, d1, d2 } (src/v5.js); null = sem especial naquele botão
    if (this.tilt) {
      for (const pl of this.players) {
        const pick = (tiltSpecials[pl.team] && tiltSpecials[pl.team][pl.idx]) || {};
        pl.tiltSp = normalizeSpecials(pick, pl.char.special);
        pl.spPool = pick._pool || null; // 5.0: Modo História — só os especiais aprendidos
        // 5.0 modo Novo: um especial de cada tipo; o nível (50% / 100%) vem da barra
        if (this.isNovo(pl)) { const sp = pl.tiltSp; sp.a1 = sp.a2 = sp.a1 || sp.a2; sp.d1 = sp.d2 = sp.d1 || sp.d2; }
      }
    }
    for (const t of this.teams) t.formIdx = 0; // 5.0: formação da dupla (RT troca; src/data/partida5.js)
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
  // 5.0: o jogador dono do atleta (mesmo quando outro atleta da dupla está sendo controlado) e o modo de controle dele
  ownerOf(pl) {
    const t = this.teams[pl.team];
    if (!t.human || pl.ai) return null;
    return (t.pilot === 'fixed' ? t.fixed[pl.idx] : t.pilots && t.pilots[0]) || null;
  }
  // 5.0: mira direta para o jogador que controla o atleta (Configurações → Controles → Mira do ataque)
  aimDirect(pl, n = this.pilotOf(pl) || this.ownerOf(pl)) {
    // aimFn: lê Configurações na hora (trocar a mira na pausa vale na mesma partida)
    const v = n && (this.aimFn ? this.aimFn(n) : this.aim[n]);
    return v ? v === 'direto' : TILT.direct;
  }
  isNovo(pl) { const n = this.ownerOf(pl); return !!n && this.ctrl[n] === 'novo'; }
  // 5.0 modo Novo: LT + LB / RB — o próximo especial do tipo (lista do editor; na história, só os aprendidos)
  cycleSpecial(pl, t) {
    const tipo = t === 'a' ? 'ataque' : 'defesa';
    const pool = (pl.spPool && pl.spPool[tipo]) || specialsFor(t + '1');
    const cur = pl.tiltSp[t + '1'] || pl.tiltSp[t + '2'];
    if (pool.length < 2) { this.emit('callout', { text: pool.length ? `SÓ UM ESPECIAL DE ${tipo.toUpperCase()}` : `NENHUM ESPECIAL DE ${tipo.toUpperCase()}`, small: true, team: pl.team }); return; }
    const next = pool[(pool.indexOf(cur) + 1) % pool.length];
    pl.tiltSp[t + '1'] = pl.tiltSp[t + '2'] = next;
    this.emit('spSwap', { player: pl, kind: t, from: cur, to: next });
  }
  // 5.0 modo Novo: o especial que o LB / RB solta agora (barra cheia = 100%; de 50% a 99% = 50%)
  novoSlot(pl, key) {
    const t = key === 'L' ? 'a' : 'd';
    return pl.meter >= costOf(t + '2') ? t + '2' : t + '1';
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
  netLimit() { const v = +((V5.rede || {}).limiteBola ?? 0.1); return Math.max(0, Math.min(0.5, isFinite(v) ? v : 0.1)); }
  // 5.0: atleta que acabou de tocar e não pode tocar de novo (dupla / trinca) — até o parceiro tocar ou a bola
  // passar a rede
  spent(pl) {
    const b = this.ball;
    return this.size > 1 && b.live && this.lastToucher === pl && this.lastTeam === pl.team && b.pos.x * pl.side > 0;
  }
  // 5.0: quem do time vai receber a bola agora (null = a bola não vem para este lado)
  receiverOf(ti) {
    const t = this.teams[ti];
    if (!this.ball.live) return null;
    const incoming = this.ball.contactPoint(1.2, t.side);
    if (!incoming) return null;
    const tps = this.teamPlayers(ti);
    if (t.human && t.pilot === 'switch') return this.controlledOf(ti);
    if (this.lastTeam === ti && this.lastToucher) { const r = this.receiverAfter(this.lastToucher); return r && r !== this.lastToucher ? r : null; }
    const plan = this.cpu.plans[ti];
    return (plan && plan.receiver) || nearest(tps, incoming);
  }
  emit(type, data = {}) { this.events.push({ type, ...data }); }

  // first = dupla que saca primeiro (cara ou coroa) · treino: a CPU (time 1) saca
  // side0 = lado do time 0 escolhido no cara ou coroa (-1 / 1; null = como está)
  begin(first = 0, side0 = null) { this.setSide0(side0); this.resetRally(this.practice ? 1 : first); }
  setSide0(side0) { if (side0 && this.teams[0].side !== side0) this.swapSides(); }
  // 5.0: próximo set (melhor de 3): placar zerado, quem saca vem do sorteio / da escolha
  nextSet(first = 0, side0 = null) {
    this.setNo++;
    this.setSide0(side0);
    this.pointsToWin = this.setPoints[this.setNo] ?? this.pointsToWin;
    this.swapEvery = this.setSwaps[this.setNo] ?? this.swapEvery;
    for (const t of this.teams) { t.score = 0; t.serverIdx = 0; }
    this.players.forEach(p => { p.mood = null; });
    this.emit('setStart', { setNo: this.setNo });
    this.resetRally(first);
  }
  // 5.0: tempo técnico oficial (1 por dupla na partida, no Campeonato)
  useTempo(ti) { if (!(this.tempos[ti] > 0)) return false; this.tempos[ti]--; this.emit('tempo', { team: ti }); return true; }

  resetRally(st) {
    this.servingTeam = st;
    this.state = 'serve';
    this.timer = 0;
    this.pendingServe = null;
    this.kidsGlide = null;
    this.tiltPause = null;
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
    this.clock = (this.clock || 0) + dt; // relógio da partida (dois toques do Modo Tilt)
    // Modo Tilt: tempo parado enquanto o jogador mira (só a seta se mexe)
    if (this.tiltPause) { this.stepTiltPause(dt); return; }
    for (const pl of this.players) if (tickBuffs(pl, dt)) { refreshMods(pl); this.emit('buffEnd', { player: pl }); }
    if (this.slowT > 0) {
      this.slowT -= dt / Math.max(this.timeScale, 0.05);
      if (this.slowT <= 0) this.timeScale = 1;
    }
    if (this.state === 'serve') this.stepServe(dt);
    else if (this.state === 'rally') this.stepRally(dt);
    else if (this.state === 'point' || this.state === 'over' || this.state === 'setover') this.stepPoint(dt);
  }

  portOf(n) { return this.ports[n] || IDLE; }

  // 5.0: RT troca a formação da dupla (qualquer jogador da dupla pode apertar).
  checkFormationKeys() {
    for (const t of this.teams) {
      if (this.teamPilots(t.id).some(n => this.portOf(n).pressed('R2'))) this.toggleFormation(t.id);
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
      if (this.timer > (this.practice ? 1.8 : 1.3)) this.startServe(sv, this.practice || Math.random() < 0.5 ? 'B' : 'A', this.practice ? { f: 0, l: 0 } : { f: rand(-0.5, 0.8), l: rand(-1, 1) });
    }
    this.ball.hold(this.serveBallPos());
  }

  startServe(sv, btn, aim) {
    sv.startSwing('serve', btn, aim, 'kick', false);
    sv.telegraph = null;
    this.pendingServe = { sv, mv: btn === 'A' ? MOVES.saqueForte : MOVES.saqueColocado, aim, t: 0.13, tipo: btn === 'A' ? 'forte' : 'viagem' };
  }

  launchServe() {
    const { sv, mv, aim, tipo } = this.pendingServe;
    // 5.0: cada tipo de saque com os seus números (partida5 saque.forte / saque.viagem; antigo: saque plano)
    const SQ = V5.saque || {}, sq = SQ[tipo] || SQ;
    this.pendingServe = null;
    tune.miss = sv.mods.miss;
    // 5.0: saque do jogador humano — o LS desloca o alvo (frente/trás e lados), sem ajudas visuais
    const human = this.tilt && !sv.ai;
    const res = mv.exec(this.ctxFor(sv, human ? { f: 0, l: 0 } : aim, 1));
    tune.miss = MISS_DEFAULT;
    if (human && aim) {
      const to = res.traj.to, dir = -sv.side;
      to.x += dir * (aim.f || 0) * (+sq.profundidade || 0);
      to.z = Math.max(-4.4, Math.min(4.4, to.z + (aim.l || 0) * (+sq.lateral || 0)));
      if (to.x * dir < 0.6) to.x = dir * 0.6; // passa a rede
      // o LS leva até as linhas, não para fora (a Precisão ainda espalha um pouco)
      to.x = dir * Math.min(Math.abs(to.x), COURT.halfLen - 0.4); to.z = Math.max(-(COURT.halfWid - 0.3), Math.min(COURT.halfWid - 0.3, to.z));
    }
    // 5.0: força (× velocidade) e chance de Banana Shot (curva lateral) do tipo de saque — jogador e CPU
    if (this.tilt && Math.random() < (+sq.banana || 0)) { res.traj.bend = (Math.random() < 0.5 ? -1 : 1) * (+V5.bananaCurva || 1.4); res.banana = true; }
    this.applyKids(res, sv, sv.kidsKey, true);
    sv.kidsKey = null;
    this.applyWeather(res.traj, sv);
    this.ball.launchPath(this.ball.pos, res.traj, { speed: sv.mods.speed * (this.tilt ? Math.max(0.2, 1 + (+sq.forca || 0)) : 1), banana: !!res.banana });
    this.lastToucher = sv;
    this.lastTeam = sv.team;
    this.teams[sv.team].touches = 3; // quem saca não pode tocar de novo
    this.state = 'rally';
    this.emit('hit', { player: sv, move: mv, speed: Math.hypot(this.ball.vel.x, this.ball.vel.y, this.ball.vel.z) });
    this.emit('callout', { text: res.banana ? mv.name + ' · BANANA SHOT!' : mv.name, small: true, team: sv.team });
    this.onPathChange();
  }

  // R: na dupla troca quem fica na rede; na trinca, passa a vez da rede para o próximo.
  // 5.0: na dupla, RT passa para a próxima formação da lista (src/data/partida5.js); na trinca,
  // passa a vez da rede para o próximo
  toggleFormation(ti) {
    if (this.size < 2) return;
    const t = this.teams[ti];
    if (this.size === 2) {
      const list = formations();
      t.formIdx = (t.formIdx + 1) % list.length;
      this.emit('formation', { team: ti, name: list[t.formIdx].nome });
      this.emit('callout', { text: list[t.formIdx].nome, small: true, team: ti });
      return;
    }
    t.netIdx = (t.netIdx + 1) % this.size;
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
      if (this.tilt && this.tryTiltCatch(pl)) break; // Modo Tilt: bola na hitbox de quem segura o botão
      if (this.tryContact(pl)) break;
    }
    if (this.state === 'rally' && !this.tiltPause) this.autoPartnerDomain();
    this.updateFacing();
  }

  // ---------- Modo Tilt ----------
  // 5.0: X (A) / B seguram a hitbox em 3 partes (inferior, tronco, superior); a parte em que a bola
  // entra e o toque escolhem o golpe (src/data/partida5.js, golpesZona). A bola é a do botão.
  // Golpe base de cada animação no toque (para a nota da ação e a física de reserva)
  baseMoveId(anim, key, air, touchNo) {
    const t = Math.min(3, Math.max(1, touchNo));
    const by = {
      header: ['cabeca', 'cabecaSet', 'cabecada'], chest: ['peito', 'ombro', 'chuteColocado'], shoulder: ['peito', 'ombro', 'pingo'],
      poke: ['pe', 'naFita', 'pingo'], thigh: ['pe', 'ombro', 'chuteColocado'], kick: ['pe', 'naFita', 'chuteColocado'],
    }[anim];
    return by ? by[t - 1] : pickMove(key, air, t);
  }
  tiltMove(pl, key, air = pl.state === 'air') {
    const touchNo = Math.min(this.touchNoFor(pl), 3);
    const mv = MOVES[pickMove(key, air, touchNo)];
    return { ...mv, id: mv.id, name: tiltName(touchNo, air, key) || mv.name, anim: mv.anim, band: zoneBand(heightOf(pl.char)), reach: TILT.reach || mv.reach, zoned: true };
  }
  // o golpe da parte da hitbox em que a bola está (sorteado pelos pesos)
  zonedMove(pl, key, air, touchNo) {
    const zone = zoneAt(this.ball.pos.y - pl.y, this.bandPadFor(pl), heightOf(pl.char)) || 'tronco';
    const g = zoneMove(zone, touchNo);
    const anim = (g && g.anim) || 'chest';
    const base = MOVES[this.baseMoveId(anim, key, air, touchNo)] || MOVES[pickMove(key, air, touchNo)];
    return { ...base, id: base.id, name: (g && g.nome) || base.name, anim, band: zoneBand(heightOf(pl.char)), reach: TILT.reach || base.reach, zone };
  }
  // especial do slot (a1 LB LB, a2 X X, d1 RB RB, d2 B B) escolhido na seleção
  tiltSpecialId(pl, slot) {
    const id = pl.tiltSp && pl.tiltSp[slot];
    return id && MOVES[id] ? id : null;
  }
  // golpe armado: 'A' / 'B' (bola do botão) ou 'Sa1' / 'Sa2' / 'Sd1' / 'Sd2' (especial; hitbox inteira)
  tiltHoldMove(pl, hk) {
    if (hk && hk[0] === 'S') {
      const slot = hk.slice(1), id = this.tiltSpecialId(pl, slot);
      if (!id) return null;
      const mv = MOVES[id], sp = tiltSpecial(id);
      const name = sp && sp.name ? sp.name.toUpperCase() + '!' : mv.name;
      // 5.0: o especial de 50% tem hitbox menor (altura e alcance × niveis[50].hitbox)
      const hbx = levelFx(slot).hitbox, band = specialBand(heightOf(pl.char));
      return { ...mv, id, name, anim: mv.anim, band: [band[0], band[1] * hbx], reach: ((sp && sp.reach) || mv.reach || 1.75) * hbx, special: true, slot };
    }
    return this.tiltMove(pl, hk);
  }
  holdKey(hk) { return hk && hk[0] === 'S' ? SLOTS[hk.slice(1)].key : hk; }
  // direção automática do especial: defesa antes do 3º toque = para o parceiro; senão, para o
  // ponto do campo adversário mais longe dos defensores
  autoAngle(pl, mv, touchNo) {
    const mate = this.partnerOf(pl);
    const def = (V5.especiais[mv.id] || {}).tipo === 'defesa';
    if (def && touchNo < 3 && mate && mate !== pl) return Math.atan2(mate.z - pl.z, mate.x - pl.x);
    const opp = this.teamPlayers(1 - pl.team), x = -pl.side * 5.2;
    let best = 0, bd = -1;
    for (const z of [-3.4, -1.7, 0, 1.7, 3.4]) {
      const d = opp.length ? Math.min(...opp.map(o => Math.hypot(o.x - x, o.z - z))) : 0;
      if (d > bd) { bd = d; best = z; }
    }
    return Math.atan2(best - pl.z, x - pl.x);
  }
  // 5.0: especial de defesa no 1º ou 2º toque: vai direto no parceiro (sem mira) e dá a "levantada perfeita"
  defToMate(pl, mv, touchNo) {
    const mate = this.partnerOf(pl);
    return !!(mv && mv.id && typeOfSpecial(mv.id) === 'defesa' && touchNo < 3 && mate && mate !== pl);
  }
  // jogador humano segurando X/B (ou com especial armado) e a bola entrou na hitbox: o tempo para
  // para mirar. B no ar vai direto para o parceiro; especial com o botão já solto sai na direção automática.
  tryTiltCatch(pl) {
    const armed = pl.armed && this.clock <= pl.armed.until ? pl.armed.hold : null;
    const hk = pl.hold || armed;
    if (pl.ai || !hk || pl.swing || !pl.canAct()) return false;
    let mv = this.tiltHoldMove(pl, hk);
    if (!mv || !this.inZone(pl, mv)) return false;
    const touchNo = this.touchNoFor(pl);
    if (touchNo > 3) { pl.hold = null; pl.armed = null; this.fault(pl.team, '4 TOQUES!'); return true; }
    const special = hk[0] === 'S', air = pl.state === 'air';
    const key = special ? (pl.holdBtn || this.holdKey(hk)) : hk; // o botão que está sendo segurado (LB vira X X com a barra cheia)
    if (!special) mv = this.zonedMove(pl, key, air, Math.min(touchNo, 3));
    const slot = special ? hk.slice(1) : null;
    // 5.0: mira direta — todo golpe (especial também) começa onde o analógico aponta; sem direção, reto para a rede
    const tp = { pl, n: this.pilotOf(pl), key, kind: special ? 'S' : key, special, slot, cost: special ? costOf(slot) : 0, air, mv, touchNo,
      angle: this.aimDirect(pl) ? this.directAngle(pl, Math.atan2(0, -pl.side)) : special ? this.autoAngle(pl, mv, touchNo) : Math.atan2(0, -pl.side), t: 0 };
    pl.armed = null;
    if (special && (!pl.hold || this.defToMate(pl, mv, touchNo))) { this.tiltHit(tp); return true; } // já soltou (ou defesa para o parceiro): sem mira
    if (!special && air && key === 'B') { this.tiltHit(tp); return true; }
    this.tiltPause = tp;
    this.emit('tilt', { player: pl, key, special, air, name: special ? mv.name.replace('!', '') : `${mv.name} · ${tiltBall(key, air).name}` });
    return true;
  }
  // 5.0: mira direta — a direção do analógico agora (sem direção: fica a que já estava)
  directAngle(pl, keep) {
    const input = this.portOf(this.pilotOf(pl));
    return input && Math.hypot(input.x, input.z) > 0.3 ? Math.atan2(input.z, input.x) : keep;
  }
  stepTiltPause(dt) {
    const tp = this.tiltPause;
    tp.t += dt;
    const input = this.portOf(tp.n);
    // o direcional (d-pad, setas/WASD ou analógico; cima, baixo, esquerda, direita e diagonais)
    // aponta para onde a seta deve ir — já vem convertido para o chão conforme a câmera;
    // a seta gira até lá pelo caminho mais curto
    const mag = Math.hypot(input.x, input.z);
    if (mag > 0.3 && this.aimDirect(tp.pl, tp.n)) tp.angle = Math.atan2(input.z, input.x); // 5.0: mira direta (soltou o analógico: fica a última)
    else if (mag > 0.3) {
      const d = Math.atan2(Math.sin(Math.atan2(input.z, input.x) - tp.angle), Math.cos(Math.atan2(input.z, input.x) - tp.angle));
      const step = TILT.turnSpeed * dt;
      tp.angle += Math.abs(d) <= step ? d : Math.sign(d) * step;
    }
    // 5.0: na mira de um golpe normal, os 4 especiais ainda valem (o jogo está parado, nada atrasa):
    //   LB LB / RB RB a qualquer momento da mira → ataque / defesa 50% (com a barra cheia, o de 100%)
    //   soltou X / B → espera "duploMira" por um 2º toque do mesmo botão → X X / B B (100%)
    const novo = this.isNovo(tp.pl);
    if (!tp.special && novo) {
      // 5.0 modo Novo: LB / RB na mira trocam o golpe pelo especial (nível pela barra); com LT segurado, nada
      if (!input.down('L2')) for (const k of ['L', 'R']) if (input.pressed(k) && this.upgradeTilt(tp, this.novoSlot(tp.pl, k), k)) { tp.waitT = null; return; }
    } else if (!tp.special) {
      const duplo = +V5.duploToque || 0.3;
      for (const k of ['L', 'R']) {
        if (!input.pressed(k)) continue;
        if (tp.tap && tp.tap.key === k && tp.t - tp.tap.t <= duplo) {
          let slot = slotOfKey(k);
          if (tp.pl.meter >= SPECIAL.max && this.tiltSpecialId(tp.pl, slot[0] + '2')) slot = slot[0] + '2';
          tp.tap = null;
          if (this.upgradeTilt(tp, slot, k)) { tp.waitT = null; return; }
        } else tp.tap = { key: k, t: tp.t };
      }
    }
    const tapOpen = !tp.special && tp.tap && tp.t - tp.tap.t <= (+V5.duploToque || 0.3); // um LB/RB esperando o 2º toque
    if (tp.waitT != null) {
      tp.waitT -= dt;
      if (input.pressed(tp.key) && this.upgradeTilt(tp, slotOfKey(tp.key), tp.key)) { tp.waitT = null; return; }
      if ((tp.waitT <= 0 && !tapOpen) || tp.t >= TILT.maxPause) this.commitTilt();
      return;
    }
    // soltou o botão (ou acabou o tempo): decide
    if (!input.down(tp.key) || tp.t >= TILT.maxPause) {
      if (!tp.special && tp.t < TILT.maxPause && !novo) { tp.waitT = +(V5.duploMira ?? 0.25); return; } // modo Novo: sem X X / B B
      this.commitTilt();
    }
  }
  // 5.0: troca o golpe normal da mira pelo especial do slot (X X a2, B B d2, LB LB a1, RB RB d1); key = botão segurado agora
  upgradeTilt(tp, slot, key) {
    const pl = tp.pl;
    if (!slot) return false;
    const cost = costOf(slot);
    if (!this.tiltSpecialId(pl, slot)) return false;
    if (pl.meter < cost) { this.emit('callout', { text: `BARRA ${Math.floor(pl.meter)}% · PRECISA ${cost}%`, small: true, team: pl.team }); return false; }
    const mv = this.tiltHoldMove(pl, 'S' + slot);
    if (!mv) return false;
    Object.assign(tp, { key, special: true, slot, cost, kind: 'S', mv, angle: this.aimDirect(pl, tp.n) ? tp.angle : this.autoAngle(pl, mv, tp.touchNo), t: 0 });
    pl.hold = 'S' + slot; pl.holdBtn = key;
    if (this.defToMate(pl, mv, tp.touchNo)) { this.commitTilt(); return true; } // defesa: direto no parceiro, sem mira
    this.emit('tilt', { player: pl, key, special: true, air: tp.air, name: mv.name.replace('!', '') });
    return true;
  }
  commitTilt() {
    const tp = this.tiltPause;
    this.tiltPause = null;
    this.emit('tiltEnd', { player: tp.pl });
    this.tiltHit(tp);
  }
  tiltHit(tp) {
    const pl = tp.pl;
    pl.hold = null;
    if (tp.special) pl.startSwing('special', null, { f: 0, l: 0 }, tp.mv.anim, pl.state === 'air');
    else pl.startSwing('hit', tp.key, { f: 0, l: 0 }, tp.mv.anim, tp.air);
    pl.swing.hit = true;
    pl.swing.specialId = tp.special ? tp.mv.id : null;
    pl.swing.cost = tp.cost;
    pl.swing.slot = tp.slot || null;
    pl.swing.tilt = { key: tp.key, special: tp.special, slot: tp.slot || null, air: tp.air, angle: tp.angle, id: tp.mv.id, zone: tp.mv.zone || null };
    if (this.startApproach(pl, tp.mv, { f: 0, l: 0 }, tp.touchNo)) return; // 5.0: chega até a bola antes do toque
    this.performHit(pl, tp.mv, { f: 0, l: 0 }, tp.touchNo);
  }
  // 5.0: toque da CPU com as regras do jogador: golpe pela parte da hitbox, bola do botão e a
  // direção (para a parceira nos passes; no ataque, o canto mais vazio — ou um ponto qualquer do
  // campo deles quando a CPU "não pensa", pela esperteza do nível)
  cpuTiltHit(pl, key, touchNo, plan) {
    const air = pl.state === 'air', t = Math.min(touchNo, 3);
    const mv = this.zonedMove(pl, key, air, t);
    const mate = this.partnerOf(pl);
    let angle;
    if (!plan.attack && mate && mate !== pl) angle = Math.atan2(mate.z - pl.z, mate.x - pl.x);
    else if (Math.random() < this.paramsOf(pl).smart) angle = this.autoAngle(pl, { id: null }, 3);
    else { const x = -pl.side * rand(2.5, 8), z = rand(-3.8, 3.8); angle = Math.atan2(z - pl.z, x - pl.x); }
    this.tiltHit({ pl, key, special: false, air, mv, touchNo, angle, cost: 0 });
  }
  // troca a trajetória do golpe pela bola do botão (ou do especial), na direção escolhida
  applyTilt(res, pl, tl, touchNo = 1) {
    const miss = pl.mods.miss, away = Math.cos(tl.angle) || -pl.side;
    if (tl.special) {
      // especial: a trajetória e a distância do Tilt (specialDefs), para onde a seta aponta
      const sp = tiltSpecial(tl.id);
      if (sp && this.defToMate(pl, { id: tl.id }, touchNo)) {
        // 5.0: defesa especial — a bola cai exatamente onde o parceiro alcança, com a trajetória do especial
        const mate = this.partnerOf(pl), at = mate.reachCenter();
        res.aimC = at; res.toMate = mate; res.deceptive = false;
        res.traj = { to: { x: at.x, z: at.z }, model: sp.model, apex: sp.apex, launch: sp.launch || 0, bend: 0, pace: sp.pace };
        return;
      }
      if (sp) {
        // 5.0: a área onde cai = a da bola simples do tipo (ataque = X, defesa = B) × a precisão do
        // nível do botão (50% menos precisa que 100%; as duas mais precisas que a simples)
        const simple = tiltBall(typeOfSpecial(tl.id) === 'defesa' ? 'B' : 'A', false).radius || 1.5;
        const radius = Math.max(0.1, simple * levelFx(tl.slot).area);
        const ctr = tiltAimAt(pl, Math.max(1, sp.dist), radius, tl.angle); res.aimC = ctr;
        res.traj = { to: tiltPoint(ctr, miss, Math.random, away),
          model: sp.model, apex: sp.apex, launch: sp.launch || 0, bend: sp.bend || 0, pace: sp.pace };
        return;
      }
      const to = res.traj.to, dist = Math.max(1.5, Math.hypot(to.x - pl.x, to.z - pl.z));
      res.traj.to = tiltPoint(tiltAimAt(pl, dist, 1, tl.angle), miss, Math.random, away);
      return;
    }
    const c = tiltBall(tl.key, tl.air);
    // 5.0: a CPU erra a direção um pouco (o erro de mira do nível)
    if (pl.ai && !tl.special) tl.angle += (Math.random() * 2 - 1) * this.paramsOf(pl).aimErr * 0.25;
    if (tl.air && tl.key === 'B') {
      // ○ no ar: direto para a região do parceiro
      const mate = this.partnerOf(pl);
      const at = mate && mate !== pl ? { x: mate.x, z: mate.z } : { x: pl.side * 3, z: 0 };
      res.traj = { to: tiltPoint({ ...at, r: c.radius }, miss, Math.random, pl.side), model: c.model, apex: c.apex, launch: c.launch || 0, pace: c.pace, bend: c.bend || 0 };
      res.deceptive = false;
      return;
    }
    // □ no ar: sai no ângulo dado (45°) — sem ar, a bola sobe d·tan(θ)/4 até o pico
    let apex = tl.air && tl.key === 'A' ? this.ball.pos.y + c.dist * Math.tan((c.angle || 45) * Math.PI / 180) / 4 : c.apex;
    // 5.0: a parte da hitbox mexe na bola (src/data/partida5.js → zonas.*.efeito):
    // em cima = um pouco mais alta, precisa e forte; embaixo = o espelho; Banana Shot = curva lateral
    const fx = ((V5.zonas || {})[tl.zone] || {}).efeito || {};
    apex *= 1 + (+fx.altura || 0);
    const radius = Math.max(0.1, c.radius * (1 - (+fx.precisao || 0)));
    res.forceMul = 1 + (+fx.forca || 0);
    // 5.0: a parte da hitbox também muda a distância da bola (efeito.distancia: + mais longe, − mais curta)
    const ctr = tiltAimAt(pl, Math.max(0.5, c.dist * (1 + (+fx.distancia || 0))), radius, tl.angle); res.aimC = ctr;
    let bend = c.bend || 0;
    if (Math.random() < (+fx.banana || 0)) { bend = (Math.random() < 0.5 ? -1 : 1) * (+V5.bananaCurva || 1.4); res.banana = true; }
    res.traj = { to: tiltPoint(ctr, miss, Math.random, away), model: c.model, apex, launch: c.launch || 0, pace: c.pace, bend };
    res.deceptive = false;
  }

  // Modo Tilt: o carrinho do jogador humano usa a trajetória do Tilt (src/data/tilt.js, carrinho), reto rumo à rede
  applyTiltDive(res, pl) {
    const c = TILT.data.carrinho;
    if (!c) return;
    const ang = Math.atan2(0, -pl.side);
    res.traj = { to: tiltPoint(tiltAimAt(pl, c.dist, c.radius, ang), pl.mods.miss, Math.random, -pl.side), model: c.model, apex: c.apex, launch: c.launch || 0, pace: c.pace, bend: c.bend || 0 };
    res.deceptive = false;
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
    } else if (this.tilt && pl.canAct()) {
      // 5.0: segurar X (A) / B arma a hitbox em 3 partes (o toque sai quando a bola entra nela —
      // tryTiltCatch); soltar sem bola não faz nada. Dois toques rápidos armam um especial:
      // LB LB ataque 1 (50%) · X X ataque 2 (100%) · RB RB defesa 1 (50%) · B B defesa 2 (100%).
      // Segurando o 2º toque dá para mirar; soltando, o especial fica armado (V5.armado s) e sai
      // na direção automática. A pula (A + X / A + B = golpe no ar); Y carrinho.
      const novo = this.isNovo(pl);
      if (novo && input.down('L2') && (input.pressed('L') || input.pressed('R'))) this.cycleSpecial(pl, input.pressed('L') ? 'a' : 'd');
      else if (novo && !pl.swing) {
        // 5.0 modo Novo: X / B só seguram o golpe; LB / RB = especial (segurando mira; soltando, fica armado)
        const key = ['A', 'B', 'L', 'R'].find(k => input.pressed(k));
        if (key === 'A' || key === 'B') pl.hold = key;
        else if (key) {
          const slot = this.novoSlot(pl, key), t = slot[0];
          if (pl.meter >= costOf(t + '1') && this.tiltSpecialId(pl, slot)) { pl.hold = 'S' + slot; pl.holdBtn = key; pl.armed = null; }
          else this.emit('callout', { text: this.tiltSpecialId(pl, slot) ? `BARRA ${Math.floor(pl.meter)}% · PRECISA ${costOf(t + '1')}%` : 'SEM ESPECIAL', small: true, team: pl.team });
        }
      } else if (!pl.swing) {
        const key = ['A', 'B', 'L', 'R'].find(k => input.pressed(k));
        if (key) {
          const tap = pl.tiltTap, slot = slotOfKey(key);
          const dbl = tap && tap.key === key && this.clock - tap.t <= (+V5.duploToque || 0.3);
          if (dbl && this.tiltSpecialId(pl, slot)) {
            // 5.0: com a barra em 100%, o comando do especial de 50% solta o de 100% do mesmo tipo
            let use = slot;
            if (pl.meter >= SPECIAL.max && (slot === 'a1' || slot === 'd1') && this.tiltSpecialId(pl, slot[0] + '2')) use = slot[0] + '2';
            if (pl.meter >= costOf(use)) { pl.hold = 'S' + use; pl.holdBtn = key; pl.armed = null; }
            else {
              this.emit('callout', { text: `BARRA ${Math.floor(pl.meter)}% · PRECISA ${costOf(slot)}%`, small: true, team: pl.team });
              if (key === 'A' || key === 'B') pl.hold = key;
            }
          } else if (key === 'A' || key === 'B') pl.hold = key;
          pl.tiltTap = dbl ? null : { key, t: this.clock };
        }
      }
      if (pl.hold && !input.down(pl.hold[0] === 'S' && pl.holdBtn ? pl.holdBtn : this.holdKey(pl.hold))) {
        if (pl.hold[0] === 'S') pl.armed = { hold: pl.hold, until: this.clock + (+V5.armado || 0) };
        pl.hold = null;
      }
      if (pl.armed && this.clock > pl.armed.until) pl.armed = null;
      if (input.pressed('C') && pl.state === 'ground' && !pl.swing) pl.jump();
      if (input.pressed('D') && pl.state === 'ground' && !pl.swing) {
        let d = dir;
        if (mag < 0.35) {
          const c = this.ball.live ? this.ball.contactPoint(1.0, pl.side) : null;
          d = c ? { x: c.x - pl.x, z: c.z - pl.z } : { x: pl.facing, z: 0 };
        }
        pl.hold = null;
        pl.dive(d);
        this.emit('dive', { player: pl });
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
    // (Modo Tilt: segurando o botão o atleta ainda anda, mais devagar, para buscar a bola)
    const locked = this.tilt ? (pl.swing && pl.swing.kind !== 'dive') : (pl.hold || (pl.swing && pl.swing.kind !== 'dive'));
    if (locked && pl.state === 'ground') { pl.vx = 0; pl.vz = 0; }
    const mul = this.tilt && pl.hold ? TILT.holdMove : 1;
    pl.update(dt, locked ? null : { x: dir.x, z: dir.z, mul });
    this.setHoldTelegraph(pl);
  }

  // Enquanto segura A/B o atleta assume a postura do golpe que vai sair.
  setHoldTelegraph(pl) {
    if (!pl.hold) { pl.telegraph = null; return; }
    if (this.state === 'serve') { pl.telegraph = 'kick'; return; }
    if (this.tilt) { const mv = this.tiltHoldMove(pl, pl.hold); pl.telegraph = mv ? (mv.zoned ? null : mv.anim) : null; return; }
    const key = this.kids ? kidsMoveKey(pl.hold) : pl.hold;
    const mv = MOVES[pickMove(key, pl.state === 'air', Math.min(this.touchNoFor(pl), 3))];
    pl.telegraph = mv.anim;
  }

  // especial (CPU): id e slot escolhidos no plano; sem id, o especial do próprio atleta
  startSpecial(pl, aim, id = pl.char.special, slot = null) {
    const mv = MOVES[id] || MOVES[pl.char.special];
    pl.hold = null;
    pl.startSwing('special', null, aim, mv.anim, true);
    pl.swing.specialId = mv.id;
    pl.swing.cost = slot ? costOf(slot) : SPECIAL.max;
    pl.swing.slot = slot;
    // 5.0: a trajetória do especial vem de src/data/tilt.js (specialDefs), na direção automática
    if (this.tilt) pl.swing.tilt = { special: true, slot, id: mv.id, key: null, air: pl.state === "air", angle: this.autoAngle(pl, mv, Math.min(this.touchNoFor(pl), 3)) };
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
    if (sw.kind === 'special') {
      const mv = MOVES[sw.specialId] || MOVES[pl.char.special];
      if (!this.tilt) return mv;
      const hk = levelFx(sw.slot).hitbox, band = specialBand(heightOf(pl.char)), sp = tiltSpecial(mv.id);
      return { ...mv, band: [band[0], band[1] * hk], reach: ((sp && sp.reach) || mv.reach || 1.75) * hk, special: true };
    }
    if (sw.kind === 'dive') {
      // Modo Tilt: a hitbox do carrinho do jogador humano vem do Tilt
      const c = this.tilt && TILT.data.carrinho; // 5.0: CPU também
      return c && c.band ? { ...MOVES.carrinho, band: c.band, reach: c.reach || MOVES.carrinho.reach } : MOVES.carrinho;
    }
    return MOVES[pickMove(sw.btn, sw.air, Math.min(this.touchNoFor(pl), 3))];
  }

  // Alcance do toque: o jogador humano tem hitbox maior; a CPU usa o alcance do nível.
  // Golpes com alcance próprio (carrinho, especiais) somam a mesma diferença.
  // 2.0: o alcance do golpe (dados) é o do jogador humano; a CPU tem ele menos a diferença do nível dela
  // 5.0: a CPU tem a mesma hitbox do jogador em todos os níveis (o nível muda reação, mira e erros);
  // só a ajuda do Kids Mode é do jogador humano
  reachFor(pl, mv) {
    const r = mv.reach || P.reach;
    return this.kids && !pl.ai ? r * KIDS.reach : r;
  }
  // Largura da hitbox para os lados: a mesma para todos os golpes (src/data/hitbox.js); a CPU
  // tem menos a diferença do nível dela, como no alcance
  sideReachFor(pl) {
    const s = HITBOX.side;
    return this.kids && !pl.ai ? s * KIDS.reach : s;
  }
  // folga de altura da hitbox: só do jogador humano (maior no Kids Mode)
  bandPadFor(pl) { return P.bandPad * (this.kids && !pl.ai ? KIDS.bandPad : 1); }

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
  // 5.0: a bola entrou na hitbox mas longe do corpo — o atleta desliza até ela e só então toca (a bola
  // espera um instante), para parecer que ele realmente a alcançou (src/data/partida5.js, aproximacao)
  startApproach(pl, mv, aim, touchNo) {
    if (this.kids || this.state !== 'rally') return false;
    const A = V5.aproximacao || {}, near = +(A.perto ?? 0.45);
    const b = this.ball.pos, rc = pl.reachCenter();
    const dx = b.x - rc.x, dz = b.z - rc.z, d = Math.hypot(dx, dz);
    if (!(d > near)) return false;
    const k = (d - near) / d, gap = P.netGap || 0.55;
    let x1 = pl.x + dx * k;
    if (x1 * pl.side < gap) x1 = pl.side * gap; // nunca passa para o outro lado da rede
    const dur = Math.max(+(A.min ?? 0.05), Math.min(+(A.max ?? 0.16), (d - near) / Math.max(0.5, +(A.velocidade ?? 8))));
    this.kidsGlide = { pl, mv, aim, touchNo, x0: pl.x, z0: pl.z, x1, z1: pl.z + dz * k, t: 0, dur, ball: { ...b } };
    this.emit('approach', { player: pl, d });
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
    // 5.0: só toca a bola do próprio lado — passou da rede mais que V5.rede.limiteBola (fração da bola), não toca
    if (b.x * pl.side < BALL_R * (1 - 2 * this.netLimit())) return false;
    // Mesmo atleta não toca duas vezes seguidas. No 1x1 pode (até 3 toques), mas só depois
    // que a bola se afasta do pé (0,35 s), para não contar o mesmo golpe duas vezes.
    if (this.lastToucher === pl && (this.size > 1 || this.ball.t < 0.35)) return false;
    // 5.0: a CPU usa a mesma hitbox do jogador.
    // elipse: alcance do golpe para frente/trás, largura universal para os lados
    const hb = pl.setBonus && pl.setBonus.team === pl.team ? pl.setBonus.hitbox : 1; // 5.0: levantada perfeita
    const reach = this.reachFor(pl, mv) * hb, side = this.sideReachFor(pl) * hb;
    const pad = this.bandPadFor(pl);
    const rc = pl.reachCenter();
    const dx = (b.x - rc.x) / reach;
    const dz = (b.z - rc.z) / side;
    if (dx * dx + dz * dz > 1) return false;
    const h = b.y - pl.y;
    return h >= mv.band[0] - pad && h <= mv.band[1] * hb + pad;
  }

  // Área de contato do golpe em andamento (para desenhar a hitbox); null se não está ativo.
  // (Fica visível durante toda a janela ativa, mesmo depois do contato: a CPU bate
  // no mesmo instante em que começa o golpe.)
  activeHitbox(pl) {
    const sw = pl.swing;
    // Modo Tilt: a hitbox aparece enquanto o jogador segura □/○ (e durante a pausa para mirar)
    const paused = this.tiltPause && this.tiltPause.pl === pl;
    const armed = pl.armed && this.clock <= pl.armed.until ? pl.armed.hold : null;
    if (this.tilt && !pl.ai && (pl.hold || armed || paused) && this.state === 'rally') {
      const mv = paused ? this.tiltPause.mv : this.tiltHoldMove(pl, pl.hold || armed), pad = this.bandPadFor(pl);
      if (!mv) return null;
      // 5.0: X / B mostram as 3 partes (cores do editor); o especial, a hitbox inteira
      const zones = mv.special ? null : zoneBands(heightOf(pl.char)).map((z, i, a) => ({ lo: (i ? z.lo : z.lo - pad), hi: (i === a.length - 1 ? z.hi + pad : z.hi), cor: z.cor }));
      const hb = pl.setBonus ? pl.setBonus.hitbox : 1;
      return { reach: this.reachFor(pl, mv) * hb, side: this.sideReachFor(pl) * hb, lo: mv.band[0] - pad, hi: mv.band[1] * hb + pad, c: pl.reachCenter(), zones, special: !!mv.special };
    }
    // 5.0: CPU no Tilt — no golpe, as 3 partes com a parte usada em destaque (especial: a hitbox inteira)
    if (this.tilt && pl.ai && sw && sw.tilt && sw.t <= 0.45 && this.state === 'rally') {
      const tl = sw.tilt, pad = this.bandPadFor(pl);
      const mv = tl.special ? this.moveFor(pl) : this.tiltMove(pl, tl.key || 'B');
      const zones = tl.special ? null : zoneBands(heightOf(pl.char)).map((z, i, a) => ({ lo: (i ? z.lo : z.lo - pad), hi: (i === a.length - 1 ? z.hi + pad : z.hi), cor: z.cor, on: z.key === tl.zone }));
      return { reach: this.reachFor(pl, mv), side: this.sideReachFor(pl), lo: mv.band[0] - pad, hi: mv.band[1] + pad, c: pl.reachCenter(), zones, special: !!tl.special, used: true };
    }
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
    sw.tContact = sw.t; // 3.0: tempo do aperto (quanto depois de soltar a bola entrou)
    const touchNo = this.touchNoFor(pl);
    if (touchNo > 3) { this.fault(pl.team, '4 TOQUES!'); return true; }
    // Kids Mode: bola na hitbox mas longe: o atleta desliza até ela e bate no fim (stepKidsGlide)
    if (this.kids && !pl.ai && this.startKidsGlide(pl, mv, sw.aim, touchNo)) return true;
    if (this.startApproach(pl, mv, sw.aim, touchNo)) return true; // 5.0: chega até a bola antes do toque
    this.performHit(pl, mv, sw.aim, touchNo);
    return true;
  }

  performHit(pl, mv, aim, touchNo) {
    const team = this.teams[pl.team];
    const b = this.ball;
    // o que chegou: base da nota da ação
    const incoming = { speed: Math.hypot(b.vel.x, b.vel.y, b.vel.z), h: b.pos.y - pl.y, net: Math.abs(pl.x), ballY: b.pos.y, touchNo };
    // 3.0: a nota do toque anterior do MESMO TIME passa adiante (src/grade.js, GRADE_FLOW):
    // levantamento Ótimo = ataque mais rápido e certeiro; domínio Ruim = levantamento mais difícil
    const flow = GRADE_FLOW.bom; // 5.0: sem a dinâmica de boas/más abordagens (a nota não passa adiante)
    // 3.0: jogador humano — a precisão vem do tempo do aperto (bola entrando logo depois de soltar)
    const sw = pl.swing;
    const tm = !pl.ai && !this.kids && !this.tilt && sw && sw.kind === 'hit' ? timingMiss(sw.tContact ?? sw.t, P.swingWindow) : null;
    tune.miss = pl.mods.miss * flow.miss * (tm ? tm.mul : 1);
    const ctx = this.ctxFor(pl, aim, touchNo);
    ctx.err += flow.err;
    const res = mv.exec(ctx);
    tune.miss = MISS_DEFAULT;
    if (pl.swing && pl.swing.kind === 'hit') this.applyKids(res, pl, pl.swing.kidsKey);
    if (pl.swing && pl.swing.tilt) this.applyTilt(res, pl, pl.swing.tilt, touchNo);
    else if (this.tilt && pl.swing && pl.swing.kind === 'dive') this.applyTiltDive(res, pl);
    // Força, a nota anterior do time e o especial (mais rápido) encurtam o tempo no ar
    // 5.0: o especial sai mais rápido conforme o nível do botão (50% ou 100%; src/data/partida5.js)
    let speed = pl.mods.speed * flow.speed * (mv.special && !this.tilt ? SPECIAL_BOOST.speed : 1);
    // 5.0: força e precisão da parte da hitbox (applyTilt → res.forceMul)
    if (res.forceMul) speed *= res.forceMul;
    // 5.0: cada passe antes do ataque deixa a bola +25% mais precisa e mais forte (acumula: 2º toque +25%,
    // 3º toque +50%) — assim não compensa atacar sempre no 1º ou 2º toque (src/data/partida5.js, bonusPasse)
    const passes = Math.max(0, touchNo - 1);
    const attack = res.traj && res.traj.to && Math.sign(res.traj.to.x) === -pl.side;
    // 5.0: "levantada perfeita" (defesa especial do parceiro): soma ao bônus por passe, vale só neste toque
    const sb = pl.setBonus && pl.setBonus.team === pl.team ? pl.setBonus : null;
    for (const p of this.players) p.setBonus = null;
    let bonus = 1 + (attack && passes > 0 ? (+V5.bonusPasse || 0) * passes : 0) + (sb ? sb.bonus : 0);
    if (bonus > 1 && !res.toMate) {
      speed *= bonus;
      const c = res.aimC;
      if (c && res.traj && res.traj.to) res.traj.to = { x: c.x + (res.traj.to.x - c.x) / bonus, z: c.z + (res.traj.to.z - c.z) / bonus };
      this.emit('passBonus', { player: pl, bonus, passes, set: !!sb });
    }
    const rateMul = mv.special && this.tilt ? levelFx(pl.swing && pl.swing.slot).velocidade : 1;
    // CPU às vezes pega mal na bola: sai torta, curta, longa ou na rede.
    if (pl.ai && !res.toMate && Math.random() < this.paramsOf(pl).shank) {
      // mais comum sair longa ou pela lateral do que ir na rede
      const tr = res.traj;
      tr.to.x += -pl.side * rand(-0.3, 2.6);
      tr.to.z += (Math.random() < 0.5 ? -1 : 1) * rand(1.2, 3.2);
      tr.apex *= rand(0.85, 1.15);
      this.emit('shank', { player: pl });
    }
    if (!res.toMate) this.applyWeather(res.traj, pl); // a defesa especial vai direto no parceiro
    if (res.banana) this.emit('callout', { text: 'BANANA SHOT!', small: true, team: pl.team });
    // 3.0: todo especial é enganoso (a CPU demora mais para ler)
    this.ball.launchPath(this.ball.pos, res.traj, {
      deceptive: !!res.deceptive || !!mv.special, special: !!mv.special, color: mv.special ? pl.char.color : null, speed, rateMul, banana: !!res.banana,
    });
    if (this.lastTeam === pl.team) { team.touches++; this.touchedBy.push(pl); }
    else { team.touches = 1; this.touchedBy = [pl]; }
    this.lastTeam = pl.team;
    this.lastToucher = pl;
    this.passTo = ctx.partner; // quem deve receber (o alvo do passe deste toque)
    if (tm && tm.q < 0.12 && !mv.special) this.emit('callout', { text: 'NO TEMPO!', small: true, team: pl.team });
    if (mv.special) {
      // 5.0: o especial gasta o custo do nível dele (50% ou 100%)
      pl.meter = Math.max(0, pl.meter - (pl.swing && pl.swing.cost != null ? pl.swing.cost : SPECIAL.max));
      this.timeScale = 0.3;
      this.slowT = 0.55;
      this.emit('special', { player: pl, move: mv });
      if (res.toMate) {
        const L = (V5.defesaEspecial || {})[SLOTS[pl.swing && pl.swing.slot] ? SLOTS[pl.swing.slot].nivel : 100] || {};
        res.toMate.setBonus = { team: pl.team, bonus: +(L.bonus ?? 0.5), hitbox: +(L.hitbox ?? 1.3) };
        this.emit('callout', { text: 'LEVANTADA PERFEITA!', team: pl.team });
        this.emit('setBonus', { player: res.toMate, from: pl });
      }
    } else {
      // Kids Mode: sem especiais, a barra não enche
      if (!this.kids) pl.meter = Math.min(SPECIAL.max, pl.meter + SPECIAL.perTouch * pl.mods.meter); // 5.0: igual em todo toque
      this.emit('callout', { text: mv.name, small: true, team: pl.team });
    }
    if (mv.fall) pl.fallAfter = mv.fall;
    this.emit('hit', { player: pl, move: mv, speed: Math.hypot(this.ball.vel.x, this.ball.vel.y, this.ball.vel.z),
      kind: pl.swing ? pl.swing.kind : null, tilt: pl.swing && pl.swing.tilt ? { ...pl.swing.tilt, base: Math.atan2(0, -pl.side) } : null, touchNo });
    this.onPathChange();
  }

  // 4.0: clima — chuva espalha o destino (área maior), vento desvia a direção (−18° a +18°),
  // sol forte gasta o Pique de quem toca (o protetor solar anula)
  applyWeather(traj, pl) {
    if (!this.weather.length || !traj || !traj.to) return;
    const b = this.ball.pos, to = traj.to;
    if (this.weather.includes('vento')) {
      const a = rand(-1, 1) * WEATHER_FX.windDeg * Math.PI / 180, dx = to.x - b.x, dz = to.z - b.z;
      let x = b.x + dx * Math.cos(a) - dz * Math.sin(a);
      if (Math.sign(x) !== Math.sign(to.x) && Math.abs(to.x) > 0.3) x = 0.3 * Math.sign(to.x); // não troca de lado da rede
      traj.to = { x, z: b.z + dx * Math.sin(a) + dz * Math.cos(a) };
    }
    if (this.weather.includes('chuva')) {
      const r = WEATHER_FX.rainScatter * Math.sqrt(Math.random()), t = Math.random() * Math.PI * 2;
      const x = traj.to.x + Math.cos(t) * r;
      traj.to = { x: Math.sign(x) === Math.sign(traj.to.x) ? x : traj.to.x, z: traj.to.z + Math.sin(t) * r };
    }
    if (this.weather.includes('sol') && pl && pl.cond && !pl.cond.sunblock && !pl.cond.immune) {
      pl.cond.sunLoss = Math.min(WEATHER_FX.sunMax, (pl.cond.sunLoss || 0) + WEATHER_FX.sunPique * (pl.cond.visor ? WEATHER_FX.visor : 1));
      refreshMods(pl);
    }
  }

  // 4.0: pausa (tempo técnico) do time: usa um consumível liberado em um atleta do time
  useTimeout(ti, pl, id) {
    const t = this.teams[ti];
    if (!t || t.timeouts <= 0 || !this.consumables.includes(id) || !pl || pl.team !== ti) return null;
    t.timeouts--;
    const text = consume(pl, id);
    this.emit('consume', { player: pl, item: id, text });
    return text;
  }

  // 5.0: pausa técnica da troca de lado — os atletas do time escolhem (no máximo 1 cada); devolve os textos
  consumePicks(picks) {
    const out = [];
    for (const { pl, id } of picks) {
      if (!id || !this.consumables.includes(id) || !pl) continue;
      const text = consume(pl, id);
      this.emit('consume', { player: pl, item: id, text });
      out.push(`${pl.char.name}: ${CONSUMABLES[id] ? CONSUMABLES[id].name : id}`);
    }
    return out;
  }
  // 5.0: na mesma pausa, cada atleta da CPU (dos dois times) pega um consumível ao acaso — 30% de chance de nada
  cpuConsume(team = null) {
    const out = [];
    for (const pl of this.players) {
      if (team !== null && pl.team !== team) continue; // 5.0: tempo técnico de uma dupla só
      if (!pl.ai || !this.consumables.length || Math.random() < 0.3) continue;
      const id = this.consumables[Math.floor(Math.random() * this.consumables.length)];
      const text = consume(pl, id);
      this.emit('consume', { player: pl, item: id, text });
      out.push(`${pl.char.name} (CPU): ${CONSUMABLES[id] ? CONSUMABLES[id].name : id}`);
    }
    return out;
  }
  // (antigo) pausa técnica pelo menu — cada atleta escolhido usa no máximo 1 consumível; depois, cada atleta da CPU
  // (dos dois times) consome um ao acaso, com 30% de chance de não pegar nada. Devolve os textos.
  useTimeoutPicks(ti, picks) {
    const t = this.teams[ti];
    if (!t || t.timeouts <= 0) return null;
    t.timeouts--;
    const out = [];
    for (const { pl, id } of picks) {
      if (!id || !this.consumables.includes(id) || !pl || pl.team !== ti) continue;
      const text = consume(pl, id);
      this.emit('consume', { player: pl, item: id, text });
      out.push(`${pl.char.name}: ${CONSUMABLES[id] ? CONSUMABLES[id].name : id}`);
    }
    const done = new Set(picks.map(p => p.pl));
    for (const pl of this.players) {
      if (!pl.ai || done.has(pl) || !this.consumables.length) continue;
      if (Math.random() < 0.3) continue; // 30%: a CPU não consome nada
      const id = this.consumables[Math.floor(Math.random() * this.consumables.length)];
      const text = consume(pl, id);
      this.emit('consume', { player: pl, item: id, text });
      out.push(`${pl.char.name} (CPU): ${CONSUMABLES[id] ? CONSUMABLES[id].name : id}`);
    }
    return out;
  }

  // Efeito da nota da ação (o Pique define o quanto pesa).
  applyGrade(pl, grade) {
    const sev = pl.mods.severity;
    if (grade === 'pior') pl.knockDown(1.0 * sev);
    else if (grade === 'ruim') pl.pushBack(1.0 * sev);
    // (3.0: o bônus do Ótimo vai para o próximo toque do time — team.flowGrade em performHit)
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
    if (this.drain) {
      const sun = this.weather.includes('sol');
      for (const p of this.players) {
        if (p.cond.immune) continue;
        p.cond.fome = Math.min(100, p.cond.fome + MATCH_DRAIN.fome);
        p.cond.sede = Math.min(100, p.cond.sede + MATCH_DRAIN.sede + (sun && !p.cond.sunblock ? MATCH_DRAIN.sunSede : 0));
        refreshMods(p);
      }
    }
    if (this.practice) {
      // treino (tutorial): sem placar; quem saca é sempre o time da CPU
      this.nextServe = this.teams[0].human ? 1 : 0;
      this.state = 'point'; this.timer = 0; this.ball.kill(); this.cpu.plans = [null, null];
      this.players.forEach(p => { p.hold = null; p.telegraph = null; });
      this.emit('point', { winner: w, reason, practice: true });
      this.pendingSwap = false;
      return;
    }
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
    if ((a >= this.pointsToWin || b >= this.pointsToWin) && Math.abs(a - b) >= 2) {
      this.setsWon[w]++;
      this.setHistory.push([a, b]);
      if (this.setsWon[w] >= Math.ceil(this.setPoints.length / 2)) {
        this.state = 'over';
        this.winner = w;
        this.emit('over', { winner: w });
        return;
      }
      // 5.0: fim de set (melhor de 3) — o jogo espera o intervalo e o próximo sorteio / escolha
      this.state = 'setover';
      this.emit('setOver', { winner: w, setNo: this.setNo, score: [a, b], setsWon: [...this.setsWon] });
      return;
    }
    // Regra oficial: a cada 6 pontos disputados (somando as duas duplas), troca de lado
    // (5.0: no set decisivo de 15 pontos, a cada 5)
    this.pendingSwap = (a + b) % this.swapEvery === 0;
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
