import { COURT } from './config.js';

// Nota de cada ação em relação à bola recebida: 'otimo' | 'bom' | 'ruim' | 'pior'.
//   b = { speed (m/s da bola que chegou), h (altura da bola em relação aos pés),
//         net (distância do atleta à rede), ballY (altura absoluta), touchNo }
// A ideia é premiar o golpe que o futevôlei real usaria para aquela bola.
const RULES = {
  // ---- 1º toque (domínio) ----
  // peito: feito para amortecer bola forte
  peito: b => b.speed > 12 ? 'otimo' : b.speed > 7 ? 'bom' : 'bom',
  // pé: o mais preciso com bola lenta, mas não segura pancada
  pe: b => b.speed < 9 ? 'otimo' : b.speed < 12 ? 'bom' : b.speed < 15 ? 'ruim' : 'pior',
  // cabeça: bola alta e não muito forte
  cabeca: b => b.speed > 14 ? 'ruim' : b.h > 1.7 && b.speed < 11 ? 'otimo' : 'bom',
  // shark no bloqueio: colado na rede contra ataque forte
  sharkBlock: b => b.net > 2.6 ? 'pior' : b.net < 1.5 && b.speed > 11 ? 'otimo' : b.net < 2.2 ? 'bom' : 'ruim',
  // carrinho: bola de desespero — salvar já é bom
  carrinho: b => b.speed > 16 ? 'ruim' : 'bom',

  // ---- 2º toque (levantamento) ----
  // ombro: precisa de bola alta chegando
  ombro: b => b.h > 1.3 ? 'otimo' : b.h > 0.95 ? 'bom' : 'ruim',
  // na fita: só faz sentido perto da rede
  naFita: b => b.net < 2.5 ? 'otimo' : b.net < 4 ? 'bom' : 'ruim',
  // ataque de segunda: de perto da rede e com a bola alta
  ataqueSegunda: b => b.net < 2.5 && b.ballY > COURT.netH + 0.2 ? 'otimo' : b.net < 4.5 ? 'bom' : 'ruim',
  cabecaSet: b => b.h > 1.6 ? 'bom' : 'ruim',

  // ---- 3º toque (ataque) ----
  // chute colocado: do fundo da quadra
  chuteColocado: b => b.net > 3.5 ? 'otimo' : 'bom',
  // pingo: pertinho da rede; de longe fica uma bola boba
  pingo: b => b.net < 3 ? 'otimo' : b.net < 6 ? 'bom' : 'ruim',
  // cabeçada: bola alta, idealmente de trás
  cabecada: b => b.h < 1.4 ? 'ruim' : b.net > 3.5 ? 'otimo' : 'bom',
  // shark attack: colado na rede e com a bola acima da fita
  sharkAttack: b => b.net < 1.8 && b.ballY > COURT.netH + 0.4 ? 'otimo' : b.net < 2.2 ? 'bom' : 'pior',
};

export function gradeHit(move, b) {
  if (move.special) return 'bom'; // especial já é o próprio bônus
  const rule = RULES[move.id];
  return rule ? rule(b) : 'bom';
}

// Barra de especial ganha por nota.
export const GRADE_METER = { otimo: 1.6, bom: 1, ruim: 0.5, pior: 0 };
