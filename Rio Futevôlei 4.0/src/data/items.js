// 4.0: os itens das lojas — Lanchonete e Farmácia (consumíveis: mochila, pausas da Exibição e troca de
// lado), Artigos Esportivos (equipamento), Moda (roupas da Giulia na história), Spa e Academia (serviços).
// Editado pelo editor de itens (docs/editor-itens.html), que regrava o arquivo a partir da linha do
// export: o que vem depois dela é JSON puro.
//   enabled: false = some das lojas e da Exibição (quem já tem na mochila continua podendo usar)
//   price: preço base em R$ (a dificuldade da história multiplica) · icon: emoji · image: imagem enviada
//          (caminho a partir da raiz do jogo; quando há imagem, ela substitui o emoji)
//   effect (consumíveis): fome/sede (cura), buff { stat, v, t } (atributo, pontos, segundos),
//          sunblock (anula o Sol Forte), cure (Lesionado, Fadiga, Sono ou Ansiedade)
//   effect (equipamento): gear 'sol' (Sol Forte gasta metade do Pique) | 'stat' (+v no atributo stat nas
//          partidas) | 'semLesao' (malhar demais não causa Lesionado)
//   moda: kind (blusa, short, cabeca) e look (campos do desenho da Giulia que a peça troca)
//   spa: effect.cures (marcas curadas) · academia: effect.forma (forma física ganha)
export default {
  "items": {
    "mate": {
      "enabled": true,
      "shop": "lanchonete",
      "name": "Mate",
      "desc": "cura 50 de sede · +2 Agilidade por 30 s",
      "price": 6,
      "icon": "🧉",
      "image": null,
      "effect": {
        "sede": 50,
        "buff": {
          "stat": "agilidade",
          "v": 2,
          "t": 30
        }
      }
    },
    "suco": {
      "enabled": true,
      "shop": "lanchonete",
      "name": "Suco",
      "desc": "cura 80 de sede · +1 Pique por 15 s",
      "price": 8,
      "icon": "🧃",
      "image": null,
      "effect": {
        "sede": 80,
        "buff": {
          "stat": "pique",
          "v": 1,
          "t": 15
        }
      }
    },
    "brownie": {
      "enabled": true,
      "shop": "lanchonete",
      "name": "Brownie",
      "desc": "cura 50 de fome · +2 Precisão por 30 s",
      "price": 7,
      "icon": "🍫",
      "image": null,
      "effect": {
        "fome": 50,
        "buff": {
          "stat": "precisao",
          "v": 2,
          "t": 30
        }
      }
    },
    "sanduiche": {
      "enabled": true,
      "shop": "lanchonete",
      "name": "Sanduíche",
      "desc": "cura 80 de fome · +1 Força por 15 s",
      "price": 12,
      "icon": "🥪",
      "image": null,
      "effect": {
        "fome": 80,
        "buff": {
          "stat": "forca",
          "v": 1,
          "t": 15
        }
      }
    },
    "protetor": {
      "enabled": true,
      "shop": "farmacia",
      "name": "Protetor solar",
      "desc": "anula o Sol Forte",
      "price": 15,
      "icon": "🧴",
      "image": null,
      "effect": {
        "sunblock": true
      }
    },
    "anestesico": {
      "enabled": true,
      "shop": "farmacia",
      "name": "Anestésico",
      "desc": "cura Lesionado",
      "price": 20,
      "icon": "💉",
      "image": null,
      "effect": {
        "cure": "lesionado"
      }
    },
    "tonico": {
      "enabled": true,
      "shop": "farmacia",
      "name": "Tônico",
      "desc": "cura Sono",
      "price": 18,
      "icon": "🧪",
      "image": null,
      "effect": {
        "cure": "sono"
      }
    },
    "viseira": {
      "enabled": true,
      "shop": "esportes",
      "name": "Viseira",
      "desc": "o Sol Forte gasta metade do Pique",
      "price": 45,
      "icon": "🧢",
      "image": null,
      "effect": {
        "gear": "sol"
      }
    },
    "meias": {
      "enabled": true,
      "shop": "esportes",
      "name": "Meias de neoprene",
      "desc": "+1 de Agilidade nas partidas",
      "price": 35,
      "icon": "🧦",
      "image": null,
      "effect": {
        "gear": "stat",
        "stat": "agilidade",
        "v": 1
      }
    },
    "tornozeleira": {
      "enabled": true,
      "shop": "esportes",
      "name": "Tornozeleira",
      "desc": "malhar demais não causa mais Lesionado",
      "price": 40,
      "icon": "🩹",
      "image": null,
      "effect": {
        "gear": "semLesao"
      }
    },
    "regataRoxa": {
      "enabled": true,
      "shop": "moda",
      "name": "Regata roxa",
      "desc": "Blusa",
      "price": 0,
      "icon": "🎽",
      "image": null,
      "kind": "blusa",
      "look": {
        "topStyle": "regata",
        "top": "#9b5cff",
        "topAccent": "#ffffff"
      }
    },
    "camisetaBranca": {
      "enabled": true,
      "shop": "moda",
      "name": "Camiseta branca",
      "desc": "Blusa",
      "price": 35,
      "icon": "👕",
      "image": null,
      "kind": "blusa",
      "look": {
        "topStyle": "camiseta",
        "top": "#ffffff",
        "topAccent": "#9b5cff"
      }
    },
    "croppedRosa": {
      "enabled": true,
      "shop": "moda",
      "name": "Cropped rosa",
      "desc": "Blusa",
      "price": 35,
      "icon": "👚",
      "image": null,
      "kind": "blusa",
      "look": {
        "topStyle": "cropped",
        "top": "#ff5fa2",
        "topAccent": "#ffffff"
      }
    },
    "listradaAzul": {
      "enabled": true,
      "shop": "moda",
      "name": "Listrada azul",
      "desc": "Blusa",
      "price": 40,
      "icon": "👕",
      "image": null,
      "kind": "blusa",
      "look": {
        "topStyle": "listrada",
        "top": "#1d5cff",
        "topAccent": "#ffffff"
      }
    },
    "shortRoxo": {
      "enabled": true,
      "shop": "moda",
      "name": "Short roxo-escuro",
      "desc": "Short",
      "price": 0,
      "icon": "🩳",
      "image": null,
      "kind": "short",
      "look": {
        "shorts": "#2a1d45",
        "shortsAccent": "#ff5fa2"
      }
    },
    "shortBranco": {
      "enabled": true,
      "shop": "moda",
      "name": "Short branco",
      "desc": "Short",
      "price": 30,
      "icon": "🩳",
      "image": null,
      "kind": "short",
      "look": {
        "shorts": "#ffffff",
        "shortsAccent": "#1d1a2b",
        "shortsStyle": "faixa"
      }
    },
    "shortFlorido": {
      "enabled": true,
      "shop": "moda",
      "name": "Short estampado",
      "desc": "Short",
      "price": 35,
      "icon": "🩳",
      "image": null,
      "kind": "short",
      "look": {
        "shorts": "#1fbf6a",
        "shortsAccent": "#ffcf2e",
        "shortsStyle": "florida"
      }
    },
    "oculosEstrela": {
      "enabled": true,
      "shop": "moda",
      "name": "Óculos de estrela",
      "desc": "Acessório de cabeça",
      "price": 0,
      "icon": "🌟",
      "image": null,
      "kind": "cabeca",
      "look": {
        "extra": "starshades",
        "headwear": null
      }
    },
    "oculosEscuros": {
      "enabled": true,
      "shop": "moda",
      "name": "Óculos escuros",
      "desc": "Acessório de cabeça",
      "price": 25,
      "icon": "🕶️",
      "image": null,
      "kind": "cabeca",
      "look": {
        "extra": "shades",
        "headwear": null
      }
    },
    "chapeu": {
      "enabled": true,
      "shop": "moda",
      "name": "Chapéu de pescador",
      "desc": "Acessório de cabeça",
      "price": 25,
      "icon": "👒",
      "image": null,
      "kind": "cabeca",
      "look": {
        "extra": null,
        "headwear": "bucket",
        "hatColor": "#ffcf2e"
      }
    },
    "bone": {
      "enabled": true,
      "shop": "moda",
      "name": "Boné",
      "desc": "Acessório de cabeça",
      "price": 20,
      "icon": "🧢",
      "image": null,
      "kind": "cabeca",
      "look": {
        "extra": null,
        "headwear": "cap",
        "hatColor": "#9b5cff"
      }
    },
    "brinco": {
      "enabled": true,
      "shop": "moda",
      "name": "Brinco de argola",
      "desc": "Acessório de cabeça",
      "price": 20,
      "icon": "💍",
      "image": null,
      "kind": "cabeca",
      "look": {
        "extra": "hoop",
        "headwear": null
      }
    },
    "spa": {
      "enabled": true,
      "shop": "spa",
      "name": "Tratamento completo",
      "desc": "cura Fadiga, Sono e Ansiedade da Giulia · 1 hora",
      "price": 40,
      "icon": "💆",
      "image": null,
      "effect": {
        "cures": [
          "fadiga",
          "sono",
          "ansiedade"
        ]
      }
    },
    "academia": {
      "enabled": true,
      "shop": "academia",
      "name": "Malhar",
      "desc": "+80 de forma física · 1 hora",
      "price": 20,
      "icon": "🏋️",
      "image": null,
      "effect": {
        "forma": 80
      }
    }
  }
};
