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
import { V5 } from './v5.js';

export const TILT = {
  data: JSON.parse(JSON.stringify(TILT_DATA)), // vivo: o editor troca e a próxima bola já usa
  band: [0, 2.4],          // altura da bola (m dos pés) que a hitbox pega — golpes normais dos dois botões
  doubleTap: 0.3,          // s entre dois toques para valer como especial
  color: { A: '#ff3b4f', B: '#3d8bff', S: '#ffc21a' }, // seta: □ vermelha · ○ azul · especial dourada
  arrowW: { A: 0.2, B: 0.7, S: 0.45 },                 // largura do corpo da seta
};
// 5.0: valores do "segurar e mirar" editáveis (src/data/tilt.js, controle; editor de golpes)
// (agora na aba Controle do editor da Partida: partida5 controle.mira; o tilt.js antigo fica de reserva)
const CTL = () => ((V5.controle || {}).mira) || TILT.data.controle || {};
Object.defineProperties(TILT, {
  turnSpeed: { get: () => (+CTL().giro || 360) * Math.PI / 180 }, // giro da seta (rad/s)
  direct: { get: () => CTL().modo === 'direto' },                  // 5.0: mira direta (a seta vai na hora para o analógico)
  maxPause: { get: () => +(CTL().pausaMax ?? 3) },                 // s de pausa até sair sozinha
  holdMove: { get: () => +(CTL().andarSegurando ?? 0.75) },       // velocidade segurando o botão (×)
  reach: { get: () => +CTL().alcance || 0 },                       // alcance da hitbox de X / B (m; 0 = o do golpe)
});
// 5.0: a seta estica durante a pausa: começa em setaInicio × a distância da bola e chega a setaFim × no
// fim da pausa máxima, acelerando (progresso = (t / pausaMax) ^ setaCurva; 2 = quadrática). A área onde a
// bola cai cresce junto, de areaInicio a areaFim. Passando de 100%, a câmera treme até tremorMax.
const num = (v, d) => (v == null || v === '' || isNaN(+v) ? d : +v);
export function tiltStretchCfg() {
  const c = CTL();
  return { ini: num(c.setaInicio, 0.7), fim: num(c.setaFim, 1.4), curva: Math.max(0.1, num(c.setaCurva, 2)),
    aIni: num(c.areaInicio, 0.8), aFim: num(c.areaFim, 1.3), tremor: num(c.tremorMax, 0.2), some: Math.max(0.01, num(c.tremorSome, 0.5)) };
}
// esticada da seta depois de t s mirando: { len (× distância), area (× raio), over (0..1 acima de 100%), p (0..1) }
export function tiltStretch(t) {
  const c = tiltStretchCfg(), max = Math.max(0.01, TILT.maxPause);
  const k = Math.min(1, Math.max(0, t / max)) ** c.curva;
  return stretchOf(c, k);
}
// a mesma esticada pelo comprimento (× distância) que se quer — a CPU escolhe quanto "esperar" assim
export function tiltStretchFor(want) {
  const c = tiltStretchCfg(), span = c.fim - c.ini;
  const k = span ? Math.min(1, Math.max(0, (want - c.ini) / span)) : 0;
  return stretchOf(c, k);
}
function stretchOf(c, k) {
  const len = c.ini + (c.fim - c.ini) * k;
  const over = c.fim > 1 ? Math.min(1, Math.max(0, (len - 1) / (c.fim - 1))) : 0;
  return { len, area: c.aIni + (c.aFim - c.aIni) * k, over, p: k };
}
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
