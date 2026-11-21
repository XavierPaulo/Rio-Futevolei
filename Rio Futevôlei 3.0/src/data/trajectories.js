// Física das trajetórias da bola — dados puros, editados no artefato "Editor de golpes".
//
// A bola segue a física real: gravidade, arrasto do ar e efeito (rotação). Cada golpe escolhe um
// modelo e a altura máxima; o jogo calcula a velocidade de saída que leva a bola até essa altura e
// ao destino, e o tempo no ar sai da física. A Força do atleta deixa o chute mais rápido e mais
// reto (pico mais baixo para o mesmo destino).
//
// mundo.gravity   gravidade (m/s²): 9,8 é a real; 9,0 deixa o jogo um pouco mais "arcade"
// Parâmetros de cada modelo:
//   drag     arrasto do ar (1/s): 0 = sem ar; maior = a bola perde velocidade e cai mais em pé
//   spin     efeito na vertical (m/s²): positivo = para baixo (topspin, mergulha);
//            negativo = para trás (backspin, sustenta um pouco)
//   wobble   oscilação para os lados (m) da bola sem rotação · freq = oscilações por segundo
// No golpe: apex = altura máxima (m); na cravada, launch = velocidade para baixo na saída (m/s);
// bend = curva lateral (m, efeito lateral).
export const PARAM_INFO = {
  gravity: { label: 'Gravidade', hint: 'm/s² · 9,8 = real', min: 4, max: 15, step: 0.1 },
  drag: { label: 'Arrasto do ar', hint: '1/s · 0 = sem ar', min: 0, max: 1.5, step: 0.01 },
  spin: { label: 'Efeito vertical', hint: 'm/s² · + mergulha (topspin) · − sustenta (backspin)', min: -5, max: 10, step: 0.1 },
  wobble: { label: 'Oscilação lateral', hint: 'm · bola sem rotação', min: 0, max: 1.5, step: 0.01 },
  freq: { label: 'Oscilações por segundo', hint: 'Hz', min: 0.3, max: 4, step: 0.05 },
};

export default {
  mundo: {"gravity":10},
  balistica: {"drag":0},
  arrasto: {"drag":0.35},
  topspin: {"drag":0.86,"spin":-2.8},
  backspin: {"drag":0.2,"spin":-0.6},
  cravada: {"drag":0.15,"spin":0},
  balao: {"drag":0.5},
  largadinha: {"drag":0.45,"spin":0},
  sidespin: {"drag":0},
  flutuante: {"drag":0.3,"wobble":0.35,"freq":1.6},
};
