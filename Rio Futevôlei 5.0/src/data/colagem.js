// 5.0 Estilo "Colagem": o jogo como recortes de revista colados numa folha (cartaz hippie dos anos 70,
// capa de CD de rock dos anos 80/90, humor de quadrinho). Editado pelo editor de visual
// (docs/editor-visual.html), que regrava o arquivo a partir da linha do export: o que vem depois dela é JSON puro.
//   paleta     — tintas de impressão: o cenário puxa cada cor para a tinta mais próxima
//   fidelidade — 0 = cor original, 1 = só as tintas da paleta
//   faixas     — tons de luz e sombra de cada cor (2 a 5; menos = mais chapado)
//   reticula   — retícula de gráfica nas sombras: tamanho do ponto (px), força (0–1) e ângulo (graus)
//   desalinho  — impressão barata: o vermelho sai deslocado (px)
//   granulado  — textura do papel (0–0.2)
//   contorno   — força do contorno escuro (0–1)
//   mosaico    — céu em quadradinhos, como o cartaz da girafa (tamanho do quadrado em px; 0 = desliga)
//   ceu        — tipo: 'raios' (raios de cartaz hippie, como a carta de tarô) | 'mosaico' | 'normal';
//                raios (quantidade), forcaRaios (0–1), solX/solY (centro, 0–1 da tela), cor1 (topo), cor2 (horizonte), sol
//   recorteCenario — cada objeto do cenário vira recorte: borda de papel (px), contorno (px), cor, sombra
//   recorte    — atletas e bola: borda branca de recorte de tesoura (px), cor do papel, lados do corte
//                (menos = mais "tesourado"), sombra do recorte colado (deslocamento e cor)
//   reticulaAtleta — pontinhos de impressão por cima dos atletas (força 0–1, tamanho em px)
//   granuladoAtleta — fibra do papel nos atletas (0–1)
//   visualAtletas — atletas em cartoon: cabeça, corpo, músculo (0–1), contorno, mãos, pés, escala,
//                desgaste (estampa gasta, 0–1), jeito padrão do rosto e, por atleta: olhar (relax|intenso|normal),
//                sorriso (canto|serio|normal), tatuagem (cor ou null), corrente (cor de ouro ou null), músculo,
//                barbaPorFazer; rostoHumano (olhos, nariz e boca de gente); foto = acabamento de foto de revista
//                (cor: quanto da cor original volta, contraste, brilho, escuro = tinta das sombras, claro = papel)
//   atletas    — atletas mostrados no menu Visual Colagem · sugestoes — ideias de atletas (nome, ref, personalidade, visual)
export default {
  "paleta": [
    "#d9261c",
    "#ff3d8b",
    "#ff7a2e",
    "#b8952a",
    "#1f2a66",
    "#8c8fd8",
    "#e3f230",
    "#3f8a4a",
    "#e9cf9a",
    "#f4ecd8",
    "#6b3a1e",
    "#1a1622"
  ],
  "fidelidade": 0.5,
  "faixas": 4,
  "reticula": {
    "tamanho": 5,
    "forca": 0.28,
    "angulo": 15
  },
  "desalinho": 0.8,
  "granulado": 0.05,
  "contorno": 0.26,
  "mosaico": 14,
  "ceu": {
    "tipo": "raios",
    "raios": 22,
    "forcaRaios": 0.8,
    "solX": 0.21,
    "solY": 0.8,
    "cor1": "#8a90dc",
    "cor2": "#ffb27a",
    "sol": "#fff1c9"
  },
  "recorteCenario": {
    "borda": 1.5,
    "contorno": 1.2,
    "cor": "#efe4cf",
    "sombraX": 2,
    "sombraY": 3
  },
  "recorte": {
    "borda": 1.5,
    "cor": "#f1e8d6",
    "lados": 14,
    "sombraX": 2.5,
    "sombraY": 3.5,
    "sombraCor": "rgba(40, 18, 10, 0.32)"
  },
  "reticulaAtleta": {
    "forca": 0,
    "tamanho": 3.5
  },
  "granuladoAtleta": 0.9,
  "atletas": [
    "arcano",
    "rosa",
    "carneiro",
    "pePato",
    "dada",
    "tito"
  ],
  "sugestoes": [
    {
      "nome": "Nunca Esconde",
      "ref": "cartaz \"Never Hide\"",
      "personalidade": "Diva colecionadora: vaidosa, generosa e barulhenta. Carrega a cabeça cheia de bugigangas e a torcida inteira atrás dela.",
      "visual": "Turbante vermelho cheio de bonequinhos, óculos brancos de bolinha, boca brilhante; vermelho, creme e dourado."
    }
  ],
  "visualAtletas": {
    "ligado": true,
    "cabeca": 0.52,
    "corpo": 1.02,
    "musculo": 0.55,
    "contorno": 0.8,
    "contornoCabeca": 0.7,
    "maos": 1.6,
    "pes": 1.3,
    "escala": 0.98,
    "desgaste": 0.23,
    "padrao": {
      "olhar": "relax",
      "sorriso": "canto"
    },
    "atletas": {
      "tito": {
        "olhar": "arregalado",
        "sorriso": "normal",
        "tatuagem": "#1f2a66",
        "corrente": null,
        "musculo": 0.45,
        "barbaPorFazer": false
      },
      "dada": {
        "olhar": "arregalado",
        "sorriso": "normal",
        "tatuagem": null,
        "corrente": "#e0b030",
        "musculo": 0.5
      },
      "arcano": {
        "olhar": "relax",
        "sorriso": "canto",
        "tatuagem": null,
        "corrente": "#e0b030",
        "musculo": 0.6,
        "barbaPorFazer": true
      },
      "rosa": {
        "olhar": "intenso",
        "sorriso": "serio",
        "tatuagem": "#1a1622",
        "corrente": null,
        "musculo": 0.55
      },
      "carneiro": {
        "olhar": "relax",
        "sorriso": "normal",
        "tatuagem": null,
        "corrente": null,
        "musculo": 0.6,
        "barbaPorFazer": true
      },
      "pePato": {
        "olhar": "intenso",
        "sorriso": "serio",
        "tatuagem": "#1f2a66",
        "corrente": "#e0b030",
        "musculo": 1,
        "barbaPorFazer": true
      },
      "giulia": {
        "olhar": "relax",
        "sorriso": "canto",
        "tatuagem": null,
        "corrente": "#e0b030",
        "musculo": 0.6
      },
      "zefa": {
        "olhar": "normal",
        "sorriso": "normal",
        "tatuagem": null,
        "corrente": null,
        "musculo": 0.6
      },
      "tubarao": {
        "olhar": "intenso",
        "sorriso": "canto",
        "tatuagem": "#1f2a66",
        "corrente": "#e0b030",
        "musculo": 1,
        "barbaPorFazer": true
      },
      "pipoca": {
        "olhar": "normal",
        "sorriso": "canto",
        "tatuagem": null,
        "corrente": null,
        "musculo": 0.5
      },
      "drauzio": {
        "olhar": "relax",
        "sorriso": "canto",
        "tatuagem": null,
        "corrente": "#e0b030",
        "musculo": 0.8,
        "barbaPorFazer": true
      },
      "varella": {
        "olhar": "relax",
        "sorriso": "serio",
        "tatuagem": "#1a1622",
        "corrente": null,
        "musculo": 0.7
      }
    },
    "rostoHumano": true,
    "foto": {
      "ligado": true,
      "cor": 0.4,
      "contraste": 1.4,
      "brilho": 0.97,
      "escuro": "#16131c",
      "claro": "#f4ecd8"
    }
  }
};
