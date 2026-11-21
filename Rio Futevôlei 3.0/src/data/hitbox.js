// Hitbox dos golpes — vale para todos os golpes, jogadores e CPU (editada no Editor de golpes).
//
// A hitbox é uma elipse no chão em volta do ponto de contato do atleta:
//   frente/trás = alcance de cada golpe (reach, em src/data/moves.js)
//   side        = largura para os lados (m, de cada lado do centro), igual para todos os golpes
// A CPU tem as duas medidas menos a diferença do nível dela; no Kids Mode o jogador tem 1,5×.
export default {
  side: 1.69,
};
