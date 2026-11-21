// 5.0: regras da partida — hitbox em 3 partes, golpes de cada parte, especiais de 50% e 100%,
// formações (RT), saque e tempos dos botões. Editado pelo editor da partida
// (docs/editor-partida.html), que regrava o arquivo a partir da linha do export: o que vem depois
// dela é JSON puro.
//   alturaAtleta   altura padrão do atleta (m): as partes da hitbox são frações da altura de cada um
//   alturas        altura própria de cada atleta (id → m); os do Criar Jogador guardam a deles.
//                  Muda a hitbox e o tamanho do desenho na quadra
//   zonas          inferior / tronco / superior: "ate" = até que fração da altura (a inferior começa
//                  no pé; cada uma começa onde a anterior acaba), cor no jogo e no editor;
//                  efeito = o que a parte faz na bola: altura (× apex), precisao (fração a menos no raio
//                  da área onde cai), forca (× velocidade), distancia (× distância da bola do botão) e banana
//                  (chance de Banana Shot, curva lateral)
//   bananaCurva    quanto a bola do Banana Shot curva para o lado (m, no meio do caminho)
//   bonusPasse     a cada passe antes do ataque, + esta fração de precisão e força (acumula: 0.25 = +25% no
//                  2º toque e +50% no 3º)
//   aterrissagem   depois de um pulo, o atleta fica parado ao tocar o chão: max (s, agilidade 1) − porPonto
//                  por ponto de agilidade acima de 1, nunca menos que min (s); arredonda em 0,00 s
//   controle       aba Controle do editor: botoes (ação do jogo → botão do controle, pelo índice padrão:
//                  0 A · 1 B · 2 X · 3 Y · 4 LB · 5 RB · 6 LT · 7 RT · 8 View · 9 Menu · 10 LS · 11 RS),
//                  andar (velocidade m/s, aceleracao), pulo (forca = velocidade de subida m/s),
//                  carrinho (velocidade m/s, duracao s, recuperacao s) e mira (segurar X/B: modo "giro" = a seta
//                  gira até a direção do analógico / "direto" = aponta na hora para onde o analógico está (sem
//                  direção, reto para a rede), giro °/s, pausaMax s, andarSegurando ×, alcance m)
//   aproximacao    bola entrou na hitbox longe do corpo: o atleta desliza até ela antes do toque — perto (m: a
//                  esta distância ou menos não desliza), velocidade (m/s), min e max (s de deslize)
//   caraOuCoroa    sorteio no início da partida (e do set decisivo): quem ganha escolhe o saque ou o lado; o outro
//                  escolhe o que sobrou. cpuSaque = chance da CPU (ganhando) escolher o saque em vez do lado
//   rede           limiteBola = fração da bola que pode passar da rede para o atleta ainda tocar nela (0.1 = 10%)
//   aposToque      opacidade do atleta que acabou de tocar e não pode tocar de novo (dupla/trinca), até o
//                  parceiro tocar ou a bola passar a rede
//   campeonato     Modo Campeonato (regras oficiais, mata-mata de 8 duplas): quartas (chave 1) / semifinal
//                  (chave 2) / terceiro = set único (pontos, trocaLado a cada N pontos somados), final = melhor de 3
//                  (sets, trocaLado de cada set), diferença de 2; temposTecnicos por dupla na partida; premios em
//                  R$ (1º, 2º, 3º); arena; clima ('aleatorio', 'nenhum', 'chuva'…); dificuldades = nível das CPUs
//                  na chave 1, 2 e 3 (Escada; o Aleatório sorteia entre o menor e o maior). grupos, pontosTabela e
//                  nivelVariacao: só para campeonatos antigos (fase de grupos), salvos antes do mata-mata
//   golpesZona     zona → toque (1, 2, 3) → golpes possíveis { nome, anim, chance (peso) }
//                  anim: kick, poke, thigh (coxa), chest, shoulder, header
//   especiais      id → { tipo: ataque | defesa, ativo } — na seleção, cada atleta escolhe qual especial
//                  do tipo vai no botão de 50% e qual no de 100% (sem repetir): LB LB = ataque 50% ·
//                  X X = ataque 100% · RB RB = defesa 50% · B B = defesa 100%
//   custo          quanto da barra cada nível gasta (e precisa ter)
//   niveis         força, precisão e hitbox do especial por nível (hitbox = tamanho da hitbox do especial, 1 = inteira):
//                  area = fração do raio da área onde a bola cai
//                  (1 = a da bola simples do tipo: X para ataque, B para defesa), velocidade = × na bola
//                  (o golpe simples é × 1)
//   hitboxEspecial a hitbox inteira dos especiais: do pé até "ate" × altura
//   duploToque     s entre os dois toques do especial
//   defesaEspecial nível do botão (50 / 100) → a "levantada perfeita": a defesa especial no 1º/2º toque vai
//                  direto no parceiro (sem mira) e o próximo toque dele ganha + bonus de precisão e força
//                  (soma ao bonusPasse) e a hitbox × hitbox
//   duploMira      s de espera, depois de soltar o botão na mira de um golpe normal, por um 2º toque que
//                  troca o golpe pelo especial do botão (X X / B B com a bola já na hitbox)
//   armado         s que o especial fica armado depois de soltar o 2º toque (sai na direção automática)
//   formacoes      RT troca, nesta ordem; posições (m) da rede (x) e do meio (z, + = lado da câmera)
//                  de quem fica na rede e de quem fica no fundo; "recebendo" = no saque do adversário
//   historia       Modo História: especiais que a Giulia e a Zefa sabem no início (inicio), os que o
//                  campeonato do CT da Urca ensina e os que cada uma das 10 vitórias do Rio Futevôlei
//                  ensina ({ quem: giulia | zefa, especial: id | null }); só os ativos entram no jogo
//   saque          forte (X) e viagem (B), cada um: o LS desloca o alvo até "profundidade" m (frente/trás) e "lateral" m
//                  (lados); forca (× velocidade: 0,1 = +10%) e banana (chance de Banana Shot, 0 a 1)
//   atributos      o que cada atributo (1 a 10) faz no jogo: valor = base (com o atributo em 5) + (atributo − 5) ×
//                  porPonto. forca.velocidadeBola (× na velocidade da bola dos golpes e do saque) · agilidade
//                  .velocidadeQuadra (× na corrida) e .recuperacao (× no tempo para voltar a agir depois do golpe,
//                  do carrinho e da queda; menor = melhor) · precisao.erroMira (fração do raio da área onde a bola
//                  cai: 0 = no centro, 1 = na borda) · pique.barraEspecial (× no que a barra enche) e .notaRuim
//                  (× no empurrão / queda das notas ruins)
export default {
  "atributos": {
    "forca": {
      "velocidadeBola": {
        "base": 1,
        "porPonto": 0.1
      }
    },
    "agilidade": {
      "velocidadeQuadra": {
        "base": 1,
        "porPonto": 0.03
      },
      "recuperacao": {
        "base": 1.05,
        "porPonto": -0.05
      }
    },
    "precisao": {
      "erroMira": {
        "base": 0.5556,
        "porPonto": -0.1111
      }
    },
    "pique": {
      "barraEspecial": {
        "base": 1,
        "porPonto": 0.08
      },
      "notaRuim": {
        "base": 1,
        "porPonto": -0.08
      }
    }
  },
  "alturaAtleta": 1.85,
  "alturas": {},
  "zonas": {
    "inferior": {
      "nome": "Inferior",
      "ate": 0.4,
      "cor": "#3d8bff",
      "efeito": {
        "altura": -0.1,
        "precisao": -0.1,
        "forca": -0.2,
        "distancia": 0.3,
        "banana": 0.5
      }
    },
    "tronco": {
      "nome": "Tronco",
      "ate": 0.9,
      "cor": "#ffc21a",
      "efeito": {
        "altura": 0,
        "precisao": 0,
        "forca": 0,
        "distancia": 0.15,
        "banana": 0.2
      }
    },
    "superior": {
      "nome": "Superior",
      "ate": 1.39,
      "cor": "#ff3b4f",
      "efeito": {
        "altura": 0.1,
        "precisao": 0.1,
        "forca": 0.2,
        "distancia": 0,
        "banana": 0
      }
    }
  },
  "golpesZona": {
    "superior": {
      "1": [
        {
          "nome": "Domínio de cabeça",
          "anim": "header",
          "chance": 100
        }
      ],
      "2": [
        {
          "nome": "Levantada de cabeça",
          "anim": "header",
          "chance": 100
        }
      ],
      "3": [
        {
          "nome": "Cabeçada",
          "anim": "header",
          "chance": 100
        }
      ]
    },
    "tronco": {
      "1": [
        {
          "nome": "Domínio de peito",
          "anim": "chest",
          "chance": 50
        },
        {
          "nome": "Domínio de ombro",
          "anim": "shoulder",
          "chance": 50
        }
      ],
      "2": [
        {
          "nome": "Levantada de peito",
          "anim": "chest",
          "chance": 50
        },
        {
          "nome": "Levantada de ombro",
          "anim": "shoulder",
          "chance": 50
        }
      ],
      "3": [
        {
          "nome": "Peito",
          "anim": "chest",
          "chance": 50
        },
        {
          "nome": "Ombro",
          "anim": "shoulder",
          "chance": 50
        }
      ]
    },
    "inferior": {
      "1": [
        {
          "nome": "Domínio de pé",
          "anim": "poke",
          "chance": 100
        }
      ],
      "2": [
        {
          "nome": "Levantada de pé",
          "anim": "poke",
          "chance": 50
        },
        {
          "nome": "Levantada de coxa",
          "anim": "thigh",
          "chance": 50
        }
      ],
      "3": [
        {
          "nome": "Chute colocado",
          "anim": "kick",
          "chance": 100
        }
      ]
    }
  },
  "especiais": {
    "naFita": {
      "tipo": "ataque",
      "ativo": true
    },
    "pingoPipoca": {
      "tipo": "ataque",
      "ativo": true
    },
    "sharkSupremo": {
      "tipo": "ataque",
      "ativo": true
    },
    "pingoOmbro": {
      "tipo": "ataque",
      "ativo": true
    },
    "meiaBicicleta": {
      "tipo": "defesa",
      "ativo": true
    },
    "sarrada": {
      "tipo": "defesa",
      "ativo": true
    },
    "bicicleta": {
      "tipo": "defesa",
      "ativo": true
    },
    "escorpiao": {
      "tipo": "defesa",
      "ativo": true
    },
    "ondaBarra": {
      "tipo": "ataque",
      "ativo": false
    },
    "pedradaLeme": {
      "tipo": "ataque",
      "ativo": false
    },
    "porDoSol": {
      "tipo": "ataque",
      "ativo": false
    },
    "bondinho": {
      "tipo": "ataque",
      "ativo": false
    },
    "toqueClasse": {
      "tipo": "ataque",
      "ativo": false
    },
    "asaDelta": {
      "tipo": "defesa",
      "ativo": false
    },
    "pontal": {
      "tipo": "ataque",
      "ativo": false
    },
    "freguesia": {
      "tipo": "defesa",
      "ativo": false
    },
    "aterro": {
      "tipo": "ataque",
      "ativo": false
    },
    "mareBaia": {
      "tipo": "defesa",
      "ativo": false
    }
  },
  "custo": {
    "50": 50,
    "100": 100
  },
  "niveis": {
    "50": {
      "area": 0.7,
      "velocidade": 1.25,
      "hitbox": 0.8
    },
    "100": {
      "area": 0.45,
      "velocidade": 1.45,
      "hitbox": 1
    }
  },
  "hitboxEspecial": {
    "ate": 1.4
  },
  "duploToque": 0.8,
  "duploMira": 0.25,
  "defesaEspecial": {
    "50": {
      "bonus": 0.25,
      "hitbox": 1.15
    },
    "100": {
      "bonus": 0.5,
      "hitbox": 1.3
    }
  },
  "armado": 1.2,
  "formacoes": [
    {
      "nome": "Rede e fundo",
      "rede": {
        "x": 2.3,
        "z": -1.2
      },
      "fundo": {
        "x": 6.1,
        "z": 1.4
      },
      "recebendo": {
        "rede": {
          "x": 3.2,
          "z": -1.6
        },
        "fundo": {
          "x": 6.4,
          "z": 1.6
        }
      }
    },
    {
      "nome": "Lado a lado",
      "rede": {
        "x": 4.3,
        "z": -2.1
      },
      "fundo": {
        "x": 4.3,
        "z": 2.1
      },
      "recebendo": {
        "rede": {
          "x": 5.4,
          "z": -2.1
        },
        "fundo": {
          "x": 5.4,
          "z": 2.1
        }
      }
    },
    {
      "nome": "Diagonal",
      "rede": {
        "x": 2.8,
        "z": 2.4
      },
      "fundo": {
        "x": 6.3,
        "z": -2.4
      },
      "recebendo": {
        "rede": {
          "x": 3.6,
          "z": 2.2
        },
        "fundo": {
          "x": 6.5,
          "z": -2.2
        }
      }
    }
  ],
  "saque": {
    "forte": {
      "profundidade": 3,
      "lateral": 3.6,
      "forca": 0,
      "banana": 0
    },
    "viagem": {
      "profundidade": 3,
      "lateral": 3.6,
      "forca": 0,
      "banana": 0
    }
  },
  "historia": {
    "inicio": {
      "giulia": [
        "bicicleta"
      ],
      "zefa": [
        "meiaBicicleta"
      ]
    },
    "campeonatoUrca": [
      {
        "quem": "giulia",
        "especial": "sharkSupremo"
      },
      {
        "quem": "giulia",
        "especial": "pingoPipoca"
      }
    ],
    "rio": [
      {
        "quem": "giulia",
        "especial": "naFita"
      },
      {
        "quem": "giulia",
        "especial": null
      },
      {
        "quem": "giulia",
        "especial": "sarrada"
      },
      {
        "quem": "giulia",
        "especial": null
      },
      {
        "quem": "giulia",
        "especial": "pingoOmbro"
      },
      {
        "quem": "giulia",
        "especial": null
      },
      {
        "quem": "giulia",
        "especial": "escorpiao"
      },
      {
        "quem": "giulia",
        "especial": null
      },
      {
        "quem": "giulia",
        "especial": null
      },
      {
        "quem": "giulia",
        "especial": null
      }
    ]
  },
  "bonusPasse": 0.35,
  "bananaCurva": 1.4,
  "aterrissagem": {
    "max": 2,
    "porPonto": 0.2044,
    "min": 0.16
  },
  "controle": {
    "botoes": {
      "A": 2,
      "B": 1,
      "C": 0,
      "D": 3,
      "L": 4,
      "R": 5,
      "L2": 6,
      "R2": 7,
      "start": 9
    },
    "andar": {
      "velocidade": 5.4,
      "aceleracao": 38
    },
    "pulo": {
      "forca": 5.4
    },
    "carrinho": {
      "velocidade": 7.5,
      "duracao": 0.42,
      "recuperacao": 0.6
    },
    "mira": {
      "modo": "giro",
      "giro": 360,
      "pausaMax": 3,
      "andarSegurando": 0.75,
      "alcance": 1.35
    }
  },
  "aproximacao": {
    "perto": 0.45,
    "velocidade": 8,
    "min": 0.05,
    "max": 0.16
  },
  "caraOuCoroa": {
    "cpuSaque": 0.7
  },
  "rede": {
    "limiteBola": 0.1
  },
  "aposToque": {
    "opacidade": 0.5
  },
  "campeonato": {
    "nome": "Campeonato Rio Futevôlei",
    "grupos": {
      "pontos": 18,
      "trocaLado": 6
    },
    "quartas": {
      "pontos": 18,
      "trocaLado": 6
    },
    "semifinal": {
      "pontos": 18,
      "trocaLado": 6
    },
    "terceiro": {
      "pontos": 18,
      "trocaLado": 6
    },
    "final": {
      "sets": [
        18,
        18,
        15
      ],
      "trocaLado": [
        6,
        6,
        5
      ]
    },
    "temposTecnicos": 1,
    "pontosTabela": {
      "vitoria": 3,
      "derrota": 1
    },
    "premios": [
      300,
      150,
      80
    ],
    "arena": "copacabana",
    "clima": "aleatorio",
    "nivelVariacao": 2,
    "dificuldades": {
      "facil": [
        1,
        3,
        5
      ],
      "medio": [
        3,
        6,
        9
      ],
      "dificil": [
        4,
        8,
        12
      ]
    }
  }
};
