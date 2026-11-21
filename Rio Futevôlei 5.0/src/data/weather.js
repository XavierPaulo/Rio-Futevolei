// 4.0: os climas da partida — chuva, vento forte e sol forte. Os efeitos são de código (src/match.js e
// src/scene/weather.js); aqui ficam nome, ícone, descrição, os números de cada efeito, o visual na arena
// e o sorteio do dia. Editado pelo editor de clima (docs/editor-clima.html), que regrava o arquivo a
// partir da linha do export: o que vem depois dela é JSON puro.
//   enabled: false = o clima não é sorteado nem aparece nas opções da Exibição
//   efeito: chuva.espalha (raio extra do alvo, m) · vento.graus (desvio máximo da bola) ·
//           sol.piquePorToque, sol.piqueMax, sol.sedeExtra (por ponto), sol.viseira (fator com viseira)
//   visual: luzSol e luzCeu (multiplicam a luz da arena), neblina/tom (cor e mistura), gotas da chuva
//   sorteio (%): diaNormal = dia sem clima; chuva = chance de ser chuva (senão sol) num dia com clima;
//           depois só o principal / só vento / principal + vento (pesos)
export default {
  "climas": {
    "chuva": {
      "enabled": true,
      "name": "Chuva",
      "icon": "🌧",
      "info": "a área do alvo cresce (menos precisão)",
      "efeito": {
        "espalha": 1.3
      },
      "visual": {
        "luzSol": 0.35,
        "luzCeu": 0.7,
        "neblina": "#8b97a6",
        "neblinaMix": 0.6,
        "gotas": 650,
        "corGota": "#cfe3ff",
        "queda": 17
      }
    },
    "vento": {
      "enabled": true,
      "name": "Vento forte",
      "icon": "💨",
      "info": "a bola desvia entre −18° e +18°",
      "efeito": {
        "graus": 11
      },
      "visual": {
        "arrasto": 6
      }
    },
    "sol": {
      "enabled": true,
      "name": "Sol forte",
      "icon": "☀",
      "info": "o Pique cai a cada toque (protetor solar anula)",
      "efeito": {
        "piquePorToque": 0.08,
        "piqueMax": 3,
        "sedeExtra": 2,
        "viseira": 0.5
      },
      "visual": {
        "luzSol": 1.4,
        "luzCeu": 1.1,
        "tom": "#ffd08a",
        "tomMix": 0.35
      }
    }
  },
  "sorteio": {
    "diaNormal": 70,
    "chuva": 50,
    "soPrincipal": 40,
    "soVento": 30,
    "ambos": 30
  }
};
