// Marcas patrocinadoras — dados puros (a engine terá uma área para inserir, editar e excluir).
//
// name     nome da marca, como aparece nas placas
// product  o que ela vende (aparece menor, abaixo do nome)
// logo     id do desenho do logo em src/art/logos.js (ou, no futuro, uma imagem enviada)
// colors   bg = fundo da placa · fg = cor do nome · accent = detalhes
// weight   peso no rodízio das placas (1 = normal; 2 = aparece o dobro)
export default {
  sunburn: {
    name: 'SunBurn', product: 'Filtro solar', logo: 'sunburn',
    colors: { bg: '#ff7a1a', fg: '#ffffff', accent: '#ffd21a' }, weight: 1,
  },
  arabom: {
    name: 'AraBom', product: 'Comida árabe', logo: 'camelinho',
    colors: { bg: '#f6e3b4', fg: '#b3261e', accent: '#d9a35b' }, weight: 1,
  },
  calango: {
    name: 'Calango Lindo', product: 'Óculos de sol', logo: 'lagartixa',
    colors: { bg: '#4a5a24', fg: '#ff9a3c', accent: '#5f6e2c' }, weight: 1,
  },
  chimamate: {
    name: 'Chimamate', product: 'Mate', logo: 'cuia',
    colors: { bg: '#2f6b2f', fg: '#f4e6c3', accent: '#8a5a2b' }, weight: 1,
  },
  angra: {
    name: 'Angra', product: 'Água', logo: 'gotas',
    colors: { bg: '#e8f6ff', fg: '#0a5fbf', accent: '#1fa4ff' }, weight: 1,
  },
  sucaza: {
    name: 'Su Caza', product: 'Bolas', logo: 'bola',
    colors: { bg: '#1d1a2b', fg: '#ffd21a', accent: '#ff5fa2' }, weight: 1,
  },
  cambitos: {
    name: 'Cambitos', product: 'Pré-treino', logo: 'varas',
    colors: { bg: '#141414', fg: '#b6ff2e', accent: '#b6ff2e' }, weight: 1,
  },
  vaprala: {
    name: 'VáPralá', product: 'Curso de inglês', logo: 'balao-aviao',
    colors: { bg: '#1d5cff', fg: '#ffffff', accent: '#ff3b4f' }, weight: 1,
  },
  coentro: {
    name: 'Coentro Verde', product: 'Comida natural', logo: 'coentro',
    colors: { bg: '#ffffff', fg: '#2f9e44', accent: '#7cc95a' }, weight: 1,
  },
};
