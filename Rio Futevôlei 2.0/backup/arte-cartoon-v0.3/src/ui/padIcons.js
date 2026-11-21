// Ícones dos botões, sem nomes: só o símbolo de cada padrão.
// Ações lógicas → posição física:
//   A (forte) = face esquerda · B (preciso) = face direita · C (pulo) = face de baixo
//   D (carrinho) = face de cima · R = ombro direito · L = ombro esquerdo · start = menu
// Estilos: 'ps' | 'xbox' | teclado: 'full' | 'kb1' | 'kb2' (teclado dividido)

const BG = '#1d1a2b';

function svg(inner, size) {
  return `<svg class="pad-ico" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
}

const PS = {
  D: `<circle cx="12" cy="12" r="11" fill="${BG}"/><path d="M12 6.2 L17.6 16 L6.4 16 Z" fill="none" stroke="#3ddc97" stroke-width="2.2" stroke-linejoin="round"/>`,
  B: `<circle cx="12" cy="12" r="11" fill="${BG}"/><circle cx="12" cy="12" r="5.4" fill="none" stroke="#ff5b6b" stroke-width="2.2"/>`,
  C: `<circle cx="12" cy="12" r="11" fill="${BG}"/><path d="M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5" stroke="#7aa7ff" stroke-width="2.4" stroke-linecap="round"/>`,
  A: `<circle cx="12" cy="12" r="11" fill="${BG}"/><rect x="7" y="7" width="10" height="10" fill="none" stroke="#ff8fd0" stroke-width="2.2"/>`,
};

const XB_COLORS = { C: ['#5dc21e', 'A'], B: ['#e2231a', 'B'], A: ['#2d6ee0', 'X'], D: ['#f5c400', 'Y'] };
const XB = Object.fromEntries(Object.entries(XB_COLORS).map(([k, [c, letter]]) => [k,
  `<circle cx="12" cy="12" r="11" fill="${c}"/><text x="12" y="16.6" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="13" fill="${k === 'D' ? '#1d1a2b' : '#ffffff'}">${letter}</text>`]));

const SHOULDER = { ps: { R: 'R1', L: 'L1', L2: 'L2' }, xbox: { R: 'RB', L: 'LB', L2: 'LT' } };

// Tecla principal de cada ação em cada layout de teclado.
const KEYS = {
  full: { A: 'J', B: 'K', C: 'L', D: 'U', R: 'I', L: 'T', L2: 'G', start: 'Esc', move: 'WASD' },
  kb1: { A: 'J', B: 'K', C: 'L', D: 'U', R: 'I', L: 'T', L2: 'G', start: 'Esc', move: 'WASD' },
  kb2: { A: ',', B: '.', C: '/', D: ';', R: "'", L: '—', L2: '\\', start: 'Esc', move: '← ↑ ↓ →' },
};

const isKeyboard = style => style in KEYS;

export function padIcon(action, style, size = 22) {
  if (isKeyboard(style)) return `<kbd class="key-cap">${KEYS[style][action] || ''}</kbd>`;
  if (action === 'R' || action === 'L' || action === 'L2') return `<span class="pad-pill">${SHOULDER[style][action]}</span>`;
  if (action === 'start') return `<span class="pad-pill">≡</span>`;
  if (action === 'move') return `<span class="pad-pill">✥</span>`;
  const set = style === 'xbox' ? XB : PS;
  return set[action] ? svg(set[action], size) : '';
}

// Amostra de cada tipo de controle (menu de configurações), sem nomes.
export function devicePreview(device) {
  if (device === 'keyboard') {
    return `<svg class="pad-ico" width="44" height="30" viewBox="0 0 44 30" aria-hidden="true">
      <rect x="1" y="3" width="42" height="24" rx="4" fill="${BG}" stroke="#fff" stroke-opacity="0.55" stroke-width="1.5"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${5 + i * 6}" y="7" width="4.5" height="4.5" rx="1" fill="#fff" fill-opacity="0.8"/>`).join('')}
      ${[0, 1, 2, 3, 4].map(i => `<rect x="${8 + i * 6}" y="13" width="4.5" height="4.5" rx="1" fill="#fff" fill-opacity="0.8"/>`).join('')}
      <rect x="11" y="20" width="22" height="4" rx="1" fill="#fff" fill-opacity="0.8"/></svg>`;
  }
  return ['D', 'A', 'B', 'C'].map(a => padIcon(a, device, 28)).join('');
}
