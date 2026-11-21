import * as THREE from 'three';
import { DT, TRAINING, SLOW_STEPS } from './config.js';
import { Keyboard, Port, assignSources, padProfile } from './input.js';
import { Match } from './match.js';
import { buildCopacabana } from './scene/copacabana.js';
import { Renderer } from './render.js';
import { Hud } from './hud.js';
import { Sfx } from './audio.js';
import { CHARACTERS } from './art/characters.js';
import { settings, saveSettings } from './ui/settings.js';
import { SelectScreen } from './ui/select.js';
import { PenPost, brushFrag } from './scene/penPost.js';
import { CreatorScreen } from './ui/creator.js';
import './art/custom.js'; // registra os atletas criados antes de qualquer tela
import { listenEditor } from './engine/liveEdit.js';
import { buildWeather } from './scene/weather.js';
import { buildBeachLife } from './scene/beachLife.js';
import { weatherOf, WEATHER, consume, CONSUMABLE_IDS } from './condition.js';
import { Tutorial } from './tutorial.js';
import { StoryMode } from './story/story.js';
import { newSave, readSave, writeSave } from './story/save.js';

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

// Estilo artístico: 'caneta' e 'pincel' passam o cenário por um efeito de desenho à mão.
function applyArtStyle() {
  document.body.classList.toggle('art-caneta', settings.art === 'caneta');
  document.body.classList.toggle('art-pincel', settings.art === 'pincel');
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
const menuPort = new Port(keyboard, { layout: 'full', pad: 'all' });
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
  match = new Match(teamIds.map(t => t.map(id => CHARACTERS[id])), { mode: matchMode, level, control, levels, tilt: true, ...opts, tiltSpecials: opts.tiltSpecials || {} });
  hud.match = match;
  weatherFx.set(match.weather);
  arena.setHood(opts.arena || 'copacabana'); // paisagem do bairro da partida
  match.screenToWorld = (x, z) => view.rig.toWorld(x, z); // Kids Mode: as metades seguem a câmera
  arena.ads.reshuffle(); // cada partida tem só 5 marcas, sorteadas agora
  view.bind(match);
  match.begin();
}

// Monta as portas dos jogadores conforme o modo e o dispositivo de cada um.
function setupPorts(forMode) {
  const m = forMode || (match ? match.mode : game.mode);
  const a = assignSources(m === 'demo' ? 'solo' : m, { p1: settings.p1, p2: settings.p2 });
  ports = { 1: new Port(keyboard, a.p1) };
  if (a.p2) ports[2] = new Port(keyboard, a.p2);
  // o direcional é relativo à tela: a câmera diz para onde "cima/direita" apontam na quadra
  for (const p of Object.values(ports)) p.view = (x, z) => view.rig.toWorld(x, z);
  hud.setStyles(a.styles);
  return { 1: a.styles.p1, 2: a.styles.p2 || a.styles.p1 };
}

function showTitle() {
  newMatch('demo', DEFAULT_TEAMS); // no fundo, a CPU joga contra ela mesma
  mode = 'menu';
  slowIdx = 0;
  hud.setSlow(1);
  setupPorts();
  hud.open('title');
}

hud.actions = {
  // seleção de atletas (cada jogador com o seu controle) → VS → partida
  select(matchMode, variant = null) {
    sfx.unlock();
    const styles = setupPorts(matchMode);
    mode = 'select';
    select.open({
      mode: matchMode, size: settings.teamSize, control: { 1: settings.control1, 2: settings.control2 }, ports, styles, sfx,
      tilt: true, // cada atleta escolhe o especial de ataque e o de defesa
      onDone: (teams, levels, tiltSpecials) => hud.actions.start(matchMode, teams, levels, variant, tiltSpecials),
      onCancel: () => { setupPorts('solo'); mode = 'menu'; hud.open('title'); },
    });
  },
  start(matchMode, teamIds, levels = {}, variant = null, tiltSpecials = null) {
    sfx.unlock();
    document.getElementById('hud').classList.remove('story-on');
    game = { mode: DEBUG_DEMO ? 'demo' : matchMode, teams: teamIds, levels, variant, tiltSpecials };
    // Modo Exibição: pontos, clima (o aleatório é sorteado a cada partida) e consumíveis das pausas
    const exh = variant === 'exh' ? { arena: settings.exhArena, pointsToWin: settings.exhPoints, weather: weatherOf(settings.exhWeather), drain: true, timeouts: 2, consumables: settings.exhItems.filter(k => CONSUMABLE_IDS.includes(k)) } : {};
    newMatch(game.mode, game.teams, game.levels, { tiltSpecials, ...exh });
    setupPorts();
    mode = 'play';
    {
      const [a, b, c, d] = ['A', 'B', 'C', 'D'].map(k => hud.ico(k));
      const wx = match.weather.length ? ` · CLIMA: ${match.weather.map(k => WEATHER[k].icon + ' ' + WEATHER[k].name).join(' e ')}` : '';
      hud.toast(`ATÉ ${match.pointsToWin} PONTOS${wx} · segure ${a} bola rápida ou ${b} bola precisa (no ar: ${a} cortada 45°, ${b} no parceiro) · a bola na hitbox para o tempo · o direcional aponta a seta · solte para bater · ${c} pulo · ${d} carrinho · barra cheia: ${a}${a} especial de ataque, ${b}${b} de defesa`, 8);
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
  again() { this.start(game.mode, game.teams, game.levels, game.variant, game.tiltSpecials); },
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
      onClose: () => { mode = 'menu'; hud.open('title'); hud.push('creators'); },
    });
  },
  devicesChanged() { setupPorts(); },
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

// No itch.io o jogo roda dentro de um quadro (iframe): o primeiro clique traz o teclado para o jogo.
addEventListener('pointerdown', () => { window.focus(); sfx.unlock(); });

// Controle que o navegador não reconhece e que não tem perfil conhecido: sugere calibrar.
addEventListener('gamepadconnected', e => {
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
  view.rig.setAspect(w / h);
  if (story.street) story.street.setAspect(w / h);
}
addEventListener('resize', resize);
resize();

let last = performance.now();
let acc = 0;
let time = 0;

function menuInput(dt, escTapped) {
  const p = menuPort;
  // calibrando: os botões do controle são lidos crus pela HUD; só o Esc do teclado cancela
  if (hud.screen === 'calibrate') {
    hud.calibTick(dt);
    if (escTapped) hud.activate('calib-cancel');
    return;
  }
  if (p.pressed('up')) hud.move(-1);
  else if (p.pressed('down')) hud.move(1);
  if (p.pressed('left')) hud.change(-1);
  else if (p.pressed('right')) hud.change(1);
  // teste do controle na tela de configurações
  if (hud.screen === 'settings') {
    const a = ['A', 'B', 'C', 'D', 'R', 'L', 'L2', 'start'].find(k => p.pressed(k));
    if (a) hud.setLastButton(a);
  }
  if (p.pressed('ok') || p.pressed('C')) { sfx.unlock(); hud.confirm(); }
  else if (p.pressed('start') || p.pressed('B')) hud.back();
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

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  menuPort.poll();
  for (const p of Object.values(ports)) p.poll();
  const escTapped = keyboard.tapped.has('Escape');
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
    if (TRAINING && anyPressed('L')) {
      slowIdx = (slowIdx + 1) % SLOW_STEPS.length; // normal → 90% → 75% → 50% → normal
      hud.setSlow(slowFactor());
    }
    if (anyPressed('L2')) toggleAssists();
    if (anyPressed('start')) {
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
    hud.onEvent(e, match);
    sfx.onEvent(e);
    view.onEvent(e);
    if (e.type === 'over' && !match.demo && !match.story) mode = 'menu'; // menu de fim de jogo
  }
  match.events.length = 0;
  if (tutorial && mode === 'play') tutorial.update(dt);
  if (storyCb && storyOverT > 0) { storyOverT -= dt; if (storyOverT <= 0) finishStoryMatch(match.winner === 0); }
  weatherFx.update(mode === 'paused' ? 0 : dt);
  beachLife.update(mode === 'paused' || (match && match.tiltPause) ? 0 : dt);

  const animDt = mode === 'play' ? dt * slowFactor() : dt;
  time += animDt;
  if (mode !== 'paused') {
    view.update(animDt, time);
    arena.update(time, camera); // depois da câmera: céu e objetos que tapam a visão
  }
  hud.update(match, dt);
  if (settings.art === 'caneta') penPost.render(scene, camera, arena.root, view.root, time);
  else if (settings.art === 'pincel') brushPost.render(scene, camera, arena.root, view.root, time);
  else renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// ganchos de depuração
window.__rf = { get match() { return match; }, get mode() { return mode; }, hud, scene, camera, view, select, arena, story, finishStoryMatch: won => finishStoryMatch(won) };
