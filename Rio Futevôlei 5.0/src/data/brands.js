// Marcas patrocinadoras — dados puros, editados pelo editor de marcas (docs/editor-marcas.html), que
// regrava o arquivo a partir da linha do export: o que vem depois dela é JSON puro.
//
// enabled  false = a marca não aparece no jogo
// name     nome da marca, como aparece nas placas
// product  descrição curta (o que ela vende): aparece menor, abaixo do nome
// logo     id do desenho do logo em src/art/logos.js (usado quando não há imagem)
// image    logo enviado como imagem (caminho a partir da raiz do jogo) ou null
// colors   bg = fundo do banner · fg = cor do nome · accent = faixa e detalhes
// weight   peso no rodízio das placas (1 = normal; 2 = aparece o dobro)
export default {
  "sunburn": {
    "enabled": true,
    "name": "SunBurn",
    "product": "Filtro solar",
    "logo": "sunburn",
    "image": null,
    "colors": {
      "bg": "#ff7a1a",
      "fg": "#ffffff",
      "accent": "#ffd21a"
    },
    "weight": 1
  },
  "arabom": {
    "enabled": true,
    "name": "AraBom",
    "product": "Comida árabe",
    "logo": "camelinho",
    "image": null,
    "colors": {
      "bg": "#f6e3b4",
      "fg": "#b3261e",
      "accent": "#d9a35b"
    },
    "weight": 1
  },
  "calango": {
    "enabled": true,
    "name": "Calango Lindo",
    "product": "Óculos de sol",
    "logo": "lagartixa",
    "image": null,
    "colors": {
      "bg": "#4a5a24",
      "fg": "#ff9a3c",
      "accent": "#5f6e2c"
    },
    "weight": 1
  },
  "chimamate": {
    "enabled": true,
    "name": "Chimamate",
    "product": "Mate",
    "logo": "cuia",
    "image": null,
    "colors": {
      "bg": "#2f6b2f",
      "fg": "#f4e6c3",
      "accent": "#8a5a2b"
    },
    "weight": 1
  },
  "angra": {
    "enabled": true,
    "name": "Angra",
    "product": "Água",
    "logo": "gotas",
    "image": null,
    "colors": {
      "bg": "#e8f6ff",
      "fg": "#0a5fbf",
      "accent": "#1fa4ff"
    },
    "weight": 1
  },
  "sucaza": {
    "enabled": true,
    "name": "Su Caza",
    "product": "Bolas",
    "logo": "bola",
    "image": null,
    "colors": {
      "bg": "#1d1a2b",
      "fg": "#ffd21a",
      "accent": "#ff5fa2"
    },
    "weight": 1
  },
  "cambitos": {
    "enabled": true,
    "name": "Cambitos",
    "product": "Pré-treino",
    "logo": "varas",
    "image": null,
    "colors": {
      "bg": "#141414",
      "fg": "#b6ff2e",
      "accent": "#b6ff2e"
    },
    "weight": 1
  },
  "vaprala": {
    "enabled": true,
    "name": "VáPralá",
    "product": "Curso de inglês",
    "logo": "balao-aviao",
    "image": null,
    "colors": {
      "bg": "#1d5cff",
      "fg": "#ffffff",
      "accent": "#ff3b4f"
    },
    "weight": 1
  },
  "coentro": {
    "enabled": true,
    "name": "Coentro Verde",
    "product": "Comida natural",
    "logo": "coentro",
    "image": null,
    "colors": {
      "bg": "#ffffff",
      "fg": "#2f9e44",
      "accent": "#7cc95a"
    },
    "weight": 1
  }
};
