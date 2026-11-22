// 5.0: regras da partida lidas de src/data/partida5.js (editor da partida).
//   hitbox em 3 partes (inferior, tronco, superior) proporcionais à altura do atleta; a parte em que
//   a bola entra e o toque (1, 2, 3) escolhem o golpe (nome e animação; a bola é a do botão).
//   4 especiais por atleta: a1 (LB LB, ataque 50%), a2 (X X, ataque 100%), d1 (RB RB, defesa 50%),
//   d2 (B B, defesa 100%); o jogador escolhe qual especial do tipo vai em cada botão.
import DATA from './data/partida5.js';
import { P } from './config.js';

export const V5 = JSON.parse(JSON.stringify(DATA)); // vivo: o editor pode trocar
export const ZONE_KEYS = ['inferior', 'tronco', 'superior'];
// os 4 especiais: botão do jogo (ações da porta), tipo, nível e rótulos
export const SLOTS = {
  a1: { tipo: 'ataque', nivel: 50, key: 'L', label: 'Ataque 50%', pad: 'LB LB' },
  a2: { tipo: 'ataque', nivel: 100, key: 'A', label: 'Ataque 100%', pad: 'X X' },
  d1: { tipo: 'defesa', nivel: 50, key: 'R', label: 'Defesa 50%', pad: 'RB RB' },
  d2: { tipo: 'defesa', nivel: 100, key: 'B', label: 'Defesa 100%', pad: 'B B' },
};
export const SLOT_KEYS = ['a1', 'a2', 'd1', 'd2'];

// ---------- 5.0: controle (editor da Partida → aba Controle) ----------
// botões do controle pelo índice padrão do navegador (posição física, igual em qualquer marca)
export const PAD_BUTTONS = [
  { i: 0, xbox: 'A', ps: '✕', lugar: 'botão de baixo' }, { i: 1, xbox: 'B', ps: '○', lugar: 'botão da direita' },
  { i: 2, xbox: 'X', ps: '□', lugar: 'botão da esquerda' }, { i: 3, xbox: 'Y', ps: '△', lugar: 'botão de cima' },
  { i: 4, xbox: 'LB', ps: 'L1', lugar: 'ombro esquerdo' }, { i: 5, xbox: 'RB', ps: 'R1', lugar: 'ombro direito' },
  { i: 6, xbox: 'LT', ps: 'L2', lugar: 'gatilho esquerdo' }, { i: 7, xbox: 'RT', ps: 'R2', lugar: 'gatilho direito' },
  { i: 8, xbox: 'View', ps: 'Share', lugar: 'botão de duas janelas' }, { i: 9, xbox: 'Menu', ps: 'Options', lugar: 'botão de três riscos' },
  { i: 10, xbox: 'LS (apertar)', ps: 'L3', lugar: 'apertar o analógico esquerdo' }, { i: 11, xbox: 'RS (apertar)', ps: 'R3', lugar: 'apertar o analógico direito' },
];
// ações do jogo que vão num botão (o direcional e o analógico esquerdo sempre movem)
export const PAD_ACTIONS = ['A', 'B', 'C', 'D', 'L', 'R', 'L2', 'R2', 'start'];
export const ACTION_DEFAULT = { A: 2, B: 1, C: 0, D: 3, L: 4, R: 5, L2: 6, R2: 7, start: 9 };
export const ACTION_NAMES = {
  A: 'ataque (segure) · dois toques = ataque 100% · saque forte · muda a opção ◀ nos menus', B: 'defesa (segure) · dois toques = defesa 100% · saque viagem · cursor no Voltar nos menus',
  C: 'pulo · acessa / muda a opção ▶ nos menus', D: 'carrinho', L: 'especial de ataque 50% (dois toques)', R: 'especial de defesa 50% (dois toques)',
  L2: 'ajudas visuais', R2: 'formação da dupla', start: 'pausa · cursor no Avançar / Pronto! nos menus (segurar = Pronto! direto)',
};
const num = (v, d) => (v === undefined || v === null || v === '' || !isFinite(+v) ? d : +v);
// botão (índice padrão) de cada ação
export const padIndex = a => num((((V5.controle || {}).botoes) || {})[a], ACTION_DEFAULT[a]);
// 5.0 (padrão de controle): segundos segurando Start nos menus para ir direto ao Pronto! (editor da Partida → Controle)
export const menuHoldTime = () => num((V5.controle || {}).menuSegurar, 2);
export const actionsAt = i => PAD_ACTIONS.filter(a => padIndex(a) === i);
// andar, pulo e carrinho do jogador vêm do editor (src/config.js P guarda os valores de fábrica)
const P0 = { ...P };
export function applyControl() {
  const c = V5.controle || {}, an = c.andar || {}, pu = c.pulo || {}, ca = c.carrinho || {};
  P.speed = num(an.velocidade, P0.speed); P.accel = num(an.aceleracao, P0.accel);
  P.jumpV = num(pu.forca, P0.jumpV);
  P.diveSpeed = num(ca.velocidade, P0.diveSpeed); P.diveTime = num(ca.duracao, P0.diveTime); P.diveRecover = num(ca.recuperacao, P0.diveRecover);
}
applyControl();
export const slotOfKey = key => SLOT_KEYS.find(s => SLOTS[s].key === key);

// 5.0 (rev.): o jogador escolhe qual especial de cada tipo vai no botão de 50% e no de 100%.
// O nível não é do especial, é do botão: 50% carrega mais rápido, mas a bola é menos precisa e
// mais lenta que a do 100% (V5.niveis: area = fração do raio da área onde cai, velocidade = ×).
// O mesmo especial não pode estar nos dois botões do mesmo tipo.
const sibling = slot => SLOT_KEYS.find(s => s !== slot && SLOTS[s].tipo === SLOTS[slot].tipo);
// especiais ativos do tipo do slot (na ordem do arquivo de dados)
export function specialsFor(slot) {
  const s = SLOTS[slot];
  return Object.entries(V5.especiais).filter(([, e]) => e.ativo !== false && e.tipo === s.tipo).map(([id]) => id);
}
// os que podem ir no slot sem repetir o do outro botão do mesmo tipo
export const choicesFor = (slot, picks = {}) => specialsFor(slot).filter(id => id !== picks[sibling(slot)]);
// tipo de um especial ('ataque' | 'defesa'; null = fora da lista ou desativado)
export function typeOfSpecial(id) {
  const e = V5.especiais[id];
  return e && e.ativo !== false ? e.tipo : null;
}
export const costOf = slot => +(V5.custo[SLOTS[slot].nivel] ?? SLOTS[slot].nivel);
// força e precisão do nível do botão
// 5.0: tempo parado ao tocar o chão depois de um pulo, pela agilidade (agilidade 1 = máximo)
export function landFreeze(agilidade) {
  const L = V5.aterrissagem || {}, max = +(L.max ?? 2), por = +(L.porPonto ?? 0.2044), min = +(L.min ?? 0.16);
  const t = max - por * (Math.max(1, +agilidade || 1) - 1);
  return Math.round(Math.max(min, Math.min(max, t)) * 100) / 100;
}
export function levelFx(slot) {
  const n = (V5.niveis || {})[slot ? SLOTS[slot].nivel : 100] || {};
  // area = precisão (fração da área onde a bola cai) · velocidade = força · hitbox = tamanho da hitbox do especial
  return { area: +(n.area ?? 1), velocidade: +(n.velocidade ?? 1.3), hitbox: +(n.hitbox ?? 1) };
}

// especiais de um atleta { a1, a2, d1, d2 } sem repetir dentro do tipo: aceita o formato da 4.0
// ({ attack, defense }) e o especial do próprio atleta (vai no botão de 100% do tipo dele); o que
// faltar fica com o 1º livre da lista, ou sorteado (null escolhido = sem especial)
export function normalizeSpecials(pick = {}, own = null, { allowNull = true, random = false } = {}) {
  const out = {};
  const legacy = [own, pick.attack, pick.defense].filter(Boolean);
  for (const s of ['a2', 'd2', 'a1', 'd1']) {
    const free = specialsFor(s).filter(id => !Object.values(out).includes(id));
    if (allowNull && pick[s] === null) { out[s] = null; continue; }
    if (free.includes(pick[s])) { out[s] = pick[s]; continue; }
    const from = legacy.find(id => typeOfSpecial(id) === SLOTS[s].tipo && free.includes(id));
    out[s] = from || (random ? free[Math.floor(Math.random() * free.length)] : free[0]) || null;
  }
  return { a1: out.a1, a2: out.a2, d1: out.d1, d2: out.d2 };
}

// ---------- hitbox em 3 partes ----------
const H = () => Math.max(0.5, +V5.alturaAtleta || 1.85);
// altura de um atleta (m): a do Criar Jogador, senão a do editor da partida (alturas), senão a padrão
export function heightOf(char) {
  const h = (char && +char.altura) || (char && V5.alturas && +V5.alturas[char.id]) || H();
  return Math.max(1.2, Math.min(2.4, h));
}
// escala do desenho do atleta (1 = altura padrão)
export const heightScale = char => heightOf(char) / H();
// limites de cada parte em metros a partir do pé: [{ key, lo, hi, cor, nome }] (h = altura do atleta)
export function zoneBands(h = H()) {
  let lo = 0;
  return ZONE_KEYS.map(k => {
    const z = V5.zonas[k] || {};
    const hi = Math.max(lo + 0.05, (+z.ate || 0) * h);
    const out = { key: k, lo, hi, cor: z.cor || '#ffffff', nome: z.nome || k };
    lo = hi;
    return out;
  });
}
export const zoneBand = (h = H()) => { const b = zoneBands(h); return [0, b[b.length - 1].hi]; };
// parte da hitbox em que está a bola (h = altura da bola em relação ao pé)
export function zoneAt(h, pad = 0, height = H()) {
  const b = zoneBands(height);
  if (h < -pad || h > b[b.length - 1].hi + pad) return null;
  return (b.find(z => h <= z.hi) || b[b.length - 1]).key;
}
// golpe da parte no toque: sorteio pelos pesos (chance)
export function zoneMove(zone, touchNo, rnd = Math.random) {
  const list = (V5.golpesZona[zone] || {})[Math.min(3, Math.max(1, touchNo))] || [];
  const tot = list.reduce((a, g) => a + Math.max(0, +g.chance || 0), 0);
  if (!list.length) return null;
  if (tot <= 0) return list[0];
  let r = rnd() * tot;
  for (const g of list) { r -= Math.max(0, +g.chance || 0); if (r <= 0) return g; }
  return list[list.length - 1];
}
// hitbox inteira dos especiais
export const specialBand = (h = H()) => [0, Math.max(0.5, (+V5.hitboxEspecial.ate || 1.4) * h)];

// ---------- formações (RT) ----------
export const formations = () => (V5.formacoes && V5.formacoes.length ? V5.formacoes : [{ nome: 'Rede e fundo', rede: { x: 2.3, z: -1.2 }, fundo: { x: 6.1, z: 1.4 } }]);

// ---------- Modo História: especiais aprendidos → os 4 botões ----------
// spWho = save.specials.giulia (listas attack/defense de aprendidos; eq5 = escolhidos { a1, a2, d1, d2 })
const learnedOf = w => [...new Set([...(w.attack || []), ...(w.defense || [])])];
// aprendidos (e ativos) do tipo do botão, sem o que está no outro botão do mesmo tipo
export const storyOptions = (w, slot, eq = w.eq5 || {}) => learnedOf(w).filter(id => typeOfSpecial(id) === SLOTS[slot].tipo && id !== eq[sibling(slot)]);
export function storySlots(w) {
  const eq = w.eq5 || (w.eq5 = {});
  for (const s of ['a2', 'd2', 'a1', 'd1']) { const opts = storyOptions(w, s, eq); if (!opts.includes(eq[s])) eq[s] = opts[0] || null; }
  return eq;
}
