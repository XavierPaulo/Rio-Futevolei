// Atletas criados pelo jogador. Cada um é uma "receita" (escolhas do criador)
// que vira um personagem igual aos oficiais, ocupando as vagas livres da grade
// de seleção. As receitas ficam salvas no navegador.
import { CHARACTERS, CUSTOM_ROSTER } from './characters.js';

export const MAX_CUSTOM = 6;
const KEY = 'rio-futevolei.custom';

// ---------- opções do criador ----------
export const OPTIONS = {
  skin: [['#f6d3b3', 'Clara'], ['#e8b48a', 'Morena clara'], ['#c98d62', 'Morena'], ['#8a5634', 'Negra'], ['#5e3a22', 'Retinta']],
  hairStyle: [['ponytail', 'Rabo de cavalo'], ['puff', 'Black power'], ['mohawk', 'Moicano'], ['curly', 'Cacheado curto'], ['long', 'Liso comprido'], ['buzz', 'Raspado']],
  hairColor: [['#1b1310', 'Preto'], ['#5a3a22', 'Castanho'], ['#c8612a', 'Ruivo'], ['#e8c25a', 'Loiro'], ['#7a3cf0', 'Roxo'], ['#1690c9', 'Azul']],
  headwear: [['none', 'Sem chapéu'], ['bucket', 'Chapéu de pescador'], ['cap', 'Boné'], ['visor', 'Viseira']],
  topStyle: [['regata', 'Regata'], ['camiseta', 'Camiseta'], ['cropped', 'Cropped'], ['listrada', 'Listrada']],
  shortsStyle: [['lisa', 'Lisa'], ['faixa', 'Faixa lateral'], ['florida', 'Estampada'], ['sunga', 'Sunga']],
  wrist: [['none', 'Nada'], ['munhequeira', 'Munhequeira'], ['relogio', 'Relógio'], ['pulseiras', 'Pulseiras']],
  face: [['none', 'Nada'], ['shades', 'Óculos escuros'], ['starshades', 'Óculos de estrela'], ['mustache', 'Bigode'], ['hoop', 'Brinco']],
  color: [['#e8281f', 'Vermelho'], ['#1d5cff', 'Azul'], ['#1fbf6a', 'Verde'], ['#ffcf2e', 'Amarelo'], ['#9b5cff', 'Roxo'], ['#ff5fa2', 'Rosa'], ['#1d1a2b', 'Preto'], ['#ffffff', 'Branco']],
  special: ['bicicleta', 'meiaBicicleta', 'sharkSupremo', 'pingoPipoca', 'sarrada', 'escorpiao'],
};

// Descrição dos especiais (mostrada no criador).
export const SPECIAL_INFO = {
  bicicleta: 'Chute de costas, por cima da cabeça, que cai no fundo da quadra. Ponto de qualquer lugar, mas o atleta cai na areia depois.',
  meiaBicicleta: 'Chute de lado, na diagonal cruzada, com efeito que abre a quadra adversária.',
  sharkSupremo: 'Shark Attack de cima para baixo que funciona até do meio da quadra.',
  pingoPipoca: 'Parece um ataque de fundo, mas freia no ar e morre logo depois da rede.',
  sarrada: 'Defesa com a cintura, com área de contato enorme: a bola vai certinha no parceiro.',
  escorpiao: 'Pula para a frente e bate com o calcanhar por cima da cabeça: defesa de alcance ou, no 3º toque, ataque de fundo.',
};

export const STAT_TOTAL = 24;

const NAMES = ['Tico', 'Bia', 'Juca', 'Nina', 'Caju', 'Lelê', 'Duda', 'Rafa', 'Guto', 'Mel', 'Tatá', 'Zeca', 'Lua', 'Dudu', 'Kiko', 'Preta'];
export const randomName = () => NAMES[Math.floor(Math.random() * NAMES.length)];

export function newRecipe() {
  return {
    id: null, name: randomName(),
    skin: '#c98d62', hairStyle: 'curly', hairColor: '#1b1310', headwear: 'none', hatColor: '#1d5cff',
    topStyle: 'regata', topColor: '#1d5cff', shortsStyle: 'faixa', shortsColor: '#1d1a2b',
    wrist: 'none', face: 'none', special: 'bicicleta',
    stats: { forca: 6, agilidade: 6, precisao: 6, pique: 6 },
  };
}

// ---------- receita → personagem ----------
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c * k))).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}
const isLight = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) > 170; };

export function buildCharacter(r) {
  const top = r.topColor, shorts = r.shortsColor;
  return {
    id: r.id, name: r.name || 'Atleta', special: r.special, custom: true, version: r.version || 0,
    color: top === '#ffffff' ? '#1d5cff' : top,
    stats: { ...r.stats },
    skin: r.skin, skinShade: shade(r.skin, 0.8), eyes: '#2a1a10',
    hair: r.hairColor, hairHi: shade(r.hairColor, 1.6), hairStyle: r.hairStyle, band: isLight(top) ? '#1d1a2b' : top,
    headwear: r.headwear === 'none' ? null : r.headwear, hatColor: r.hatColor,
    top, topAccent: isLight(top) ? '#1d1a2b' : '#ffffff', topStyle: r.topStyle,
    shorts, shortsAccent: isLight(shorts) ? '#1d1a2b' : '#ffffff', shortsStyle: r.shortsStyle,
    wrist: r.wrist === 'none' ? null : r.wrist, wristColor: r.hatColor,
    extra: r.face === 'none' ? null : r.face,
  };
}

// ---------- armazenamento e registro na grade ----------
let recipes = [];
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (Array.isArray(saved)) recipes = saved.filter(r => r && r.id).slice(0, MAX_CUSTOM);
} catch { /* sem armazenamento */ }

// Registra os criados em CHARACTERS e nas 6 vagas próprias da grade (CUSTOM_ROSTER, alterado no lugar).
function register() {
  for (const id of Object.keys(CHARACTERS)) if (CHARACTERS[id].custom) delete CHARACTERS[id];
  for (const r of recipes) CHARACTERS[r.id] = buildCharacter(r);
  for (let i = 0; i < CUSTOM_ROSTER.length; i++) CUSTOM_ROSTER[i] = recipes[i] ? recipes[i].id : null;
}
register();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(recipes)); } catch { /* ignora */ }
  register();
}

export const listCustom = () => recipes.map(r => ({ ...r, stats: { ...r.stats } }));
export const getRecipe = id => { const r = recipes.find(x => x.id === id); return r ? JSON.parse(JSON.stringify(r)) : null; };

export function saveRecipe(r) {
  const copy = JSON.parse(JSON.stringify(r));
  copy.version = (copy.version || 0) + 1; // invalida os retratos em cache
  if (!copy.id) {
    if (recipes.length >= MAX_CUSTOM) return null;
    copy.id = 'custom-' + Date.now().toString(36);
    recipes.push(copy);
  } else {
    const i = recipes.findIndex(x => x.id === copy.id);
    if (i >= 0) recipes[i] = copy; else recipes.push(copy);
  }
  persist();
  return copy.id;
}

export function deleteRecipe(id) {
  recipes = recipes.filter(r => r.id !== id);
  persist();
}
