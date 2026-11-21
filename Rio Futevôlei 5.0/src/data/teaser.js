// 5.0 Teaser: a trilha (ska-rock dos anos 90, tocada pelo navegador) e os textos do clipe.
// Editado pela tela do Teaser (docs/teaser.html), que regrava o arquivo a partir da linha do export:
// o que vem depois dela é JSON puro.
//   bpm      — andamento (160 = 60 compassos em 1:30 exatos; outro valor muda onde caem os cortes)
//   volumes  — 0 a 1: geral, bateria, baixo, guitarraSka (contratempo), guitarraRock (base distorcida e solo), metais
//   eco      — eco "dub" da guitarra ska na parte lenta (0 a 0.8)
//   carimbos — palavras que aparecem carimbadas na tela nos cortes
//   vhs      — cara de fita VHS: chiado (0 a 1), linhas (0 a 1) e o texto do canto
//   personalidades — frase de cada atleta nas fotos do clipe (quem tem "bio" no jogo usa a bio)
export default {
  "bpm": 160,
  "volumes": {
    "geral": 0.8,
    "bateria": 0.95,
    "baixo": 0.8,
    "guitarraSka": 0.4,
    "guitarraRock": 0.7,
    "metais": 0.4
  },
  "eco": 0.45,
  "carimbos": [
    "DEMAIS!",
    "NA FITA!",
    "PANCADA!",
    "QUE ISSO?!",
    "SEM DÓ!",
    "BRABO!",
    "ALUCINANTE!",
    "PRAIA!"
  ],
  "vhs": {
    "chiado": 0.35,
    "linhas": 0.35,
    "canto": "▶ PLAY  SP  RIO 1996"
  },
  "personalidades": {
    "giulia": "Sonha ser a Rainha da Areia e não aceita menos que isso",
    "zefa": "Rápida, risonha e invocada: chega em toda bola",
    "tubarao": "Força bruta, sorriso de dente afiado e zero paciência",
    "pipoca": "Precisão de relojoeiro: o pingo dele é veneno puro",
    "drauzio": "Veterano bigodudo que conhece cada grão de areia",
    "varella": "Malandro elegante, de óculos escuros até no pôr do sol"
  }
};
