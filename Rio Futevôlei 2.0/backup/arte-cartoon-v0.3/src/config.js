// Unidades em metros e segundos. Eixo x = comprimento da quadra (rede em x = 0),
// z = profundidade (+z aponta para a câmera), y = altura.
export const COURT = { halfLen: 9, halfWid: 4.5, netH: 2.2 };

export const G = 9.0; // gravidade arcade, um pouco mais "flutuante" que a real
export const BALL_R = 0.14;
export const DT = 1 / 120;
export const POINTS_TO_WIN = 12;
export const SIDE_SWAP_EVERY = 6; // troca de lado a cada 6 pontos somados

export const P = {
  speed: 5.4,
  accel: 38,
  holdMul: 0.35,      // velocidade enquanto segura A/B mirando
  jumpV: 5.4,
  reach: 1.35,        // alcance horizontal do toque do jogador (hitbox)
  cpuReach: 1.1,      // alcance da CPU
  bandPad: 0.2,       // folga extra na faixa de altura de cada golpe
  swingWindow: 0.3,   // janela ativa do golpe após soltar o botão
  swingTotal: 0.5,
  autoDomSpeed: 11,   // bola acima desta velocidade (m/s) no parceiro sem controle...
  autoDomChance: 0.8, // ...é dominada sozinha com esta chance, se estiver na hitbox dele
  diveSpeed: 7.4,     // carrinho
  diveTime: 0.42,
  diveRecover: 0.6,
};

// Erros "humanos" da CPU: reage com atraso variável, lê mal a bola e corrige tarde,
// às vezes não chega, e às vezes pega mal na bola (vai para fora ou na rede).
export const CPU = {
  speed: 4.8,
  react: [0.14, 0.38],   // tempo de reação (s), sorteado a cada bola
  speedVar: [0.78, 1.0], // disposição para correr naquela bola
  judge: 1.1,            // erro de leitura do ponto de queda (m), corrigido tarde
  diveMax: 2.8,          // distância máxima em que a CPU tenta o carrinho
  aimErr: 0.35,
  shank: 0.12,           // chance de pegar mal na bola
  deceptiveExtra: 0.3,
};

// Ferramentas de treino (câmera lenta). Desligar na versão arcade.
export const TRAINING = true;
export const SLOW_FACTOR = 0.5;

export const SPECIAL = { max: 100, perTouch: 9, perPoint: 12 };
