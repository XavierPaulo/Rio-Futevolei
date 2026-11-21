import { createRegistry } from './engine/registry.js';
import MOVE_DATA, { PRECISION } from './data/moves.js';

// Golpes da 2.0. Cada golpe recebe um contexto c:
//   p        posição da bola no contato · player = quem bate · s = lado do time (-1 / +1)
//   partner  para quem vai o passe (quem a CPU e a troca de controle esperam que receba)
//   aim      { f, l }  direcional: f = +1 para o lado do adversário, l = lateral (z)
//   inSpeed  velocidade da bola recebida · err = erro extra (CPU) · touchNo = toque do time (1..3)
// e retorna { traj: { to, model, apex, launch, bend }, deceptive? } (física em src/engine/trajectory.js).
// O destino e a trajetória vêm dos dados editáveis (src/data/moves.js, registro moveDefs).

const rnd = Math.random;
export const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 1.5;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// definições editáveis (o editor de golpes escreve aqui; o jogo lê ao vivo)
export const moveDefs = createRegistry('move', {
  band: { type: 'range', label: 'Altura da bola (m dos pés)' },
  reach: { type: 'number', label: 'Alcance (m)' },
  aim: { type: 'group', label: 'Destino' },
  traj: { type: 'group', label: 'Trajetória' },
});
moveDefs.load(MOVE_DATA);
export { PRECISION };

// Mira do atleta que está batendo, definida pela partida a partir da Precisão do atleta:
//   miss = o quanto a bola se afasta do centro da subárea, como fração do raio dela
//   (Precisão 10 = 0, no centro exato; Precisão 1 = 1, na borda). Ver statMods.
export const MISS_DEFAULT = 5 / 9; // Precisão 5
export const tune = { miss: MISS_DEFAULT };

// erro extra que não vem da Precisão (CPU, bola forte no domínio, toque ruim)
const jit = (t, r) => { if (r > 0) { t.x += gauss() * r; t.z += gauss() * r; } return t; };
// Precisão do atleta: a bola cai a (miss × raio) do centro da subárea, numa direção sorteada
function place(t, rx, rz = rx) {
  const d = tune.miss * (0.6 + 0.4 * rnd());
  const a = rnd() * Math.PI * 2;
  t.x += Math.cos(a) * d * rx;
  t.z += Math.sin(a) * d * rz;
  return t;
}
const hard = c => Math.max(0, c.inSpeed - 9);

// ---------- destino: malha 3×3 numa linha reta do jogador em direção à rede ----------
// A área inteira (de borda a borda das subáreas de fora) mede w × h (diâmetro no círculo;
// horizontal × vertical na elipse). As subáreas crescem: a do centro 60% e as outras 40%,
// para dentro (a borda de fora fica no lugar).
export const CENTER_GROW = 1.6, SIDE_GROW = 1.4;
// golpe sem mira (o direcional não escolhe subárea): a área do círculo central dobra (raio × √2)
export const NOAIM_GROW = Math.SQRT2;
const SPAN = 3.1; // área inteira = 3,1 × passo (passo + raio de 0,55 passo de cada lado)
// Tamanho da área inteira: w = horizontal (profundidade, ao longo da quadra), h = vertical
// (lateral, ao longo da rede). Dados antigos (só precision + shape vertical/horizontal + ratio)
// continuam valendo.
export function areaOf(aim) {
  if (aim.w > 0 && aim.h > 0) return aim.shape === 'circulo' ? { w: aim.w, h: aim.w } : { w: aim.w, h: aim.h };
  const size = (PRECISION[aim.precision] || PRECISION.media).size;
  const ratio = Math.max(1, aim.ratio || 1);
  return { w: aim.shape === 'vertical' ? size / ratio : size, h: aim.shape === 'horizontal' ? size / ratio : size };
}
export function gridOf(aim) {
  const { w, h } = areaOf(aim);
  const sx = w / SPAN, sz = h / SPAN;
  return { sx, sz, rx: 0.55 * sx, rz: 0.55 * sz };
}
// subárea escolhida: deslocamento (df = para a frente, dl = para o lado) e raios
export function subarea(g, k, noAim = false) {
  const cg = CENTER_GROW * (noAim ? NOAIM_GROW : 1);
  if (!k.f && !k.l) return { df: 0, dl: 0, rx: cg * g.rx, rz: cg * g.rz };
  const n = Math.hypot(k.f, k.l), g1 = SIDE_GROW - 1;
  return {
    df: k.f * g.sx - g1 * g.rx * k.f / n,
    dl: k.l * g.sz - g1 * g.rz * k.l / n,
    rx: SIDE_GROW * g.rx, rz: SIDE_GROW * g.rz,
  };
}
// direcional (contínuo) → célula da malha (-1, 0 ou +1 em cada eixo; 8 direções + neutro)
export function aimCell(aim) {
  const f = aim ? aim.f : 0, l = aim ? aim.l : 0;
  const m = Math.hypot(f, l);
  if (m < 0.3) return { f: 0, l: 0 };
  const s = Math.sin(Math.PI / 8);
  return { f: Math.abs(f / m) > s ? Math.sign(f) : 0, l: Math.abs(l / m) > s ? Math.sign(l) : 0 };
}
// Centros e raios das 9 subáreas para um jogador em (x, z) do lado s (para a mira na tela),
// com os mesmos limites do destino de verdade
// Centro da malha: em linha reta rumo à rede, a "dist" do jogador. 3.0: nos passes (golpes que
// ficam no nosso campo) a linha vai em direção ao parceiro, até "dist" (sem passar dele).
export function gridCenter(aim, x, z, s, mate = null) {
  if (aim.ownCourt && mate) {
    const dx = mate.x - x, dz = mate.z - z, d = Math.hypot(dx, dz);
    if (d > 0.3) { const k = Math.min(aim.dist, d) / d; return { x: x + dx * k, z: z + dz * k }; }
  }
  return { x: x - s * aim.dist, z };
}
export function subareasFor(aim, x, z, s, mate = null) {
  const g = gridOf(aim), dir = -s, out = [];
  const c = gridCenter(aim, x, z, s, mate);
  for (const f of [-1, 0, 1]) for (const l of [-1, 0, 1]) {
    const sa = subarea(g, { f, l }, aim.noAim);
    let cx = clamp(c.x + dir * sa.df, -9.6, 9.6);
    if (aim.ownCourt && cx * s < 0.45) cx = s * 0.45;
    out.push({ f, l, x: cx, z: clamp(c.z + sa.dl, -4.4, 4.4), rx: sa.rx, rz: sa.rz });
  }
  return out;
}
// Ponto de destino de um golpe: subárea escolhida + afastamento pela Precisão do atleta
function target(c, aim) {
  const pl = c.player;
  const g = gridOf(aim);
  const sa = subarea(g, aim.noAim ? { f: 0, l: 0 } : aimCell(c.aim), aim.noAim);
  const dir = -c.s; // em direção à rede (e além)
  const mate = c.partner && c.partner !== pl ? c.partner : null;
  const ctr = gridCenter(aim, pl.x, pl.z, c.s, mate);
  const t = place({ x: ctr.x + dir * sa.df, z: ctr.z + sa.dl }, sa.rx, sa.rz);
  t.x = clamp(t.x, -9.6, 9.6);
  // domínios e levantamentos: a linha reta para antes da rede (a bola fica no nosso campo)
  if (aim.ownCourt && t.x * c.s < 0.45) t.x = c.s * 0.45;
  // 3.0: ataque sempre passa a rede — cai pelo menos 0,6 m do outro lado (pingo curto continua
  // fácil de pegar, mas não vira ponto contra quem atacou)
  if (!aim.ownCourt && t.x * dir < 0.6) t.x = dir * (0.6 + Math.random() * 0.5);
  if (Math.abs(t.x) < 0.3) t.x = 0.3 * Math.sign(t.x || dir); // nunca em cima da rede
  t.z = clamp(t.z, -4.4, 4.4);
  return t;
}

// golpe padrão: destino + trajetória dos dados (def pode ser o "alt" do 3º toque)
function standard(c, def, extraErr = 0, deceptive = false) {
  const to = jit(target(c, def.aim), extraErr + c.err);
  return { traj: { to, model: def.traj.model, apex: def.traj.apex, launch: def.traj.launch, bend: def.traj.bend || 0, pace: def.traj.pace || 'normal' }, deceptive };
}
const D = id => moveDefs.get(id);
const altOr = (c, id) => (c.touchNo >= 3 && D(id).alt ? D(id).alt : D(id));

// Golpes: nome, botão, animação e regras especiais. Altura de contato (band), alcance (reach),
// destino e trajetória ficam nos dados (getters abaixo leem a definição atual).
const MOVE_INFO = {
  // ---------- 1º toque: domínio ----------
  peito: { name: 'Domínio de peito', btn: 'A', anim: 'chest', exec: c => standard(c, D('peito'), D('peito').hardErr * hard(c)) },
  pe: { name: 'Domínio de pé', btn: 'B', anim: 'poke', exec: c => standard(c, D('pe'), D('pe').hardErr * hard(c)) },
  cabeca: { name: 'Cabeça', btn: 'A', air: true, anim: 'header', exec: c => standard(c, D('cabeca'), D('cabeca').hardErr * hard(c)) },
  // Shark no bloqueio: colado na rede devolve o ataque; longe dela vira um toque ruim (erro de 0,9 m)
  sharkBlock: { name: 'Shark (bloqueio)', btn: 'B', air: true, anim: 'shark', fall: 0.4,
    exec: c => (Math.abs(c.p.x) < 2.6 ? standard(c, D('sharkBlock')) : standard(c, D('peito'), 0.9)) },

  // ---------- 2º toque: levantamento ----------
  ombro: { name: 'Passe de ombro', btn: 'A', anim: 'shoulder', exec: c => standard(c, D('ombro')) },
  naFita: { name: 'Na fita!', btn: 'B', anim: 'poke', exec: c => standard(c, D('naFita')) },
  ataqueSegunda: { name: 'Ataque de segunda!', btn: 'A', air: true, anim: 'header', exec: c => standard(c, D('ataqueSegunda'), 0, true) },
  cabecaSet: { name: 'Levantada de cabeça', btn: 'B', air: true, anim: 'header', exec: c => standard(c, D('cabecaSet')) },

  // ---------- 3º toque: ataque ----------
  chuteColocado: { name: 'Chute colocado', btn: 'A', anim: 'kick', exec: c => standard(c, D('chuteColocado')) },
  pingo: { name: 'Pingo', btn: 'B', anim: 'poke', exec: c => standard(c, D('pingo')) },
  cabecada: { name: 'Cabeçada', btn: 'A', air: true, anim: 'header', exec: c => standard(c, D('cabecada')) },
  // Shark Attack: linha reta para baixo a partir do contato — de longe ou com a bola baixa, a
  // linha passa abaixo da fita e vai na rede, como no real. Depois o atleta rola na areia.
  sharkAttack: { name: 'Shark Attack!', btn: 'B', air: true, anim: 'shark', fall: 0.55, exec: c => standard(c, D('sharkAttack')) },

  // ---------- defesa ----------
  // Carrinho: o direcional escolhe o deslize, não o destino; no 3º toque, balão de qualquer jeito
  carrinho: { name: 'Carrinho!', anim: 'slide', exec: c => standard(c, altOr(c, 'carrinho')) },

  // ---------- saque ----------
  saqueForte: { name: 'Saque forte', anim: 'kick', exec: c => standard(c, D('saqueForte')) },
  saqueColocado: { name: 'Saque viagem', anim: 'kick', exec: c => standard(c, D('saqueColocado')) },

  // ---------- especiais (C + C no ar, barra cheia) ----------
  bicicleta: { name: 'BICICLETA!', special: true, anim: 'bicicleta', fall: 0.85, exec: c => standard(c, D('bicicleta'), 0, true) },
  // Meia-bicicleta: a bola curva para o lado da subárea escolhida (no meio, para o lado oposto ao da bola)
  meiaBicicleta: { name: 'MEIA-BICICLETA!', special: true, anim: 'meia', fall: 0.5,
    exec: c => {
      const r = standard(c, D('meiaBicicleta'), 0, true);
      const side = Math.abs(r.traj.to.z - c.p.z) > 0.3 ? Math.sign(r.traj.to.z - c.p.z) : (c.p.z >= 0 ? -1 : 1);
      r.traj.bend = side * Math.abs(r.traj.bend);
      return r;
    } },
  sharkSupremo: { name: 'SHARK ATTACK SUPREMO!', special: true, anim: 'shark', fall: 0.6, exec: c => standard(c, D('sharkSupremo'), 0, true) },
  pingoPipoca: { name: 'PINGO ENVENENADO!', special: true, anim: 'poke', exec: c => standard(c, D('pingoPipoca'), 0, true) },
  // 4.0: especiais do Rio Futevôlei (um por bairro; a trajetória vem de src/data/tilt.js)
  ondaBarra: { name: 'ONDA DA BARRA!', special: true, anim: 'bicicleta', fall: 0.85, exec: c => standard(c, D('bicicleta'), 0, true) },
  pedradaLeme: { name: 'PEDRADA DO LEME!', special: true, anim: 'shark', fall: 0.6, exec: c => standard(c, D('sharkSupremo'), 0, true) },
  porDoSol: { name: 'PÔR DO SOL DE IPANEMA!', special: true, anim: 'meia', fall: 0.4, exec: c => standard(c, D('meiaBicicleta'), 0, true) },
  bondinho: { name: 'BONDINHO!', special: true, anim: 'poke', fall: 0.4, exec: c => standard(c, D('pingoPipoca'), 0, true) },
  toqueClasse: { name: 'TOQUE DE CLASSE!', special: true, anim: 'poke', fall: 0.4, exec: c => standard(c, D('pingoPipoca'), 0, true) },
  asaDelta: { name: 'ASA-DELTA!', special: true, anim: 'bicicleta', fall: 0.85, exec: c => standard(c, D('bicicleta'), 0, true) },
  pontal: { name: 'PEDRA DO PONTAL!', special: true, anim: 'shark', fall: 0.6, exec: c => standard(c, D('sharkSupremo'), 0, true) },
  freguesia: { name: 'RASTEIRA DA FREGUESIA!', special: true, anim: 'meia', fall: 0.4, exec: c => standard(c, D('meiaBicicleta'), 0, true) },
  aterro: { name: 'ATERRO SUPREMO!', special: true, anim: 'shark', fall: 0.6, exec: c => standard(c, D('sharkSupremo'), 0, true) },
  mareBaia: { name: 'MARÉ DA BAÍA!', special: true, anim: 'bicicleta', fall: 0.85, exec: c => standard(c, D('bicicleta'), 0, true) },
  // ---------- especiais de defesa ----------
  sarrada: { name: 'SARRADA!', special: true, defense: true, anim: 'sarrada', exec: c => standard(c, altOr(c, 'sarrada')) },
  escorpiao: { name: 'ESCORPIÃO!', special: true, defense: true, anim: 'escorpiao', fall: 0.5, lunge: 4.5,
    exec: c => standard(c, altOr(c, 'escorpiao'), 0, c.touchNo >= 3) },
};

export const MOVES = {};
for (const [id, info] of Object.entries(MOVE_INFO)) {
  MOVES[id] = {
    id, ...info,
    // lidos da definição atual (o editor pode mudar ao vivo)
    get band() { return (D(id) && D(id).band) || [0, 3]; },
    get reach() { return (D(id) && D(id).reach) || 1.35; }, // alcance do jogador humano (m)
    get aim() { return D(id) && D(id).aim; },
  };
}

const TABLE = {
  1: { A: ['peito', 'cabeca'], B: ['pe', 'sharkBlock'] },
  2: { A: ['ombro', 'ataqueSegunda'], B: ['naFita', 'cabecaSet'] },
  3: { A: ['chuteColocado', 'cabecada'], B: ['pingo', 'sharkAttack'] },
};

export function pickMove(btn, air, touchNo) {
  return TABLE[clamp(touchNo, 1, 3)][btn][air ? 1 : 0];
}
