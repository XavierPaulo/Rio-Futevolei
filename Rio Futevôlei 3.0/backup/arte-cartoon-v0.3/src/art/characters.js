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
};

// Grade da seleção: 12 vagas (as sem atleta ficam bloqueadas) + a dupla de chefes.
export const ROSTER = ['giulia', 'zefa', 'tubarao', 'pipoca', 'drauzio', 'varella', null, null, null, null, null, null];
export const BOSSES = [null, null];

export const STAT_LABELS = { forca: 'Força', agilidade: 'Agilidade', precisao: 'Precisão', pique: 'Pique' };

// Multiplicadores de jogo derivados dos atributos (5 = neutro).
export function statMods(stats) {
  const s = stats || { forca: 5, agilidade: 5, precisao: 5, pique: 5 };
  return {
    speed: 1 + (s.forca - 5) * 0.05,        // velocidade da bola
    move: 0.85 + s.agilidade * 0.03,        // velocidade em quadra
    recover: 1.3 - s.agilidade * 0.05,      // tempo de recuperação (menor = melhor)
    error: 1.5 - s.precisao * 0.08,         // erro de mira (menor = melhor)
    meter: 0.6 + s.pique * 0.08,            // enchimento da barra de especial
    severity: 1.4 - s.pique * 0.08,         // intensidade das notas ruins
  };
}
