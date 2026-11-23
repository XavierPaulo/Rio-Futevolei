// 5.0 Artes: imagens enviadas pelo editor de artes (docs/editor-artes.html) que substituem as artes
// desenhadas por código. Editado pelo editor, que regrava o arquivo a partir da linha do export:
// o que vem depois dela é JSON puro. A lista de artes que dá para trocar (código, nome, descrição,
// tamanho e tipo) fica em src/art/artes.js (catalogoArtes).
//   fotoNasArtes — true: as artes enviadas dos atletas também ganham o acabamento de foto de revista
//                  do Visual Colagem; false: aparecem com as cores do arquivo
//   trocas — { código: { arquivo (caminho a partir da raiz do jogo, em assets/artes/), ligado,
//              escala (1 = tamanho da peça original), x, y (deslocamento em px do desenho de 256 px;
//              no cenário, em metros), giro (graus) } }
export default {
  "fotoNasArtes": true,
  "trocas": {}
};
