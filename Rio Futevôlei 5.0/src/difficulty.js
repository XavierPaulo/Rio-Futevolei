// Dificuldade da CPU: 12 níveis em 5 faixas.
//
//   Iniciante (1–3)   reage tarde, lê mal a bola, erra muito e quase não ataca de verdade
//   Amador (4–6)      joga o básico, já devolve bem as bolas fáceis
//   Profissional (7–9) escolhe o golpe certo na maioria das vezes e mira nos espaços
//   Elite (10–11)     rápida, precisa e esperta; quase não dá bola de graça
//   Lenda (12)        o máximo: reação de reflexo, leitura quase perfeita, erro raríssimo
//
// O que cada parâmetro controla:
//   react     tempo de reação, sorteado entre [mín, máx] a cada bola (s)
//   speed     velocidade base em quadra (m/s), antes da Agilidade do atleta
//   speedVar  disposição para correr naquela bola (multiplicador, [mín, máx])
//   judge     erro de leitura do ponto de queda (m), corrigido conforme a bola chega
//   shank     chance de pegar mal na bola (sai torta, longa ou na rede)
//   aimErr    erro extra de pontaria (m)
//   diveMax   até que distância ela tenta o carrinho (m)
//   reach     alcance do toque (m) — o do jogador humano é 1,35
//   smart     chance de tomar a decisão tática certa (golpe ideal, mirar no espaço vazio)
//   special   chance de usar o especial quando a barra está cheia e a jogada permite
//   outRead   chance de deixar passar uma bola que vai para fora
// Cada nível é um ponto (k, de 0 a 1) na progressão entre a CPU mais fraca (K0) e a mais
// forte (K1). Os valores de LEVEL_K foram CALIBRADOS por medição (tools/balance.js →
// calibrate): a porcentagem de pontos que a CPU ganha contra um jogador de referência
// sobe em degraus iguais de um nível para o outro.
const K0 = { react: [0.48, 0.80], speed: 3.8, speedVar: [0.58, 0.78], judge: 2.4, shank: 0.38, aimErr: 1.05, diveMax: 1.3, reach: 0.90, smart: 0.05, special: 0.10, outRead: 0.40 };
const K1 = { react: [0.04, 0.08], speed: 5.9, speedVar: [0.98, 1.06], judge: 0.12, shank: 0.008, aimErr: 0.05, diveMax: 3.9, reach: 1.34, smart: 1.00, special: 0.95, outRead: 0.995 };
// Calibrado contra um jogador de referência que acerta 85% das bolas: ~500 partidas
// simuladas, com uma curva logística ajustada às medições (a medição de cada nível sozinha
// tem ~±7% de ruído). Previsto: a CPU ganha 14%, 21%, 29%, 36%, 44%, 51%, 58%, 66%, 73%,
// 81%, 88% e ~97% dos pontos — degraus regulares de ~7,5%.
export const LEVEL_K = [0, 0.174, 0.272, 0.346, 0.41, 0.468, 0.524, 0.583, 0.646, 0.721, 0.821, 1];

export const LEVEL_NAMES = [
  'Turista', 'Banhista', 'Iniciante',
  'Peladeiro', 'Racha de domingo', 'Amador',
  'Semiprofissional', 'Profissional', 'Circuito Carioca',
  'Elite', 'Seleção',
  'Lenda',
];

export const TIERS = [
  { name: 'Iniciante', from: 1, to: 3 },
  { name: 'Amador', from: 4, to: 6 },
  { name: 'Profissional', from: 7, to: 9 },
  { name: 'Elite', from: 10, to: 11 },
  { name: 'Lenda', from: 12, to: 12 },
];

export const MIN_LEVEL = 1, MAX_LEVEL = 12, DEFAULT_LEVEL = 5;

export const tierOf = level => TIERS.find(t => level >= t.from && level <= t.to);

// Parâmetros num ponto k da progressão (0 = mais fraca, 1 = mais forte).
export function paramsAt(k) {
  k = Math.max(0, Math.min(1, k));
  const mix = (a, b) => Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * k) : a + (b - a) * k;
  const p = { k };
  for (const key of Object.keys(K0)) p[key] = mix(K0[key], K1[key]);
  p.deceptiveExtra = 0.45 - 0.25 * p.smart; // bola enganosa atrasa mais quem é menos esperto
  return p;
}

export function cpuParams(level) {
  const l = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round(level || DEFAULT_LEVEL)));
  return { ...paramsAt(LEVEL_K[l - 1]), level: l };
}
