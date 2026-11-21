// Câmeras do jogo — dados puros (podem virar um arquivo .json editado pela engine).
//
// Coordenadas no referencial da quadra, escritas com a dupla "da casa" do lado esquerdo (x < 0):
//   x = comprimento (rede em x = 0), y = altura, z = largura (+z = calçadão, -z = mar).
// anchor   'world' = a câmera fica sempre no mesmo lugar
//          'home'  = a câmera acompanha a dupla da casa e gira 180° quando os lados trocam
// position / target   onde a câmera fica e para onde olha (m)
// fov      abertura vertical mínima (graus); minHFov garante a largura visível em telas estreitas
// follow   modo "Seguindo a bola": pan = quanto acompanha a bola de lado (e o limite panMax, m),
//          back = quanto recua, lift/liftMax = quanto sobe o olhar com a bola alta
// facing   como o atleta (desenho de perfil) se vira na tela:
//          'screen' = para o lado da tela onde está a frente dele (projeção na câmera)
export default {
  lateral: {
    name: 'Lateral',
    desc: 'de lado para a quadra, como na TV',
    anchor: 'world',
    position: [0, 6.4, 19.5],
    target: [0, 1.5, -1.5],
    fov: 36,
    minHFov: 64,
    follow: { pan: 0.11, panMax: 1, back: 1.5, lift: 0.1, liftMax: 0.5 },
    facing: 'screen',
  },
  fundo: {
    name: 'Por trás',
    desc: 'atrás da sua dupla, como no tênis',
    anchor: 'home',
    position: [-19.5, 7.8, 2.4],
    target: [0.5, 0, 0],
    fov: 40,
    minHFov: 46,
    follow: { pan: 0.22, panMax: 1.3, back: 1.0, lift: 0.08, liftMax: 0.4 },
    facing: 'screen',
  },
};
