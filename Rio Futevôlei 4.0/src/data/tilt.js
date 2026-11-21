// Golpes do Modo Tilt — dados puros, editados no Editor de golpes (aba "Modo Tilt").
//
// ground / air: a bola de cada botão no chão e no ar
//   A (□ no PS, X no Xbox) · B (○ no PS, B no Xbox)
//   name   nome da bola (aparece no aviso da pausa)
//   dist   distância (m) do atleta ao centro da área, na direção da seta
//   radius raio (m) da área onde a bola cai (a Precisão do atleta encolhe)
//   apex   altura máxima (m) · model / pace: modelo físico e velocidade da bola (como nos golpes)
//   angle  (só air.A) ângulo de saída em graus: a altura máxima sai dele e da distância
//   air.B  vai direto para a região do parceiro (sem pausa e sem seta; radius = metade do diâmetro)
// names: nome do golpe em cada toque (1, 2, 3), no chão e no ar, por botão
// specials: especiais que os atletas podem escolher na seleção
//   attack  = □ □ (dois toques rápidos) · defense = ○ ○ — precisam da barra cheia
// specialDefs: cada especial no Modo Tilt (só vale aqui; o modo normal usa src/data/moves.js)
//   name, dist, radius, apex, launch (só cravada), bend (curva lateral), model, pace
//   band = alturas mínima e máxima da bola na hitbox (m dos pés) · reach = alcance frente/trás (m)
// carrinho: o carrinho (△) no Modo Tilt — sem pausa e sem seta, vai reto rumo à rede (mesmos campos)
export default {
  "ground": {
    "A": {
      "name": "Bola rápida",
      "dist": 9,
      "radius": 1.7,
      "apex": 2.8,
      "model": "arrasto",
      "pace": "rapida"
    },
    "B": {
      "name": "Bola precisa",
      "dist": 3.6,
      "radius": 0.6,
      "apex": 4.8,
      "model": "backspin",
      "pace": "lenta"
    }
  },
  "air": {
    "A": {
      "name": "Cortada 45°",
      "dist": 6.3,
      "radius": 1.7,
      "angle": 45,
      "model": "balistica",
      "pace": "rapida"
    },
    "B": {
      "name": "No parceiro",
      "radius": 1,
      "apex": 4.2,
      "model": "backspin",
      "pace": "normal"
    }
  },
  "names": {
    "1": {
      "ground": {
        "A": "Domínio de peito",
        "B": "Domínio de pé"
      },
      "air": {
        "A": "Cabeça",
        "B": "Shark (bloqueio)"
      }
    },
    "2": {
      "ground": {
        "A": "Passe de ombro",
        "B": "Na fita"
      },
      "air": {
        "A": "Ataque de segunda",
        "B": "Levantada de cabeça"
      }
    },
    "3": {
      "ground": {
        "A": "Chute colocado",
        "B": "Pingo"
      },
      "air": {
        "A": "Cabeçada",
        "B": "Shark Attack"
      }
    }
  },
  "specials": {
    "attack": [
      "bicicleta",
      "sharkSupremo",
      "pingoPipoca",
      "ondaBarra",
      "pedradaLeme",
      "porDoSol",
      "bondinho",
      "toqueClasse",
      "asaDelta",
      "pontal",
      "freguesia",
      "aterro",
      "mareBaia"
    ],
    "defense": [
      "sarrada",
      "escorpiao",
      "meiaBicicleta"
    ]
  },
  "specialDefs": {
    "bicicleta": {
      "name": "Bicicleta",
      "dist": 10,
      "radius": 1,
      "apex": 2.6,
      "launch": 0,
      "bend": 0,
      "model": "topspin",
      "pace": "normal",
      "band": [
        0.5,
        3.3
      ],
      "reach": 1.75
    },
    "meiaBicicleta": {
      "name": "Meia-Bicicleta",
      "dist": 8,
      "radius": 1,
      "apex": 2.7,
      "launch": 0,
      "bend": 1.6,
      "model": "sidespin",
      "pace": "normal",
      "band": [
        0.5,
        3.3
      ],
      "reach": 1.75
    },
    "sharkSupremo": {
      "name": "Shark Attack Supremo",
      "dist": 7.4,
      "radius": 1,
      "apex": 3,
      "launch": 0,
      "bend": 0,
      "model": "topspin",
      "pace": "normal",
      "band": [
        0.5,
        3.4
      ],
      "reach": 1.75
    },
    "pingoPipoca": {
      "name": "Pingo Envenenado",
      "dist": 4.7,
      "radius": 1,
      "apex": 2.8,
      "launch": 0,
      "bend": 0,
      "model": "largadinha",
      "pace": "normal",
      "band": [
        0.5,
        3.3
      ],
      "reach": 1.75
    },
    "sarrada": {
      "name": "Sarrada",
      "dist": 3.4,
      "radius": 1,
      "apex": 4.4,
      "launch": 0,
      "bend": 0,
      "model": "balistica",
      "pace": "normal",
      "band": [
        0.1,
        2.8
      ],
      "reach": 2.55
    },
    "escorpiao": {
      "name": "Escorpião",
      "dist": 2.4,
      "radius": 1,
      "apex": 4.6,
      "launch": 0,
      "bend": 0,
      "model": "balistica",
      "pace": "normal",
      "band": [
        0.5,
        3.4
      ],
      "reach": 2.15
    },
    "ondaBarra": {
      "name": "Onda da Barra",
      "dist": 11,
      "radius": 1,
      "apex": 2.4,
      "launch": 0,
      "bend": 0,
      "model": "topspin",
      "pace": "rapida",
      "band": [
        0.5,
        3.3
      ],
      "reach": 1.8
    },
    "pedradaLeme": {
      "name": "Pedrada do Leme",
      "dist": 5.5,
      "radius": 0.9,
      "apex": 2.2,
      "launch": 5,
      "bend": 0,
      "model": "cravada",
      "pace": "normal",
      "band": [
        1,
        3.4
      ],
      "reach": 1.7
    },
    "porDoSol": {
      "name": "Pôr do Sol de Ipanema",
      "dist": 9.5,
      "radius": 1.1,
      "apex": 6.5,
      "launch": 0,
      "bend": 0,
      "model": "balao",
      "pace": "lenta",
      "band": [
        0.5,
        3.2
      ],
      "reach": 1.75
    },
    "bondinho": {
      "name": "Bondinho",
      "dist": 4.2,
      "radius": 0.8,
      "apex": 4.5,
      "launch": 0,
      "bend": 0,
      "model": "largadinha",
      "pace": "lenta",
      "band": [
        0.4,
        3.2
      ],
      "reach": 1.75
    },
    "toqueClasse": {
      "name": "Toque de Classe",
      "dist": 7,
      "radius": 0.6,
      "apex": 3,
      "launch": 0,
      "bend": 0,
      "model": "backspin",
      "pace": "normal",
      "band": [
        0.4,
        3.2
      ],
      "reach": 1.75
    },
    "asaDelta": {
      "name": "Asa-Delta",
      "dist": 10,
      "radius": 1.1,
      "apex": 3.2,
      "launch": 0,
      "bend": 2,
      "model": "sidespin",
      "pace": "normal",
      "band": [
        0.5,
        3.3
      ],
      "reach": 1.8
    },
    "pontal": {
      "name": "Pedra do Pontal",
      "dist": 8,
      "radius": 1,
      "apex": 1.9,
      "launch": 0,
      "bend": 0,
      "model": "arrasto",
      "pace": "rapida",
      "band": [
        0.8,
        3.4
      ],
      "reach": 1.75
    },
    "freguesia": {
      "name": "Rasteira da Freguesia",
      "dist": 6,
      "radius": 1,
      "apex": 2,
      "launch": 0,
      "bend": 0,
      "model": "arrasto",
      "pace": "rapida",
      "band": [
        0.2,
        2.6
      ],
      "reach": 1.9
    },
    "aterro": {
      "name": "Aterro Supremo",
      "dist": 7,
      "radius": 1,
      "apex": 2.5,
      "launch": 7,
      "bend": 0,
      "model": "cravada",
      "pace": "rapida",
      "band": [
        1,
        3.5
      ],
      "reach": 1.75
    },
    "mareBaia": {
      "name": "Maré da Baía",
      "dist": 12,
      "radius": 1.2,
      "apex": 3,
      "launch": 0,
      "bend": 1.8,
      "model": "sidespin",
      "pace": "normal",
      "band": [
        0.5,
        3.3
      ],
      "reach": 1.8
    }
  },
  "carrinho": {
    "dist": 2.5,
    "radius": 2,
    "apex": 3.8,
    "launch": 0,
    "bend": 0,
    "model": "balistica",
    "pace": "normal",
    "band": [
      0,
      1
    ],
    "reach": 1.65
  }
};
