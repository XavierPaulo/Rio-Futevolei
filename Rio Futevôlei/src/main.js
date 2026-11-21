import * as THREE from 'three';
import { DT, TRAINING, SLOW_FACTOR } from './config.js';
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

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 1200); // posição: engine/camera.js

const arena = buildCopacabana(scene);
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
let mode = 'menu';    // menu | play | paused
let slowMode = false; // treino: jogo a 50% (só com TRAINING ligado)

// levels: nível de cada atleta da CPU, escolhido no cartão dele na seleção ({ time: [nível por atleta] })
function newMatch(matchMode, teamIds, levels = {}) {
  // a partida de fundo do menu usa o nível 6 para todos
  const level = 6;
  // o que cada jogador controla (time inteiro ou só o 1º atleta escolhido), escolhido antes da seleção
  const control = { 1: settings.control1, 2: settings.control2 };
  match = new Match(teamIds.map(t => t.map(id => CHARACTERS[id])), { mode: matchMode, level, control, levels });
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
  slowMode = false;
  hud.setSlow(false);
  setupPorts();
  hud.open('title');
}

hud.actions = {
  // seleção de atletas (cada jogador com o seu controle) → VS → partida
  select(matchMode) {
    sfx.unlock();
    const styles = setupPorts(matchMode);
    mode = 'select';
    select.open({
      mode: matchMode, size: settings.teamSize, control: { 1: settings.control1, 2: settings.control2 }, ports, styles, sfx,
      onDone: (teams, levels) => hud.actions.start(matchMode, teams, levels),
      onCancel: () => { setupPorts('solo'); mode = 'menu'; hud.open('title'); },
    });
  },
  start(matchMode, teamIds, levels = {}) {
    sfx.unlock();
    game = { mode: DEBUG_DEMO ? 'demo' : matchMode, teams: teamIds, levels };
    newMatch(game.mode, game.teams, game.levels);
    setupPorts();
    mode = 'play';
  },
  again() { this.start(game.mode, game.teams, game.levels); },
  resume() { setupPorts(); mode = 'play'; },
  quit() { showTitle(); },
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
      slowMode = !slowMode;
      hud.setSlow(slowMode);
    }
    if (anyPressed('L2')) toggleAssists();
    if (anyPressed('start')) {
      mode = 'paused';
      hud.open('pause');
      consumeAll();
    } else {
      acc += dt * match.timeScale * (slowMode ? SLOW_FACTOR : 1);
      while (acc >= DT) {
        match.step(DT, ports);
        consumeAll();
        acc -= DT;
      }
    }
  }

  for (const e of match.events) {
    hud.onEvent(e, match);
    sfx.onEvent(e);
    view.onEvent(e);
    if (e.type === 'over' && !match.demo) mode = 'menu'; // menu de fim de jogo
  }
  match.events.length = 0;

  const animDt = mode === 'play' && slowMode ? dt * SLOW_FACTOR : dt;
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
window.__rf = { get match() { return match; }, get mode() { return mode; }, hud, scene, camera, view, select, arena };
