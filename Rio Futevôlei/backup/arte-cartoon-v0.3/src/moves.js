import { G, COURT, BALL_R } from './config.js';

// Cada golpe recebe um contexto c:
//   p        posição da bola no contato
//   s        lado do time (-1 esquerda, +1 direita)
//   partner  o parceiro de dupla
//   aim      { f, l }  f = +1 em direção à rede / fundo adversário, l = -1 longe da câmera, +1 perto
//   inSpeed  velocidade da bola recebida (bola forte é mais difícil de dominar)
//   err      erro extra (CPU)
//   touchNo  número do toque da equipe (1..3)
// e retorna { v, curve?, deceptive? }.

const rnd = Math.random;
export const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clampZ = z => clamp(z, -4.3, 4.3);

export function velFromT(p, t, vy, T, curve) {
  const cx = curve ? curve.x : 0, cz = curve ? curve.z : 0;
  return {
    x: (t.x - p.x - 0.5 * cx * T * T) / T,
    y: vy,
    z: (t.z - p.z - 0.5 * cz * T * T) / T,
  };
}

// Trajetória com altura máxima definida (passes, levantamentos, lobs).
export function solveApex(p, t, apex, ty = 0.15, curve = null) {
  const H = Math.max(apex, p.y + 0.2, ty + 0.2);
  const vy = Math.sqrt(2 * G * (H - p.y));
  const T = vy / G + Math.sqrt(2 * (H - ty) / G);
  return velFromT(p, t, vy, T, curve);
}

// Trajetória com velocidade vertical inicial definida (ataques).
export function solveVy(p, t, vy, ty = 0.15, curve = null) {
  const c = p.y - ty;
  const T = (vy + Math.sqrt(Math.max(vy * vy + 2 * G * c, 0.01))) / G;
  return velFromT(p, t, vy, Math.max(T, 0.12), curve);
}

function yAtNet(p, v) {
  if (Math.abs(v.x) < 1e-3 || Math.sign(-p.x) !== Math.sign(v.x)) return null;
  const t = -p.x / v.x;
  return p.y + v.y * t - 0.5 * G * t * t;
}

// Ataque: sobe a curva até passar a rede, a menos que clear = false
// (o Shark Attack de longe vai na rede, como na vida real).
function attack(p, t, vy, { clear = true, margin = 0.3, curve = null } = {}) {
  let v = solveVy(p, t, vy, 0.15, curve);
  if (clear) {
    for (let i = 0; i < 40; i++) {
      const y = yAtNet(p, v);
      if (y === null || y > COURT.netH + BALL_R + margin) break;
      vy += 0.3;
      v = solveVy(p, t, vy, 0.15, curve);
    }
  }
  return v;
}

function lob(p, t, apex, ty = 0.15) {
  let v = solveApex(p, t, apex, ty);
  for (let i = 0; i < 30; i++) {
    const y = yAtNet(p, v);
    if (y === null || y > COURT.netH + BALL_R + 0.35) break;
    apex += 0.3;
    v = solveApex(p, t, apex, ty);
  }
  return v;
}

// Multiplicador de erro do atleta que está batendo (atributo Precisão), definido pela partida.
export const tune = { error: 1 };

const opp = (c, d, z) => ({ x: -c.s * clamp(d, 0.6, 9.4), z });
const own = (c, d, z) => ({ x: c.s * clamp(d, 0.4, 8.6), z });
const jit = (t, r) => { const e = r * tune.error; t.x += gauss() * e; t.z += gauss() * e; return t; };
const hard = c => Math.max(0, c.inSpeed - 9);
const keepOwn = (c, t, min = 0.35) => { if (t.x * c.s < min) t.x = c.s * min; return t; };
function toPartner(c, nudge = 1) {
  const q = c.partner;
  return own(c, Math.abs(q.x) - c.aim.f * nudge, clampZ(q.z + c.aim.l * nudge));
}

export const MOVES = {
  // ---------- 1º toque: domínio ----------
  // Peito: amortece bola forte. Menos preciso, mas aguenta pancada.
  peito: {
    name: 'Domínio de peito', btn: 'A', band: [0.75, 2.0], anim: 'chest',
    exec: c => ({ v: solveApex(c.p, keepOwn(c, jit(toPartner(c), 0.2 + 0.03 * hard(c) + c.err)), 4.4, 1.1) }),
  },
  // Pé: o passe mais preciso com bola lenta; sofre com bola forte.
  pe: {
    name: 'Domínio de pé', btn: 'B', band: [0, 1.15], anim: 'poke',
    exec: c => ({ v: solveApex(c.p, keepOwn(c, jit(toPartner(c), 0.1 + 0.13 * hard(c) + c.err)), 3.6, 1.1) }),
  },
  cabeca: {
    name: 'Cabeça', btn: 'A', air: true, band: [1.1, 2.9], anim: 'header',
    exec: c => ({ v: solveApex(c.p, keepOwn(c, jit(toPartner(c), 0.2 + 0.06 * hard(c) + c.err)), 4.0, 1.1) }),
  },
  // Shark no bloqueio: devolve o ataque colado na rede. Longe da rede, vira um toque ruim.
  sharkBlock: {
    name: 'Shark (bloqueio)', btn: 'B', air: true, band: [1.2, 3.1], anim: 'shark',
    exec: c => {
      if (Math.abs(c.p.x) < 2.6) {
        const t = jit(opp(c, 2.4 + c.aim.f * 1.2, clampZ(c.p.z + c.aim.l * 2.5)), 0.6 + c.err);
        return { v: attack(c.p, t, -0.8, { clear: false }) };
      }
      return { v: solveApex(c.p, keepOwn(c, jit(toPartner(c), 0.9)), 3.4, 1.1) };
    },
  },

  // ---------- 2º toque: levantamento ----------
  // Ombro: levantamento alto, dá tempo ao atacante.
  ombro: {
    name: 'Passe de ombro', btn: 'A', band: [0.8, 2.0], anim: 'shoulder',
    exec: c => ({ v: solveApex(c.p, keepOwn(c, jit(own(c, 1.9 - c.aim.f * 0.8, clampZ(c.partner.z + c.aim.l * 1.5)), 0.25 + c.err)), 4.6, 1.4) }),
  },
  // Na fita: colado na rede e mais baixo. Arma o Shark Attack, mas exige tempo certo.
  naFita: {
    name: 'Na fita!', btn: 'B', band: [0, 1.15], anim: 'poke',
    exec: c => ({ v: solveApex(c.p, keepOwn(c, jit(own(c, 0.9 - c.aim.f * 0.4, clampZ(c.partner.z + c.aim.l * 1.2)), 0.12 + c.err), 0.4), 3.8, 1.8) }),
  },
  // Ataque de segunda: surpresa, pega a defesa ainda se armando.
  ataqueSegunda: {
    name: 'Ataque de segunda!', btn: 'A', air: true, band: [1.0, 2.9], anim: 'header',
    exec: c => ({ v: attack(c.p, jit(opp(c, 4.5 + c.aim.f * 3, clampZ(c.aim.l * 3.6)), 0.3 + c.err), 1.0), deceptive: true }),
  },
  cabecaSet: {
    name: 'Levantada de cabeça', btn: 'B', air: true, band: [1.0, 2.9], anim: 'header',
    exec: c => ({ v: solveApex(c.p, keepOwn(c, jit(own(c, 1.9 - c.aim.f * 0.8, clampZ(c.partner.z + c.aim.l * 1.5)), 0.3 + c.err)), 4.2, 1.4) }),
  },

  // ---------- 3º toque: ataque ----------
  // Chute colocado: colocação segura no fundo, em qualquer ponto da quadra.
  chuteColocado: {
    name: 'Chute colocado', btn: 'A', band: [0, 1.45], anim: 'kick',
    exec: c => ({ v: attack(c.p, jit(opp(c, 6.3 + c.aim.f * 2.3, clampZ(c.aim.l * 3.9)), 0.28 + c.err), 3.2) }),
  },
  // Pingo: bola curta logo após a rede. Pune a defesa recuada.
  pingo: {
    name: 'Pingo', btn: 'B', band: [0, 1.45], anim: 'poke',
    exec: c => ({ v: lob(c.p, jit(opp(c, 1.7 + c.aim.f, clampZ(c.aim.l * 3.4)), 0.3 + c.err), COURT.netH + 1.2) }),
  },
  // Cabeçada: bola funda na linha; nas diagonais vai para as quinas.
  cabecada: {
    name: 'Cabeçada', btn: 'A', air: true, band: [1.15, 2.9], anim: 'header',
    exec: c => ({ v: attack(c.p, jit(opp(c, 8.1 + c.aim.f * 0.9, clampZ(c.aim.l * 4.0)), 0.4 + c.err), 1.2) }),
  },
  // Shark Attack: o ataque mais forte, de cima para baixo. Só funciona perto da rede
  // (até ~2,2 m) e com a bola acima da fita; de longe ou com a bola baixa, vai na rede.
  sharkAttack: {
    name: 'Shark Attack!', btn: 'B', air: true, band: [1.3, 3.1], anim: 'shark',
    exec: c => {
      const vy = -3.0 - Math.max(0, 2.5 - Math.abs(c.p.x)) * 0.8;
      const ok = Math.abs(c.p.x) < 2.2 && c.p.y > COURT.netH + 0.2;
      return { v: attack(c.p, jit(opp(c, 3.9 + c.aim.f * 1.8, clampZ(c.aim.l * 3.7)), 0.35 + c.err), vy, { clear: ok, margin: 0.05 }) };
    },
  },

  // ---------- defesa ----------
  // Carrinho: busca com os pés a bola longe, mas o jogador fica no chão.
  carrinho: {
    name: 'Carrinho!', band: [0, 1.05], reach: 1.4, anim: 'slide',
    exec: c => c.touchNo < 3
      ? { v: solveApex(c.p, keepOwn(c, jit(toPartner(c, 0), 0.55 + c.err)), 3.8, 1.1) }
      : { v: lob(c.p, opp(c, 5.5, gauss() * 2), 4.5) },
  },

  // ---------- saque ----------
  saqueForte: {
    name: 'Saque forte', anim: 'kick',
    exec: c => ({ v: attack(c.p, jit(opp(c, 7.2 + c.aim.f * 1.5, clampZ(c.aim.l * 3.8)), 0.35 + c.err), 4.6, { margin: 0.5 }) }),
  },
  saqueColocado: {
    name: 'Saque viagem', anim: 'kick',
    exec: c => ({ v: lob(c.p, jit(opp(c, 4.6 + c.aim.f * 2.8, clampZ(c.aim.l * 3.6)), 0.3 + c.err), 7.5) }),
  },

  // ---------- especiais (C + C no ar, barra cheia) ----------
  // Bicicleta (Giulia): ponto de qualquer lugar, fundo e rápido. Cai na areia depois.
  bicicleta: {
    name: 'BICICLETA!', special: true, band: [0.5, 3.3], reach: 1.5, anim: 'bicicleta', fall: 0.85,
    exec: c => {
      const z = c.aim.l ? Math.sign(c.aim.l) * 4.0 : (rnd() < 0.5 ? -3.8 : 3.8);
      return { v: attack(c.p, jit(opp(c, 8.3 + c.aim.f * 0.7, z), 0.2), 0.2, { margin: 0.15 }), deceptive: true };
    },
  },
  // Meia-bicicleta (Zefa): diagonal cruzada com efeito, abre a quadra.
  meiaBicicleta: {
    name: 'MEIA-BICICLETA!', special: true, band: [0.5, 3.3], reach: 1.5, anim: 'meia', fall: 0.5,
    exec: c => {
      const side = c.aim.l ? Math.sign(c.aim.l) : (c.p.z >= 0 ? -1 : 1);
      const curve = { x: 0, z: side * 6 };
      return { v: attack(c.p, jit(opp(c, 5.0 + c.aim.f * 2, side * 3.9), 0.2), 1.6, { curve, margin: 0.2 }), curve, deceptive: true };
    },
  },
  // Shark Attack Supremo (Tubarão): finalização vertical que funciona até do meio da quadra.
  sharkSupremo: {
    name: 'SHARK ATTACK SUPREMO!', special: true, band: [0.5, 3.4], reach: 1.5, anim: 'shark',
    exec: c => ({ v: attack(c.p, jit(opp(c, 3.4 + c.aim.f * 1.6, clampZ(c.aim.l * 3.8)), 0.25), -5.5, { margin: 0.1 }), deceptive: true }),
  },
  // Pingo Envenenado (Pipoca): parece ataque de fundo e morre logo após a rede.
  pingoPipoca: {
    name: 'PINGO ENVENENADO!', special: true, band: [0.5, 3.3], reach: 1.5, anim: 'poke',
    exec: c => {
      const curve = { x: c.s * 7, z: 0 };
      return { v: attack(c.p, jit(opp(c, 1.3 + c.aim.f * 0.5, clampZ(c.aim.l * 3.6)), 0.2), 2.4, { curve, margin: 0.4 }), curve, deceptive: true };
    },
  },

  // ---------- especiais de defesa ----------
  // Sarrada (Dráuzio): defende com a cintura, hitbox enorme; bola domada no parceiro.
  sarrada: {
    name: 'SARRADA!', special: true, defense: true, band: [0.1, 2.8], reach: 2.3, anim: 'sarrada',
    exec: c => c.touchNo < 3
      ? { v: solveApex(c.p, keepOwn(c, jit(toPartner(c), 0.1)), 4.4, 1.2) }
      : { v: lob(c.p, jit(opp(c, 6 + c.aim.f * 2, clampZ(c.aim.l * 3.5)), 0.3), 5) },
  },
  // Escorpião (Varella): pula para a frente e bate com o calcanhar por cima da cabeça.
  // Defesa de alcance (vai no parceiro) ou, no 3º toque, ataque de fundo.
  escorpiao: {
    name: 'ESCORPIÃO!', special: true, defense: true, band: [0.5, 3.4], reach: 1.9, anim: 'escorpiao', fall: 0.5, lunge: 4.5,
    exec: c => c.touchNo < 3
      ? { v: solveApex(c.p, keepOwn(c, jit(toPartner(c), 0.15)), 4.6, 1.2) }
      : { v: attack(c.p, jit(opp(c, 7.5 + c.aim.f, clampZ(c.aim.l * 4)), 0.25), 1.0), deceptive: true },
  },
};

for (const [id, m] of Object.entries(MOVES)) m.id = id;

const TABLE = {
  1: { A: ['peito', 'cabeca'], B: ['pe', 'sharkBlock'] },
  2: { A: ['ombro', 'ataqueSegunda'], B: ['naFita', 'cabecaSet'] },
  3: { A: ['chuteColocado', 'cabecada'], B: ['pingo', 'sharkAttack'] },
};

export function pickMove(btn, air, touchNo) {
  return TABLE[clamp(touchNo, 1, 3)][btn][air ? 1 : 0];
}
