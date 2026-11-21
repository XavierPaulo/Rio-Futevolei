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
    R: ['KeyI', 'KeyV'], L: ['KeyT'], L2: ['KeyG'],
  },
  kb1: {
    left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    A: ['KeyJ'], B: ['KeyK'], C: ['KeyL', 'Space'], D: ['KeyU'], R: ['KeyI'], L: ['KeyT'], L2: ['KeyG'],
  },
  kb2: {
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    A: ['Comma', 'Numpad1'], B: ['Period', 'Numpad2'], C: ['Slash', 'Numpad0'], D: ['Semicolon', 'Numpad5'],
    R: ['Quote', 'Numpad3'], L: [], L2: ['Backslash', 'Numpad6'],
  },
};
const SYSTEM = { start: ['Escape', 'KeyP'], ok: ['Enter', 'NumpadEnter'] };
const ACTIONS = ['left', 'right', 'up', 'down', 'A', 'B', 'C', 'D', 'R', 'L', 'L2', 'start', 'ok'];

// Teclado físico (compartilhado por todas as portas).
export class Keyboard {
  constructor() {
    this.keys = new Set();
    this.tapped = new Set(); // toques mais rápidos que um quadro ainda contam
    addEventListener('keydown', e => {
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
  if (b(6)) c.L2 = true;  // L2 / LT: liga/desliga ajudas visuais
  if (b(2)) c.A = true;   // face esquerda (□ / X)
  if (b(1)) c.B = true;   // face direita (○ / B)
  if (b(0)) c.C = true;   // face de baixo (✕ / A)
  if (b(3)) c.D = true;   // face de cima (△ / Y)
  if (b(5)) c.R = true;   // R1 / RB
  if (b(4)) c.L = true;   // L1 / LB
  if (b(9)) c.start = true;
}

// source = { layout: 'full' | 'kb1' | 'kb2' | null, pad: 'all' | número do controle | null }
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
    const map = this.source.layout ? LAYOUTS[this.source.layout] : null;
    for (const a of ACTIONS) {
      const codes = (map && map[a]) || (this.source.layout ? SYSTEM[a] : null) || [];
      c[a] = codes.some(code => this.kb.has(code));
    }
    const axes = { x: 0, z: 0 };
    const pads = connectedPads();
    if (this.source.pad === 'all') pads.forEach(gp => readPad(gp, c, axes));
    else if (typeof this.source.pad === 'number' && pads[this.source.pad]) readPad(pads[this.source.pad], c, axes);
    let x = (c.right ? 1 : 0) - (c.left ? 1 : 0) + axes.x;
    let z = (c.down ? 1 : 0) - (c.up ? 1 : 0) + axes.z;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    this.x = x;
    this.z = z;
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
}

// Distribui teclado e controles entre os jogadores conforme o modo e o dispositivo
// escolhido por cada um nas configurações ('ps' | 'xbox' = controle, 'keyboard' = teclado).
// Retorna as fontes e o estilo de ícones de cada jogador.
export function assignSources(mode, devices) {
  if (mode !== 'versus' && mode !== 'coop') {
    const style = devices.p1 === 'keyboard' ? 'full' : devices.p1;
    return { p1: { layout: 'full', pad: 'all' }, p2: null, styles: { p1: style, p2: style } };
  }
  const kb1 = devices.p1 === 'keyboard', kb2 = devices.p2 === 'keyboard';
  let nextPad = 0;
  const p1 = kb1 ? { layout: kb2 ? 'kb1' : 'full', pad: null } : { layout: kb2 ? null : 'full', pad: nextPad++ };
  const p2 = kb2 ? { layout: kb1 ? 'kb2' : 'full', pad: null } : { layout: null, pad: nextPad++ };
  return {
    p1, p2,
    styles: { p1: kb1 ? p1.layout : devices.p1, p2: kb2 ? p2.layout : devices.p2 },
  };
}
