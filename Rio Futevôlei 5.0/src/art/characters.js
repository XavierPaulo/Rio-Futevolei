// Visual, golpe especial e atributos de cada atleta. Cores em sRGB.
// Atributos de 1 a 10, todos somando 24:
//   forca     — velocidade com que a bola cumpre a trajetória
//   agilidade — velocidade em quadra e recuperação depois de cada ação
//   precisao  — o quanto a bola vai para onde se mirou
//   pique     — velocidade com que a barra de especial enche e o quanto o
//               atleta sofre (ou aproveita) a nota de cada ação
export const CHARACTERS = {
  giulia: {
    id: 'giulia', name: 'Giulia', special: 'bicicleta', color: '#9b5cff',
    stats: { forca: 7, agilidade: 6, precisao: 5, pique: 6 },
    skin: '#f3c9a5', skinShade: '#d9a07c', eyes: '#5a2bb8',
    hair: '#7a3cf0', hairHi: '#c09bff', hairStyle: 'ponytail',
    top: '#9b5cff', topAccent: '#ffffff', shorts: '#2a1d45', shortsAccent: '#ff5fa2',
    extra: 'starshades',
  },
  zefa: {
    id: 'zefa', name: 'Zefa', special: 'meiaBicicleta', color: '#ffc21f',
    stats: { forca: 5, agilidade: 8, precisao: 6, pique: 5 },
    skin: '#8a5634', skinShade: '#6a3d22', eyes: '#3a2012',
    hair: '#2b1a14', hairHi: '#6b4636', hairStyle: 'puff', band: '#ff4f6d',
    top: '#ffcf2e', topAccent: '#1fbf6a', shorts: '#1fbf6a', shortsAccent: '#ffcf2e',
    extra: 'hoop',
  },
  tubarao: {
    id: 'tubarao', name: 'Tubarão', special: 'sharkSupremo', color: '#15b8c9',
    stats: { forca: 9, agilidade: 4, precisao: 5, pique: 6 },
    skin: '#c98d62', skinShade: '#a56b44', eyes: '#0f3a52',
    hair: '#1690c9', hairHi: '#7fe6ff', hairStyle: 'mohawk',
    top: '#15b8c9', topAccent: '#e8fbff', shorts: '#16325c', shortsAccent: '#7fe6ff',
    extra: 'tooth',
  },
  pipoca: {
    id: 'pipoca', name: 'Pipoca', special: 'pingoPipoca', color: '#ff5a3c',
    stats: { forca: 4, agilidade: 6, precisao: 9, pique: 5 },
    skin: '#eab58c', skinShade: '#c98f67', eyes: '#5b3312',
    hair: '#e0932e', hairHi: '#ffc46b', hairStyle: 'bucket', hat: '#ff5a3c',
    top: '#ffffff', topAccent: '#ff5a3c', shorts: '#ff5a3c', shortsAccent: '#ffffff',
    extra: 'freckles',
  },
  drauzio: {
    id: 'drauzio', name: 'Dráuzio', special: 'sarrada', color: '#e8281f',
    stats: { forca: 6, agilidade: 4, precisao: 7, pique: 7 },
    skin: '#b9794f', skinShade: '#955a36', eyes: '#2a1a10',
    hair: '#1b1310', hairHi: '#5a4032', hairStyle: 'curly',
    top: '#e8281f', topAccent: '#ffffff', shorts: '#ffffff', shortsAccent: '#e8281f',
    extra: 'mustache',
  },
  varella: {
    id: 'varella', name: 'Varella', special: 'escorpiao', color: '#8bd346',
    stats: { forca: 5, agilidade: 8, precisao: 5, pique: 6 },
    skin: '#f0c09a', skinShade: '#d39c74', eyes: '#2d5a1f',
    hair: '#e8c25a', hairHi: '#fff0a8', hairStyle: 'long', band: '#1d1a2b',
    top: '#8bd346', topAccent: '#1d1a2b', shorts: '#1d1a2b', shortsAccent: '#8bd346',
    extra: 'shades',
  },
  // 5.0 Colagem — atletas criados a partir das referências de revista (menu: Visual Colagem)
  // Tito Barulho: merdeiro, meio punk, mas no fundo um amor. Vive de música e arte, já viveu muito
  // e quer viver mais. Azul-marinho, vermelho de Natal com faixa de pelúcia branca, chapéu-coco
  // preto, cabelão e barba escura por fazer (como a foto de referência), spikes e a câmera no peito.
  tito: {
    id: 'tito', name: 'Tito Barulho', special: 'sarrada', color: '#1f2a66', altura: 1.74,
    bio: 'Merdeiro, meio punk, mas no fundo um amor. Vive de música e de arte: já viveu muito e ainda quer viver muito mais.',
    stats: { forca: 6, agilidade: 4, precisao: 8, pique: 6 },
    skin: '#f0c9a8', skinShade: '#d4a582', eyes: '#1b1310',
    hair: '#2b2622', hairHi: '#6a625c', hairStyle: 'desgrenhado', beard: '#3a302a',
    headwear: 'coco', hatColor: '#1d1a22',
    top: '#1f2a66', topAccent: '#f4ecd8', topStyle: 'camiseta', prop: 'camera',
    shorts: '#d9261c', shortsAccent: '#fbf6e8', shortsStyle: 'faixa',
    wrist: 'spikes',
  },
  // Dadá Girafa: divertida, meio estranha, meio caseira, mas extrovertida e original. Alta,
  // pescoçuda, chifrinhos de cabelo, blusa de girafa, ouro velho e amarelo-neon de papel colorido.
  dada: {
    id: 'dada', name: 'Dadá Girafa', special: 'pingoOmbro', color: '#ff7a2e', altura: 2.02,
    bio: 'Divertida, meio estranha, meio caseira, mas extrovertida e original. Faz crochê no intervalo e dança sozinha na areia.',
    stats: { forca: 5, agilidade: 6, precisao: 6, pique: 7 },
    skin: '#d9a679', skinShade: '#b9845a', eyes: '#3a2012',
    hair: '#6b3a1e', hairHi: '#e9cf9a', hairStyle: 'chifrinhos', blush: 'rgba(255, 92, 120, 0.55)',
    top: '#ff8a2e', topAccent: '#6b3a1e', topStyle: 'girafa',
    shorts: '#b8952a', shortsAccent: '#e3f230', shortsStyle: 'faixa',
    wrist: 'munhequeira', wristColor: '#e3f230',
  },
  // Mestre Arcano (ref.: carta de tarô "FIM"): cartomante da praia, teatral e dramático.
  arcano: {
    id: 'arcano', name: 'Mestre Arcano', special: 'escorpiao', color: '#d9261c', altura: 1.80,
    bio: 'Cartomante da praia, teatral e dramático: jura que já sabia onde a bola ia cair. Fala com a bola antes do saque.',
    stats: { forca: 5, agilidade: 5, precisao: 8, pique: 6 },
    skin: '#b9794f', skinShade: '#955a36', eyes: '#3a2012',
    hair: '#4a2a1a', hairHi: '#8a5a3a', hairStyle: 'careca', extra: 'mustache', hoop: true,
    top: '#d9261c', topAccent: '#e0b030', topStyle: 'moedas',
    shorts: '#3a2a7a', shortsAccent: '#e3f230', shortsStyle: 'florida',
    wrist: 'pulseiras', wristColor: '#e0b030',
  },
  // Rosa Choque (ref.: rosto de franja rosa): tímida e intensa, nunca sorri e nunca pisca.
  rosa: {
    id: 'rosa', name: 'Rosa Choque', special: 'naFita', color: '#ff3d8b', altura: 1.68,
    bio: 'Tímida e intensa: nunca sorri e nunca pisca. Ninguém sabe o que ela pensa, nem quando vai atacar.',
    stats: { forca: 4, agilidade: 7, precisao: 8, pique: 5 },
    skin: '#f3c9a5', skinShade: '#d9a07c', eyes: '#8f98a3',
    hair: '#ff3d8b', hairHi: '#ffa3c8', hairStyle: 'franjao',
    top: '#ff7a2e', topAccent: '#ff3d8b', topStyle: 'cropped',
    shorts: '#ff3d8b', shortsAccent: '#ff7a2e', shortsStyle: 'faixa',
  },
  // Carneiro Zen (ref.: carneiro com a mosca): calmo até demais; só a mosca o tira do sério.
  carneiro: {
    id: 'carneiro', name: 'Carneiro Zen', special: 'meiaBicicleta', color: '#8c8fd8', altura: 1.82,
    bio: 'Calmo até demais: nada o tira do sério, só a mosca que vive voando em volta da cabeça dele.',
    stats: { forca: 5, agilidade: 5, precisao: 6, pique: 8 },
    skin: '#c98d62', skinShade: '#a56b44', eyes: '#2a1a10',
    hair: '#f4f1ea', hairHi: '#ffffff', hairStyle: 'la', horn: '#c9a46a', fly: true,
    top: '#8c8fd8', topAccent: '#3f8a4a', topStyle: 'camiseta',
    shorts: '#3f8a4a', shortsAccent: '#ffd23f', shortsStyle: 'florida',
  },
  // Seu Pé de Pato (ref.: o pé de desenho da colagem): meio mal-humorado, mas gente boa. Reclama de
  // tudo e acaba ajudando todo mundo; joga de pé de pato porque "a areia é quente demais".
  pePato: {
    id: 'pePato', name: 'Seu Pé de Pato', special: 'pingoPipoca', color: '#f0a040', altura: 1.70,
    bio: 'Meio mal-humorado, mas gente boa: reclama de tudo e acaba ajudando todo mundo. Joga de pé de pato porque "a areia é quente demais".',
    stats: { forca: 7, agilidade: 3, precisao: 7, pique: 7 },
    skin: '#e8b48a', skinShade: '#c98f67', eyes: '#2a1a10',
    hair: '#9a9590', hairHi: '#d8d4cf', hairStyle: 'buzz', brow: '#3a3530', fins: '#f0a040',
    headwear: 'visor', hatColor: '#e88a7a',
    top: '#e88a7a', topAccent: '#6b3a1e', topStyle: 'regata',
    shorts: '#6b3a1e', shortsAccent: '#f0a040', shortsStyle: 'faixa',
    wrist: 'relogio',
  },
  // treinador do CT da Urca (tutorial e modo história) — não aparece na grade de seleção
  treinador: {
    id: 'treinador', name: 'Treinador Moacir', special: 'sarrada', color: '#1d5cff', npc: true,
    stats: { forca: 5, agilidade: 5, precisao: 8, pique: 6 },
    skin: '#8a5634', skinShade: '#6a3d22', eyes: '#2a1a10',
    hair: '#d8d8d8', hairHi: '#ffffff', hairStyle: 'buzz',
    top: '#1d5cff', topAccent: '#ffffff', shorts: '#1d1a2b', shortsAccent: '#1d5cff',
    extra: 'mustache', headwear: 'cap', hatColor: '#ffffff',
  },
};

// Grade da seleção: 12 vagas de atletas oficiais (as sem atleta ficam bloqueadas), embaixo as 6 vagas
// dos jogadores criados (src/art/custom.js preenche CUSTOM_ROSTER) e a dupla de chefes.
import { V5 } from '../v5.js';
export const ROSTER = ['giulia', 'zefa', 'tubarao', 'pipoca', 'drauzio', 'varella', 'tito', 'dada', 'arcano', 'rosa', 'carneiro', 'pePato'];
export const CUSTOM_ROSTER = [null, null, null, null, null, null];
export const BOSSES = [null, null];

export const STAT_LABELS = { forca: 'Força', agilidade: 'Agilidade', precisao: 'Precisão', pique: 'Pique' };

// Multiplicadores de jogo derivados dos atributos (5 = neutro).
// 5.0: os números vêm de src/data/partida5.js → atributos (editor da Partida → aba Atributos):
// valor = base (atributo 5) + (atributo − 5) × porPonto
export const ATTR_DEFAULT = {
  forca: { velocidadeBola: { base: 1, porPonto: 0.05 } },
  agilidade: { velocidadeQuadra: { base: 1, porPonto: 0.03 }, recuperacao: { base: 1.05, porPonto: -0.05 } },
  precisao: { erroMira: { base: 5 / 9, porPonto: -1 / 9 } },
  pique: { barraEspecial: { base: 1, porPonto: 0.08 }, notaRuim: { base: 1, porPonto: -0.08 } },
};
export function attrValue(attr, key, v, table = V5.atributos) {
  const d = ATTR_DEFAULT[attr][key], e = ((table || {})[attr] || {})[key] || {};
  const base = Number.isFinite(+e.base) && e.base !== null ? +e.base : d.base, per = Number.isFinite(+e.porPonto) && e.porPonto !== null ? +e.porPonto : d.porPonto;
  return base + ((Number.isFinite(+v) ? +v : 5) - 5) * per;
}
export function statMods(stats) {
  const s = stats || { forca: 5, agilidade: 5, precisao: 5, pique: 5 };
  return {
    speed: Math.max(0.2, attrValue('forca', 'velocidadeBola', s.forca)),            // velocidade da bola
    move: Math.max(0.2, attrValue('agilidade', 'velocidadeQuadra', s.agilidade)),   // velocidade em quadra
    recover: Math.max(0.2, attrValue('agilidade', 'recuperacao', s.agilidade)),     // tempo de recuperação (menor = melhor)
    miss: Math.max(0, Math.min(1, attrValue('precisao', 'erroMira', s.precisao))),  // distância do centro da subárea (fração do raio)
    meter: Math.max(0, attrValue('pique', 'barraEspecial', s.pique)),               // enchimento da barra de especial
    severity: Math.max(0, attrValue('pique', 'notaRuim', s.pique)),                 // intensidade das notas ruins
  };
}
