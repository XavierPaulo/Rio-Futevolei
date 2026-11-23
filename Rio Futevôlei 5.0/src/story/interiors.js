// 4.0 Modo História — o interior de cada lugar (fundo da tela enquanto o menu dele está aberto).
// Desenhado à mão em canvas, uma vez por lugar (fica em cache como imagem).
import { troca, arteUrl } from '../art/artes.js'; // 5.0: interiores enviados no editor de artes
const W = 1280, H = 720;
const cache = {};

const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const round = (g, x, y, w, h, r, c) => { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
const circ = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
const text = (g, s, x, y, size, c, align = 'center') => { g.fillStyle = c; g.font = `900 ${size}px Nunito, sans-serif`; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); };
const emoji = (g, s, x, y, size) => { g.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); };

// parede, rodapé e piso em perspectiva
function room(g, wall, floor, stripe) {
  rect(g, 0, 0, W, H, wall);
  if (stripe) for (let x = 0; x < W; x += 80) rect(g, x, 0, 40, H * 0.62, stripe);
  rect(g, 0, H * 0.62, W, H * 0.38, floor);
  g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 3;
  for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(W / 2 + i * 60, H * 0.62); g.lineTo(W / 2 + i * 220, H); g.stroke(); }
  for (let y = H * 0.68; y < H; y += (y - H * 0.55) * 0.35) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  rect(g, 0, H * 0.6, W, 16, 'rgba(0,0,0,0.25)');
}
function shelf(g, x, y, w, items, size = 46) {
  rect(g, x, y + size * 0.6, w, 12, '#8a5a2b');
  const step = w / items.length;
  items.forEach((it, i) => emoji(g, it, x + step * (i + 0.5), y + size * 0.15, size));
}
function windowView(g, x, y, w, h) {
  rect(g, x, y, w, h, '#8fd3ff');
  rect(g, x, y + h * 0.65, w, h * 0.35, '#3fa3d6');
  rect(g, x, y + h * 0.82, w, h * 0.18, '#ecd9a6');
  g.strokeStyle = '#f5f1e8'; g.lineWidth = 12; g.strokeRect(x, y, w, h);
  g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();
}

const DRAW = {
  lanchonete(g) {
    room(g, '#ffe7a3', '#c96f4a', '#ffdd85');
    // quadro do cardápio
    round(g, 340, 60, 600, 230, 18, '#2a2a2a');
    text(g, 'CARDÁPIO', 640, 105, 44, '#ffd21a');
    ['Mate gelado', 'Suco natural', 'Brownie', 'Sanduíche natural'].forEach((s, i) => text(g, s, 420, 155 + i * 34, 28, '#ffffff', 'left'));
    // balcão
    round(g, 120, 360, 1040, 120, 16, '#e8281f');
    rect(g, 120, 360, 1040, 26, '#ffffff');
    emoji(g, '🧉', 300, 330, 70); emoji(g, '🧃', 450, 330, 64); emoji(g, '🍫', 640, 335, 58); emoji(g, '🥪', 830, 330, 66); emoji(g, '🍹', 990, 330, 62);
    // banquinhos
    for (const x of [260, 520, 780, 1040]) { rect(g, x - 8, 480, 16, 140, '#555'); circ(g, x, 480, 40, '#1fbf6a'); }
    windowView(g, 40, 70, 230, 200); windowView(g, 1010, 70, 230, 200);
  },
  moda(g) {
    room(g, '#fbe3ef', '#d9c3a5', null);
    // araras de roupas
    for (const [x, cols] of [[150, ['#9b5cff', '#ff5fa2', '#ffffff', '#1d5cff']], [760, ['#1fbf6a', '#ffcf2e', '#e8281f', '#1d1a22']]]) {
      rect(g, x, 160, 380, 10, '#777'); rect(g, x, 160, 10, 300, '#777'); rect(g, x + 370, 160, 10, 300, '#777');
      cols.forEach((c, i) => { round(g, x + 30 + i * 85, 175, 70, 120, 14, c); rect(g, x + 55 + i * 85, 165, 20, 18, '#777'); });
    }
    // espelho
    round(g, 560, 90, 160, 340, 80, '#c9e8f5'); g.strokeStyle = '#d4a017'; g.lineWidth = 12; g.beginPath(); g.roundRect(560, 90, 160, 340, 80); g.stroke();
    shelf(g, 140, 470, 400, ['🕶️', '👒', '🧢', '💍']);
    shelf(g, 760, 470, 380, ['👙', '🩳', '👕', '👜']);
    text(g, 'MODA PRAIA', 640, 60, 46, '#9b5cff');
  },
  loterica(g) {
    room(g, '#d6f2c6', '#a8a8a0', '#c8ecb4');
    round(g, 280, 70, 720, 200, 18, '#1fbf6a');
    text(g, 'LOTERIA DOS LEGUMES', 640, 115, 46, '#ffffff');
    text(g, '25 grupos · 5 números · acerte os 2 grupos e ganhe 10×', 640, 175, 26, '#eaffea');
    emoji(g, '🥕', 380, 230, 46); emoji(g, '🥬', 500, 230, 46); emoji(g, '🍅', 620, 230, 46); emoji(g, '🌽', 740, 230, 46); emoji(g, '🥔', 860, 230, 46);
    // guichês
    for (const x of [180, 520, 860]) { round(g, x, 330, 240, 200, 14, '#ffffff'); rect(g, x + 20, 350, 200, 110, '#bfe8ff'); text(g, 'CAIXA', x + 120, 500, 28, '#1fbf6a'); }
    // previsão do tempo
    round(g, 40, 300, 110, 150, 14, '#1d5cff'); emoji(g, '⛅', 95, 350, 52); text(g, 'AMANHÃ', 95, 420, 18, '#fff');
  },
  spa(g) {
    room(g, '#d9eef5', '#e8dcc8', null);
    // maca, toalhas e velas
    round(g, 380, 400, 520, 70, 30, '#ffffff'); rect(g, 420, 470, 20, 120, '#b8a07a'); rect(g, 840, 470, 20, 120, '#b8a07a');
    round(g, 420, 380, 180, 40, 18, '#9fd4c7');
    emoji(g, '🪴', 160, 420, 150); emoji(g, '🪴', 1130, 420, 150);
    emoji(g, '🕯️', 470, 330, 48); emoji(g, '🕯️', 560, 340, 40); emoji(g, '🧴', 720, 335, 50); emoji(g, '🌸', 820, 340, 46);
    // quadro de pedras
    round(g, 470, 80, 340, 190, 16, '#f5f1e8');
    circ(g, 640, 210, 50, '#7a7a7a'); circ(g, 640, 150, 36, '#999'); circ(g, 640, 108, 24, '#bbb');
    text(g, 'SPA', 640, 50, 40, '#1d5cff');
  },
  farmacia(g) {
    room(g, '#ffffff', '#cfd8dc', '#f1f8f3');
    // cruz verde
    rect(g, 600, 50, 80, 220, '#1fbf6a'); rect(g, 530, 120, 220, 80, '#1fbf6a');
    // prateleiras
    for (const [x, items] of [[60, ['🧴', '💊', '🩹', '🧴']], [880, ['💊', '🧪', '🩺', '💊']]]) {
      for (let r = 0; r < 3; r++) shelf(g, x, 90 + r * 120, 340, items, 44);
    }
    round(g, 320, 390, 640, 110, 14, '#1fbf6a'); rect(g, 320, 390, 640, 22, '#ffffff');
    emoji(g, '☀️', 480, 360, 48); emoji(g, '💉', 640, 360, 46); emoji(g, '🍵', 800, 360, 48);
    text(g, 'Protetor · Anestésico · Tônico', 640, 460, 30, '#ffffff');
  },
  esportes(g) {
    room(g, '#e3ecff', '#7fb069', null);
    text(g, 'ARTIGOS ESPORTIVOS', 640, 60, 46, '#1d5cff');
    for (let r = 0; r < 2; r++) shelf(g, 80, 120 + r * 150, 520, r ? ['🧢', '🧦', '🦶', '🥤'] : ['⚽', '🏐', '⚽', '🏐'], 58);
    for (let r = 0; r < 2; r++) shelf(g, 680, 120 + r * 150, 520, r ? ['🕶️', '👟', '🎒', '🧴'] : ['🥅', '👟', '🎽', '🏅'], 58);
    round(g, 420, 430, 440, 100, 14, '#1d5cff'); text(g, 'Viseira · Meias · Tornozeleira', 640, 480, 28, '#fff');
  },
  academia(g) {
    room(g, '#3a3a46', '#2a2a2a', '#44444f');
    text(g, 'ACADEMIA', 640, 60, 52, '#ffd21a');
    // halteres e esteira
    for (const x of [180, 330]) { rect(g, x - 50, 380, 100, 14, '#999'); circ(g, x - 55, 387, 28, '#222'); circ(g, x + 55, 387, 28, '#222'); }
    round(g, 520, 360, 300, 60, 10, '#555'); rect(g, 780, 230, 16, 140, '#777'); round(g, 740, 210, 90, 40, 8, '#1d5cff');
    emoji(g, '🏋️', 1020, 360, 140);
    // espelho com reflexo
    round(g, 400, 110, 480, 200, 10, '#7f8fa6');
    emoji(g, '💪', 640, 210, 90);
    shelf(g, 60, 480, 300, ['🥤', '🍌', '🥤'], 44);
  },
  casa(g) {
    room(g, '#f6d9c3', '#b47a4e', null);
    windowView(g, 470, 70, 340, 220);
    // cama, sofá e prateleira de troféus
    round(g, 80, 380, 420, 120, 20, '#9b5cff'); round(g, 80, 350, 140, 60, 20, '#ffffff');
    round(g, 820, 380, 380, 110, 30, '#1fbf6a');
    shelf(g, 860, 230, 320, ['🏆', '🏐', '📷'], 50);
    emoji(g, '🛏️', 290, 300, 90); emoji(g, '🐱', 1000, 350, 54);
  },
  ct(g) {
    rect(g, 0, 0, W, H * 0.45, '#8fd3ff');
    rect(g, 0, H * 0.45, W, H * 0.12, '#3fa3d6');
    rect(g, 0, H * 0.57, W, H * 0.43, '#ecd9a6');
    // quadra e rede
    g.strokeStyle = '#ffffff'; g.lineWidth = 8;
    g.beginPath(); g.moveTo(140, 640); g.lineTo(380, 470); g.lineTo(900, 470); g.lineTo(1140, 640); g.closePath(); g.stroke();
    rect(g, 636, 330, 10, 230, '#1fbf6a');
    g.strokeStyle = '#1d1a22'; g.lineWidth = 2;
    for (let y = 340; y < 420; y += 12) { g.beginPath(); g.moveTo(400, y); g.lineTo(880, y); g.stroke(); }
    rect(g, 400, 330, 480, 10, '#ffffff');
    circ(g, 1050, 200, 70, '#e8281f'); text(g, 'CT', 1050, 202, 60, '#ffffff');
    emoji(g, '🏐', 300, 560, 60);
  },
};

export const INTERIOR_KINDS = Object.keys(DRAW);
export function interior(kind) {
  if (!DRAW[kind]) return null;
  const t = troca(`cenarios/interiores/${kind}`);
  if (t) return arteUrl(t.arquivo);
  if (!cache[kind]) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    DRAW[kind](c.getContext('2d'));
    cache[kind] = c.toDataURL('image/jpeg', 0.85);
  }
  return cache[kind];
}
