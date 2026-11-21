import { P, SPECIAL, COURT } from './config.js';
import { MOVES, pickMove, gauss } from './moves.js';

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
  const hard = Math.min(1, Math.max(0, (speed - 9) / 10)) + (b.deceptive ? 0.5 : 0);
  const judgeR = C.judge * (0.6 + hard) * (touchNo === 1 ? 1 : 0.5); // passe do parceiro é mais fácil de ler
  const smart = () => rnd() < C.smart;
  const plan = {
    receiver, touchNo, kind: 'ground', target: ground, choice: null, aim: null,
    react: rand(...C.react) + (b.deceptive ? C.deceptiveExtra : 0),
    speedMul: rand(...C.speedVar),
    judge: { x: gauss() * judgeR, z: gauss() * judgeR },
    jumped: false, dove: false,
  };
  const spMove = MOVES[receiver.char.special];
  const full = receiver.meter >= SPECIAL.max && rnd() < C.special;
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
  if (touchNo === 3) {
    const high = b.contactPoint(2.35, t.side);
    const special = full && spMove.id !== 'sarrada';
    const thinks = smart();
    // esperta: shark só colada na rede; pingo se a defesa está no fundo; senão chute colocado
    const nearNet = high && Math.abs(high.x) < 2.1;
    const defenders = m.teamPlayers(1 - ti);
    const deep = defenders.reduce((a, p) => a + Math.abs(p.x), 0) / defenders.length > 4.5;
    if (high && (special || (thinks ? nearNet && rnd() < 0.9 : rnd() < 0.45))) {
      plan.kind = special ? 'special' : 'air';
      plan.target = high;
      plan.choice = special ? receiver.char.special : 'sharkAttack';
    } else {
      plan.choice = thinks ? (deep ? 'pingo' : 'chuteColocado') : (rnd() < 0.35 ? 'pingo' : 'chuteColocado');
    }
    plan.aim = cpuAim(m, ti, smart());
  } else if (touchNo === 2) {
    // esperta: na fita se a bola chega perto da rede (arma o shark), ombro se chega longe
    plan.choice = smart() ? (Math.abs(ground.x) < 3 ? 'naFita' : 'ombro') : (rnd() < 0.5 ? 'naFita' : 'ombro');
  } else {
    // esperta: peito para bola forte, pé para bola lenta (o golpe "ótimo" de cada uma)
    const fast = speed > 12;
    plan.choice = smart() ? (fast ? 'peito' : 'pe') : (rnd() < 0.5 ? 'pe' : 'peito');
  }
  m.cpu.plans[ti] = plan;
}

function candidates(m, pl, plan, touchNo, air) {
  if (air) {
    const fallback = pickMove('A', true, touchNo);
    if (plan.kind === 'special' && pl.meter >= SPECIAL.max) return [pl.char.special, fallback];
    if (plan.kind === 'special') return [fallback];
    if (touchNo === 3) return plan.choice === 'sharkAttack' ? ['sharkAttack', 'cabecada'] : ['cabecada'];
    return [pickMove('A', true, touchNo)];
  }
  // Para usar pé / na fita a CPU espera a bola baixar; bola forte pede peito.
  if (touchNo === 1) return plan.choice === 'pe' ? ['pe'] : ['peito', 'pe'];
  if (touchNo === 2) return plan.choice === 'naFita' ? ['naFita'] : ['ombro', 'naFita'];
  return plan.choice === 'pingo' ? ['pingo', 'chuteColocado'] : ['chuteColocado', 'pingo'];
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
    if (plan.kind === 'ground' && pl.state === 'ground' && !plan.dove && tLeft < 0.32 && dist > 1.3 && dist < C.diveMax) {
      pl.dive({ x: goal.x - pl.x, z: goal.z - pl.z });
      plan.dove = true;
    }
    pl.update(dt, want);
    cpuTryHit(m, pl, plan);
  }
}
