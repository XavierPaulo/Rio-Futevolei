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
      "pingoPipoca"
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
    }
  },
  "carrinho": { "dist": 2.5, "radius": 2, "apex": 3.8, "launch": 0, "bend": 0, "model": "balistica", "pace": "normal", "band": [0, 1], "reach": 1.65 }
};
