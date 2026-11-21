// Logos das marcas patrocinadoras, desenhados à mão no canvas (estilo adesivo: cor chapada e
// contorno grosso, como os atletas). Cada desenho ocupa um quadrado de lado s, a partir de (0, 0).
// Registrados por id em LOGOS: a marca diz qual usar (src/data/brands.js → logo).
// Também desenha a placa de publicidade, a faixa do avião e a bandeira com logo + nome.

const INK = '#1a1622';
const TAU = Math.PI * 2;

function outline(g, s, k = 0.035) { g.lineWidth = s * k; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round'; }
function fillStroke(g, fill, s, k) { g.fillStyle = fill; g.fill(); outline(g, s, k); g.stroke(); }
function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }

export const LOGOS = {
  // SunBurn: pessoa com marca de sol (marca branca da alça da regata na pele vermelha) e o sol
  sunburn(g, s) {
    // sol atrás
    g.save(); g.translate(s * 0.7, s * 0.3);
    g.fillStyle = '#ffd21a';
    for (let i = 0; i < 12; i++) {
      g.rotate(TAU / 12);
      g.beginPath(); g.moveTo(-s * 0.04, -s * 0.2); g.lineTo(0, -s * 0.3); g.lineTo(s * 0.04, -s * 0.2); g.closePath(); g.fill();
    }
    circle(g, 0, 0, s * 0.17); fillStroke(g, '#ffd21a', s, 0.03);
    g.restore();
    // tronco (ombros e peito) com a pele queimada
    g.beginPath();
    g.moveTo(s * 0.12, s * 0.95);
    g.quadraticCurveTo(s * 0.1, s * 0.58, s * 0.3, s * 0.55);
    g.lineTo(s * 0.58, s * 0.55);
    g.quadraticCurveTo(s * 0.78, s * 0.58, s * 0.76, s * 0.95);
    g.closePath();
    fillStroke(g, '#ff5a3c', s);
    // marca de sol: alças brancas da regata
    g.save(); g.clip();
    g.fillStyle = '#ffe9d6';
    for (const x of [0.3, 0.58]) {
      g.beginPath(); g.moveTo(s * (x - 0.035), s * 0.5); g.lineTo(s * (x + 0.035), s * 0.5); g.lineTo(s * (x + 0.06 * (x < 0.4 ? 1 : -1) + 0.03), s * 0.98); g.lineTo(s * (x + 0.06 * (x < 0.4 ? 1 : -1) - 0.03), s * 0.98); g.closePath(); g.fill();
    }
    g.beginPath(); g.moveTo(s * 0.33, s * 0.72); g.quadraticCurveTo(s * 0.44, s * 0.86, s * 0.55, s * 0.72); g.lineTo(s * 0.55, s * 0.98); g.lineTo(s * 0.33, s * 0.98); g.closePath(); g.fill();
    g.restore();
    g.beginPath();
    g.moveTo(s * 0.12, s * 0.95); g.quadraticCurveTo(s * 0.1, s * 0.58, s * 0.3, s * 0.55); g.lineTo(s * 0.58, s * 0.55); g.quadraticCurveTo(s * 0.78, s * 0.58, s * 0.76, s * 0.95);
    outline(g, s); g.stroke();
    // cabeça (vermelha) com rosto
    circle(g, s * 0.44, s * 0.36, s * 0.16); fillStroke(g, '#ff6b4a', s);
    g.fillStyle = INK;
    circle(g, s * 0.39, s * 0.35, s * 0.018); g.fill(); circle(g, s * 0.5, s * 0.35, s * 0.018); g.fill();
    g.beginPath(); g.arc(s * 0.445, s * 0.41, s * 0.045, 0.2, Math.PI - 0.2); outline(g, s, 0.02); g.stroke();
    // nariz descascando
    g.fillStyle = '#fff'; circle(g, s * 0.445, s * 0.385, s * 0.012); g.fill();
  },

  // AraBom: camelinho
  camelinho(g, s) {
    const c = '#d9a35b', d = '#b98340';
    // pernas
    for (const x of [0.3, 0.42, 0.6, 0.72]) {
      g.beginPath(); g.moveTo(s * x, s * 0.6); g.lineTo(s * x, s * 0.9);
      outline(g, s, 0.075); g.stroke(); g.strokeStyle = x < 0.5 ? d : c; g.lineWidth = s * 0.045; g.stroke();
    }
    // corpo com duas corcovas
    g.beginPath();
    g.moveTo(s * 0.22, s * 0.62);
    g.quadraticCurveTo(s * 0.22, s * 0.48, s * 0.32, s * 0.46);
    g.quadraticCurveTo(s * 0.38, s * 0.26, s * 0.46, s * 0.44);
    g.quadraticCurveTo(s * 0.54, s * 0.26, s * 0.62, s * 0.44);
    g.quadraticCurveTo(s * 0.8, s * 0.46, s * 0.8, s * 0.62);
    g.quadraticCurveTo(s * 0.5, s * 0.72, s * 0.22, s * 0.62);
    g.closePath();
    fillStroke(g, c, s);
    // pescoço e cabeça
    g.beginPath();
    g.moveTo(s * 0.74, s * 0.5);
    g.quadraticCurveTo(s * 0.86, s * 0.42, s * 0.82, s * 0.24);
    g.lineTo(s * 0.92, s * 0.24);
    g.quadraticCurveTo(s * 0.98, s * 0.28, s * 0.94, s * 0.33);
    g.lineTo(s * 0.88, s * 0.33);
    g.quadraticCurveTo(s * 0.9, s * 0.48, s * 0.8, s * 0.58);
    g.closePath();
    fillStroke(g, c, s);
    circle(g, s * 0.84, s * 0.21, s * 0.035); fillStroke(g, d, s, 0.025); // orelha
    g.fillStyle = INK; circle(g, s * 0.89, s * 0.27, s * 0.015); g.fill(); // olho
    // rabinho e manta
    g.beginPath(); g.moveTo(s * 0.22, s * 0.56); g.quadraticCurveTo(s * 0.12, s * 0.6, s * 0.15, s * 0.7); outline(g, s, 0.03); g.stroke();
    g.beginPath(); g.moveTo(s * 0.4, s * 0.5); g.lineTo(s * 0.56, s * 0.5); g.lineTo(s * 0.58, s * 0.62); g.lineTo(s * 0.38, s * 0.62); g.closePath();
    fillStroke(g, '#b3261e', s, 0.025);
    g.fillStyle = '#ffd21a'; for (const x of [0.42, 0.48, 0.54]) { circle(g, s * x, s * 0.56, s * 0.012); g.fill(); }
  },

  // Calango Lindo: lagartixa cor de abóbora de óculos de sol verde-musgo
  lagartixa(g, s) {
    const c = '#ff8a1f', moss = '#5f6e2c';
    // rabo enrolado
    g.beginPath();
    g.moveTo(s * 0.5, s * 0.66);
    g.bezierCurveTo(s * 0.5, s * 0.92, s * 0.2, s * 0.95, s * 0.2, s * 0.78);
    g.bezierCurveTo(s * 0.2, s * 0.68, s * 0.32, s * 0.7, s * 0.3, s * 0.78);
    outline(g, s, 0.11); g.stroke(); g.strokeStyle = c; g.lineWidth = s * 0.07; g.stroke();
    // patas (com dedinhos)
    const leg = (x0, y0, x1, y1) => {
      g.beginPath(); g.moveTo(s * x0, s * y0); g.lineTo(s * x1, s * y1);
      outline(g, s, 0.08); g.stroke(); g.strokeStyle = c; g.lineWidth = s * 0.045; g.stroke();
      circle(g, s * x1, s * y1, s * 0.035); fillStroke(g, c, s, 0.025);
    };
    leg(0.42, 0.42, 0.25, 0.32); leg(0.58, 0.42, 0.75, 0.32); leg(0.43, 0.6, 0.27, 0.68); leg(0.57, 0.6, 0.73, 0.68);
    // corpo
    g.beginPath(); g.ellipse(s * 0.5, s * 0.52, s * 0.11, s * 0.2, 0, 0, TAU); fillStroke(g, c, s);
    g.fillStyle = '#ffb35c'; for (const y of [0.45, 0.53, 0.61]) { circle(g, s * 0.5, s * y, s * 0.022); g.fill(); }
    // cabeça
    g.beginPath(); g.ellipse(s * 0.5, s * 0.25, s * 0.15, s * 0.12, 0, 0, TAU); fillStroke(g, c, s);
    // óculos verde-musgo
    for (const x of [0.43, 0.57]) { g.beginPath(); g.ellipse(s * x, s * 0.23, s * 0.065, s * 0.05, 0, 0, TAU); fillStroke(g, moss, s, 0.025); }
    g.beginPath(); g.moveTo(s * 0.48, s * 0.22); g.lineTo(s * 0.52, s * 0.22); outline(g, s, 0.025); g.stroke();
    g.fillStyle = 'rgba(220,255,190,0.7)'; g.beginPath(); g.ellipse(s * 0.415, s * 0.215, s * 0.02, s * 0.01, -0.4, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(s * 0.555, s * 0.215, s * 0.02, s * 0.01, -0.4, 0, TAU); g.fill();
    // sorriso
    g.beginPath(); g.arc(s * 0.5, s * 0.27, s * 0.06, 0.4, Math.PI - 0.4); outline(g, s, 0.02); g.stroke();
  },

  // Chimamate: cuia com a bomba
  cuia(g, s) {
    // bomba (canudo de metal)
    g.beginPath(); g.moveTo(s * 0.48, s * 0.5); g.lineTo(s * 0.72, s * 0.1);
    outline(g, s, 0.075); g.stroke(); g.strokeStyle = '#d6dbe3'; g.lineWidth = s * 0.04; g.stroke();
    g.beginPath(); g.moveTo(s * 0.7, s * 0.12); g.lineTo(s * 0.8, s * 0.08); outline(g, s, 0.06); g.stroke(); g.strokeStyle = '#ffd21a'; g.lineWidth = s * 0.03; g.stroke();
    // erva
    g.beginPath(); g.ellipse(s * 0.45, s * 0.42, s * 0.25, s * 0.07, 0, 0, TAU); fillStroke(g, '#5c9e2e', s);
    // cuia (cabaça)
    g.beginPath();
    g.moveTo(s * 0.2, s * 0.42);
    g.bezierCurveTo(s * 0.12, s * 0.62, s * 0.22, s * 0.92, s * 0.45, s * 0.92);
    g.bezierCurveTo(s * 0.68, s * 0.92, s * 0.78, s * 0.62, s * 0.7, s * 0.42);
    g.quadraticCurveTo(s * 0.45, s * 0.52, s * 0.2, s * 0.42);
    g.closePath();
    fillStroke(g, '#8a5a2b', s);
    // anel de metal e brilho
    g.beginPath(); g.moveTo(s * 0.19, s * 0.47); g.quadraticCurveTo(s * 0.45, s * 0.58, s * 0.71, s * 0.47);
    outline(g, s, 0.07); g.stroke(); g.strokeStyle = '#d6dbe3'; g.lineWidth = s * 0.035; g.stroke();
    g.beginPath(); g.ellipse(s * 0.3, s * 0.7, s * 0.03, s * 0.08, 0.3, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
  },

  // Angra: duas gotas formando uma ampulheta (uma de ponta para baixo em cima, outra de ponta para cima embaixo)
  gotas(g, s) {
    const drop = (cy, dir, fill) => {
      // dir = 1: ponta para baixo · -1: ponta para cima
      g.beginPath();
      g.moveTo(s * 0.5, cy + dir * s * 0.3);
      g.bezierCurveTo(s * 0.62, cy + dir * s * 0.12, s * 0.72, cy, s * 0.72, cy - dir * s * 0.06);
      g.arc(s * 0.5, cy - dir * s * 0.06, s * 0.22, 0, Math.PI, dir > 0);
      g.bezierCurveTo(s * 0.28, cy, s * 0.38, cy + dir * s * 0.12, s * 0.5, cy + dir * s * 0.3);
      g.closePath();
      fillStroke(g, fill, s);
    };
    drop(s * 0.2, 1, '#1fa4ff');
    drop(s * 0.8, -1, '#0a5fbf');
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath(); g.ellipse(s * 0.4, s * 0.12, s * 0.04, s * 0.06, -0.4, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(s * 0.4, s * 0.82, s * 0.04, s * 0.06, -0.4, 0, TAU); g.fill();
  },

  // Su Caza: bola colorida em gomos
  bola(g, s) {
    const cx = s * 0.5, cy = s * 0.5, r = s * 0.4;
    const cols = ['#ff3b4f', '#ffd21a', '#1fbf6a', '#1f6fff', '#9b5cff', '#ff8a1f'];
    for (let i = 0; i < 6; i++) {
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, i * TAU / 6 - 0.3, (i + 1) * TAU / 6 - 0.3); g.closePath();
      g.fillStyle = cols[i]; g.fill();
    }
    // costuras curvas
    outline(g, s, 0.025);
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3 - 0.3;
      g.beginPath(); g.moveTo(cx, cy);
      g.quadraticCurveTo(cx + Math.cos(a + 0.5) * r * 0.6, cy + Math.sin(a + 0.5) * r * 0.6, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(cx - r * 0.35, cy - r * 0.4, r * 0.22, r * 0.12, -0.6, 0, TAU); g.fill();
    circle(g, cx, cy, r); outline(g, s); g.stroke();
  },

  // Cambitos: duas varas
  varas(g, s) {
    const vara = (x0, y0, x1, y1) => {
      g.beginPath(); g.moveTo(s * x0, s * y0); g.lineTo(s * x1, s * y1);
      outline(g, s, 0.13); g.stroke(); g.strokeStyle = '#b6ff2e'; g.lineWidth = s * 0.085; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = s * 0.02;
      g.beginPath(); g.moveTo(s * (x0 - 0.02), s * (y0 + 0.04)); g.lineTo(s * (x1 - 0.02), s * (y1 - 0.06)); g.stroke();
    };
    vara(0.36, 0.1, 0.3, 0.9);
    vara(0.64, 0.1, 0.7, 0.9);
    // raio de energia entre elas
    g.beginPath(); g.moveTo(s * 0.55, s * 0.3); g.lineTo(s * 0.43, s * 0.52); g.lineTo(s * 0.53, s * 0.52); g.lineTo(s * 0.45, s * 0.72); g.lineTo(s * 0.6, s * 0.46); g.lineTo(s * 0.5, s * 0.46); g.closePath();
    fillStroke(g, '#ffd21a', s, 0.025);
  },

  // VáPralá: balão de diálogo com um avião dentro
  'balao-aviao'(g, s) {
    g.beginPath();
    g.moveTo(s * 0.2, s * 0.12);
    g.lineTo(s * 0.8, s * 0.12);
    g.quadraticCurveTo(s * 0.94, s * 0.12, s * 0.94, s * 0.26);
    g.lineTo(s * 0.94, s * 0.6);
    g.quadraticCurveTo(s * 0.94, s * 0.74, s * 0.8, s * 0.74);
    g.lineTo(s * 0.4, s * 0.74);
    g.lineTo(s * 0.2, s * 0.92);
    g.lineTo(s * 0.26, s * 0.74);
    g.lineTo(s * 0.2, s * 0.74);
    g.quadraticCurveTo(s * 0.06, s * 0.74, s * 0.06, s * 0.6);
    g.lineTo(s * 0.06, s * 0.26);
    g.quadraticCurveTo(s * 0.06, s * 0.12, s * 0.2, s * 0.12);
    g.closePath();
    fillStroke(g, '#ffffff', s);
    // avião
    g.save(); g.translate(s * 0.5, s * 0.43); g.rotate(-0.25);
    g.beginPath(); g.ellipse(0, 0, s * 0.28, s * 0.06, 0, 0, TAU); fillStroke(g, '#ff3b4f', s, 0.025);
    g.beginPath(); g.moveTo(-s * 0.02, 0); g.lineTo(-s * 0.12, s * 0.17); g.lineTo(-s * 0.02, s * 0.17); g.lineTo(s * 0.08, 0); g.closePath(); fillStroke(g, '#1d5cff', s, 0.025);
    g.beginPath(); g.moveTo(-s * 0.02, 0); g.lineTo(-s * 0.1, -s * 0.13); g.lineTo(-s * 0.02, -s * 0.13); g.lineTo(s * 0.06, 0); g.closePath(); fillStroke(g, '#1d5cff', s, 0.025);
    g.beginPath(); g.moveTo(-s * 0.22, 0); g.lineTo(-s * 0.3, -s * 0.12); g.lineTo(-s * 0.24, -s * 0.12); g.lineTo(-s * 0.16, -s * 0.02); g.closePath(); fillStroke(g, '#1d5cff', s, 0.025);
    g.fillStyle = '#bfe6ff'; for (const x of [0.06, 0.12, 0.18]) { circle(g, s * x - s * 0.02, -s * 0.01, s * 0.016); g.fill(); }
    g.restore();
  },

  // Coentro Verde: um ramo de coentro
  coentro(g, s) {
    const green = '#2f9e44', light = '#7cc95a';
    g.beginPath(); g.moveTo(s * 0.5, s * 0.95); g.quadraticCurveTo(s * 0.46, s * 0.6, s * 0.5, s * 0.35);
    outline(g, s, 0.065); g.stroke(); g.strokeStyle = light; g.lineWidth = s * 0.03; g.stroke();
    // folha de coentro: leque de lóbulos arredondados (contorno só por fora: traço grosso
    // primeiro, cor por cima)
    const leaf = (x, y, r, rot, fill) => {
      g.save(); g.translate(s * x, s * y); g.rotate(rot);
      const lobes = [[0, -0.55, 0.36], [-0.42, -0.32, 0.3], [0.42, -0.32, 0.3], [-0.2, -0.05, 0.26], [0.2, -0.05, 0.26], [0, -0.2, 0.3]];
      const path = () => { g.beginPath(); for (const [lx, ly, lr] of lobes) { g.moveTo(lx * r * s + lr * r * s, ly * r * s); g.arc(lx * r * s, ly * r * s, lr * r * s, 0, TAU); } };
      path(); outline(g, s, 0.05); g.stroke();
      path(); g.fillStyle = fill; g.fill();
      // nervuras
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = s * 0.012;
      for (const [lx, ly] of lobes.slice(0, 3)) { g.beginPath(); g.moveTo(0, 0); g.lineTo(lx * r * s * 0.8, ly * r * s * 0.8); g.stroke(); }
      g.restore();
    };
    g.beginPath(); g.moveTo(s * 0.5, s * 0.55); g.quadraticCurveTo(s * 0.35, s * 0.5, s * 0.25, s * 0.4); outline(g, s, 0.05); g.stroke(); g.strokeStyle = light; g.lineWidth = s * 0.022; g.stroke();
    g.beginPath(); g.moveTo(s * 0.49, s * 0.65); g.quadraticCurveTo(s * 0.65, s * 0.58, s * 0.76, s * 0.5); outline(g, s, 0.05); g.stroke(); g.strokeStyle = light; g.lineWidth = s * 0.022; g.stroke();
    leaf(0.5, 0.26, 0.42, 0, green);
    leaf(0.24, 0.36, 0.32, -0.7, green);
    leaf(0.77, 0.45, 0.32, 0.8, green);
  },
};

// Desenha o logo da marca no quadrado (x, y, s). Logo desconhecido: a inicial do nome.
export function drawLogo(g, brand, x, y, s) {
  g.save();
  g.translate(x, y);
  const paint = LOGOS[brand.logo];
  if (paint) paint(g, s);
  else {
    circle(g, s / 2, s / 2, s * 0.42); fillStroke(g, brand.colors.accent, s);
    g.fillStyle = brand.colors.fg; g.font = `${s * 0.5}px 'Lilita One', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(brand.name[0], s / 2, s * 0.53);
  }
  g.restore();
}

// Placa / faixa: fundo da marca, logo à esquerda, nome e produto à direita.
export function drawBrandStrip(g, brand, w, h, { border = true } = {}) {
  const c = brand.colors;
  g.clearRect(0, 0, w, h);
  g.fillStyle = c.bg; g.fillRect(0, 0, w, h);
  // faixa de destaque embaixo
  g.fillStyle = c.accent; g.fillRect(0, h * 0.88, w, h * 0.12);
  const pad = h * 0.08, ls = h - pad * 2;
  // logo num círculo claro para destacar do fundo
  circle(g, pad + ls / 2, h / 2, ls * 0.5); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
  drawLogo(g, brand, pad + ls * 0.08, pad + ls * 0.08, ls * 0.84);
  // nome (diminui até caber) e produto
  const tx = pad * 2 + ls, tw = w - tx - pad;
  let size = h * 0.5;
  g.font = `${size}px 'Lilita One', 'Arial Black', sans-serif`;
  while (g.measureText(brand.name).width > tw && size > 8) { size -= 2; g.font = `${size}px 'Lilita One', 'Arial Black', sans-serif`; }
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.lineWidth = size * 0.12; g.strokeStyle = INK; g.lineJoin = 'round';
  g.strokeText(brand.name, tx + tw / 2, h * 0.56);
  g.fillStyle = c.fg; g.fillText(brand.name, tx + tw / 2, h * 0.56);
  g.font = `900 ${h * 0.15}px 'Nunito', sans-serif`;
  g.fillStyle = c.fg; g.globalAlpha = 0.85;
  g.fillText(brand.product.toUpperCase(), tx + tw / 2, h * 0.8);
  g.globalAlpha = 1;
  if (border) { g.lineWidth = h * 0.06; g.strokeStyle = INK; g.strokeRect(0, 0, w, h); }
}
