// 4.0 Modo História — dados: dificuldade, personagens da história, bairros, comércio, loteria e roteiro.
// Os atletas dos CTs e as duplas ficam em src/data/athletes.js (editor: docs/editor-atletas.html).
import { CHARACTERS } from '../art/characters.js';
import { buildCharacter } from '../art/custom.js';
import ATH from '../data/athletes.js';
import { ITEMS } from '../items.js';

// ---------- dificuldade ----------
//   levels: níveis da CPU (mín–máx) · cond: quanto as condições pesam (0 = nada) · price: preços ×
export const DIFFICULTY = {
  facil: { name: 'Fácil', levels: [1, 8], cond: 0, price: 0.8, info: 'CPU nível 1 a 8 · condições não pesam · comércio com desconto' },
  medio: { name: 'Médio', levels: [3, 10], cond: 0.5, price: 1, info: 'CPU nível 3 a 10 · condições pesam pouco · preços normais' },
  dificil: { name: 'Difícil', levels: [5, 12], cond: 1, price: 1.25, info: 'CPU nível 5 a 12 · condições pesam muito · comércio mais caro' },
};
// nível da CPU na fração f (0..1) da faixa da dificuldade
export const levelAt = (diff, f) => { const [a, b] = DIFFICULTY[diff].levels; return Math.round(a + (b - a) * f); };

// ---------- relógio e condições ----------
// 1 dia = 12 min reais, das 6h às 22h (960 min de jogo em 720 s)
export const CLOCK = { start: 6 * 60, end: 22 * 60, gameMinPerSec: (16 * 60) / 720 };
// por hora de jogo acordada: fome e sede sobem; por noite: forma cai um pouco, fome e sede da manhã
export const DRAIN = { fomePerHour: 4, sedePerHour: 5, nightFome: 15, nightSede: 15, formaPerDay: 3 };
// quanto tempo (min de jogo) gasta cada coisa
export const TIME_COST = { match: 90, buy: 10, spa: 60, lottery: 10, eat: 5 };

// ---------- personagens da história ----------
function npc(id, recipe) {
  const ch = buildCharacter({ id, wrist: 'none', face: 'none', headwear: 'none', hatColor: '#1d1a2b', topStyle: 'regata', shortsStyle: 'lisa', ...recipe });
  ch.custom = false; ch.npc = true;
  CHARACTERS[id] = ch;
  return ch;
}
// todos os atletas da história (Rei e Rainha, CTs, Niterói): src/data/athletes.js
for (const [id, a] of Object.entries(ATH.athletes)) npc(id, { ...a, special: a.attack });
// especiais de cada atleta da CPU na partida: { attack, defense }
export const athleteSpecials = id => { const a = ATH.athletes[id]; return a ? { attack: a.attack, defense: a.defense } : {}; };
export const TEAMS = ATH.teams;

// ---------- CTs e campeonatos ----------
// rounds: as chaves (adversários e fração da faixa de nível da dificuldade) · prize: R$ por chave
export const CT = {
  urca: {
    name: 'CT da Urca', coach: 'treinador',
    rounds: [
      { name: '1ª chave', team: TEAMS.urca1, f: 0, prize: 40 },
      { name: '2ª chave', team: TEAMS.urca2, f: 0.15, prize: 60 },
      { name: 'Final', team: TEAMS.urca3, f: 0.3, prize: 100 },
    ],
  },
};

// ---------- bairros (vista de lado: praia, calçadão, 1º quarteirão, esquina com ponto de ônibus, 2º quarteirão) ----------
// shops: os 4 comércios do bairro · backdrop: paisagem de fundo (src/story/street.js) · ct: nome do CT
// private: CT privado no lugar da praia (Jacarepaguá) · home: a casa da Giulia (Urca)
export const HOODS = {
  urca: { name: 'Urca', ct: 'CT da Urca', backdrop: 'paoDeAcucar', home: true, shops: ['lanchonete', 'moda', 'loterica', 'spa'] },
  copacabana: { name: 'Copacabana', ct: 'CT do Posto 5', backdrop: 'posto5', shops: ['lanchonete', 'moda', 'farmacia', 'esportes'] },
  barra: { name: 'Barra da Tijuca', ct: 'CT da Praia do Pepê', backdrop: 'condominios', shops: ['academia', 'moda', 'spa', 'esportes'] },
  leme: { name: 'Leme', ct: 'CT do Leme', backdrop: 'pedraLeme', shops: ['lanchonete', 'moda', 'farmacia', 'loterica'] },
  ipanema: { name: 'Ipanema', ct: 'CT do Posto 9', backdrop: 'posto9', shops: ['lanchonete', 'moda', 'academia', 'spa'] },
  botafogo: { name: 'Botafogo', ct: 'CT da Enseada', backdrop: 'enseada', shops: ['academia', 'esportes', 'loterica', 'spa'] },
  leblon: { name: 'Leblon', ct: 'CT do Posto 12', backdrop: 'leblon', shops: ['moda', 'farmacia', 'academia', 'spa'] },
  saoConrado: { name: 'São Conrado', ct: 'CT da Praia do Pepino', backdrop: 'pedraGavea', shops: ['moda', 'academia', 'esportes', 'spa'] },
  recreio: { name: 'Recreio dos Bandeirantes', ct: 'CT da Praia do Pontal', backdrop: 'pedraPontal', shops: ['lanchonete', 'academia', 'moda', 'farmacia'] },
  jacarepagua: { name: 'Jacarepaguá', ct: 'CT Privado da Freguesia', backdrop: 'montanhas', private: true, shops: ['farmacia', 'academia', 'loterica', 'spa'] },
  flamengo: { name: 'Flamengo', ct: 'CT do Aterro', backdrop: 'aterro', shops: ['lanchonete', 'farmacia', 'loterica', 'academia'] },
  ilha: { name: 'Ilha do Governador', ct: 'CT da Praia da Bica', backdrop: 'baia', shops: ['farmacia', 'lanchonete', 'esportes', 'loterica'] },
};
export const HOOD_ORDER = ['urca', 'copacabana', 'barra', 'leme', 'ipanema', 'botafogo', 'leblon', 'saoConrado', 'recreio', 'jacarepagua', 'flamengo', 'ilha'];
// ônibus: preço base e tempo de viagem (min de jogo); na Urca, só depois das obras (campeonato do CT)
export const BUS = { price: 4, time: 40, closed: 'A prefeitura está renovando o asfalto: os ônibus não estão passando pela Urca.' };

// ---------- duplas dos CTs (desafios e Rio Futevôlei) ----------
// dupla de cada CT (Rio Futevôlei e desafios; na Urca, a dupla da final do campeonato)
export const CT_DUOS = { urca: TEAMS.urca3, ...Object.fromEntries(HOOD_ORDER.filter(h => h !== 'urca').map(h => [h, TEAMS[h]])) };
// desafio do CT: uma vez por dia por CT, prêmio pequeno
export const CHALLENGE = { prize: 25, points: 9, f: 0.4 };

// ---------- Rio Futevôlei: 10 partidas, em ordem, e a final em Copacabana ----------
// 5.0: o que cada vitória ensina fica em src/data/partida5.js (historia.rio; editor da Partida)
export const ROUTE = [
  { hood: 'barra', special: 'ondaBarra' },
  { hood: 'leme', special: 'pedradaLeme' },
  { hood: 'ipanema', special: 'porDoSol' },
  { hood: 'botafogo', special: 'bondinho' },
  { hood: 'leblon', special: 'toqueClasse' },
  { hood: 'saoConrado', special: 'asaDelta' },
  { hood: 'recreio', special: 'pontal' },
  { hood: 'jacarepagua', special: 'freguesia' },
  { hood: 'flamengo', special: 'aterro' },
  { hood: 'ilha', special: 'mareBaia' },
];
export const RIO = { points: 12, prize: i => 60 + i * 15, f: i => 0.35 + i * 0.065, finalPoints: 15, finalPrize: 500 };

// ---------- academia e artigos esportivos ----------
// malhar: +80 de forma; malhar de novo no mesmo dia pode causar uma marca (Lesionado, Fadiga, Sono, Ansiedade)
// (preço e forma ganhos: item 'academia' de src/data/items.js)
export const GYM = { price: ITEMS.academia.price, forma: ITEMS.academia.effect.forma, risk: 0.6, time: 60 };
// equipamentos (comprados uma vez, valem sempre): itens de Artigos Esportivos em src/data/items.js
//   effect.gear: 'sol' | 'stat' (+v em stat) | 'semLesao'
export const GEAR = Object.entries(ITEMS).filter(([, i]) => i.shop === 'esportes').map(([id, i]) => ({ id, name: i.name, price: i.price, info: i.desc, effect: i.effect || {}, enabled: i.enabled !== false }));
export const gearHas = (owned, kind) => owned.map(id => GEAR.find(g => g.id === id)).filter(Boolean).filter(g => g.effect.gear === kind);

// ---------- comércio ----------
export const SHOP_NAMES = { lanchonete: 'Lanchonete', farmacia: 'Farmácia', moda: 'Moda', loterica: 'Lotérica', spa: 'Spa', academia: 'Academia', esportes: 'Artigos Esportivos' };
// preço base (R$) dos consumíveis (src/data/items.js) — vão para a mochila ou são usados na hora
export const FOOD_PRICES = Object.fromEntries(Object.entries(ITEMS).filter(([, i]) => i.shop === 'lanchonete' || i.shop === 'farmacia').map(([id, i]) => [id, i.price]));
export const SPA = { price: ITEMS.spa.price, cures: ITEMS.spa.effect.cures, name: ITEMS.spa.name, info: ITEMS.spa.desc };
// Moda: roupas e acessórios de cabeça (mudam o visual da Giulia) — src/data/items.js
export const FASHION = Object.entries(ITEMS).filter(([, i]) => i.shop === 'moda').map(([id, i]) => ({ id, kind: i.kind, name: i.name, price: i.price, look: i.look || {}, enabled: i.enabled !== false }));
export const FASHION_KINDS = { blusa: 'Blusas', short: 'Shorts', cabeca: 'Acessórios de cabeça' };

// ---------- loteria (25 grupos de legumes e verduras, 4 números cada; 5 números sorteados) ----------
export const VEGGIES = ['Alface', 'Abóbora', 'Abobrinha', 'Batata', 'Berinjela', 'Beterraba', 'Brócolis', 'Cebola', 'Cenoura', 'Chuchu',
  'Couve', 'Espinafre', 'Inhame', 'Jiló', 'Mandioca', 'Maxixe', 'Milho', 'Pepino', 'Pimentão', 'Quiabo', 'Rabanete', 'Repolho', 'Rúcula', 'Tomate', 'Vagem'];
export const LOTTERY = { tickets: [2, 10, 20], payout: 10, draws: 5 };
export const groupOf = n => Math.floor((n - 1) / 4); // número 1..100 → grupo 0..24
export function drawLottery(rnd = Math.random) {
  const nums = new Set();
  while (nums.size < LOTTERY.draws) nums.add(1 + Math.floor(rnd() * 100));
  return [...nums];
}

// ---------- roteiro (falas) ----------
// who: id do personagem (retrato) ou null (narração)
export const SCRIPT = {
  intro: [
    [null, 'Urca, Rio de Janeiro. Uma manhã de sol.'],
    ['zefa', 'GIULIA! Bora! Hoje é a nossa primeira aula de futevôlei no CT!'],
    ['giulia', 'Zefa... são sete da manhã. Eu nunca joguei isso na vida.'],
    ['zefa', 'Por isso mesmo! O treinador Moacir é ótimo. Vai, pega os óculos e vamos.'],
    ['giulia', 'Tá bom, tá bom... mas se eu passar vergonha, a culpa é sua.'],
  ],
  ctArrive: [
    [null, 'No CT da Urca, na areia da praia.'],
    ['treinador', 'Bom dia, meninas! Então essa é a famosa Giulia. Vamos começar pelo básico, na prática.'],
  ],
  talent: [
    ['treinador', 'Giulia... você tem certeza de que nunca jogou? Isso é talento nato!'],
    ['treinador', 'Semana que vem tem o campeonato do CT, três chaves. Quero vocês duas lá. A inscrição eu mesmo pago.'],
    ['zefa', 'Sério?! Ouviu isso, Giulia?'],
    ['rolando', 'Talento nato? Hahaha! Na MINHA areia ninguém é talento nato sem passar por mim.'],
    ['marra', 'Vamos ver se a novata aguenta uma partidinha rápida. Seis pontos. Topa?'],
    ['treinador', 'Rolando, deixa as meninas em paz. Elas acabaram de começar!'],
    ['giulia', '...Eu topo.'],
  ],
  lostToKing: [
    ['rolando', 'Foi divertido. Volta quando aprender a jogar, novata.'],
    ['treinador', 'Não liga, Giulia. Aquele é o Rolando Carioca, o Rei do Futevôlei do Rio de Janeiro. E a Marra Viteia é a Rainha da Areia.'],
    ['treinador', 'Desculpa por isso. Não desanima: o campeonato do CT continua de pé. Vocês se inscrevem?'],
    ['zefa', 'Claro que sim!'],
    ['giulia', 'Inscritas. Agora eu quero muito ganhar.'],
    [null, 'Giulia e Zefa se inscrevem e voltam para casa para descansar.'],
  ],
  wonVsKing: [
    ['rolando', '...Sorte de principiante. Não se acostuma.'],
    ['treinador', 'Vocês ganharam do Rolando Carioca, o Rei do Futevôlei do Rio! E da Marra Viteia, a Rainha da Areia!'],
    ['treinador', 'O campeonato do CT é a próxima. Vocês se inscrevem?'],
    ['zefa', 'Claro que sim!'],
    [null, 'Giulia e Zefa se inscrevem e voltam para casa para descansar.'],
  ],
  day2: [
    [null, 'Dia seguinte. O campeonato do CT da Urca é hoje!'],
    ['zefa', 'Te encontro no CT, na praia. Come alguma coisa antes, hein? E nada de ônibus: estão refazendo o asfalto.'],
  ],
  roundWon: [['treinador', 'Boa! Passaram de chave. O prêmio é de vocês. Querem descansar ou comer alguma coisa antes da próxima?']],
  roundLost: [['treinador', 'Não foi dessa vez. Respira, se cuida e tenta a chave de novo quando estiverem prontas.']],
  ctWon: [
    ['treinador', 'CAMPEÃS DO CT DA URCA! Eu sabia!'],
    ['treinador', 'Vocês merecem: vou ensinar especiais novos para vocês.'],
    ['rolando', 'Hm. Tenho que admitir... vocês foram boas mesmo.'],
    ['marra', 'Se forem boas o bastante, a revanche é no campeonato da cidade: o Rio Futevôlei.'],
    ['rolando', 'Inscrição no CT de Copacabana, Posto 5. Se tiverem coragem.'],
    ['giulia', 'A gente vai estar lá.'],
  ],
  forcedHome: [[null, 'Já passa das 22h. Exausta, Giulia volta para casa e cai no sono... e acorda com Sono.']],
  busOpen: [[null, 'As obras do asfalto terminaram: os ônibus voltaram a passar pela Urca.'], ['zefa', 'Bora pegar o ônibus no ponto da esquina e ir para Copacabana!']],
  register: [
    [null, 'CT do Posto 5, Copacabana. A sede do Rio Futevôlei.'],
    ['tiao', 'Inscrição para o Rio Futevôlei? Dez partidas, uma em cada bairro, na ordem. Quem vencer todas joga a final aqui, contra o Rei e a Rainha.'],
    ['zefa', 'Giulia e Zefa, do CT da Urca. Pode anotar!'],
    ['tiao', 'Anotado. A primeira é na Barra da Tijuca, na Praia do Pepê. Boa sorte, meninas.'],
  ],
  rioLost: [['zefa', 'Ainda não foi... Bora se recuperar e voltar aqui com tudo.']],
  finalReady: [['zefa', 'DEZ VITÓRIAS, Giulia! Agora é a final, em Copacabana. Contra o Rolando e a Marra.']],
  finalPre: [
    ['rolando', 'Então a novata da Urca chegou até aqui.'],
    ['marra', 'Vamos ver se aprendeu alguma coisa desde aquela partidinha.'],
    ['giulia', 'Aprendi. Bora jogar.'],
  ],
  finalLost: [['rolando', 'Quase, novata. Quase.'], ['zefa', 'A gente volta mais forte. A final continua esperando a gente.']],
  finalWon: [
    ['rolando', '...Vocês ganharam. De verdade.'],
    ['marra', 'A areia tem uma nova rainha. Parabéns, Giulia.'],
    ['treinador', 'Eu sabia desde a primeira aula. Talento nato!'],
    ['zefa', 'GIULIA, RAINHA DA AREIA!'],
    ['giulia', 'Nada disso seria possível sem você, Zefa.'],
  ],
  credits: [[null, 'Giulia se tornou a Rainha da Areia do Rio de Janeiro.'], [null, 'FIM — obrigado por jogar Rio Futevôlei!']],
  hardHint: [[null, 'Vença o Modo História no Difícil para descobrir um desafio extra...']],
  epilogue: [
    [null, 'Na manhã seguinte...'],
    ['zefa', 'GIULIA! Acorda! O treinador está aqui!'],
    ['treinador', 'Sinto muito pelo horário, campeã. Chegou um desafio de Niterói: o King Size quer duelar com vocês no CT da Urca. Agora!'],
    ['giulia', '...Nem um dia de descanso para a Rainha. Bora.'],
  ],
  kingSizePre: [['kingSize', 'Então essa é a Rainha da Areia do Rio? Do outro lado da baía a gente joga diferente.'], ['icarai', 'Vamos ver quanto tempo dura a coroa.']],
  kingSizeLost: [['kingSize', 'Volta quando quiser, rainha. Niterói te espera.']],
  kingSizeWon: [['kingSize', 'Respeito. A coroa é sua, dos dois lados da baía.'], [null, 'Giulia e Zefa vencem o King Size de Niterói. FIM VERDADEIRO — parabéns!']],
};
