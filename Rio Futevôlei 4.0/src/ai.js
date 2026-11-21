import { P, SPECIAL, COURT } from './config.js';
import { MOVES, pickMove, gauss } from './moves.js';
import AI_TREE from './data/ai-tree.js';

const rnd = Math.random;
const rand = (a, b) => a + rnd() * (b - a);

// Posição padrão de cada atleta conforme a formação do time (botão R troca quem fica na rede).
//   1x1: no meio da quadra · dupla: um na rede, um no fundo · trinca: um na rede, dois no fundo
export function formationSpot(m, pl) {
  const t = m.teams[pl.team];
  const s = t.side;
  const receiving = m.state === 'serve' && m.servingTeam !== pl.team;
  if (m.size === 1) return receiving ? { x: s * 5.6, z: 0 } : { x: s * 4.5, z: 0 };
  const net = pl.idx === t.netIdx;
  if (m.size === 3) {
    if (net) return receiving ? { x: s * 3.2, z: 0 } : { x: s * 2.3, z: 0 };
    // os dois do fundo: o de índice menor do lado do mar (z < 0), o outro do lado do calçadão
    const backs = m.teamPlayers(pl.team).filter(p => p.idx !== t.netIdx);
    const z = backs[0] === pl ? -2.3 : 2.3;
    return receiving ? { x: s * 6.4, z } : { x: s * 6.0, z };
  }
  if (receiving) return net ? { x: s * 3.2, z: -1.6 } : { x: s * 6.4, z: 1.6 };
  return net ? { x: s * 2.3, z: -1.2 } : { x: s * 6.1, z: 1.4 };
}

export function steer(pl, target, speed = P.speed) {
  const dx = target.x - pl.x, dz = target.z - pl.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.06) return { x: 0, z: 0, mul: 0, speed };
  return { x: dx / d, z: dz / d, mul: Math.min(1, d / 0.7), speed };
}

export function nearest(players, pt) {
  let best = players[0], bd = Infinity;
  for (const p of players) {
    const d = Math.hypot(p.x - pt.x, p.z - pt.z);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

// Mira da CPU. Esperta: joga no espaço vazio (lado aberto e, se a defesa está no
// fundo, curto; se está na rede, fundo). Senão, mira mais ou menos a esmo.
export function cpuAim(m, ti, smart = true) {
  if (!smart) return { f: rand(-0.8, 0.8), l: rand(-1, 1) };
  const hs = m.teamPlayers(1 - ti);
  const avgZ = hs.reduce((a, p) => a + p.z, 0) / hs.length;
  const avgDepth = hs.reduce((a, p) => a + Math.abs(p.x), 0) / hs.length;
  const l = avgZ > 0 ? -rand(0.55, 1) : rand(0.55, 1);
  const f = avgDepth > 4.5 ? rand(-0.8, -0.3) : rand(0.4, 0.95);
  return { f, l };
}

// Recalculado sempre que a trajetória da bola muda.
export function cpuPlan(m, ti) {
  const t = m.teams[ti];
  const b = m.ball;
  const touchNo = m.lastTeam === ti ? t.touches + 1 : 1;
  const ground = b.contactPoint(1.15, t.side);
  m.cpu.plans[ti] = null;
  if (!ground || touchNo > 3) return;

  const tps = m.teamPlayers(ti);
  // quem recebe: o alvo do passe do companheiro, ou quem está mais perto da bola.
  // Se for o atleta de um humano, a CPU só posiciona os outros (o humano joga a bola).
  const receiver = (m.lastToucher && m.lastToucher.team === ti) ? m.receiverAfter(m.lastToucher) : nearest(tps, ground);
  // a jogada segue o nível de quem vai receber
  const C = m.paramsOf(receiver);

  // A CPU deixa passar as bolas que vão para fora (as mais fracas nem sempre percebem).
  const land = b.landing();
  const out = land && (Math.abs(land.x) > COURT.halfLen + 0.2 || Math.abs(land.z) > COURT.halfWid + 0.2);
  if (out && m.lastTeam !== ti && rnd() < C.outRead) return;
  // Bola forte ou enganosa é mais difícil de ler: reação e leitura pioram.
  const speed = Math.hypot(b.vel.x, b.vel.y, b.vel.z);
  // 3.0: o especial é ainda mais difícil de ler (decisivo)
  const hard = Math.min(1, Math.max(0, (speed - 9) / 10)) + (b.deceptive ? 0.5 : 0) + (b.special ? 0.5 : 0);
  const judgeR = C.judge * (0.6 + hard) * (touchNo === 1 ? 1 : 0.5); // passe do parceiro é mais fácil de ler
  const smart = () => rnd() < C.smart;
  const plan = {
    receiver, touchNo, kind: 'ground', target: ground, choice: null, aim: null,
    react: rand(...C.react) + (b.deceptive ? C.deceptiveExtra : 0) + (b.special ? 0.12 : 0),
    speedMul: rand(...C.speedVar),
    judge: { x: gauss() * judgeR, z: gauss() * judgeR },
    jumped: false, dove: false,
  };
  const spMove = MOVES[receiver.char.special];
  const full = !m.kids && receiver.meter >= SPECIAL.max && rnd() < C.special; // Kids Mode: sem especiais
  // especial de defesa (Sarrada, Escorpião) no 1º toque, em bola difícil
  if (touchNo === 1 && full && spMove.defense && (speed > 11 || rnd() < 0.3)) {
    const high = b.contactPoint(1.7, t.side);
    if (high) {
      plan.kind = 'special';
      plan.target = high;
      plan.choice = receiver.char.special;
      plan.aim = { f: 0, l: 0 };
      m.cpu.plans[ti] = plan;
      return;
    }
  }
  // 3º toque com a barra cheia: especial de ataque (regra própria, fora da árvore)
  const high3 = touchNo === 3 ? b.contactPoint(AI_HIGH[3], t.side) : null;
  if (high3 && full && spMove.id !== 'sarrada') {
    plan.kind = 'special';
    plan.target = high3;
    plan.choice = receiver.char.special;
  } else {
    // árvore de decisão (src/data/ai-tree.js): a esperteza do nível é a chance de segui-la;
    // senão, um golpe possível do toque ao acaso
    const defenders = m.teamPlayers(1 - ti);
    const vars = {
      netDist: Math.abs(ground.x),
      defDepth: defenders.reduce((a, p) => a + Math.abs(p.x), 0) / defenders.length,
      ballSpeed: speed,
    };
    const pick = smart() ? treeChoice(touchNo, vars, b, t.side) : randomChoice(touchNo, b, t.side, vars);
    plan.choice = pick.move;
    if (pick.high) { plan.kind = 'air'; plan.target = pick.high; }
  }
  if (touchNo === 3) plan.aim = cpuAim(m, ti, smart());
  m.cpu.plans[ti] = plan;
}

// ---------- árvore de decisão ----------
// golpes que a CPU usa em cada toque, no chão e no ar
export const AI_MOVES = {
  1: { ground: ['peito', 'pe'], air: ['cabeca'] },
  2: { ground: ['ombro', 'naFita'], air: ['ataqueSegunda', 'cabecaSet'] },
  3: { ground: ['chuteColocado', 'pingo'], air: ['sharkAttack', 'cabecada'] },
};
// variáveis das condições da árvore
export const AI_VARS = {
  netDist: { label: 'Distância da rede', unit: 'm', hint: 'no ponto de contato' },
  defDepth: { label: 'Defesa adversária no fundo', unit: 'm', hint: 'distância média dos adversários até a rede' },
  ballSpeed: { label: 'Velocidade da bola recebida', unit: 'm/s', hint: '10 m/s = 36 km/h' },
};
// altura em que a CPU pula para encontrar a bola nos golpes de ar, por toque
const AI_HIGH = { 1: 1.9, 2: 2.2, 3: 2.35 };
const isAir = (touchNo, id) => AI_MOVES[touchNo].air.includes(id);
const test = (c, vars) => (c.op === '<' ? vars[c.v] < c.x : vars[c.v] > c.x);
// golpe escolhido: { move, high } (high = ponto no alto para pular, nos golpes de ar)
function airPick(touchNo, id, b, side) {
  const high = b.contactPoint(AI_HIGH[touchNo], side);
  return high ? { move: id, high } : null;
}
function treeChoice(touchNo, vars, b, side) {
  const tree = AI_TREE[touchNo] || { rules: [] };
  for (const r of tree.rules || []) {
    if (!MOVES[r.move] || !(r.when || []).every(c => test(c, vars))) continue;
    if (rnd() * 100 >= (r.chance ?? 100)) continue;
    if (!isAir(touchNo, r.move)) return { move: r.move };
    const p = airPick(touchNo, r.move, b, side);
    if (p) return p; // bola alta demais para pular: tenta a próxima regra
  }
  const fb = MOVES[tree.fallback] ? tree.fallback : AI_MOVES[touchNo].ground[0];
  return (isAir(touchNo, fb) && airPick(touchNo, fb, b, side)) || { move: isAir(touchNo, fb) ? AI_MOVES[touchNo].ground[0] : fb };
}
// 3.0: ataques de cima só perto da rede, mesmo quando a CPU não segue a árvore
// (de longe o Shark Attack vai na rede e o ataque de segunda vira bola boba)
const NEAR_NET_ONLY = { sharkAttack: 1.8, ataqueSegunda: 2.5 };
const allowed = (id, vars) => !NEAR_NET_ONLY[id] || (vars && vars.netDist < NEAR_NET_ONLY[id]);
function randomChoice(touchNo, b, side, vars) {
  const list = AI_MOVES[touchNo];
  const high = b.contactPoint(AI_HIGH[touchNo], side);
  const all = (high ? [...list.ground, ...list.air] : list.ground).filter(id => allowed(id, vars));
  const id = all[Math.floor(rnd() * all.length)];
  return isAir(touchNo, id) ? { move: id, high } : { move: id };
}

// Golpes que a CPU tenta, em ordem, quando a bola entra no alcance. Pé e na fita esperam a bola
// baixar (não trocam por outro golpe).
const WAIT = new Set(['pe', 'naFita']);
function candidates(m, pl, plan, touchNo, air) {
  const list = AI_MOVES[Math.min(touchNo, 3)];
  if (air) {
    const fallback = pickMove('A', true, touchNo);
    if (plan.kind === 'special' && pl.meter >= SPECIAL.max) return [pl.char.special, fallback];
    if (plan.kind === 'special') return [fallback];
    // 3.0: o golpe de cima planejado; de reserva só os que não dependem de estar colado na rede
    if (list.air.includes(plan.choice)) return [plan.choice, ...list.air.filter(id => id !== plan.choice && !NEAR_NET_ONLY[id])];
    return [fallback];
  }
  if (!list.ground.includes(plan.choice)) return list.ground;
  if (WAIT.has(plan.choice)) return [plan.choice];
  return [plan.choice, ...list.ground.filter(id => id !== plan.choice)];
}

function cpuTryHit(m, pl, plan) {
  if (pl.swing || !pl.canAct()) return;
  const touchNo = m.touchNoFor(pl);
  if (touchNo > 3) return;
  const air = pl.state === 'air';
  for (const id of candidates(m, pl, plan, touchNo, air)) {
    const mv = MOVES[id];
    if (!m.inZone(pl, mv)) continue;
    // A CPU sabe que o shark precisa da bola acima da fita; se passou do ponto, cabeceia.
    if (mv.anim === 'shark' && m.ball.pos.y < COURT.netH + 0.3) continue;
    const aim = touchNo === 3 || mv.special ? (plan.aim || cpuAim(m, pl.team, rnd() < m.paramsOf(pl).smart)) : { f: rand(-0.2, 0.2), l: rand(-0.2, 0.2) };
    if (mv.special) m.startSpecial(pl, aim);
    else pl.startSwing('hit', mv.btn, aim, mv.anim, air);
    m.tryContact(pl);
    return;
  }
}

// Animação de preparação que a CPU mostra antes do golpe (para o adversário ler).
function telegraphFor(m, pl, plan) {
  if (plan.kind === 'special') return MOVES[pl.char.special].anim;
  if (plan.choice && MOVES[plan.choice]) return MOVES[plan.choice].anim;
  return MOVES[pickMove('A', pl.state === 'air', plan.touchNo)].anim;
}

export function cpuUpdate(m, dt, ti) {
  const plan = m.cpu.plans[ti];
  for (const pl of m.teamPlayers(ti)) {
    if (!pl.ai) continue; // atleta de um humano: quem move é o jogador
    const C = m.paramsOf(pl); // cada atleta corre e reage no seu próprio nível
    pl.telegraph = null;
    if (!plan || plan.receiver !== pl) {
      pl.update(dt, pl.canAct() ? steer(pl, formationSpot(m, pl), C.speed) : null);
      continue;
    }
    if (plan.react > 0) {
      plan.react -= dt;
      pl.update(dt, null);
      continue;
    }
    const tg = plan.target;
    const tLeft = tg.t - m.ball.t;
    // A leitura errada vai sendo corrigida conforme a bola chega — às vezes tarde demais.
    const fade = Math.min(1, Math.max(0, (tLeft - 0.1) / 0.9));
    // fica com a bola à frente do corpo (o corpo já está virado para a bola)
    const goal = { x: tg.x - pl.facing * 0.3 + plan.judge.x * fade, z: tg.z + plan.judge.z * fade };
    const want = pl.canAct() ? steer(pl, goal, C.speed * plan.speedMul) : null;
    const air = plan.kind === 'air' || plan.kind === 'special';
    if (tLeft < (air ? 0.75 : 0.5) && tLeft > -0.2) pl.telegraph = telegraphFor(m, pl, plan);
    if ((plan.kind === 'air' || plan.kind === 'special') && pl.state === 'ground' && !plan.jumped && tLeft < 0.42 && tLeft > 0) {
      pl.jump();
      plan.jumped = true;
    }
    const dist = Math.hypot(goal.x - pl.x, goal.z - pl.z);
    // (Kids Mode: sem carrinho)
    if (!m.kids && plan.kind === 'ground' && pl.state === 'ground' && !plan.dove && tLeft < 0.32 && dist > 1.3 && dist < C.diveMax) {
      pl.dive({ x: goal.x - pl.x, z: goal.z - pl.z });
      plan.dove = true;
    }
    pl.update(dt, want);
    cpuTryHit(m, pl, plan);
  }
}
