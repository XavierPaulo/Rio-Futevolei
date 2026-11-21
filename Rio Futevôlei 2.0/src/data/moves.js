// Parâmetros editáveis de cada golpe (2.0) — dados puros, editados no artefato "Editor de golpes".
//
// aim (destino): sempre numa linha reta a partir do jogador, em direção à rede (mesma lateral)
//   dist       distância (m) do jogador até o centro da subárea do meio
//   shape      'circulo' | 'elipse' — formato da área inteira (malha 3×3) e das subáreas
//   w, h       tamanho da área inteira (m), vista da câmera lateral: w = horizontal (ao longo
//              da quadra, rumo à rede / ao fundo) e h = vertical (ao longo da rede). No círculo,
//              w = h = diâmetro
//   precision  nível da tabela PRECISION abaixo que serviu de atalho (o maior lado da área =
//              tamanho do nível) ou 'personalizada'; só um rótulo: o jogo usa w e h
//   noAim      true = o direcional não escolhe subárea (vai sempre na do meio)
//   ownCourt   true = a bola fica no nosso campo (domínios e levantamentos): a linha para a
//              0,45 m da rede em vez de atravessá-la
// traj (trajetória, física em src/engine/trajectory.js): model = um dos modelos físicos,
//   apex = altura máxima (m; o tempo no ar sai da física), launch = velocidade para baixo na
//   saída (m/s, só na cravada), bend = curva lateral (m)
//
// band = alturas mínima e máxima da bola (m dos pés) · reach = alcance do jogador humano (m,
//   frente/trás; para os lados é 25% maior). A CPU tem esse alcance menos a diferença do nível dela.
// hardErr = erro extra (m) a cada m/s de bola recebida acima de 9 m/s (domínios)
// alt = outro destino/trajetória no 3º toque (carrinho, Sarrada, Escorpião)

export const PRECISION = {
  perfeita: {"name":"Perfeita","size":2.4},
  alta: {"name":"Alta","size":3.23},
  mediaAlta: {"name":"Média alta","size":4.06},
  media: {"name":"Média","size":4.89},
  mediaBaixa: {"name":"Média baixa","size":5.72},
  baixa: {"name":"Baixa","size":6.56},
  espirrada: {"name":"Espirrada","size":9},
};

export default {
  peito: {"aim":{"dist":0.45,"precision":"personalizada","shape":"elipse","w":10.25,"h":6.6,"noAim":true},"band":[0.75,2],"hardErr":0.03,"reach":1.35,"traj":{"apex":4.4,"model":"balistica"}},
  pe: {"aim":{"dist":0.3,"precision":"personalizada","shape":"elipse","w":6.7,"h":7.15},"band":[0,1.15],"hardErr":0.13,"reach":1.2,"traj":{"apex":3,"model":"balistica"}},
  cabeca: {"aim":{"dist":0.35,"precision":"personalizada","shape":"circulo","w":12,"h":12,"noAim":true},"band":[1.1,2.9],"hardErr":0.06,"reach":1.35,"traj":{"apex":4,"model":"balistica"}},
  sharkBlock: {"aim":{"dist":3,"precision":"baixa","shape":"elipse","w":6.56,"h":4.2},"band":[1.2,3.1],"reach":1.35,"traj":{"apex":2.9,"launch":0,"model":"cravada"}},
  ombro: {"aim":{"dist":0.3,"precision":"espirrada","shape":"circulo","w":9,"h":9,"noAim":true},"band":[0.8,2],"reach":1.35,"traj":{"apex":4.6,"model":"backspin"}},
  naFita: {"aim":{"dist":0.8,"precision":"personalizada","shape":"elipse","w":3.85,"h":8.5},"band":[0,1.15],"reach":1.35,"traj":{"apex":4,"bend":0,"model":"topspin","pace":"lenta"}},
  ataqueSegunda: {"aim":{"dist":6.1,"precision":"baixa","shape":"circulo","w":6.56,"h":6.56,"noAim":true},"band":[1,2.9],"reach":1.35,"traj":{"apex":2.7,"launch":3,"model":"backspin"}},
  cabecaSet: {"aim":{"dist":0.4,"precision":"personalizada","shape":"circulo","w":7.8,"h":7.8},"band":[1.5,2.9],"reach":1.35,"traj":{"apex":4.2,"model":"backspin"}},
  chuteColocado: {"aim":{"dist":11,"precision":"baixa","shape":"circulo","w":6.56,"h":6.56,"noAim":true},"band":[0,1.45],"reach":1.35,"traj":{"apex":3.1,"model":"arrasto"}},
  pingo: {"aim":{"dist":3.6,"precision":"personalizada","shape":"elipse","w":2.1,"h":8.5},"band":[0,1.45],"reach":1.35,"traj":{"apex":2.7,"model":"largadinha"}},
  cabecada: {"aim":{"dist":10.25,"precision":"personalizada","shape":"elipse","w":3.5,"h":12,"noAim":true},"band":[1.15,2.9],"reach":1.35,"traj":{"apex":2.6,"model":"arrasto"}},
  sharkAttack: {"aim":{"dist":3.35,"precision":"espirrada","shape":"elipse","w":3.75,"h":9},"band":[1.3,3.2],"reach":1.35,"traj":{"launch":4,"model":"cravada"}},
  carrinho: {"aim":{"dist":0.5,"precision":"espirrada","shape":"circulo","w":9,"h":9,"noAim":true},"alt":{"aim":{"dist":11,"precision":"espirrada","shape":"circulo","w":9,"h":9,"noAim":true},"traj":{"apex":4.5,"launch":3,"model":"sidespin"}},"band":[0,1],"reach":1.65,"traj":{"apex":3.8,"model":"balistica"}},
  saqueForte: {"aim":{"dist":16,"precision":"media","shape":"circulo","w":4.89,"h":4.89},"traj":{"apex":3,"model":"topspin"}},
  saqueColocado: {"aim":{"dist":12,"precision":"espirrada","shape":"elipse","w":5,"h":9},"traj":{"apex":7.5,"model":"balao"}},
  bicicleta: {"aim":{"dist":10,"precision":"mediaBaixa","shape":"circulo","w":5.72,"h":5.72},"band":[0.5,3.3],"reach":1.75,"traj":{"apex":2.6,"model":"topspin"}},
  meiaBicicleta: {"aim":{"dist":8,"precision":"mediaBaixa","shape":"circulo","w":5.72,"h":5.72},"band":[0.5,3.3],"reach":1.75,"traj":{"apex":2.7,"bend":1.6,"model":"sidespin"}},
  sharkSupremo: {"aim":{"dist":7.4,"precision":"media","shape":"circulo","w":4.89,"h":4.89,"noAim":true},"band":[0.5,3.4],"reach":1.75,"traj":{"apex":3,"model":"topspin"}},
  pingoPipoca: {"aim":{"dist":4.7,"precision":"alta","shape":"circulo","w":3.23,"h":3.23},"band":[0.5,3.3],"reach":1.75,"traj":{"apex":2.8,"model":"largadinha"}},
  sarrada: {"aim":{"dist":3.4,"precision":"alta","shape":"circulo","w":3.23,"h":3.23,"ownCourt":true},"alt":{"aim":{"dist":11,"precision":"baixa","shape":"circulo","w":6.56,"h":6.56,"noAim":true},"traj":{"apex":5,"model":"balao"}},"band":[0.1,2.8],"reach":2.55,"traj":{"apex":4.4,"model":"balistica"}},
  escorpiao: {"aim":{"dist":2.4,"precision":"alta","shape":"circulo","w":3.23,"h":3.23,"noAim":true,"ownCourt":true},"alt":{"aim":{"dist":11,"precision":"media","shape":"circulo","w":4.89,"h":4.89},"traj":{"apex":2.6,"model":"topspin"}},"band":[0.5,3.4],"reach":2.15,"traj":{"apex":4.6,"model":"balistica"}},
};
