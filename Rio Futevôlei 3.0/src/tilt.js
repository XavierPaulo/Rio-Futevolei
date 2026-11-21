// Modo Tilt: em qualquer toque, dois botões e mira em 360°.
//   □ (A; X no Xbox)  = no chão, bola rápida, longa e menos precisa (seta vermelha e comprida);
//                       no ar, cortada saindo a 45°
//   ○ (B; B no Xbox)  = no chão, bola alta, curta, precisa e lenta (seta azul e achatada);
//                       no ar, vai direto para a região do parceiro (sem pausa)
//   ✕ (C; A no Xbox)  = pulo · △ (D) = carrinho
//   □ □ / ○ ○ (dois toques rápidos, barra cheia) = especial de ataque / de defesa escolhido na seleção
// O golpe muda de nome e animação conforme o toque, mas a bola é a do botão.
// Segurando o botão, a hitbox aparece (o atleta ainda anda, um pouco mais devagar). Se a bola
// entra nela, o tempo para, a tela escurece (fora atletas, rede e linhas) e uma seta aponta para a
// rede; o direcional (cima, baixo, esquerda, direita, diagonais ou o ângulo do analógico) vira a
// seta para aquela direção, girando até lá (360°). Ao soltar o botão a bola sai na direção escolhida.
// Os valores editáveis (bolas, nomes, especiais) ficam em src/data/tilt.js.
import TILT_DATA from './data/tilt.js';

export const TILT = {
  data: JSON.parse(JSON.stringify(TILT_DATA)), // vivo: o editor troca e a próxima bola já usa
  band: [0, 2.4],          // altura da bola (m dos pés) que a hitbox pega — golpes normais dos dois botões
  turnSpeed: Math.PI * 2,  // giro da seta até a direção apertada (rad/s): uma volta por segundo
  maxPause: 3,             // s de pausa até a decisão sair sozinha
  holdMove: 0.75,          // velocidade do atleta enquanto segura o botão (×)
  doubleTap: 0.3,          // s entre dois toques para valer como especial
  color: { A: '#ff3b4f', B: '#3d8bff', S: '#ffc21a' }, // seta: □ vermelha · ○ azul · especial dourada
  arrowW: { A: 0.2, B: 0.7, S: 0.45 },                 // largura do corpo da seta
};
export const TILT_KEYS = ['A', 'B'];

// a bola de um toque: { kind: 'A' | 'B' | 'SA' | 'SB', air }
export function tiltBall(kind, air) {
  const d = TILT.data;
  return (air ? d.air : d.ground)[kind] || d.ground.A;
}
// os dados do especial no Modo Tilt (null = sem dados: usa os do modo normal)
export function tiltSpecial(id) {
  const d = TILT.data.specialDefs;
  return (d && d[id]) || null;
}
// nome do golpe do toque (1–3), no chão / no ar, por botão
export function tiltName(touchNo, air, key) {
  const n = TILT.data.names[Math.min(3, Math.max(1, touchNo))];
  return n && n[air ? 'air' : 'ground'] && n[air ? 'air' : 'ground'][key];
}
// centro e raio da área para onde a seta aponta (do atleta, na direção angle)
export function tiltAimAt(pl, dist, radius, angle) {
  return { x: pl.x + Math.cos(angle) * dist, z: pl.z + Math.sin(angle) * dist, r: radius };
}
// ponto de queda sorteado dentro da área; a Precisão do atleta (miss 0..1) encolhe o círculo
export function tiltPoint(a, miss = 0.5, rnd = Math.random, away = 1) {
  const r = a.r * Math.sqrt(rnd()) * (0.4 + 0.6 * miss), t = rnd() * Math.PI * 2;
  let x = a.x + Math.cos(t) * r;
  if (Math.abs(x) < 0.3) x = 0.3 * Math.sign(x || away); // nunca em cima da rede
  return { x, z: a.z + Math.sin(t) * r };
}
