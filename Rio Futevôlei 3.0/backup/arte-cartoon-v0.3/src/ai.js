import { P, CPU, SPECIAL, COURT } from './config.js';
import { MOVES, pickMove, gauss } from './moves.js';

const rnd = Math.random;
const rand = (a, b) => a + rnd() * (b - a);

// Posição padrão de cada atleta conforme a formação da dupla (botão R troca rede/fundo).
export function formationSpot(m, pl) {
  const t = m.teams[pl.team];
  const s = t.side;
  const net = pl.idx === t.netIdx;
  if (m.state === 'serve' && m.servingTeam !== pl.team) {
    return net ? { x: s * 3.2, z: -1.6 } : { x: s * 6.4, z: 1.6 };
  }
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

// Mira da CPU: joga para o lado da quadra onde a defesa adversária está mais aberta.
export function cpuAim(m, ti) {
  const hs = m.teamPlayers(1 - ti);
  const avgZ = hs.reduce((a, p) => a + p.z, 0) / hs.length;
  const l = avgZ > 0 ? -rand(0.3, 1) : rand(0.3, 1);
  return { f: rand(-0.6, 0.9), l };
}

// Recalculado sempre que a trajetória da bola muda.
export function cpuPlan(m, ti) {
  const t = m.teams[ti];
  const b = m.ball;
  const touchNo = m.lastTeam === ti ? t.touches + 1 : 1;
  const ground = b.contactPoint(1.15, t.side);
  m.cpu.plans[ti] = null;
  if (!ground || touchNo > 3) return;

  // A CPU deixa passar a maioria das bolas que vão para fora.
  const land = b.landing();
  const out = land && (Math.abs(land.x) > COURT.halfLen + 0.2 || Math.abs(land.z) > COURT.halfWid + 0.2);
  if (out && m.lastTeam !== ti && rnd() < 0.85) return;

  const tps = m.teamPlayers(ti);
  const receiver = (m.lastToucher && m.lastToucher.team === ti) ? m.partnerOf(m.lastToucher) : nearest(tps, ground);
  // Bola forte ou enganosa é mais difícil de ler: reação e leitura pioram.
  const speed = Math.hypot(b.vel.x, b.vel.y, b.vel.z);
  const hard = Math.min(1, Math.max(0, (speed - 9) / 10)) + (b.deceptive ? 0.5 : 0);
  const judgeR = CPU.judge * (0.6 + hard) * (touchNo === 1 ? 1 : 0.5); // passe do parceiro é mais fácil de ler
  const plan = {
    receiver, touchNo, kind: 'ground', target: ground, choice: null, aim: null,
    react: rand(...CPU.react) + (b.deceptive ? CPU.deceptiveExtra : 0),
    speedMul: rand(...CPU.speedVar),
    judge: { x: gauss() * judgeR, z: gauss() * judgeR },
    jumped: false, dove: false,
  };
  const spMove = MOVES[receiver.char.special];
  const full = receiver.meter >= SPECIAL.max;
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
    const special = full && spMove.id !== 'sarrada' && rnd() < 0.6;
    if (high && (special || (Math.abs(high.x) < 2.1 && rnd() < 0.7))) {
      plan.kind = special ? 'special' : 'air';
      plan.target = high;
      plan.choice = special ? receiver.char.special : 'sharkAttack';
    } else {
      plan.choice = rnd() < 0.35 ? 'pingo' : 'chuteColocado';
    }
    plan.aim = cpuAim(m, ti);
  } else if (touchNo === 2) {
    plan.choice = rnd() < 0.5 ? 'naFita' : 'ombro';
  } else {
    const fast = Math.hypot(b.vel.x, b.vel.y, b.vel.z) > 12;
    plan.choice = !fast && rnd() < 0.5 ? 'pe' : 'peito';
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
    const aim = touchNo === 3 || mv.special ? (plan.aim || cpuAim(m, pl.team)) : { f: rand(-0.2, 0.2), l: rand(-0.2, 0.2) };
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
    pl.telegraph = null;
    if (!plan || plan.receiver !== pl) {
      pl.update(dt, pl.canAct() ? steer(pl, formationSpot(m, pl), CPU.speed) : null);
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
    const want = pl.canAct() ? steer(pl, goal, CPU.speed * plan.speedMul) : null;
    const air = plan.kind === 'air' || plan.kind === 'special';
    if (tLeft < (air ? 0.75 : 0.5) && tLeft > -0.2) pl.telegraph = telegraphFor(m, pl, plan);
    if ((plan.kind === 'air' || plan.kind === 'special') && pl.state === 'ground' && !plan.jumped && tLeft < 0.42 && tLeft > 0) {
      pl.jump();
      plan.jumped = true;
    }
    const dist = Math.hypot(goal.x - pl.x, goal.z - pl.z);
    if (plan.kind === 'ground' && pl.state === 'ground' && !plan.dove && tLeft < 0.32 && dist > 1.3 && dist < CPU.diveMax) {
      pl.dive({ x: goal.x - pl.x, z: goal.z - pl.z });
      plan.dove = true;
    }
    pl.update(dt, want);
    cpuTryHit(m, pl, plan);
  }
}
