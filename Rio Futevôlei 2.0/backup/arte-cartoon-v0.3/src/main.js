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

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 1200);
camera.position.set(0, 6.4, 19.5);
camera.lookAt(0, 1.5, -1.5);

const arena = buildCopacabana(scene);
const view = new Renderer(scene, camera);
const hud = new Hud();
const sfx = new Sfx();
const select = new SelectScreen(document.getElementById('hud'));

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

function newMatch(matchMode, teamIds) {
  match = new Match(teamIds.map(t => t.map(id => CHARACTERS[id])), { mode: matchMode });
  view.bind(match);
  match.begin();
}

// Monta as portas dos jogadores conforme o modo e o dispositivo de cada um.
function setupPorts(forMode) {
  const m = forMode || (match ? match.mode : game.mode);
  const a = assignSources(m === 'demo' ? 'solo' : m, { p1: settings.p1, p2: settings.p2 });
  ports = { 1: new Port(keyboard, a.p1) };
  if (a.p2) ports[2] = new Port(keyboard, a.p2);
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
      mode: matchMode, ports, styles, sfx,
      onDone: teams => hud.actions.start(matchMode, teams),
      onCancel: () => { setupPorts('solo'); mode = 'menu'; hud.open('title'); },
    });
  },
  start(matchMode, teamIds) {
    sfx.unlock();
    game = { mode: DEBUG_DEMO ? 'demo' : matchMode, teams: teamIds };
    newMatch(game.mode, game.teams);
    setupPorts();
    mode = 'play';
  },
  again() { this.start(game.mode, game.teams); },
  resume() { setupPorts(); mode = 'play'; },
  quit() { showTitle(); },
  devicesChanged() { setupPorts(); },
};

showTitle();

// Controle que o navegador não reconhece e que não tem perfil conhecido: sugere calibrar.
addEventListener('gamepadconnected', e => {
  if (padProfile(e.gamepad).source === 'desconhecido') {
    hud.toast('Controle não reconhecido: calibre em Configurações → Calibrar controle');
  }
});

// Mantém a largura da quadra visível em telas estreitas.
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const minH = THREE.MathUtils.degToRad(64);
  const vFromH = 2 * Math.atan(Math.tan(minH / 2) / camera.aspect);
  camera.fov = Math.max(36, THREE.MathUtils.radToDeg(vFromH));
  camera.updateProjectionMatrix();
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

  if (mode === 'select') {
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
    arena.update(time);
    view.update(animDt, time);
  }
  hud.update(match, dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// ganchos de depuração
window.__rf = { get match() { return match; }, get mode() { return mode; }, hud, scene, camera };
