import * as THREE from 'three';
import { DT, TRAINING, SLOW_STEPS } from './config.js';
import { Keyboard, Port, padProfile, seats, sourceOf, menuSource, styleOf, seatedPlayers, padKind } from './input.js';
import { JoinScreen } from './ui/joinUI.js';
import { Match } from './match.js';
import { buildCopacabana } from './scene/copacabana.js';
import { Renderer } from './render.js';
import { Hud } from './hud.js';
import { Sfx } from './audio.js';
import { CHARACTERS } from './art/characters.js';
import { settings, saveSettings, aimModeOf } from './ui/settings.js';
import { SelectScreen } from './ui/select.js';
import { PenPost, brushFrag, collageFrag, collageUniforms } from './scene/penPost.js';
import COLAGEM from './data/colagem.js';
import { CreatorScreen } from './ui/creator.js';
import './art/custom.js'; // registra os atletas criados antes de qualquer tela
import { listenEditor } from './engine/liveEdit.js';
import { buildWeather } from './scene/weather.js';
import { buildBeachLife } from './scene/beachLife.js';
import { weatherOf, WEATHER, consume, CONSUMABLE_IDS } from './condition.js';
import { Tutorial } from './tutorial.js';
import { StoryMode } from './story/story.js';
import { newSave, readSave, writeSave } from './story/save.js';
import { installCampUI, campDuplaPlayers, campCfgOut } from './ui/campUI.js';
import { loadCamp, saveCamp, newTournament, nextMatch, recordResult, finish as campFinish, formatOf, PHASE_NAME, CAMP, teamName, isHuman, playersOf, humanTeams, levelOf, simulate as campSimulate, advance as campAdvanceT, recordWatched, simulateStage, campAthletes } from './camp.js';
import { V5, menuHoldTime } from './v5.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 1200); // posição: engine/camera.js

const arena = buildCopacabana(scene);
const weatherFx = buildWeather(scene); // chuva, sol forte e vento na arena
const beachLife = buildBeachLife(scene); // siri, gaivota, vendedor... passando de vez em quando
const view = new Renderer(scene, camera);
const penPost = new PenPost(renderer);
const brushPost = new PenPost(renderer, brushFrag);
const collagePost = new PenPost(renderer, collageFrag, collageUniforms(COLAGEM));
collagePost.mat.uniforms.tDepth = { value: collagePost.target.depthTexture }; // céu = fundo da profundidade (mosaico)

// Estilo artístico: 'caneta' e 'pincel' passam o cenário por um efeito de desenho à mão.
function applyArtStyle() {
  document.body.classList.toggle('art-caneta', settings.art === 'caneta');
  document.body.classList.toggle('art-pincel', settings.art === 'pincel');
  document.body.classList.toggle('art-colagem', settings.art === 'colagem');
}
applyArtStyle();
const hud = new Hud();
// golpes gravados no editor de golpes entram na hora, mesmo no meio da partida
listenEditor(() => hud.toast('Golpes atualizados pelo editor'));
const sfx = new Sfx();
const select = new SelectScreen(document.getElementById('hud'));
const creator = new CreatorScreen(document.getElementById('hud'));

// Entrada: porta de menu (aceita tudo) + uma porta por jogador.
const keyboard = new Keyboard();
// 5.0: os menus aceitam só os dispositivos dos jogadores (tela Jogadores, src/ui/joinUI.js)
const menuPort = new Port(keyboard, menuSource());
const joinScreen = new JoinScreen(document.getElementById('hud'), keyboard);
let ports = {};

const DEBUG_DEMO = new URLSearchParams(location.search).has('demo');
const DEFAULT_TEAMS = [['giulia', 'zefa'], ['tubarao', 'pipoca']];

let match;
let game = { mode: 'solo', teams: DEFAULT_TEAMS }; // última partida configurada
let tutorial = null;  // Tutorial em andamento (src/tutorial.js)
let storyCb = null;   // Modo História: partida da história em andamento → o que fazer no fim
let storyOverT = 0;   // espera depois do último ponto antes de voltar ao roteiro
let mode = 'menu';    // menu | play | paused
let slowIdx = 0;      // treino: câmera lenta, índice em SLOW_STEPS (só com TRAINING ligado)
const slowFactor = () => SLOW_STEPS[slowIdx];

// levels: nível de cada atleta da CPU, escolhido no cartão dele na seleção ({ time: [nível por atleta] })
// opts: regras da 4.0 passadas à Match (tiltSpecials, pointsToWin, weather, drain, timeouts,
//   consumables, practice). Toda partida usa as mecânicas do antigo Modo Tilt (src/tilt.js).
function newMatch(matchMode, teamIds, levels = {}, opts = {}) {
  // a partida de fundo do menu usa o nível 6 para todos
  const level = 6;
  // o que cada jogador controla (time inteiro ou só o 1º atleta escolhido), escolhido antes da seleção
  const control = { 1: settings.control1, 2: settings.control2 };
  match = new Match(teamIds.map(t => t.map(id => CHARACTERS[id])), { mode: matchMode, level, control, levels, tilt: true, ctrl: { ...settings.ctrlModes }, aim: Object.fromEntries([1, 2, 3, 4].map(n => [n, aimModeOf(n, (((V5.controle || {}).mira) || {}).modo === 'direto' ? 'direto' : 'giro')])), ...opts, tiltSpecials: opts.tiltSpecials || {} });
  hud.match = match;
  weatherFx.set(match.weather);
  arena.setHood(opts.arena || 'copacabana'); // paisagem do bairro da partida
  match.screenToWorld = (x, z) => view.rig.toWorld(x, z); // Kids Mode: as metades seguem a câmera
  arena.ads.reshuffle(); // cada partida tem só 5 marcas, sorteadas agora
  view.bind(match);
  // 5.0: cara ou coroa antes da partida (não na partida de fundo nem no treino)
  pendingToss = !match.demo && !match.practice && !opts.noToss ? 'match' : null;
  setBreakT = 0; campOverT = 0;
  if (!pendingToss) match.begin();
  // 5.0: mira de cada jogador lida na hora (Configurações → Controles → Mira do ataque, também na pausa)
  match.aimFn = n => aimModeOf(n, (((V5.controle || {}).mira) || {}).modo === 'direto' ? 'direto' : 'giro');
}
let pendingToss = null, setBreakT = 0, campOverT = 0;
// 5.0: cara ou coroa (início da partida e set decisivo) ou a escolha de quem perdeu o sorteio (2º set)
function startToss(kind) {
  mode = 'paused';
  hud.startToss(match, kind, (first, side0) => {
    mode = 'play';
    if (kind === 'match') match.begin(first, side0); else match.nextSet(first, side0);
    hud.toast(kind === 'match' ? `${match.teams[first].name} começa sacando` : `${match.setNo + 1}º SET · ATÉ ${match.pointsToWin} PONTOS · ${match.teams[first].name} saca`, 3);
  });
}

// Monta as portas dos jogadores conforme o modo e o dispositivo de cada um.
// 5.0: modo da partida pelos jogadores de cada lado (multi / Campeonato): dois lados com gente = versus
const sidesMode = sd => (sd[0].length && sd[1].length ? 'versus' : sd[0].length > 1 || sd[1].length > 1 ? 'coop' : 'solo');
// 5.0: cada jogador (1 a 4) só com o dispositivo dele; o teclado é um dispositivo à parte (não substitui o controle)
function setupPorts() {
  ports = {};
  for (const n of seatedPlayers()) ports[n] = new Port(keyboard, sourceOf(n));
  menuPort.source = menuSource();
  // o direcional é relativo à tela: a câmera diz para onde "cima/direita" apontam na quadra
  for (const p of Object.values(ports)) p.view = (x, z) => view.rig.toWorld(x, z);
  // ícones: teclado, Xbox ou PlayStation pelo nome do controle (desconhecido: o estilo das Configurações)
  const fb = settings.p1 === 'xbox' ? 'xbox' : 'ps';
  const styles = { 1: styleOf(1, fb), 2: styleOf(2, fb), 3: styleOf(3, fb), 4: styleOf(4, fb) };
  hud.setStyles(styles);
  return styles;
}
// 5.0: tela Jogadores (antes do menu inicial e em Configurações → Controles → Jogadores e controles)
let joinBack = null;
function openJoin(from = 'boot') {
  joinBack = { mode, stack: hud.stack ? [...hud.stack] : null };
  hud.close();
  mode = 'join';
  joinScreen.open({
    from, sfx,
    onDone: () => {
      setupPorts();
      // o botão que fechou a tela continua apertado: não vale como toque no menu
      menuPort.poll(); for (const p of Object.values(ports)) p.poll();
      consumeAll();
      const b = joinBack; joinBack = null;
      if (from === 'boot' || !b.stack) { mode = 'menu'; hud.open('title'); return; }
      mode = b.mode === 'join' ? 'menu' : b.mode;
      hud.stack = b.stack; hud.idx = 0; hud.render();
    },
  });
}
hud.playersText = () => { const ns = seatedPlayers(); return ns.length ? ns.map(n => 'J' + n + ': ' + (seats[n].kind === 'kb' ? 'teclado' : padKind(seats[n].id) === 'xbox' ? 'controle Xbox' : padKind(seats[n].id) === 'ps' ? 'controle PlayStation' : 'controle')).join(' · ') : 'ninguém'; };

function showTitle() {
  newMatch('demo', DEFAULT_TEAMS); // no fundo, a CPU joga contra ela mesma
  mode = 'menu';
  slowIdx = 0;
  hud.setSlow(1);
  setupPorts();
  hud.open('title');
}

installCampUI(hud);
// 5.0: cara ou coroa — lado da quadra (-1 / 1) → lado da tela (-1 esquerda / 1 direita)
hud.sideOnScreen = s => view.rig.screenSide(s, 0) || s;
hud.actions = {
  // seleção de atletas (cada jogador com o seu controle) → VS → partida
  select(matchMode, variant = null) {
    sfx.unlock();
    const styles = setupPorts(matchMode);
    mode = 'select';
    select.open({
      mode: matchMode, size: settings.teamSize, control: { 1: settings.control1, 2: settings.control2 }, ports, styles, sfx,
      tilt: true, // cada atleta escolhe o especial de ataque e o de defesa
      // 5.0 Exibição: nível único da CPU (tela Partida) ou um por atleta (Mais opções)
      cpuLevel: variant === 'exh' && !settings.cpuPerAthlete ? settings.cpuLevel : null,
      onDone: (teams, levels, tiltSpecials, sides) => hud.actions.start(matchMode, teams, levels, variant, tiltSpecials, sides),
      onCancel: () => { setupPorts('solo'); mode = 'menu'; hud.open('title'); if (variant === 'exh') { hud.push('play'); hud.variant = 'exh'; hud.push('exh'); } },
    });
  },
  // sides (5.0 multi, 3 ou 4 jogadores): { 0: [jogadores], 1: [...] } escolhidos na seleção
  start(matchMode, teamIds, levels = {}, variant = null, tiltSpecials = null, sides = null) {
    sfx.unlock();
    document.getElementById('hud').classList.remove('story-on');
    if (sides) matchMode = sidesMode(sides);
    game = { mode: DEBUG_DEMO ? 'demo' : matchMode, teams: teamIds, levels, variant, tiltSpecials, sides };
    // Modo Exibição: pontos, clima (o aleatório é sorteado a cada partida) e consumíveis das pausas
    const exh = variant === 'exh' ? { arena: settings.exhArena, pointsToWin: settings.exhPoints, weather: weatherOf(settings.exhWeather), drain: true, timeouts: 2, consumables: settings.exhItems.filter(k => CONSUMABLE_IDS.includes(k)) } : {};
    newMatch(game.mode, game.teams, game.levels, { tiltSpecials, ...exh, ...(sides ? { sides } : {}) });
    match.tossAuto = variant === 'exh' && settings.exhToss !== 'completo'; // 5.0: Exibição — sorteio automático (Mais opções)
    setupPorts();
    mode = 'play';
    {
      const [a, b, c, d] = ['A', 'B', 'C', 'D'].map(k => hud.ico(k));
      const wx = match.weather.length ? ` · CLIMA: ${match.weather.map(k => WEATHER[k].icon + ' ' + WEATHER[k].name).join(' e ')}` : '';
      const [lb, rb, rt] = ['L', 'R', 'R2'].map(k => hud.ico(k));
      hud.toast(`ATÉ ${match.pointsToWin} PONTOS${wx} · segure ${a} ataque ou ${b} defesa: a parte da hitbox (pé, tronco, cabeça) escolhe o golpe · a bola na hitbox para o tempo · o direcional aponta · solte para bater · ${c} pulo · ${d} carrinho · especiais: ${lb}${lb} / ${rb}${rb} com 50% da barra, ${a}${a} / ${b}${b} com 100% · ${rt} formação`, 9);
    }
  },
  // Tutorial: treino 1 contra 1 com o Treinador Moacir, sem placar (onEnd: Modo História)
  tutorial(onEnd = null, who = 'giulia') {
    sfx.unlock();
    game = { mode: 'solo', teams: [[who], ['treinador']], levels: { 1: [3] } };
    newMatch('solo', game.teams, game.levels, { practice: true });
    setupPorts();
    mode = 'play';
    tutorial = new Tutorial(match, hud, () => { tutorial = null; if (onEnd) onEnd(); else showTitle(); });
    tutorial.onEnd2 = onEnd;
  },
  // Modo História: jogo novo (cfg: players, difficulty, slot) ou salvo
  storyNew(cfg) { const sv = newSave(cfg.slot, cfg.players, cfg.difficulty); writeSave(sv); enterStory(sv); },
  storyLoad(slot) { const sv = readSave(slot); if (sv) enterStory(sv); else hud.open('title'); },
  skipStep() { if (tutorial) tutorial.skip(); setupPorts(); mode = 'play'; },
  again() { this.start(game.mode, game.teams, game.levels, game.variant, game.tiltSpecials, game.sides); },
  resume() { setupPorts(); mode = 'play'; },
  quit() {
    // história: sair do tutorial segue o roteiro; desistir da partida conta como derrota
    if (tutorial) { const back = tutorial.onEnd2; tutorial.close(); tutorial = null; if (back) { back(); return; } }
    if (storyCb) { finishStoryMatch(false); return; }
    showTitle();
  },
  // criador de atleta (id = null para um novo)
  create(id) {
    sfx.unlock();
    mode = 'creator';
    creator.open({
      id, sfx,
      onClose: () => { mode = 'menu'; hud.open('title'); hud.push('athletes'); hud.push('creators'); },
    });
  },
  // ================= 5.0 Modo Campeonato =================
  campNew(cfg) { const c = loadCamp(); c.cur = newTournament(cfg); saveCamp(c); this.campTable(); },
  // 5.0: atletas de cada dupla de jogadores na tela de seleção normal (uma dupla por vez); depois a chave
  campPick(cfg, d = 0) {
    sfx.unlock();
    const styles = setupPorts(), ps = campDuplaPlayers(cfg)[d];
    hud.close();
    mode = 'select';
    select.open({
      mode: 'camp', size: 2, control: { 1: settings.control1, 2: settings.control2 }, ports, styles, sfx, tilt: true,
      camp: { players: ps, allowed: campAthletes(), taken: cfg.ids.filter((_, i) => i < d).flat(),
        label: `Campeonato · ${cfg.nd > 1 ? `Dupla ${d + 1} de ${cfg.nd} · ` : ''}${ps.map(n => 'J' + n).join(' e ')}` },
      onDone: ids => {
        cfg.ids[d] = ids;
        if (d < cfg.nd - 1) { this.campPick(cfg, d + 1); return; }
        settings.campDuplas = cfg.ids.map(x => [...x]); settings.campDupla = [...cfg.ids[0]]; saveSettings();
        this.campNew(campCfgOut(cfg));
      },
      onCancel: () => { setupPorts(); mode = 'menu'; hud.camp = loadCamp(); hud.open('title'); hud.push('play'); hud.push('camp'); hud.push('camp-new'); },
    });
  },
  // 5.0: assistir uma partida só da CPU (Start resume: o resto é simulado a partir do placar)
  campWatch(id) {
    sfx.unlock();
    const c = loadCamp(), T = c.cur, m = T && T.matches.find(x => x.id === id);
    if (!m || m.winner !== null) { this.campTable(); return; }
    const C = CAMP(), f = formatOf(m.phase, T.pontos), A = T.teams[m.a], B = T.teams[m.b];
    const la = levelOf(T, m.a, m.phase), lb = levelOf(T, m.b, m.phase);
    game = { mode: 'solo', teams: [A.ids, B.ids], levels: { 0: [la, la], 1: [lb, lb] }, camp: true };
    newMatch('solo', game.teams, game.levels, { arena: C.arena || 'copacabana', weather: weatherOf(C.clima || 'aleatorio'), drain: true, sides: { 0: [], 1: [] },
      consumables: [...CONSUMABLE_IDS], tempos: +(C.temposTecnicos ?? 1), sets: f.sets, swaps: f.swaps, camp: { id: m.id, flipped: false, phase: m.phase, watch: true } });
    setupPorts();
    mode = 'play';
    hud.toast(`ASSISTINDO · ${PHASE_NAME[m.phase].toUpperCase()} · ${f.sets.length > 1 ? 'MELHOR DE 3 SETS' : 'SET ÚNICO DE ' + f.sets[0]} · ${hud.ico('start')} resume a partida`, 5);
  },
  // 5.0: avança a chave (as partidas da CPU não assistidas são simuladas)
  campAdvance() {
    const c = loadCamp(), T = c.cur;
    if (T && !T.done) { simulateStage(T); if (T.done) campFinish(c); saveCamp(c); }
    this.campTable();
  },
  campTable() {
    if (!match.demo) newMatch('demo', DEFAULT_TEAMS);
    hud.camp = loadCamp(); setupPorts(); mode = 'menu'; hud.open('camp-table');
  },
  campPlay() {
    sfx.unlock();
    const c = loadCamp(), T = c.cur, nm = T && nextMatch(T);
    if (!nm) { this.campTable(); return; }
    // o time 0 da partida é uma dupla de jogadores (5.0: duas duplas de jogadores = humano contra humano)
    const C = CAMP(), flipped = !isHuman(T, nm.a);
    const us = T.teams[flipped ? nm.b : nm.a], them = T.teams[flipped ? nm.a : nm.b];
    const f = formatOf(nm.phase, T.pontos);
    const sp = t => t.ids.map(id => (settings.lastSpecials && settings.lastSpecials[id]) || {});
    const tiltSpecials = { 0: sp(us), ...(them.human ? { 1: sp(them) } : {}) };
    const sides = { 0: playersOf(T, us.id), 1: them.human ? playersOf(T, them.id) : [] };
    const mm = sidesMode(sides);
    const lu = levelOf(T, us.id, nm.phase), lt = levelOf(T, them.id, nm.phase);
    game = { mode: mm, teams: [us.ids, them.ids], levels: { 0: [lu, lu], 1: [lt, lt] }, camp: true };
    newMatch(mm, game.teams, game.levels, { tiltSpecials, arena: C.arena || 'copacabana', weather: weatherOf(C.clima || 'aleatorio'), drain: true, sides,
      consumables: [...CONSUMABLE_IDS], tempos: +(C.temposTecnicos ?? 1), sets: f.sets, swaps: f.swaps, camp: { id: nm.id, flipped, phase: nm.phase } });
    setupPorts();
    mode = 'play';
    const wx = match.weather.length ? ` · CLIMA: ${match.weather.map(k => WEATHER[k].icon + ' ' + WEATHER[k].name).join(' e ')}` : '';
    hud.toast(`${PHASE_NAME[nm.phase].toUpperCase()}${nm.round ? ' · RODADA ' + nm.round : ''} · ${f.sets.length > 1 ? 'MELHOR DE 3 SETS (' + f.sets.join(', ') + ')' : 'SET ÚNICO DE ' + f.sets[0]}${wx}`, 5);
  },
  // tempo técnico oficial pedido pelo jogador (menu de pausa, com a bola parada)
  campTempo(ti = 0) {
    if (!match.camp || !match.useTempo(ti)) { hud.close(); this.resume(); return; }
    mode = 'paused';
    hud.techPause(match, [ti], [ti]);
  },
  // W.O.: a dupla do jogador perde no placar máximo do set
  // ti = time da partida que desiste (0 = a dupla de jogadores do time 0; 1 = a outra, quando também é de jogadores)
  campWO(ti = 0) {
    const c = loadCamp(), T = c.cur, nm = T && T.matches.find(x => x.id === match.camp.id);
    if (!nm) { showTitle(); return; }
    const loserIsA = (ti === 0) !== match.camp.flipped;
    const f = formatOf(nm.phase, T.pontos), need = Math.ceil(f.sets.length / 2), sets = [];
    for (let i = 0; i < need; i++) sets.push(loserIsA ? [0, f.sets[i]] : [f.sets[i], 0]);
    campRecord(c, T, nm, sets, true);
  },
  campAfterResult() {
    const c = loadCamp();
    if (c.cur && c.cur.done) this.campPodium(); else this.campTable();
  },
  campPodium() {
    const c = loadCamp();
    if (c.cur && c.cur.done) { c.cur.seen = true; saveCamp(c); }
    if (!match.demo) newMatch('demo', DEFAULT_TEAMS);
    hud.camp = c; setupPorts(); mode = 'menu'; hud.open('camp-podium');
  },
  campDeposit(slot) {
    const c = loadCamp(), sv = readSave(slot);
    if (!sv || !(c.wallet > 0)) { hud.back(); return; }
    sv.money = (sv.money || 0) + c.wallet;
    writeSave(sv);
    hud.toast(`R$ ${c.wallet} depositados na vaga ${slot} do Modo História`, 3);
    c.wallet = 0; saveCamp(c); hud.camp = c;
    hud.back();
  },
  campHome() { hud.camp = null; showTitle(); },
  devicesChanged() { setupPorts(); }, // 5.0: tipo de botões trocado (ícones)
  devicesChanged() { setupPorts(); },
  players() { openJoin('settings'); },
  styleChanged() { applyArtStyle(); },
};

// ================= Modo História =================
const story = new StoryMode(document.getElementById('hud'), {
  ico: (k, size = 18) => hud.ico(k, 1, size),
  aspect: () => innerWidth / innerHeight,
  quit: () => { document.getElementById('hud').classList.remove('story-on'); showTitle(); },
  startTutorial: onEnd => {
    document.getElementById('hud').classList.remove('story-on');
    hud.actions.tutorial(() => { enterStoryView(); onEnd(); }, 'giulia_s');
  },
  // tela de versus (especiais da Giulia e da Zefa) antes de cada partida da história
  versus: (info, specials, go) => {
    document.getElementById('hud').classList.add('story-on'); // só a tela de versus (sem o placar)
    setupPorts('solo');
    mode = 'storyvs';
    hud.storyVs = { info, specials, go };
    hud.open('storyvs');
  },
  // cfg: { mode, teams, levels, opts, title }
  startMatch: (cfg, onEnd) => {
    sfx.unlock();
    document.getElementById('hud').classList.remove('story-on');
    game = { mode: cfg.mode, teams: cfg.teams, levels: cfg.levels };
    newMatch(cfg.mode, cfg.teams, cfg.levels, cfg.opts);
    match.story = true;
    setupPorts();
    mode = 'play';
    storyCb = onEnd; storyOverT = 0;
    const wx = match.weather.length ? ` · CLIMA: ${match.weather.map(k => WEATHER[k].icon + ' ' + WEATHER[k].name).join(' e ')}` : '';
    hud.toast(`${cfg.title || 'PARTIDA'} · ATÉ ${match.pointsToWin} PONTOS${wx}`, 4);
  },
});
function enterStoryView() {
  setupPorts('solo');
  for (const p of Object.values(ports)) p.view = null; // no bairro a câmera é de lado: direita = +x
  document.getElementById('hud').classList.add('story-on');
  hud.close();
  mode = 'story';
}
// Modo História: na troca de lado, a Giulia pode usar a mochila (o jogo para enquanto escolhe)
function openSwapBag() {
  const g = match.players.find(p => p.char.id === 'giulia_s'), z = match.players.find(p => p.char.id === 'zefa' && p.team === g.team);
  if (!g) return;
  const m = match;
  hud.swapBag = {
    specials: story.s.specials,
    players: { giulia: g, zefa: z },
    get list() { return story.bagList(); },
    get status() { return hud.condText(g); },
    eat(id) {
      const text = consume(g, id);
      story.useBag(id);
      m.emit('consume', { player: g, item: id, text });
      hud.toast(`Giulia: ${text}`, 2.5);
    },
  };
  mode = 'paused';
  hud.open('swapbag');
}
function openTechPause() {
  const humans = match.teams.filter(t => t.human).map(t => t.id);
  if (!humans.length) { const res = match.cpuConsume(); if (res.length) hud.toast('PAUSA TÉCNICA · ' + res.join(' · '), 4); return; }
  mode = 'paused';
  hud.techPause(match, humans);
}
// 5.0 Campeonato: grava o resultado da partida do jogador e mostra a tela de resultado
// 5.0: fim da partida só da CPU assistida — skip (Start): o resto é simulado a partir do placar atual
function campWatchEnd(skip) {
  const c = loadCamp(), T = c.cur, nm = T && T.matches.find(x => x.id === match.camp.id);
  if (!nm || nm.winner !== null) { hud.actions.campTable(); return; }
  if (skip && match.state !== 'over') {
    const cur = match.state === 'setover' ? [0, 0] : [match.teams[0].score, match.teams[1].score];
    campSimulate(T, nm, { sets: match.setHistory, cur });
    campAdvanceT(T);
  } else recordWatched(T, nm, match.setHistory);
  if (T.done) campFinish(c);
  saveCamp(c);
  hud.camp = c;
  const a = teamName(T.teams[nm.a]), b = teamName(T.teams[nm.b]);
  hud.campResult = { won: false, wo: false, vsHuman: true, watch: true, skip: skip && match.state !== 'over', phase: nm.phase, us: a, them: b, winner: teamName(T.teams[nm.winner]), sets: nm.sets, out: [] };
  newMatch('demo', DEFAULT_TEAMS);
  setupPorts(); mode = 'menu';
  hud.open('camp-result');
}
function campFinishMatch() {
  if (match.camp.watch) { campWatchEnd(false); return; }
  const c = loadCamp(), T = c.cur, nm = T && T.matches.find(x => x.id === match.camp.id);
  if (!nm || nm.winner !== null) { hud.actions.campTable(); return; }
  // placar de cada set na ordem a/b da partida (o jogador é sempre o time 0 do motor)
  const sets = match.setHistory.map(s => (match.camp.flipped ? [s[1], s[0]] : [s[0], s[1]]));
  campRecord(c, T, nm, sets, false);
}
function campRecord(c, T, nm, sets, wo) {
  const before = { ...(T.places || {}) };
  recordResult(T, nm, sets);
  // 5.0: "nós" = a dupla de jogadores da partida (a dupla a, quando as duas são de jogadores)
  const usId = isHuman(T, nm.a) ? nm.a : nm.b, themId = usId === nm.a ? nm.b : nm.a, vsHuman = isHuman(T, themId);
  const won = nm.winner === usId, us = teamName(T.teams[usId]), them = teamName(T.teams[themId]);
  // dupla(s) eliminada(s) na fase de grupos (5º a 8º): recordResult já simulou o resto
  const out = humanTeams(T).filter(id => (T.places || {})[id] >= 5 && !before[id]).map(id => ({ name: teamName(T.teams[id]), place: T.places[id] }));
  if (T.done) campFinish(c);
  saveCamp(c);
  hud.camp = c;
  hud.campResult = { won, wo, vsHuman, phase: nm.phase, us, them, winner: teamName(T.teams[nm.winner]), sets: sets.map(s => (nm.a === usId ? s : [s[1], s[0]])), out };
  if (!match.demo) newMatch('demo', DEFAULT_TEAMS);
  setupPorts(); mode = 'menu';
  hud.open('camp-result');
}
function enterStory(sv) { sfx.unlock(); enterStoryView(); story.start(sv); }
function finishStoryMatch(won) {
  const cb = storyCb, m = match;
  storyCb = null;
  // eventos ainda não lidos (ex.: consumível usado na última pausa) saem da mochila agora
  for (const e of m.events) story.onMatchEvent(e, m);
  m.events.length = 0;
  hud.close();
  enterStoryView();
  cb(won, m);
}

showTitle();
openJoin('boot'); // 5.0: antes do menu inicial, cada jogador escolhe o seu dispositivo
{ const boot = document.getElementById('boot'); if (boot) boot.remove(); } // 5.0: tela de carregamento (index.html)

let teaserCam = null, teaserEv = null;
// 5.0 Teaser (docs/teaser.html abre o jogo com ?teaser): um pequeno filme com tudo o que existe nos
// gráficos e nos golpes, dirigido por src/teaser.js com o próprio motor do jogo
if (new URLSearchParams(location.search).has('teaser')) {
  import('./teaser.js').then(T => T.startTeaser({
    hud, view, arena, weatherFx, settings, camera,
    get match() { return match; },
    newMatch: (teams, opts) => newMatch('demo', teams, {}, opts || {}),
    setArt: style => { settings.art = style; applyArtStyle(); }, // não grava nas preferências do jogador
    setCamera: fn => { teaserCam = fn; },
    onEvent: fn => { teaserEv = fn; },
    setExportMode: on => { exportMode = !!on; }, frameStep: dt => frameStep(dt), // exportar MP4 quadro a quadro
  }));
}

// No itch.io o jogo roda dentro de um quadro (iframe): o primeiro clique traz o teclado para o jogo.
addEventListener('pointerdown', () => { window.focus(); sfx.unlock(); });

// Controle que o navegador não reconhece e que não tem perfil conhecido: sugere calibrar.
addEventListener('gamepadconnected', e => {
  // 5.0: o estilo dos ícones vem do controle de cada jogador (tela Jogadores)
  if ([1, 2, 3, 4].some(n => seats[n] && seats[n].kind === 'pad' && seats[n].index === e.gamepad.index)) setupPorts();
  if (padProfile(e.gamepad).source === 'desconhecido') {
    hud.toast('Controle não reconhecido: calibre em Configurações → Calibrar controle');
  }
});

// A abertura da câmera (que mantém a largura da quadra visível em telas estreitas) fica no rig.
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  penPost.setSize(w, h);
  brushPost.setSize(w, h);
  collagePost.setSize(w, h);
  view.rig.setAspect(w / h);
  if (story.street) story.street.setAspect(w / h);
}
addEventListener('resize', resize);
resize();

let last = performance.now();
let acc = 0;
let time = 0;

// 5.0: retorno nos menus — som ao mudar de item e ao confirmar, e uma vibração curta no controle
let menuHoldA = 0;
function menuFeel(strong) {
  sfx.onEvent({ type: 'select', vol: strong ? 0.8 : 0.4 });
  try {
    for (const gp of navigator.getGamepads ? navigator.getGamepads() : []) {
      if (gp && gp.vibrationActuator) gp.vibrationActuator.playEffect('dual-rumble', { duration: strong ? 60 : 25, strongMagnitude: strong ? 0.35 : 0, weakMagnitude: strong ? 0.5 : 0.25 });
    }
  } catch (e) { /* controle sem vibração */ }
}
function menuInput(dt, escTapped) {
  // 5.0: pausa técnica — só o jogador do atleta que está escolhendo move o cursor (os outros não mexem)
  const tw = hud.twOwner && hud.twOwner();
  const p = tw ? (ports[tw] || menuPort) : menuPort;
  // calibrando: os botões do controle são lidos crus pela HUD; só o Esc do teclado cancela
  if (hud.screen === 'calibrate') {
    hud.calibTick(dt);
    if (escTapped) hud.activate('calib-cancel');
    return;
  }
  // 5.0: padrão de controle dos menus (ver Port.menu em src/input.js) — o direcional só navega
  const k = p.menu();
  if (k.up) hud.move(-1);
  else if (k.down) hud.move(1);
  if (k.left) hud.side(-1);
  else if (k.right) hud.side(1);
  if (k.up || k.down || k.left || k.right) menuFeel(false);
  // segurar Start (2 s, editável): passa direto pelas etapas e aperta o Pronto! (só conta um Start apertado já no menu,
  // para o Start que abriu a pausa não fechá-la sozinho)
  menuHoldA = k.start ? 0.001 : (k.holdStart && menuHoldA > 0 ? menuHoldA + dt : 0);
  if (menuHoldA >= menuHoldTime()) { menuHoldA = -99; menuFeel(true); hud.rush(); return; }
  // teste do controle na tela de configurações
  if (hud.screen === 'set-controls') {
    const a = ['A', 'B', 'C', 'D', 'R', 'L', 'L2', 'start'].find(k => p.pressed(k));
    if (a) hud.setLastButton(a);
  }
  if (k.a) { sfx.unlock(); menuFeel(true); hud.confirm(); }        // A: acessa o botão / muda a opção (→)
  else if (k.x) { if (hud.alt()) menuFeel(false); }                // X: muda a opção (←)
  else if (k.start) { sfx.unlock(); if (hud.focusNav('next')) menuFeel(false); } // Start: cursor no Avançar / Pronto!
  else if (k.b) { if (hud.focusNav('back')) menuFeel(false); }     // B: cursor no Voltar (na pausa: volta ao jogo)
}

// L2: liga/desliga as ajudas visuais (nota da ação, arco da trajetória e alvo no chão)
function toggleAssists() {
  settings.assists = !settings.assists;
  saveSettings();
  hud.toast(`Ajudas visuais: ${settings.assists ? 'ligadas' : 'desligadas'}`);
}

function consumeAll() {
  menuPort.consume();
  for (const p of Object.values(ports)) p.consume();
}

// 5.0: diagnóstico da CPU (Configurações → Diagnóstico da CPU): em cima de cada atleta da CPU, o que
// ela está fazendo; no canto, quadros por segundo e o relógio da partida
const dbg = { el: null, tags: [], fps: 60 };
function cpuDebug(dt) {
  const on = settings.cpuDebug && mode === 'play' && match && !match.demo;
  if (!on) { if (dbg.el) dbg.el.hidden = true; return; }
  if (!dbg.el) { dbg.el = document.createElement('div'); dbg.el.className = 'cpu-debug'; document.body.append(dbg.el); }
  dbg.el.hidden = false;
  dbg.fps = dbg.fps * 0.95 + (dt > 0 ? 1 / dt : 60) * 0.05;
  const v = new THREE.Vector3(), w = innerWidth, h = innerHeight;
  const rows = [`<div class="cd-top">${Math.round(dbg.fps)} quadros/s · partida ${(match.clock || 0).toFixed(1)} s · ${match.state}${match.tiltPause ? ' · PAUSA PARA MIRAR' : ''}</div>`];
  for (const pl of match.players) {
    if (!pl.ai) continue;
    const plan = match.cpu.plans[pl.team];
    let txt;
    if (plan && plan.receiver === pl) {
      txt = plan.react > 0 ? `reagindo ${plan.react.toFixed(2)} s` : `indo na bola · ${plan.kind}${plan.key ? ' · botão ' + plan.key : ''}${plan.zone ? ' · ' + plan.zone : ''}`;
    } else txt = match.state === 'serve' ? 'saque' : 'posição';
    if (!pl.canAct()) txt += ` · ${pl.state}`;
    const spd = Math.hypot(pl.vx || 0, pl.vz || 0).toFixed(1);
    v.set(pl.x, pl.y + 2.7, pl.z).project(camera);
    rows.push(`<div class="cd-tag" style="left:${((v.x + 1) / 2 * w).toFixed(0)}px;top:${((1 - v.y) / 2 * h).toFixed(0)}px"><b>${pl.char.name}</b> nv ${pl.level || '?'}<br>${txt}<br>vel ${spd} m/s</div>`);
  }
  dbg.el.innerHTML = rows.join('');
}
// 5.0 Teaser → MP4: na exportação o quadro é avançado à mão, com passo fixo (__rf.frameStep), e não pelo relógio
let exportMode = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!exportMode) frameStep(dt);
}
function frameStep(dt) {
  menuPort.poll();
  for (const p of Object.values(ports)) p.poll();
  const escTapped = keyboard.tapped.has('Escape');
  if (mode === 'join') joinScreen.update();
  keyboard.endFrame();

  if (mode === 'storyvs') { // tela de versus por cima do bairro
    menuInput(dt, escTapped);
    consumeAll();
    time += dt;
    hud.update(match, dt);
    renderer.render(story.street.scene, story.street.camera);
    return;
  }
  if (mode === 'story') {
    story.update(dt, time, menuPort, ports[1]);
    consumeAll();
    time += dt;
    renderer.render(story.street.scene, story.street.camera);
    return;
  }
  if (mode === 'creator') {
    creator.update(dt, time, menuPort);
    consumeAll();
    acc += dt * match.timeScale; // partida de fundo continua
    while (acc >= DT) { match.step(DT, {}); acc -= DT; }
    if (match.demo && match.state === 'over') newMatch('demo', DEFAULT_TEAMS);
  } else if (mode === 'join') {
    consumeAll();
    acc += dt * match.timeScale; // partida de fundo continua
    while (acc >= DT) { match.step(DT, {}); acc -= DT; }
    if (match.demo && match.state === 'over') newMatch('demo', DEFAULT_TEAMS);
  } else if (mode === 'select') {
    select.update(dt, time);
    consumeAll();
    acc += dt * match.timeScale; // partida de fundo continua
    while (acc >= DT) { match.step(DT, {}); acc -= DT; }
    if (match.demo && match.state === 'over') newMatch('demo', DEFAULT_TEAMS);
  } else if (mode === 'menu' || mode === 'paused') {
    menuInput(dt, escTapped);
    consumeAll();
    if (mode === 'menu') {
      // partida de fundo (demo) ou tela de fim de jogo
      acc += dt * match.timeScale;
      while (acc >= DT) { match.step(DT, {}); acc -= DT; }
      if (match.demo && match.state === 'over') { newMatch('demo', DEFAULT_TEAMS); }
    }
  } else {
    const anyPressed = a => Object.values(ports).some(p => p.pressed(a));
    if (false && TRAINING && anyPressed('L')) { // 5.0: LB é especial (LB LB); sem câmera lenta
      slowIdx = (slowIdx + 1) % SLOW_STEPS.length; // normal → 90% → 75% → 50% → normal
      hud.setSlow(slowFactor());
    }
    if (pendingToss) { const k = pendingToss; pendingToss = null; startToss(k); }
    // 5.0: ajudas visuais — LT no modo Clássico; Select em qualquer modo (no modo Novo, o LT troca o especial)
    if (Object.entries(ports).some(([n, p]) => p.pressed('sel') || (p.pressed('L2') && settings.ctrlModes[n] !== 'novo'))) toggleAssists();
    if (mode !== 'play') { /* sorteio aberto */ } else if (anyPressed('start') && match.camp && match.camp.watch) {
      consumeAll();
      campWatchEnd(true);
    } else if (anyPressed('start')) {
      mode = 'paused';
      hud.open('pause');
      consumeAll();
    } else {
      acc += dt * match.timeScale * slowFactor();
      while (acc >= DT) {
        match.step(DT, ports);
        consumeAll();
        acc -= DT;
      }
    }
  }

  for (const e of match.events) {
    if (tutorial) tutorial.onEvent(e);
    if (match.story) story.onMatchEvent(e, match);
    if (e.type === 'over' && match.story) storyOverT = 3;
    if (e.type === 'swap' && match.story && mode === 'play') openSwapBag();
    // 5.0 Exibição: a pausa técnica acontece na troca de lado (cada atleta escolhe 1 consumível; a CPU também consome)
    else if (e.type === 'swap' && !match.story && !match.demo && !match.camp && mode === 'play' && match.consumables.length) openTechPause();
    // 5.0: fim de set (melhor de 3): intervalo e depois a escolha / o sorteio do próximo set
    if (e.type === 'setOver') setBreakT = 2.6;
    // 5.0 Campeonato: a CPU pede o tempo técnico dela quando está perdendo por 3 ou mais na reta final
    if (e.type === 'point' && match.camp) {
      for (const ti of [0, 1]) {
        const t = match.teams[ti], o = match.teams[1 - ti];
        if (t.human || !(match.tempos[ti] > 0) || match.state !== 'point') continue;
        if (o.score - t.score >= 3 && o.score >= match.pointsToWin - 8) {
          match.useTempo(ti);
          const res = match.cpuConsume(ti);
          hud.toast(`TEMPO TÉCNICO · ${t.name}${res.length ? ': ' + res.join(' · ') : ''}`, 4);
        }
      }
    }
    if (e.type === 'over' && match.camp) campOverT = 2.6;
    if (teaserEv) teaserEv(e);
    hud.onEvent(e, match);
    sfx.onEvent(e);
    view.onEvent(e);
    if (e.type === 'over' && !match.demo && !match.story) mode = 'menu'; // menu de fim de jogo
  }
  match.events.length = 0;
  if (tutorial && mode === 'play') tutorial.update(dt);
  if (setBreakT > 0 && mode === 'play') {
    setBreakT -= dt;
    if (setBreakT <= 0) {
      mode = 'paused';
      // 2º set: quem perdeu o sorteio escolhe · 3º set (decisivo): novo cara ou coroa
      hud.setBreak(match, () => startToss(match.setNo + 1 >= 2 ? 'set3' : 'choice'));
    }
  }
  if (campOverT > 0) { campOverT -= dt; if (campOverT <= 0 && match.camp && match.state === 'over') campFinishMatch(); }
  if (storyCb && storyOverT > 0) { storyOverT -= dt; if (storyOverT <= 0) finishStoryMatch(match.winner === 0); }
  weatherFx.update(mode === 'paused' ? 0 : dt);
  beachLife.update(mode === 'paused' || (match && match.tiltPause) ? 0 : dt);

  const animDt = mode === 'play' ? dt * slowFactor() : dt;
  time += animDt;
  if (mode !== 'paused') {
    view.update(animDt, time);
    if (teaserCam) teaserCam(camera, animDt); // 5.0 Teaser: câmera de clipe
    arena.update(time, camera); // depois da câmera: céu e objetos que tapam a visão
  }
  hud.update(match, dt);
  cpuDebug(dt);
  if (settings.art === 'caneta') penPost.render(scene, camera, arena.root, view.root, time);
  else if (settings.art === 'pincel') brushPost.render(scene, camera, arena.root, view.root, time);
  else if (settings.art === 'colagem') collagePost.render(scene, camera, arena.root, view.root, time);
  else renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// ganchos de depuração
window.__rf = { get match() { return match; }, get mode() { return mode; }, hud, scene, camera, view, select, arena, story, finishStoryMatch: won => finishStoryMatch(won), newMatch: (...a) => newMatch(...a), renderer,
  setExportMode: on => { exportMode = !!on; }, frameStep: dt => frameStep(dt) };
