// 5.0 Modo Campeonato — regras oficiais do futevôlei (CBFv / FIFv), editáveis em src/data/partida5.js
// (campeonato; editor da Partida → aba Campeonato):
//   5.0: mata-mata de 8 duplas em 3 chaves: chave 1 = quartas de final (set único de 18 pontos com 2 de
//   diferença, troca de lado a cada 6 pontos somados) → chave 2 = semifinal (set único) → chave 3 = disputa de
//   3º lugar (set único) e final em melhor de 3 sets (18, 18 e 15; troca de lado a cada 6, e a cada 5 no decisivo).
//   Nível das CPUs (dificuldade Fácil / Médio / Difícil, editável em campeonato.dificuldades):
//     Escada    o nível sobe a cada chave (Fácil 1, 3, 5 · Médio 3, 6, 9 · Difícil 4, 8, 12)
//     Aleatório cada dupla da CPU tem um nível sorteado entre o menor e o maior da escada da dificuldade
//   As partidas só da CPU podem ser assistidas (Start resume: o resto é simulado a partir do placar); as não
//   assistidas são simuladas quando os jogadores avançam a chave.
//   (Campeonatos antigos, salvos antes do mata-mata, seguem com a fase de grupos: 2 grupos de 4, todos contra
//   todos, tabela vitória 3 / derrota 1.)
//   1 tempo técnico por dupla em cada partida. Premiação: troféu (1º), medalhas (1º, 2º, 3º) e R$ na carteira.
// Os jogadores jogam as partidas das suas duplas; as outras são simuladas (força pelos níveis e atributos).
// 5.0: com 2 a 4 jogadores (tela Jogadores), cada um escolhe a sua dupla: duplas diferentes se enfrentam
// (humano contra humano) e o prêmio de cada dupla humana vai para a carteira única.
import { V5 } from './v5.js';
import { CHARACTERS, ROSTER } from './art/characters.js';
import { listCustom } from './art/custom.js';
import { MIN_LEVEL, MAX_LEVEL } from './difficulty.js';
import ATHLETES from './data/athletes.js';
import './story/data.js'; // registra os atletas do Modo História (as duplas dos bairros)

const KEY = 'rio-futevolei.camp';
export const CAMP = () => V5.campeonato || {};

// ---------- salvo: carteira, troféus e o campeonato em andamento ----------
export function loadCamp() {
  try { const c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c && c.v === 1) return c; } catch { /* sem armazenamento */ }
  return { v: 1, wallet: 0, trophies: [], cur: null };
}
export function saveCamp(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); return true; } catch { return false; } }

// todos os atletas que podem jogar (os do jogo e os criados)
export function campAthletes() {
  return [...ROSTER, ...listCustom().map(r => r.id)].filter(id => id && CHARACTERS[id]);
}
const shuffle = (a, rnd = Math.random) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clampLv = v => Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round(v)));
export const teamName = t => t.ids.map(id => (CHARACTERS[id] || { name: id }).name).join(' & ');
// 5.0: duplas dos jogadores (campeonatos antigos: só a dupla 0, com 1 ou 2 jogadores)
export const isHuman = (T, id) => !!(T.teams[id] && T.teams[id].human);
export const humanTeams = T => T.teams.filter(t => t.human).map(t => t.id);
export const playersOf = (T, id) => { const t = T.teams[id]; return t.players || (T.players === 2 ? [1, 2] : [1]); };
const hasHuman = (T, m) => isHuman(T, m.a) || isHuman(T, m.b);

// formato de cada fase: { sets: [pontos...], swaps: [troca de lado...] }
// pontos = a pontuação escolhida em Novo campeonato (6 / 12 / 18): o 1º set fica com esses pontos e o resto
// (outros sets da final e as trocas de lado) acompanha na mesma proporção dos valores do editor
export const PONTOS = [6, 12, 18];
export function formatOf(phase, pontos) {
  const C = CAMP();
  let f;
  if (phase === 'final') { const F = C.final || {}; f = { sets: (F.sets || [18, 18, 15]).map(Number), swaps: (F.trocaLado || [6, 6, 5]).map(Number) }; }
  else { const g = C[{ grupo: 'grupos', quartas: 'quartas', semi: 'semifinal' }[phase] || 'terceiro'] || C.grupos || {}; f = { sets: [+(g.pontos || 18)], swaps: [+(g.trocaLado || 6)] }; }
  if (!pontos || +pontos === f.sets[0]) return f;
  const k = +pontos / f.sets[0];
  return { sets: f.sets.map((x, i) => (i ? Math.max(1, Math.round(x * k)) : +pontos)), swaps: f.swaps.map(x => Math.max(1, Math.round(x * k))) };
}
export const PHASE_NAME = { grupo: 'Fase de grupos', quartas: 'Quartas de final', semi: 'Semifinal', terceiro: 'Disputa de 3º lugar', final: 'Final' };
// 5.0: chave de cada fase do mata-mata (1 = quartas, 2 = semifinal, 3 = final e 3º lugar)
export const chaveOf = phase => (phase === 'quartas' ? 1 : phase === 'semi' ? 2 : phase === 'final' || phase === 'terceiro' ? 3 : 1);
export const DIFF_NAME = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
export const LEVEL_MODE_NAME = { aleatorio: 'Aleatório', escada: 'Escada' };
const DIFF_DEFAULT = { facil: [1, 3, 5], medio: [3, 6, 9], dificil: [4, 8, 12] };
// níveis da escada da dificuldade (chave 1, 2, 3)
export function escada(diff) {
  const d = (CAMP().dificuldades || {})[diff] || DIFF_DEFAULT[diff] || DIFF_DEFAULT.medio;
  return [0, 1, 2].map(i => clampLv(+d[i] || DIFF_DEFAULT.medio[i]));
}
// nível de uma dupla numa fase: CPU (escada: o da chave; aleatório: o sorteado) e o parceiro da CPU de uma
// dupla de jogadores (o da chave). Campeonato antigo: o nível guardado.
export function levelOf(T, id, phase) {
  const t = T.teams[id];
  if (!T.ko) return t.level;
  const lv = escada(T.diff)[chaveOf(phase) - 1];
  if (t.human || T.levelMode === 'escada') return lv;
  return t.level;
}

// ---------- campeonato novo ----------
// cfg = { duplas: [{ ids: [atleta1, atleta2], players: [jogadores] }], diff: facil | medio | dificil,
//         levelMode: aleatorio | escada } (5.0: 1 a 4 duplas humanas)
//   (formato antigo: { ids, players: 1 | 2 } = uma dupla)
export function newTournament(cfg) {
  const C = CAMP();
  const diff = DIFF_NAME[cfg.diff] ? cfg.diff : 'medio', levelMode = cfg.levelMode === 'escada' ? 'escada' : 'aleatorio';
  const esc = escada(diff), lo = Math.min(...esc), hi = Math.max(...esc);
  const duplas = cfg.duplas || [{ ids: cfg.ids, players: cfg.players === 2 ? [1, 2] : [1] }];
  const teams = duplas.map((d, i) => ({ id: i, ids: [...d.ids], human: true, players: [...d.players], level: null }));
  const usedIds = duplas.flatMap(d => d.ids);
  // as outras duplas são da CPU, sem repetir atleta: as duplas dos bairros do Modo História (editor de Atletas) e
  // pares formados com os atletas da grade que sobraram
  const free = id => id && CHARACTERS[id] && !usedIds.includes(id);
  const story = Object.values((ATHLETES && ATHLETES.teams) || {}).filter(t => t.length === 2 && t.every(free));
  const left = shuffle(campAthletes().filter(free));
  const pairs = []; for (let i = 0; i + 1 < left.length; i += 2) pairs.push([left[i], left[i + 1]]);
  const H = teams.length;
  const pick = shuffle([...story, ...pairs]).slice(0, 8 - H);
  // aleatório: cada dupla da CPU sorteia o nível (fica o mesmo no campeonato todo); escada: pela chave
  pick.forEach((ids, i) => teams.push({ id: H + i, ids: [...ids], human: false, level: levelMode === 'aleatorio' ? lo + Math.floor(Math.random() * (hi - lo + 1)) : null }));
  // chave: 8 posições (partida i = posições 2i e 2i+1); as duplas humanas em partidas diferentes, uma em cada
  // metade da chave primeiro (posições 0, 4, 2, 6); as da CPU completam
  const cpu = shuffle(teams.filter(t => !t.human).map(t => t.id));
  const bracket = Array(8).fill(null);
  teams.filter(t => t.human).forEach((t, i) => { bracket[[0, 4, 2, 6][i]] = t.id; });
  for (let p = 0; p < 8; p++) if (bracket[p] === null) bracket[p] = cpu.shift();
  const matches = [0, 1, 2, 3].map(i => ({ id: i, phase: 'quartas', slot: i, a: bracket[2 * i], b: bracket[2 * i + 1], sets: [], winner: null }));
  return {
    name: C.nome || 'Campeonato Rio Futevôlei', created: Date.now(), players: duplas.reduce((n, d) => n + d.players.length, 0),
    ko: true, diff, levelMode, pontos: PONTOS.includes(+cfg.pontos) ? +cfg.pontos : null, bracket, shown: [],
    specials: cfg.specials || null, teams, matches, stage: 'quartas', done: false, place: null, podium: null, prize: 0, places: {}, prizes: {},
  };
}

// ---------- tabela dos grupos (critérios oficiais) ----------
export function standings(T, gk) {
  const ids = T.groups[gk], P = (CAMP().pontosTabela || {}), V = +(P.vitoria ?? 3), D = +(P.derrota ?? 1);
  const row = id => ({ id, j: 0, v: 0, d: 0, sg: 0, sp: 0, pf: 0, pc: 0, pts: 0 });
  const rows = Object.fromEntries(ids.map(id => [id, row(id)]));
  const played = T.matches.filter(m => m.phase === 'grupo' && m.group === gk && m.winner !== null);
  for (const m of played) {
    for (const [me, op, k] of [[m.a, m.b, 0], [m.b, m.a, 1]]) {
      const r = rows[me]; r.j++;
      const win = m.winner === me; if (win) { r.v++; r.pts += V; } else { r.d++; r.pts += D; }
      for (const s of m.sets) { const mine = s[k], theirs = s[1 - k]; r.pf += mine; r.pc += theirs; if (mine > theirs) r.sg++; else r.sp++; }
    }
  }
  const avg = (a, b) => (b ? a / b : a ? Infinity : 0);
  const list = Object.values(rows);
  // sorteio fixo por campeonato (desempate final)
  const lot = id => ((T.created + id * 7919) % 1000) / 1000;
  list.sort((x, y) => {
    if (y.pts !== x.pts) return y.pts - x.pts;
    const tied = list.filter(r => r.pts === x.pts);
    if (tied.length === 2) { const h = played.find(m => (m.a === x.id && m.b === y.id) || (m.a === y.id && m.b === x.id)); if (h) return h.winner === x.id ? -1 : 1; }
    const sx = avg(x.sg, x.sp), sy = avg(y.sg, y.sp); if (sy !== sx) return sy - sx;
    const px = avg(x.pf, x.pc), py = avg(y.pf, y.pc); if (py !== px) return py - px;
    return lot(y.id) - lot(x.id);
  });
  return list;
}

// ---------- próxima partida do jogador ----------
export function nextMatch(T) {
  // 5.0: rodada por rodada (com 2 duplas de jogadores, cada uma joga a sua partida da rodada antes da próxima)
  const open = T.matches.filter(m => m.winner === null && hasHuman(T, m));
  return open.sort((x, y) => (x.round || 0) - (y.round || 0) || x.id - y.id)[0] || null;
}

// 5.0: partidas só da CPU ainda sem resultado (mata-mata: as da chave atual)
export function cpuMatches(T) { return T.ko ? T.matches.filter(m => m.winner === null && !hasHuman(T, m)) : []; }

// ---------- simulação das partidas da CPU ----------
function strength(T, id, phase) {
  const t = T.teams[id];
  const st = t.ids.map(a => (CHARACTERS[a] || {}).stats || {}).reduce((s, x) => s + (x.forca || 5) + (x.agilidade || 5) + (x.precisao || 5) + (x.pique || 5), 0) / t.ids.length / 4;
  return (levelOf(T, id, phase) || 5) * 1.0 + (st - 6) * 0.6;
}
// from (5.0, partida assistida e resumida com Start): { sets: [[a, b] já terminados], cur: [a, b] do set atual }
export function simulate(T, m, from = null) {
  const { sets } = formatOf(m.phase, T.pontos);
  const p = Math.max(0.25, Math.min(0.75, 0.5 + (strength(T, m.a, m.phase) - strength(T, m.b, m.phase)) * 0.025));
  const won = [0, 0], need = Math.ceil(sets.length / 2);
  m.sets = from ? from.sets.map(x => [...x]) : [];
  for (const x of m.sets) won[x[0] > x[1] ? 0 : 1]++;
  for (let si = m.sets.length; si < sets.length && won[0] < need && won[1] < need; si++) {
    const pts = sets[si];
    let [a, b] = from && si === from.sets.length ? from.cur : [0, 0];
    while (!((a >= pts || b >= pts) && Math.abs(a - b) >= 2)) { if (Math.random() < p) a++; else b++; }
    m.sets.push([a, b]); won[a > b ? 0 : 1]++;
  }
  m.winner = won[0] > won[1] ? m.a : m.b;
}

// ---------- resultado de uma partida do jogador e avanço de fase ----------
// sets = [[pontos da dupla a, pontos da b], ...] na ordem a/b da partida
export function recordResult(T, m, sets) {
  m.sets = sets.map(s => [...s]);
  const won = [0, 0]; for (const s of sets) won[s[0] > s[1] ? 0 : 1]++;
  m.winner = won[0] > won[1] ? m.a : m.b;
  // as outras partidas da mesma rodada / fase são simuladas (5.0 mata-mata: só quando os jogadores avançam a
  // chave, para poderem assistir)
  if (!T.ko) for (const o of T.matches) if (o.winner === null && o.phase === m.phase && (o.phase !== 'grupo' || o.round === m.round) && o !== m && !hasHuman(T, o)) simulate(T, o);
  advance(T);
}
// simula tudo o que falta (jogador eliminado: o campeonato termina sem ele)
export function simulateRest(T) {
  for (let guard = 0; guard < 20 && !T.done; guard++) {
    const open = T.matches.filter(m => m.winner === null);
    if (!open.length) { advance(T); continue; }
    if (open.some(m => hasHuman(T, m))) break;
    open.forEach(m => simulate(T, m));
    advance(T);
  }
}
// 5.0: resultado de uma partida só da CPU (assistida) — sets na ordem a/b
export function recordWatched(T, m, sets) {
  m.sets = sets.map(x => [...x]);
  const won = [0, 0]; for (const x of sets) won[x[0] > x[1] ? 0 : 1]++;
  m.winner = won[0] > won[1] ? m.a : m.b;
  advance(T);
}
// 5.0: avança a chave — as partidas da CPU não assistidas são simuladas
export function simulateStage(T) {
  cpuMatches(T).forEach(m => simulate(T, m));
  advance(T);
}
export function advance(T) {
  const open = T.matches.filter(m => m.winner === null);
  if (open.length) {
    if (T.ko) return; // mata-mata: a chave só avança com todas as partidas decididas
    // jogador fora da fase atual: o resto da fase é simulado
    if (!open.some(m => hasHuman(T, m))) { open.forEach(m => simulate(T, m)); }
    else return;
  }
  const add = (phase, a, b, slot = 0) => T.matches.push({ id: T.matches.length, phase, slot, a, b, sets: [], winner: null });
  if (T.stage === 'quartas') {
    // chave 2: vencedores das quartas 0 × 1 e 2 × 3; quem perdeu nas quartas termina em 5º
    const q = i => T.matches.find(m => m.phase === 'quartas' && m.slot === i);
    add('semi', q(0).winner, q(1).winner, 0); add('semi', q(2).winner, q(3).winner, 1);
    T.stage = 'semi';
    T.places = T.places || {};
    for (const id of humanTeams(T)) if (T.matches.some(m => m.phase === 'quartas' && (m.a === id || m.b === id) && m.winner !== id)) T.places[id] = 5;
    bestPlace(T);
    return advance(T);
  }
  if (T.stage === 'grupo') {
    const A = standings(T, 'A'), B = standings(T, 'B');
    T.groupPlace = {};
    A.forEach((r, i) => { T.groupPlace[r.id] = i + 1; }); B.forEach((r, i) => { T.groupPlace[r.id] = i + 1; });
    add('semi', A[0].id, B[1].id); add('semi', B[0].id, A[1].id);
    T.stage = 'semi';
    // duplas humanas eliminadas nos grupos: 3º do grupo = 5º lugar, 4º = 7º
    T.places = T.places || {};
    for (const id of humanTeams(T)) if (![A[0], A[1], B[0], B[1]].some(r => r.id === id)) T.places[id] = T.groupPlace[id] === 3 ? 5 : 7;
    bestPlace(T);
    return advance(T);
  }
  if (T.stage === 'semi') {
    const semis = T.matches.filter(m => m.phase === 'semi').sort((x, y) => (x.slot || 0) - (y.slot || 0));
    const lose = m => (m.winner === m.a ? m.b : m.a);
    add('terceiro', lose(semis[0]), lose(semis[1]));
    add('final', semis[0].winner, semis[1].winner);
    T.stage = 'final';
    return advance(T);
  }
  if (T.stage === 'final') {
    const fin = T.matches.find(m => m.phase === 'final'), ter = T.matches.find(m => m.phase === 'terceiro');
    const lose = m => (m.winner === m.a ? m.b : m.a);
    T.podium = [fin.winner, lose(fin), ter.winner, lose(ter)];
    const prizes = (CAMP().premios || [300, 150, 80]).map(Number);
    T.places = T.places || {}; T.prizes = {};
    for (const id of humanTeams(T)) {
      const at = T.podium.indexOf(id);
      if (at >= 0) T.places[id] = at + 1;
      const p = T.places[id];
      T.prizes[id] = p && p <= prizes.length ? prizes[p - 1] : 0;
    }
    bestPlace(T);
    T.prize = Object.values(T.prizes).reduce((a, b) => a + b, 0); // carteira única: soma das duplas humanas
    T.stage = 'fim'; T.done = true;
  }
}

// melhor colocação entre as duplas humanas (T.place, usado nas telas)
function bestPlace(T) { const v = Object.values(T.places || {}).filter(Boolean); T.place = v.length ? Math.min(...v) : null; }

// ---------- fim: troféu e dinheiro ----------
export function finish(c) {
  const T = c.cur;
  if (!T || !T.done || T.paid) return;
  T.paid = true;
  c.wallet = (c.wallet || 0) + (T.prize || 0);
  // uma entrada por dupla humana
  const champ = { champion: T.podium ? T.podium[0] : null, champIds: T.podium ? T.teams[T.podium[0]].ids : [] };
  const ids = humanTeams(T);
  const rows = ids.map(id => ({ name: T.name, date: Date.now(), dupla: T.teams[id].ids, players: playersOf(T, id), place: (T.places || {})[id] ?? (id === 0 ? T.place : null),
    prize: (T.prizes || {})[id] ?? (ids.length === 1 ? T.prize || 0 : 0), ...champ }));
  c.trophies = [...rows, ...(c.trophies || [])].slice(0, 30);
}
export const placeName = n => (n ? `${n}º lugar` : '—');
export const medal = n => ['🏆', '🥈', '🥉'][n - 1] || '';
