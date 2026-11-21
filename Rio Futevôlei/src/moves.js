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

// Mira do atleta que está batendo, definida pela partida a partir da Precisão:
//   miss = o quanto a bola se afasta do centro da subárea, como fração do raio dela
//   (Precisão 10 = 0, no centro exato; Precisão 1 = 1, na borda). Ver statMods.
export const MISS_DEFAULT = 5 / 9; // Precisão 5
export const tune = { miss: MISS_DEFAULT };

const opp = (c, d, z) => ({ x: -c.s * clamp(d, 0.6, 9.4), z });
const own = (c, d, z) => ({ x: c.s * clamp(d, 0.4, 8.6), z });
// erro extra que não vem da Precisão (CPU, bola forte no domínio, toque ruim)
const jit = (t, r) => { if (r > 0) { t.x += gauss() * r; t.z += gauss() * r; } return t; };
// Precisão: a bola cai a (miss × raio) do centro da subárea, numa direção sorteada
// (com uma variação de até 40% para menos, para não ser mecânico). Na elipse, cada eixo
// usa o seu raio: rx na profundidade, rz na lateral.
function place(t, rx, rz = rx) {
  const d = tune.miss * (0.6 + 0.4 * rnd());
  const a = rnd() * Math.PI * 2;
  t.x += Math.cos(a) * d * rx;
  t.z += Math.sin(a) * d * rz;
  return t;
}
const hard = c => Math.max(0, c.inSpeed - 9);
const keepOwn = (c, t, min = 0.35) => { if (t.x * c.s < min) t.x = c.s * min; return t; };

// ---------- mira em 9 subáreas ----------
// A área de destino de cada golpe é uma grade 3×3 de subáreas: círculos, ou elipses nos
// golpes que cobrem uma faixa (pingo rente à rede, cabeçada na linha de fundo). O direcional
// escolhe a subárea: neutro = a do centro; cada uma das 8 direções = a daquele lado. "Frente"
// (para o lado do adversário) leva a bola mais para lá: no ataque, mais funda; no passe para
// a parceira, mais perto da rede.
//   grid(meio, passo, passoLateral = passo): centros a "passo" metros um do outro na
//   profundidade e a "passoLateral" na lateral; raios base rx = 0,55 × passo e
//   rz = 0,55 × passoLateral (iguais = círculo; diferentes = elipse). A subárea do centro é 60%
//   maior que a base; as outras 8 são 40% maiores, crescendo em direção ao centro (a borda
//   de fora fica no lugar).
// A bola mira o centro da subárea; a Precisão diz o quanto ela se afasta dele (ver place).
export const grid = (mid, sx, sz = sx) => ({ mid, sx, sz, rx: 0.55 * sx, rz: 0.55 * sz });
export const CENTER_GROW = 1.6, SIDE_GROW = 1.4;
// subárea escolhida: deslocamento (df = frente, dl = lado) a partir do centro da malha e raios
export function subarea(g, k) {
  if (!k.f && !k.l) return { df: 0, dl: 0, rx: CENTER_GROW * g.rx, rz: CENTER_GROW * g.rz };
  // cresce para dentro: o centro anda em direção ao meio da malha, 40% do raio base
  // na direção dele (medida na escala da elipse, para a borda de fora ficar no lugar)
  const nf = k.f, nl = k.l, n = Math.hypot(nf, nl);
  const g1 = SIDE_GROW - 1;
  return {
    df: k.f * g.sx - g1 * g.rx * nf / n,
    dl: k.l * g.sz - g1 * g.rz * nl / n,
    rx: SIDE_GROW * g.rx, rz: SIDE_GROW * g.rz,
  };
}
// direcional (f = frente, l = lado, contínuos) → célula da grade (-1, 0 ou +1 em cada eixo)
export function aimCell(aim) {
  const f = aim ? aim.f : 0, l = aim ? aim.l : 0;
  const m = Math.hypot(f, l);
  if (m < 0.3) return { f: 0, l: 0 };
  const s = Math.sin(Math.PI / 8); // 8 setores de 45°
  return { f: Math.abs(f / m) > s ? Math.sign(f) : 0, l: Math.abs(l / m) > s ? Math.sign(l) : 0 };
}
// alvo no campo adversário (profundidade a partir da rede); zc = centro lateral da grade
function oppCell(c, g, zc = 0) {
  const s = subarea(g, aimCell(c.aim));
  return place(opp(c, g.mid + s.df, clampZ(zc + s.dl)), s.rx, s.rz);
}
// alvo no nosso campo (levantamentos): g.mid = distância da rede do círculo central
function ownCell(c, g, zc) {
  const s = subarea(g, aimCell(c.aim));
  return place(own(c, g.mid - s.df, clampZ(zc + s.dl)), s.rx, s.rz);
}
// passe para a parceira: a malha fica centrada nela (sem malha = nela, círculo de 0,6 m)
function toPartner(c, g = AIM.partner) {
  const q = c.partner;
  if (!g) return place(own(c, Math.abs(q.x), q.z), 0.6);
  const s = subarea(g, aimCell(c.aim));
  return place(own(c, Math.abs(q.x) - s.df, clampZ(q.z + s.dl)), s.rx, s.rz);
}

// Grades de cada golpe (dados: a engine/editor poderá ajustar).
export const AIM = {
  partner: grid(0, 0.9),           // domínios: em volta da parceira
  sharkBlock: grid(2.4, 1.25),     // lateral centrada na linha da bola
  ombro: grid(1.9, 0.85),          // lateral centrada na parceira
  naFita: grid(0.95, 0.45),
  ataqueSegunda: grid(4.5, 2.4),
  cabecaSet: grid(1.9, 0.85),
  chuteColocado: grid(6.0, 2.2),
  pingo: grid(1.8, 0.8, 2.4),      // elipses: faixa rente à rede, de lateral a lateral
  cabecada: grid(7.9, 0.6, 2.5),   // elipses: faixa na linha de fundo, até os cantos
  sharkAttack: grid(3.2, 1.6),
  saqueForte: grid(6.9, 1.7),
  saqueColocado: grid(4.6, 2.3),
  bicicleta: grid(7.0, 1.9),
  meiaBicicleta: grid(5.0, 2.0),
  sharkSupremo: grid(3.4, 1.65),
  pingoPipoca: grid(1.7, 1.0),
  sarrada: grid(6.0, 2.15),        // 3º toque (balão)
  escorpiao: grid(7.0, 1.5),       // 3º toque (ataque)
};

export const MOVES = {
  // ---------- 1º toque: domínio ----------
  // Peito: amortece bola forte. Menos preciso, mas aguenta pancada.
  peito: {
    name: 'Domínio de peito', btn: 'A', band: [0.75, 2.0], anim: 'chest',
    exec: c => ({ v: solveApex(c.p, keepOwn(c, jit(toPartner(c), 0.03 * hard(c) + c.err)), 4.4, 1.1) }),
  },
  // Pé: o passe mais preciso com bola lenta; sofre com bola forte.
  pe: {
    name: 'Domínio de pé', btn: 'B', band: [0, 1.15], anim: 'poke',
    exec: c => ({ v: solveApex(c.p, keepOwn(c, jit(toPartner(c), 0.13 * hard(c) + c.err)), 3.6, 1.1) }),
  },
  cabeca: {
    name: 'Cabeça', btn: 'A', air: true, band: [1.1, 2.9], anim: 'header',
    exec: c => ({ v: solveApex(c.p, keepOwn(c, jit(toPartner(c), 0.06 * hard(c) + c.err)), 4.0, 1.1) }),
  },
  // Shark no bloqueio: devolve o ataque colado na rede. Longe da rede, vira um toque ruim.
  sharkBlock: {
    name: 'Shark (bloqueio)', btn: 'B', air: true, band: [1.2, 3.1], anim: 'shark', fall: 0.4,
    exec: c => {
      if (Math.abs(c.p.x) < 2.6) {
        const t = jit(oppCell(c, AIM.sharkBlock, clamp(c.p.z, -2.6, 2.6)), c.err);
        return { v: attack(c.p, t, -0.8, { clear: false }) };
      }
      return { v: solveApex(c.p, keepOwn(c, jit(toPartner(c), 0.9)), 3.4, 1.1) };
    },
  },

  // ---------- 2º toque: levantamento ----------
  // Ombro: levantamento alto, dá tempo ao atacante.
  ombro: {
    name: 'Passe de ombro', btn: 'A', band: [0.8, 2.0], anim: 'shoulder',
    exec: c => ({ v: solveApex(c.p, keepOwn(c, jit(ownCell(c, AIM.ombro, c.partner.z), c.err)), 4.6, 1.4) }),
  },
  // Na fita: colado na rede e mais baixo. Arma o Shark Attack, mas exige tempo certo.
  naFita: {
    name: 'Na fita!', btn: 'B', band: [0, 1.15], anim: 'poke',
    exec: c => ({ v: solveApex(c.p, keepOwn(c, jit(ownCell(c, AIM.naFita, c.partner.z), c.err), 0.4), 3.8, 1.8) }),
  },
  // Ataque de segunda: surpresa, pega a defesa ainda se armando.
  ataqueSegunda: {
    name: 'Ataque de segunda!', btn: 'A', air: true, band: [1.0, 2.9], anim: 'header',
    exec: c => ({ v: attack(c.p, jit(oppCell(c, AIM.ataqueSegunda), c.err), 1.0), deceptive: true }),
  },
  cabecaSet: {
    name: 'Levantada de cabeça', btn: 'B', air: true, band: [1.0, 2.9], anim: 'header',
    exec: c => ({ v: solveApex(c.p, keepOwn(c, jit(ownCell(c, AIM.cabecaSet, c.partner.z), c.err)), 4.2, 1.4) }),
  },

  // ---------- 3º toque: ataque ----------
  // Chute colocado: colocação segura no fundo, em qualquer ponto da quadra.
  chuteColocado: {
    name: 'Chute colocado', btn: 'A', band: [0, 1.45], anim: 'kick',
    exec: c => ({ v: attack(c.p, jit(oppCell(c, AIM.chuteColocado), c.err), 3.2) }),
  },
  // Pingo: bola curta logo após a rede. Pune a defesa recuada. Balão baixo (0,55 m acima
  // da fita) e ritmo 40% mais rápido (pace) para não dar tempo de a defesa se reposicionar.
  pingo: {
    name: 'Pingo', btn: 'B', band: [0, 1.45], anim: 'poke', pace: 1.4,
    exec: c => ({ v: lob(c.p, jit(oppCell(c, AIM.pingo), c.err), COURT.netH + 0.55) }),
  },
  // Cabeçada: bola funda; nas diagonais de trás vai para os cantos do fundo.
  cabecada: {
    name: 'Cabeçada', btn: 'A', air: true, band: [1.15, 2.9], anim: 'header',
    exec: c => ({ v: attack(c.p, jit(oppCell(c, AIM.cabecada), c.err), 1.2) }),
  },
  // Shark Attack: o ataque mais forte. Como no real, o atleta deita no ar e a sola desce
  // sobre a bola por cima da rede: ela cai bem inclinada, logo depois da rede. Só funciona
  // perto da rede (até ~2,2 m) e com a bola acima da fita; de longe ou baixa, vai na rede.
  // Depois o atleta rola de costas na areia (fica um instante no chão).
  sharkAttack: {
    name: 'Shark Attack!', btn: 'B', air: true, band: [1.3, 3.2], anim: 'shark', fall: 0.55,
    exec: c => {
      const vy = -3.6 - Math.max(0, 2.5 - Math.abs(c.p.x)) * 1.0;
      const ok = Math.abs(c.p.x) < 2.2 && c.p.y > COURT.netH + 0.2;
      return { v: attack(c.p, jit(oppCell(c, AIM.sharkAttack), c.err), vy, { clear: ok, margin: 0.05 }) };
    },
  },

  // ---------- defesa ----------
  // Carrinho: busca com os pés a bola longe, mas o jogador fica no chão.
  carrinho: {
    name: 'Carrinho!', band: [0, 1.05], reach: 1.4, anim: 'slide',
    exec: c => c.touchNo < 3
      ? { v: solveApex(c.p, keepOwn(c, jit(toPartner(c, null), c.err)), 3.8, 1.1) }
      : { v: lob(c.p, opp(c, 5.5, gauss() * 2), 4.5) },
  },

  // ---------- saque ----------
  saqueForte: {
    name: 'Saque forte', anim: 'kick',
    exec: c => ({ v: attack(c.p, jit(oppCell(c, AIM.saqueForte), c.err), 4.6, { margin: 0.5 }) }),
  },
  saqueColocado: {
    name: 'Saque viagem', anim: 'kick',
    exec: c => ({ v: lob(c.p, jit(oppCell(c, AIM.saqueColocado), c.err), 7.5) }),
  },

  // ---------- especiais (C + C no ar, barra cheia) ----------
  // Bicicleta (Giulia): ponto de qualquer lugar, fundo e rápido. Cai na areia depois.
  bicicleta: {
    name: 'BICICLETA!', special: true, band: [0.5, 3.3], reach: 1.5, anim: 'bicicleta', fall: 0.85,
    exec: c => ({ v: attack(c.p, oppCell(c, AIM.bicicleta), 0.2, { margin: 0.15 }), deceptive: true }),
  },
  // Meia-bicicleta (Zefa): cruzada com efeito, abre a quadra. A bola faz curva fechando para
  // o lado do alvo (no centro, para o lado oposto ao da bola).
  meiaBicicleta: {
    name: 'MEIA-BICICLETA!', special: true, band: [0.5, 3.3], reach: 1.5, anim: 'meia', fall: 0.5,
    exec: c => {
      const t = oppCell(c, AIM.meiaBicicleta);
      const side = Math.abs(t.z) > 0.1 ? Math.sign(t.z) : (c.p.z >= 0 ? -1 : 1);
      const curve = { x: 0, z: side * 6 };
      return { v: attack(c.p, t, 1.6, { curve, margin: 0.2 }), curve, deceptive: true };
    },
  },
  // Shark Attack Supremo (Tubarão): finalização vertical que funciona até do meio da quadra.
  sharkSupremo: {
    name: 'SHARK ATTACK SUPREMO!', special: true, band: [0.5, 3.4], reach: 1.5, anim: 'shark', fall: 0.6,
    exec: c => ({ v: attack(c.p, oppCell(c, AIM.sharkSupremo), -5.5, { margin: 0.1 }), deceptive: true }),
  },
  // Pingo Envenenado (Pipoca): parece ataque de fundo e morre logo após a rede.
  pingoPipoca: {
    name: 'PINGO ENVENENADO!', special: true, band: [0.5, 3.3], reach: 1.5, anim: 'poke',
    exec: c => {
      const curve = { x: c.s * 7, z: 0 };
      return { v: attack(c.p, oppCell(c, AIM.pingoPipoca), 2.4, { curve, margin: 0.4 }), curve, deceptive: true };
    },
  },

  // ---------- especiais de defesa ----------
  // Sarrada (Dráuzio): defende com a cintura, hitbox enorme; bola domada no parceiro.
  sarrada: {
    name: 'SARRADA!', special: true, defense: true, band: [0.1, 2.8], reach: 2.3, anim: 'sarrada',
    exec: c => c.touchNo < 3
      ? { v: solveApex(c.p, keepOwn(c, toPartner(c)), 4.4, 1.2) }
      : { v: lob(c.p, oppCell(c, AIM.sarrada), 5) },
  },
  // Escorpião (Varella): pula para a frente e bate com o calcanhar por cima da cabeça.
  // Defesa de alcance (vai no parceiro) ou, no 3º toque, ataque de fundo.
  escorpiao: {
    name: 'ESCORPIÃO!', special: true, defense: true, band: [0.5, 3.4], reach: 1.9, anim: 'escorpiao', fall: 0.5, lunge: 4.5,
    exec: c => c.touchNo < 3
      ? { v: solveApex(c.p, keepOwn(c, toPartner(c)), 4.6, 1.2) }
      : { v: attack(c.p, oppCell(c, AIM.escorpiao), 1.0), deceptive: true },
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
