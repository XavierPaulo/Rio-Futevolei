import { PAD_ACTIONS, padIndex } from './v5.js';

// Entrada por jogador. O teclado e os controles são lidos uma vez por quadro e
// distribuídos em "portas": cada jogador tem a sua (teclado inteiro, metade do
// teclado ou um controle), e os menus usam uma porta que aceita tudo.

// Layouts de teclado.
//   full: um jogador só no teclado (WASD ou setas, várias teclas alternativas)
//   kb1 / kb2: teclado dividido entre dois jogadores
export const LAYOUTS = {
  full: {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
    A: ['KeyJ', 'KeyZ'], B: ['KeyK', 'KeyX'], C: ['KeyL', 'KeyC', 'Space'], D: ['KeyU', 'KeyB'],
    R: ['KeyI', 'KeyV'], L: ['KeyT'], L2: ['KeyG'], R2: ['KeyO', 'KeyF'], sel: ['KeyH'],
  },
  kb1: {
    left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    A: ['KeyJ'], B: ['KeyK'], C: ['KeyL', 'Space'], D: ['KeyU'], R: ['KeyI'], L: ['KeyT'], L2: ['KeyG'], R2: ['KeyO'], sel: ['KeyH'],
  },
  kb2: {
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    A: ['Comma', 'Numpad1'], B: ['Period', 'Numpad2'], C: ['Slash', 'Numpad0'], D: ['Semicolon', 'Numpad5'],
    R: ['Quote', 'Numpad3'], L: ['Numpad7'], L2: ['Backslash', 'Numpad6'], R2: ['Numpad4', 'BracketRight'], sel: ['Numpad8'],
  },
};
// 5.0: 'esc' marca o Esc à parte (ele também é 'start'): nos menus o Esc vale como B (Voltar) e o Enter como Start
const SYSTEM = { start: ['Escape', 'KeyP'], ok: ['Enter', 'NumpadEnter'], esc: ['Escape'] };
const ACTIONS = ['left', 'right', 'up', 'down', 'A', 'B', 'C', 'D', 'R', 'L', 'L2', 'R2', 'start', 'ok', 'sel', 'esc'];

// Teclado físico (compartilhado por todas as portas).
export class Keyboard {
  constructor() {
    this.keys = new Set();
    this.tapped = new Set(); // toques mais rápidos que um quadro ainda contam
    addEventListener('keydown', e => {
      // digitando num campo de texto (nome do atleta): o jogo não lê a tecla
      if (e.target && e.target.tagName === 'INPUT') return;
      if (e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'Slash' || e.code === 'Quote') e.preventDefault();
      if (!e.repeat) { this.keys.add(e.code); this.tapped.add(e.code); }
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }
  has(code) { return this.keys.has(code) || this.tapped.has(code); }
  endFrame() { this.tapped.clear(); }
}

// Controles conectados, na ordem em que aparecem.
export function connectedPads() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  return [...pads].filter(Boolean);
}

// Todos os controles seguem o layout do Xbox (posição física):
//   face de baixo = C · direita = B · esquerda = A · de cima = D
// Índices do padrão usados no jogo: 0 baixo · 1 direita · 2 esquerda · 3 cima ·
// 4 L1 · 5 R1 · 6 L2 · 7 R2 · 8 select · 9 start · 12..15 direcional.
//
// Quando o navegador não reconhece o controle ("mapping" vazio), cada fabricante
// numera os botões de um jeito. Para garantir o padrão em qualquer marca:
//   1. mapa calibrado pelo jogador (Configurações → Calibrar controle), se houver;
//   2. perfis conhecidos (PlayStation original, chips genéricos "USB Gamepad");
//   3. senão, os números como vieram — e o jogo sugere calibrar.
const PROFILES = [
  // PlayStation original fora do padrão: □=0 ✕=1 ○=2 △=3 L1=4 R1=5 L2=6 R2=7 Share=8 Options=9
  { test: /054c|playstation|dualshock|dualsense|wireless controller/i, map: { 0: 2, 1: 0, 2: 1, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11 } },
  // Chips genéricos estilo PlayStation (Knup, "Twin USB", DragonRise...):
  // △=0 ○=1 ✕=2 □=3 L2=4 R2=5 L1=6 R1=7 Select=8 Start=9 L3=10 R3=11
  { test: /vendor: 0810|vendor: 0079|usb gamepad|twin usb|knup/i, map: { 0: 3, 1: 1, 2: 0, 3: 2, 4: 6, 5: 7, 6: 4, 7: 5, 8: 8, 9: 9, 10: 10, 11: 11 } },
];

const PAD_KEY = 'rio-futevolei.pads';
let calibrated = {};
try { calibrated = JSON.parse(localStorage.getItem(PAD_KEY) || '{}'); } catch { /* sem armazenamento */ }

export function saveCalibration(id, map) {
  calibrated[id] = map;
  try { localStorage.setItem(PAD_KEY, JSON.stringify(calibrated)); } catch { /* ignora */ }
}
export function clearCalibration(id) {
  delete calibrated[id];
  try { localStorage.setItem(PAD_KEY, JSON.stringify(calibrated)); } catch { /* ignora */ }
}

// Mapa bruto→padrão deste controle (null = já é padrão).
export function padProfile(gp) {
  if (calibrated[gp.id]) return { map: calibrated[gp.id], source: 'calibrado' };
  if (gp.mapping === 'standard') return { map: null, source: 'padrão' };
  const p = PROFILES.find(p => p.test.test(gp.id));
  return p ? { map: p.map, source: 'perfil' } : { map: null, source: 'desconhecido' };
}

// Botões brutos apertados agora (para a calibração).
export function rawPressed(gp) {
  const out = new Set();
  gp.buttons.forEach((b, i) => { if (b && (b.pressed || b.value > 0.5)) out.add(i); });
  return out;
}

export function padButtons(gp) {
  const pressed = new Set();
  const { map } = padProfile(gp);
  const raw = rawPressed(gp);
  if (map) {
    raw.forEach(i => {
      if (map[i] !== undefined) pressed.add(map[i]);
      else if (gp.mapping === 'standard' && i >= 12) pressed.add(i); // direcional de controle padrão
    });
  } else raw.forEach(i => pressed.add(i));
  if (gp.mapping !== 'standard') {
    // direcional como eixo "hat" (geralmente o último eixo): -1 = cima, sentido horário; >1 = solto
    const hat = gp.axes.length > 9 ? gp.axes[9] : null;
    if (hat !== null && hat >= -1.05 && hat <= 1.05) {
      const dir = Math.round((hat + 1) / (2 / 7)); // 0..7
      if ([7, 0, 1].includes(dir)) pressed.add(12);
      if ([1, 2, 3].includes(dir)) pressed.add(15);
      if ([3, 4, 5].includes(dir)) pressed.add(13);
      if ([5, 6, 7].includes(dir)) pressed.add(14);
    }
  }
  return pressed;
}

function readPad(gp, c, axes) {
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  if (Math.abs(ax) > 0.3) axes.x = ax;
  if (Math.abs(ay) > 0.3) axes.z = ay;
  // analógico bem inclinado também conta como direcional (menus)
  if (ax < -0.6) c.left = true;
  if (ax > 0.6) c.right = true;
  if (ay < -0.6) c.up = true;
  if (ay > 0.6) c.down = true;
  const set = padButtons(gp);
  const b = i => set.has(i);
  if (b(14)) c.left = true;
  if (b(15)) c.right = true;
  if (b(12)) c.up = true;
  if (b(13)) c.down = true;
  // 5.0: cada ação no botão escolhido no editor da Partida (aba Controle); de fábrica:
  // X ataque · B defesa · A pulo · Y carrinho · LB / RB especiais 50% · LT ajudas · RT formação · Menu pausa
  for (const a of PAD_ACTIONS) if (b(padIndex(a))) c[a] = true;
  if (b(8)) c.sel = true; // 5.0: Select (View / Share) — ajudas visuais
}

// source = { layout: 'full' | 'kb1' | 'kb2' | null, pad: 'all' | índice do controle no navegador (gp.index) | null }
//   ou { list: [sources] } — junta várias fontes (menus: todos os jogadores com dispositivo)
export class Port {
  constructor(kb, source) {
    this.kb = kb;
    this.source = source;
    this.cur = {};
    this.pressedLatch = new Set();
    this.releasedLatch = new Set();
    this.x = 0;
    this.z = 0;
  }

  poll() {
    const c = {};
    const axes = { x: 0, z: 0 };
    const pads = connectedPads();
    for (const src of this.source.list || [this.source]) {
      const map = src.layout ? LAYOUTS[src.layout] : null;
      for (const a of ACTIONS) {
        const codes = (map && map[a]) || (src.layout ? SYSTEM[a] : null) || [];
        if (codes.some(code => this.kb.has(code))) c[a] = true;
      }
      if (src.pad === 'all') pads.forEach(gp => readPad(gp, c, axes));
      else if (typeof src.pad === 'number') { const gp = pads.find(g => g.index === src.pad); if (gp) readPad(gp, c, axes); }
    }
    let x = (c.right ? 1 : 0) - (c.left ? 1 : 0) + axes.x;
    let z = (c.down ? 1 : 0) - (c.up ? 1 : 0) + axes.z;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    // sx/sz: direcional na tela (x = direita, z = baixo); x/z: direção na quadra, convertida
    // pela câmera (view) quando a porta controla um atleta
    this.sx = x;
    this.sz = z;
    const w = this.view ? this.view(x, z) : { x, z };
    this.x = w.x;
    this.z = w.z;
    for (const a of ACTIONS) {
      if (c[a] && !this.cur[a]) this.pressedLatch.add(a);
      if (!c[a] && this.cur[a]) this.releasedLatch.add(a);
    }
    this.cur = c;
  }

  down(a) { return !!this.cur[a]; }
  pressed(a) { return this.pressedLatch.has(a); }
  released(a) { return this.releasedLatch.has(a); }
  consume() { this.pressedLatch.clear(); this.releasedLatch.clear(); }

  // 5.0: padrão de controle dos menus (nomes no padrão Xbox; ações internas: A do Xbox = 'C', X = 'A')
  //   Start (ou Enter): leva o cursor ao Avançar / Pronto! · A (no teclado, a tecla de pulo): acessa o botão /
  //   muda a opção para a direita · X: muda a opção para a esquerda · B (ou Esc): leva o cursor ao Voltar ·
  //   direcional: só navega
  menu() {
    const p = a => this.pressed(a), d = a => this.down(a);
    return {
      a: p('C'), x: p('A'), b: p('B') || p('esc'), start: (p('start') && !p('esc')) || p('ok'),
      up: p('up'), down: p('down'), left: p('left'), right: p('right'),
      holdStart: (d('start') && !d('esc')) || d('ok'), // segurar Start: passa direto até o Pronto! (tempo: menuHoldTime)
    };
  }
}

// ================= 5.0: jogadores 1 a 4 =================
// Antes do menu inicial cada jogador escolhe o seu dispositivo (tela "Jogadores", src/ui/joinUI.js). O teclado é um
// dispositivo como um controle: não substitui nem é substituído por ele. Dispositivo sem jogador não conta (nem
// nos menus). Dois jogadores no teclado dividem as teclas (metade esquerda kb1 / direita kb2).
//   seats[n] = null | { kind: 'kb', half: 1 | 2 } | { kind: 'pad', index: gp.index, id: gp.id }
export const MAX_PLAYERS = 4;
export const seats = { 1: null, 2: null, 3: null, 4: null };
export const seatedPlayers = () => [1, 2, 3, 4].filter(n => seats[n]);
export function clearSeats() { for (const n of [1, 2, 3, 4]) seats[n] = null; }
const kbSeats = () => [1, 2, 3, 4].filter(n => seats[n] && seats[n].kind === 'kb');
// fonte de entrada de um jogador (null = sem dispositivo)
export function sourceOf(n) {
  const st = seats[n];
  if (!st) return null;
  if (st.kind === 'pad') return { layout: null, pad: st.index };
  return { layout: kbSeats().length > 1 ? (st.half === 2 ? 'kb2' : 'kb1') : 'full', pad: null };
}
// fonte dos menus: todos os jogadores com dispositivo (o teclado inteiro, se algum jogador estiver nele)
export function menuSource() {
  const list = seatedPlayers().map(n => seats[n].kind === 'kb' ? { layout: 'full', pad: null } : sourceOf(n));
  return { list };
}
// estilo dos ícones do jogador: teclado (full / kb1 / kb2), Xbox ou PlayStation (pelo nome do controle;
// desconhecido = fallback, escolhido em Configurações)
export function padKind(id) {
  id = (id || '').toLowerCase();
  return /xbox|xinput|045e/.test(id) ? 'xbox' : /054c|playstation|dualshock|dualsense|wireless controller/.test(id) ? 'ps' : null;
}
// 5.0: tipo de botões escolhido para cada controle (Xbox / PlayStation), lembrado pelo nome do controle
const STYLE_KEY = 'rio-futevolei.padStyles';
let padStyleMem = {};
try { padStyleMem = JSON.parse(localStorage.getItem(STYLE_KEY) || '{}') || {}; } catch { /* sem armazenamento */ }
export const padStyleFor = (id, fallback = 'xbox') => padStyleMem[id] || padKind(id) || fallback;
export function setPadStyle(n, style) {
  const st = seats[n];
  if (!st || st.kind !== 'pad' || (style !== 'xbox' && style !== 'ps')) return;
  st.style = style;
  padStyleMem[st.id] = style;
  try { localStorage.setItem(STYLE_KEY, JSON.stringify(padStyleMem)); } catch { /* ignora */ }
}
export function styleOf(n, fallback = 'ps') {
  const st = seats[n];
  if (!st) return fallback;
  if (st.kind === 'kb') return sourceOf(n).layout;
  return st.style || padStyleMem[st.id] || padKind(st.id) || fallback;
}
// teclas que fazem o teclado entrar na tela de jogadores: metade esquerda / inteiro e metade direita
export const KB_JOIN = { 1: ['Enter', 'NumpadEnter', 'Space', 'KeyL'], 2: ['Numpad0', 'Slash'] };
export const KB_LEAVE = { 1: ['Escape', 'KeyK'], 2: ['Period', 'Numpad2'] };
