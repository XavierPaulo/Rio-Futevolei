// 4.0 Modo História — os atletas dos CTs (visual, atributos e especiais) e as duplas de cada partida.
// Editado pelo editor de atletas (docs/editor-atletas.html), que regrava o arquivo a partir da linha
// do export: o que vem depois dela é JSON puro.
//   athletes: { id: { name, skin, hairStyle, hairColor, headwear, hatColor, topStyle, topColor, shortsStyle,
//               shortsColor, wrist, face, attack, defense, stats: { forca, agilidade, precisao, pique } } }
//   attack/defense: especial de ataque e de defesa do atleta (ids de src/data/tilt.js, specialDefs)
//   teams: as duplas — final (Rolando e Marra), urca1..urca3 (chaves do CT da Urca), um por bairro
//          (Rio Futevôlei e desafios do CT) e niteroi (King Size, epílogo do Difícil)
export default {
  "athletes": {
    "rolando": {
      "name": "Rolando Carioca",
      "skin": "#c98d62",
      "hairStyle": "buzz",
      "hairColor": "#1b1310",
      "headwear": "none",
      "hatColor": "#1d1a2b",
      "topStyle": "regata",
      "topColor": "#ffcf2e",
      "shortsStyle": "faixa",
      "shortsColor": "#1d1a2b",
      "wrist": "relogio",
      "face": "shades",
      "attack": "sharkSupremo",
      "defense": "sarrada",
      "stats": {
        "forca": 9,
        "agilidade": 8,
        "precisao": 8,
        "pique": 8
      }
    },
    "marra": {
      "name": "Marra Viteia",
      "skin": "#e8b48a",
      "hairStyle": "long",
      "hairColor": "#c8612a",
      "headwear": "none",
      "hatColor": "#1d1a2b",
      "topStyle": "cropped",
      "topColor": "#e8281f",
      "shortsStyle": "florida",
      "shortsColor": "#1d1a2b",
      "wrist": "pulseiras",
      "face": "starshades",
      "attack": "bicicleta",
      "defense": "escorpiao",
      "stats": {
        "forca": 7,
        "agilidade": 9,
        "precisao": 9,
        "pique": 8
      }
    },
    "biaGaivota": {
      "name": "Bia Gaivota",
      "skin": "#f6d3b3",
      "hairStyle": "ponytail",
      "hairColor": "#e8c25a",
      "headwear": "none",
      "hatColor": "#1d1a2b",
      "topStyle": "regata",
      "topColor": "#ffffff",
      "shortsStyle": "lisa",
      "shortsColor": "#1d5cff",
      "wrist": "none",
      "face": "none",
      "attack": "pingoPipoca",
      "defense": "sarrada",
      "stats": {
        "forca": 5,
        "agilidade": 6,
        "precisao": 6,
        "pique": 5
      }
    },
    "ninaSiri": {
      "name": "Nina Siri",
      "skin": "#8a5634",
      "hairStyle": "puff",
      "hairColor": "#1b1310",
      "headwear": "none",
      "hatColor": "#1d1a2b",
      "topStyle": "regata",
      "topColor": "#e8281f",
      "shortsStyle": "lisa",
      "shortsColor": "#ffffff",
      "wrist": "none",
      "face": "none",
      "attack": "bicicleta",
      "defense": "sarrada",
      "stats": {
        "forca": 6,
        "agilidade": 5,
        "precisao": 5,
        "pique": 6
      }
    },
    "cacoMergulho": {
      "name": "Caco Mergulho",
      "skin": "#c98d62",
      "hairStyle": "curly",
      "hairColor": "#5a3a22",
      "headwear": "cap",
      "hatColor": "#1fbf6a",
      "topStyle": "camiseta",
      "topColor": "#1fbf6a",
      "shortsStyle": "lisa",
      "shortsColor": "#1d1a2b",
      "wrist": "none",
      "face": "none",
      "attack": "bicicleta",
      "defense": "sarrada",
      "stats": {
        "forca": 7,
        "agilidade": 6,
        "precisao": 5,
        "pique": 6
      }
    },
    "dudaOnda": {
      "name": "Duda Onda",
      "skin": "#e8b48a",
      "hairStyle": "long",
      "hairColor": "#1b1310",
      "headwear": "none",
      "hatColor": "#1d1a2b",
      "topStyle": "regata",
      "topColor": "#1d5cff",
      "shortsStyle": "lisa",
      "shortsColor": "#ffcf2e",
      "wrist": "none",
      "face": "none",
      "attack": "bicicleta",
      "defense": "meiaBicicleta",
      "stats": {
        "forca": 5,
        "agilidade": 7,
        "precisao": 7,
        "pique": 5
      }
    },
    "ivoParedao": {
      "name": "Ivo Paredão",
      "skin": "#5e3a22",
      "hairStyle": "buzz",
      "hairColor": "#1b1310",
      "headwear": "none",
      "hatColor": "#1d1a2b",
      "topStyle": "regata",
      "topColor": "#1d1a2b",
      "shortsStyle": "lisa",
      "shortsColor": "#e8281f",
      "wrist": "none",
      "face": "shades",
      "attack": "sharkSupremo",
      "defense": "sarrada",
      "stats": {
        "forca": 8,
        "agilidade": 5,
        "precisao": 6,
        "pique": 7
      }
    },
    "dandaraFogo": {
      "name": "Dandara Fogo",
      "skin": "#8a5634",
      "hairStyle": "mohawk",
      "hairColor": "#c8612a",
      "headwear": "none",
      "hatColor": "#1d1a2b",
      "topStyle": "cropped",
      "topColor": "#ff5fa2",
      "shortsStyle": "lisa",
      "shortsColor": "#1d1a2b",
      "wrist": "none",
      "face": "hoop",
      "attack": "bicicleta",
      "defense": "escorpiao",
      "stats": {
        "forca": 6,
        "agilidade": 8,
        "precisao": 7,
        "pique": 6
      }
    },
    "tiao": {
      "name": "Tião Salva-Vidas",
      "skin": "#c98d62",
      "hairStyle": "buzz",
      "hairColor": "#1b1310",
      "headwear": "none",
      "hatColor": "#e8281f",
      "topStyle": "regata",
      "topColor": "#e8281f",
      "shortsStyle": "lisa",
      "shortsColor": "#ffcf2e",
      "wrist": "none",
      "face": "shades",
      "attack": "bicicleta",
      "defense": "sarrada",
      "stats": {
        "forca": 7,
        "agilidade": 6,
        "precisao": 6,
        "pique": 6
      }
    },
    "jaque": {
      "name": "Jaque Copacabana",
      "skin": "#e8b48a",
      "hairStyle": "ponytail",
      "hairColor": "#1b1310",
      "headwear": "none",
      "hatColor": "#ffcf2e",
      "topStyle": "cropped",
      "topColor": "#ffcf2e",
      "shortsStyle": "lisa",
      "shortsColor": "#1d5cff",
      "wrist": "none",
      "face": "hoop",
      "attack": "bicicleta",
      "defense": "sarrada",
      "stats": {
        "forca": 6,
        "agilidade": 7,
        "precisao": 6,
        "pique": 6
      }
    },
    "kadu": {
      "name": "Kadu Condomínio",
      "skin": "#f6d3b3",
      "hairStyle": "mohawk",
      "hairColor": "#e8c25a",
      "headwear": "cap",
      "hatColor": "#1d1a2b",
      "topStyle": "camiseta",
      "topColor": "#1d1a2b",
      "shortsStyle": "lisa",
      "shortsColor": "#ffffff",
      "wrist": "none",
      "face": "none",
      "attack": "sharkSupremo",
      "defense": "sarrada",
      "stats": {
        "forca": 7,
        "agilidade": 5,
        "precisao": 6,
        "pique": 5
      }
    },
    "thais": {
      "name": "Thaís Pepê",
      "skin": "#e8b48a",
      "hairStyle": "long",
      "hairColor": "#c8612a",
      "headwear": "none",
      "hatColor": "#ff5fa2",
      "topStyle": "regata",
      "topColor": "#ff5fa2",
      "shortsStyle": "lisa",
      "shortsColor": "#1d1a2b",
      "wrist": "none",
      "face": "starshades",
      "attack": "pingoPipoca",
      "defense": "sarrada",
      "stats": {
        "forca": 5,
        "agilidade": 6,
        "precisao": 7,
        "pique": 5
      }
    },
    "pedro": {
      "name": "Seu Pedro Pedra",
      "skin": "#8a5634",
      "hairStyle": "buzz",
      "hairColor": "#d8d8d8",
      "headwear": "none",
      "hatColor": "#ffffff",
      "topStyle": "camiseta",
      "topColor": "#ffffff",
      "shortsStyle": "lisa",
      "shortsColor": "#1d5cff",
      "wrist": "none",
      "face": "mustache",
      "attack": "bicicleta",
      "defense": "escorpiao",
      "stats": {
        "forca": 7,
        "agilidade": 5,
        "precisao": 7,
        "pique": 5
      }
    },
    "lia": {
      "name": "Lia do Leme",
      "skin": "#c98d62",
      "hairStyle": "puff",
      "hairColor": "#5a3a22",
      "headwear": "none",
      "hatColor": "#1fbf6a",
      "topStyle": "regata",
      "topColor": "#1fbf6a",
      "shortsStyle": "lisa",
      "shortsColor": "#ffffff",
      "wrist": "none",
      "face": "none",
      "attack": "bicicleta",
      "defense": "meiaBicicleta",
      "stats": {
        "forca": 5,
        "agilidade": 7,
        "precisao": 6,
        "pique": 6
      }
    },
    "caio": {
      "name": "Caio Posto 9",
      "skin": "#e8b48a",
      "hairStyle": "curly",
      "hairColor": "#5a3a22",
      "headwear": "none",
      "hatColor": "#1d5cff",
      "topStyle": "listrada",
      "topColor": "#1d5cff",
      "shortsStyle": "lisa",
      "shortsColor": "#ffffff",
      "wrist": "none",
      "face": "none",
      "attack": "bicicleta",
      "defense": "sarrada",
      "stats": {
        "forca": 7,
        "agilidade": 6,
        "precisao": 6,
        "pique": 6
      }
    },
    "bel": {
      "name": "Bel Arpoador",
      "skin": "#f6d3b3",
      "hairStyle": "ponytail",
      "hairColor": "#e8c25a",
      "headwear": "none",
      "hatColor": "#ff5fa2",
      "topStyle": "cropped",
      "topColor": "#ff5fa2",
      "shortsStyle": "lisa",
      "shortsColor": "#1fbf6a",
      "wrist": "none",
      "face": "shades",
      "attack": "pingoPipoca",
      "defense": "sarrada",
      "stats": {
        "forca": 5,
        "agilidade": 7,
        "precisao": 7,
        "pique": 6
      }
    },
    "guga": {
      "name": "Guga Enseada",
      "skin": "#5e3a22",
      "hairStyle": "curly",
      "hairColor": "#1b1310",
      "headwear": "cap",
      "hatColor": "#ffcf2e",
      "topStyle": "regata",
      "topColor": "#ffcf2e",
      "shortsStyle": "lisa",
      "shortsColor": "#1d1a2b",
      "wrist": "none",
      "face": "none",
      "attack": "sharkSupremo",
      "defense": "sarrada",
      "stats": {
        "forca": 8,
        "agilidade": 6,
        "precisao": 6,
        "pique": 6
      }
    },
    "mari": {
      "name": "Mari Mourisco",
      "skin": "#8a5634",
      "hairStyle": "long",
      "hairColor": "#1b1310",
      "headwear": "none",
      "hatColor": "#9b5cff",
      "topStyle": "regata",
      "topColor": "#9b5cff",
      "shortsStyle": "lisa",
      "shortsColor": "#ffffff",
      "wrist": "none",
      "face": "hoop",
      "attack": "bicicleta",
      "defense": "sarrada",
      "stats": {
        "forca": 6,
        "agilidade": 7,
        "precisao": 7,
        "pique": 6
      }
    },
    "arthur": {
      "name": "Arthur Classe",
      "skin": "#f6d3b3",
      "hairStyle": "buzz",
      "hairColor": "#5a3a22",
      "headwear": "none",
      "hatColor": "#1d1a2b",
      "topStyle": "camiseta",
      "topColor": "#1d1a2b",
      "shortsStyle": "lisa",
      "shortsColor": "#ffffff",
      "wrist": "none",
      "face": "shades",
      "attack": "pingoPipoca",
      "defense": "sarrada",
      "stats": {
        "forca": 6,
        "agilidade": 6,
        "precisao": 8,
        "pique": 6
      }
    },
    "vivi": {
      "name": "Vivi Leblon",
      "skin": "#e8b48a",
      "hairStyle": "long",
      "hairColor": "#e8c25a",
      "headwear": "none",
      "hatColor": "#ffffff",
      "topStyle": "cropped",
      "topColor": "#ffffff",
      "shortsStyle": "lisa",
      "shortsColor": "#ff5fa2",
      "wrist": "none",
      "face": "starshades",
      "attack": "bicicleta",
      "defense": "meiaBicicleta",
      "stats": {
        "forca": 6,
        "agilidade": 7,
        "precisao": 7,
        "pique": 7
      }
    },
    "pipo": {
      "name": "Pipo Asa-Delta",
      "skin": "#c98d62",
      "hairStyle": "mohawk",
      "hairColor": "#1690c9",
      "headwear": "none",
      "hatColor": "#1690c9",
      "topStyle": "regata",
      "topColor": "#1690c9",
      "shortsStyle": "lisa",
      "shortsColor": "#1d1a2b",
      "wrist": "none",
      "face": "none",
      "attack": "bicicleta",
      "defense": "sarrada",
      "stats": {
        "forca": 8,
        "agilidade": 7,
        "precisao": 6,
        "pique": 6
      }
    },
    "nanda": {
      "name": "Nanda Pepino",
      "skin": "#8a5634",
      "hairStyle": "puff",
      "hairColor": "#1b1310",
      "headwear": "none",
      "hatColor": "#1fbf6a",
      "topStyle": "regata",
      "topColor": "#1fbf6a",
      "shortsStyle": "lisa",
      "shortsColor": "#ffcf2e",
      "wrist": "none",
      "face": "hoop",
      "attack": "bicicleta",
      "defense": "escorpiao",
      "stats": {
        "forca": 6,
        "agilidade": 8,
        "precisao": 7,
        "pique": 6
      }
    },
    "rafa": {
      "name": "Rafa Pontal",
      "skin": "#e8b48a",
      "hairStyle": "curly",
      "hairColor": "#c8612a",
      "headwear": "cap",
      "hatColor": "#ff7a1a",
      "topStyle": "camiseta",
      "topColor": "#ff7a1a",
      "shortsStyle": "lisa",
      "shortsColor": "#1d1a2b",
      "wrist": "none",
      "face": "none",
      "attack": "sharkSupremo",
      "defense": "sarrada",
      "stats": {
        "forca": 8,
        "agilidade": 6,
        "precisao": 7,
        "pique": 6
      }
    },
    "kel": {
      "name": "Kel Recreio",
      "skin": "#c98d62",
      "hairStyle": "ponytail",
      "hairColor": "#1b1310",
      "headwear": "none",
      "hatColor": "#1d5cff",
      "topStyle": "cropped",
      "topColor": "#1d5cff",
      "shortsStyle": "lisa",
      "shortsColor": "#ffffff",
      "wrist": "none",
      "face": "shades",
      "attack": "bicicleta",
      "defense": "sarrada",
      "stats": {
        "forca": 6,
        "agilidade": 8,
        "precisao": 7,
        "pique": 7
      }
    },
    "beto": {
      "name": "Beto Freguesia",
      "skin": "#5e3a22",
      "hairStyle": "buzz",
      "hairColor": "#1b1310",
      "headwear": "none",
      "hatColor": "#1fbf6a",
      "topStyle": "camiseta",
      "topColor": "#1fbf6a",
      "shortsStyle": "lisa",
      "shortsColor": "#1d1a2b",
      "wrist": "none",
      "face": "mustache",
      "attack": "bicicleta",
      "defense": "meiaBicicleta",
      "stats": {
        "forca": 8,
        "agilidade": 7,
        "precisao": 7,
        "pique": 6
      }
    },
    "solTaquara": {
      "name": "Sol Taquara",
      "skin": "#e8b48a",
      "hairStyle": "long",
      "hairColor": "#7a3cf0",
      "headwear": "none",
      "hatColor": "#ffcf2e",
      "topStyle": "regata",
      "topColor": "#ffcf2e",
      "shortsStyle": "lisa",
      "shortsColor": "#9b5cff",
      "wrist": "none",
      "face": "starshades",
      "attack": "pingoPipoca",
      "defense": "sarrada",
      "stats": {
        "forca": 6,
        "agilidade": 8,
        "precisao": 8,
        "pique": 6
      }
    },
    "fabio": {
      "name": "Fábio Aterro",
      "skin": "#c98d62",
      "hairStyle": "buzz",
      "hairColor": "#5a3a22",
      "headwear": "none",
      "hatColor": "#e8281f",
      "topStyle": "listrada",
      "topColor": "#e8281f",
      "shortsStyle": "lisa",
      "shortsColor": "#1d1a2b",
      "wrist": "none",
      "face": "shades",
      "attack": "sharkSupremo",
      "defense": "sarrada",
      "stats": {
        "forca": 9,
        "agilidade": 6,
        "precisao": 7,
        "pique": 7
      }
    },
    "clara": {
      "name": "Clara Flamengo",
      "skin": "#f6d3b3",
      "hairStyle": "ponytail",
      "hairColor": "#1b1310",
      "headwear": "none",
      "hatColor": "#e8281f",
      "topStyle": "regata",
      "topColor": "#e8281f",
      "shortsStyle": "lisa",
      "shortsColor": "#1d1a2b",
      "wrist": "none",
      "face": "none",
      "attack": "bicicleta",
      "defense": "escorpiao",
      "stats": {
        "forca": 6,
        "agilidade": 8,
        "precisao": 8,
        "pique": 7
      }
    },
    "zeBica": {
      "name": "Zé da Bica",
      "skin": "#8a5634",
      "hairStyle": "curly",
      "hairColor": "#1b1310",
      "headwear": "cap",
      "hatColor": "#1d5cff",
      "topStyle": "regata",
      "topColor": "#1d5cff",
      "shortsStyle": "lisa",
      "shortsColor": "#ffcf2e",
      "wrist": "none",
      "face": "none",
      "attack": "bicicleta",
      "defense": "sarrada",
      "stats": {
        "forca": 9,
        "agilidade": 7,
        "precisao": 7,
        "pique": 7
      }
    },
    "iara": {
      "name": "Iara Ilhéu",
      "skin": "#c98d62",
      "hairStyle": "long",
      "hairColor": "#1b1310",
      "headwear": "none",
      "hatColor": "#1fbf6a",
      "topStyle": "cropped",
      "topColor": "#1fbf6a",
      "shortsStyle": "lisa",
      "shortsColor": "#1d5cff",
      "wrist": "none",
      "face": "hoop",
      "attack": "bicicleta",
      "defense": "sarrada",
      "stats": {
        "forca": 7,
        "agilidade": 8,
        "precisao": 8,
        "pique": 7
      }
    },
    "kingSize": {
      "name": "King Size",
      "skin": "#5e3a22",
      "hairStyle": "buzz",
      "hairColor": "#1b1310",
      "headwear": "none",
      "hatColor": "#1d1a2b",
      "topStyle": "regata",
      "topColor": "#1d1a2b",
      "shortsStyle": "lisa",
      "shortsColor": "#ffcf2e",
      "wrist": "none",
      "face": "shades",
      "attack": "sharkSupremo",
      "defense": "sarrada",
      "stats": {
        "forca": 10,
        "agilidade": 8,
        "precisao": 9,
        "pique": 9
      }
    },
    "icarai": {
      "name": "Rainha Icaraí",
      "skin": "#e8b48a",
      "hairStyle": "long",
      "hairColor": "#1b1310",
      "headwear": "none",
      "hatColor": "#ffcf2e",
      "topStyle": "cropped",
      "topColor": "#ffcf2e",
      "shortsStyle": "lisa",
      "shortsColor": "#1d1a2b",
      "wrist": "none",
      "face": "starshades",
      "attack": "bicicleta",
      "defense": "escorpiao",
      "stats": {
        "forca": 8,
        "agilidade": 10,
        "precisao": 9,
        "pique": 9
      }
    }
  },
  "teams": {
    "final": [
      "rolando",
      "marra"
    ],
    "urca1": [
      "biaGaivota",
      "ninaSiri"
    ],
    "urca2": [
      "cacoMergulho",
      "dudaOnda"
    ],
    "urca3": [
      "ivoParedao",
      "dandaraFogo"
    ],
    "copacabana": [
      "tiao",
      "jaque"
    ],
    "barra": [
      "kadu",
      "thais"
    ],
    "leme": [
      "pedro",
      "lia"
    ],
    "ipanema": [
      "caio",
      "bel"
    ],
    "botafogo": [
      "guga",
      "mari"
    ],
    "leblon": [
      "arthur",
      "vivi"
    ],
    "saoConrado": [
      "pipo",
      "nanda"
    ],
    "recreio": [
      "rafa",
      "kel"
    ],
    "jacarepagua": [
      "beto",
      "solTaquara"
    ],
    "flamengo": [
      "fabio",
      "clara"
    ],
    "ilha": [
      "zeBica",
      "iara"
    ],
    "niteroi": [
      "kingSize",
      "icarai"
    ]
  }
};
