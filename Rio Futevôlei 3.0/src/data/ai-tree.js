// Árvore de decisão da CPU — qual golpe ela escolhe em cada toque (editada no Editor de golpes,
// aba "IA da CPU").
//
// Para cada toque (1 = domínio, 2 = levantamento, 3 = ataque) há uma lista de regras, em ordem.
// A primeira regra cujas condições batem (todas) e que passa no sorteio da chance (%) decide o
// golpe; se nenhuma decidir, vale o golpe padrão (fallback).
// Condições: { v: variável, op: '<' | '>', x: valor }. Variáveis (ver src/ai.js, AI_VARS):
//   netDist   distância da rede no ponto de contato (m)
//   defDepth  profundidade média da defesa adversária (m da rede)
//   ballSpeed velocidade da bola recebida (m/s)
// Golpes de ar (cabeça, ataque de segunda, levantada de cabeça, cabeçada, Shark Attack) só valem
// se a bola passar alta o bastante para pular nela; senão a regra é pulada.
// A "esperteza" do nível da CPU é a chance de ela seguir a árvore; quando não segue, escolhe um
// golpe possível do toque ao acaso. Os especiais seguem a regra própria (barra cheia).
export default {
  "1": {
    "rules": [
      {
        "when": [
          {
            "v": "ballSpeed",
            "op": ">",
            "x": 12
          }
        ],
        "move": "peito",
        "chance": 100
      }
    ],
    "fallback": "pe"
  },
  "2": {
    "rules": [
      {
        "when": [
          {
            "v": "netDist",
            "op": "<",
            "x": 3
          }
        ],
        "move": "naFita",
        "chance": 100
      }
    ],
    "fallback": "ombro"
  },
  "3": {
    "rules": [
      {
        "when": [
          {
            "v": "netDist",
            "op": "<",
            "x": 1.4
          }
        ],
        "move": "sharkAttack",
        "chance": 90
      },
      {
        "when": [
          {
            "v": "netDist",
            "op": "<",
            "x": 3
          },
          {
            "v": "defDepth",
            "op": ">",
            "x": 4.5
          }
        ],
        "move": "pingo",
        "chance": 100
      }
    ],
    "fallback": "chuteColocado"
  }
};
