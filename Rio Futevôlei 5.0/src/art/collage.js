// 5.0 Estilo "Colagem": cada atleta (e a bola) vira um recorte de revista colado na quadra.
//  - o desenho é o do Pincel (mesmas proporções, cabeça e opções do criador);
//  - em volta, a borda branca do papel cortado à tesoura (um polígono, não um círculo perfeito);
//  - embaixo, a sombra do recorte colado; por cima, pontinhos de impressão e fibra do papel.
// Parâmetros em src/data/colagem.js (editor: docs/editor-visual.html).
import COL from '../data/colagem.js';
import { drawBrush } from './brush.js';
import { drawBall } from './chibi.js';
import { ARTES, arte, troca, pecasDoAtleta } from './artes.js'; // 5.0: artes enviadas no editor de artes

const bufs = new Map(); // por tamanho: canvases reaproveitados (nada de criar canvas a cada quadro)
function buffers(W) {
  let b = bufs.get(W);
  if (!b) {
    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = W; return c; };
    b = { fig: mk(), sil: mk(), orig: mk() };
    bufs.set(W, b);
  }
  return b;
}

// textura de pontinhos de impressão (uma por tamanho de ponto)
const dotPats = new Map();
function dotPattern(ctx, size) {
  const key = size.toFixed(1);
  if (!dotPats.has(key)) {
    const s = Math.max(3, Math.round(size)), c = document.createElement('canvas');
    c.width = c.height = s * 2;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(26, 22, 34, 1)';
    for (const [x, y] of [[0.5, 0.5], [1.5, 1.5]]) { g.beginPath(); g.arc(x * s, y * s, s * 0.32, 0, Math.PI * 2); g.fill(); }
    dotPats.set(key, c);
  }
  return ctx.createPattern(dotPats.get(key), 'repeat');
}

// fibra do papel: ruído fixo
let grain = null, grainK = null;
function grainPattern(ctx) {
  if (!grain || grainK !== COL.granuladoAtleta) { // refeito se o editor mudar a força
    grainK = COL.granuladoAtleta;
    grain = document.createElement('canvas'); grain.width = grain.height = 64;
    const g = grain.getContext('2d'), img = g.createImageData(64, 64);
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rnd() > 0.5 ? 255 : 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = (COL.granuladoAtleta ?? 0.5) * (8 + rnd() * 14);
    }
    g.putImageData(img, 0, 0);
  }
  return ctx.createPattern(grain, 'repeat');
}

// Cola o desenho de "paint" (que pinta num canvas W×W) como recorte em ctx.
function pasteCutout(ctx, paint, k = 1) {
  const W = ctx.canvas.width;
  const { fig, sil } = buffers(W);
  const f = fig.getContext('2d'), sg = sil.getContext('2d');
  paint(f);
  const R = COL.recorte || {}, sc = W / 256;
  // pontinhos de impressão e fibra só dentro do desenho
  const ht = COL.reticulaAtleta || {};
  f.save();
  f.globalCompositeOperation = 'source-atop';
  if (ht.forca > 0) { f.globalAlpha = ht.forca; f.fillStyle = dotPattern(f, (ht.tamanho || 5) * sc); f.fillRect(0, 0, W, W); }
  f.globalAlpha = 1; f.fillStyle = grainPattern(f); f.fillRect(0, 0, W, W);
  f.restore();
  // silhueta (para a borda de papel e a sombra)
  sg.clearRect(0, 0, W, W);
  sg.globalCompositeOperation = 'source-over';
  sg.drawImage(fig, 0, 0);
  sg.globalCompositeOperation = 'source-in';
  const b = (R.borda ?? 5) * sc * k, n = Math.max(4, Math.round(R.lados || 9));
  const ring = (dx, dy) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.3; ctx.drawImage(sil, dx + Math.cos(a) * b, dy + Math.sin(a) * b); } };
  ctx.clearRect(0, 0, W, W);
  // sombra do recorte colado
  sg.fillStyle = R.sombraCor || 'rgba(40,18,10,0.45)'; sg.fillRect(0, 0, W, W);
  ring((R.sombraX ?? 4) * sc * k, (R.sombraY ?? 5) * sc * k);
  // papel recortado (sombra e papel precisam da silhueta recolorida: redesenha a silhueta)
  sg.globalCompositeOperation = 'source-over'; sg.clearRect(0, 0, W, W); sg.drawImage(fig, 0, 0);
  sg.globalCompositeOperation = 'source-in'; sg.fillStyle = R.cor || '#fbf6e8'; sg.fillRect(0, 0, W, W);
  ring(0, 0);
  ctx.drawImage(sil, 0, 0); // tapa buracos entre os cortes
  ctx.drawImage(fig, 0, 0);
}

// desgaste de estampa: manchas claras irregulares (camiseta de praia lavada mil vezes)
let wornPat = null;
function wornPattern(ctx) {
  if (!wornPat) {
    wornPat = document.createElement('canvas'); wornPat.width = wornPat.height = 96;
    const g = wornPat.getContext('2d');
    let sd = 11; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * 96, y = rnd() * 96, r = 1 + rnd() * 3;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,250,235,0.9)'); gr.addColorStop(1, 'rgba(255,250,235,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(255,250,235,0.7)'; g.lineWidth = 0.8;
    for (let i = 0; i < 7; i++) { const x = rnd() * 96, y = rnd() * 96; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 + rnd() * 10, y + (rnd() - 0.5) * 4); g.stroke(); }
  }
  return ctx.createPattern(wornPat, 'repeat');
}

// Acabamento de foto de revista impressa (referência: a foto P&B do rapaz de chapéu): preto e branco
// com contraste, sombras na tinta escura, luzes no papel creme e um pouco da cor original por cima,
// como foto pintada à mão. F = { ligado, cor (0–1), contraste, escuro, claro }
function photoFinish(f, W, F) {
  if (!F || F.ligado === false || !('filter' in f)) return;
  const { orig } = buffers(W), o = orig.getContext('2d');
  o.clearRect(0, 0, W, W); o.drawImage(f.canvas, 0, 0);
  f.save();
  f.clearRect(0, 0, W, W);
  f.filter = `grayscale(1) contrast(${F.contraste ?? 1.3}) brightness(${F.brilho ?? 1.08})`;
  f.drawImage(orig, 0, 0);
  f.filter = 'none';
  f.globalCompositeOperation = 'multiply'; f.fillStyle = F.claro || '#f4ecd8'; f.fillRect(0, 0, W, W);
  f.globalCompositeOperation = 'lighten'; f.fillStyle = F.escuro || '#1d1a2b'; f.fillRect(0, 0, W, W);
  if ((F.cor ?? 0.5) > 0) { f.globalCompositeOperation = 'color'; f.globalAlpha = F.cor ?? 0.5; f.drawImage(orig, 0, 0); f.globalAlpha = 1; }
  f.globalCompositeOperation = 'destination-in'; f.drawImage(orig, 0, 0);
  f.restore();
}

// Desenha o atleta no estilo Colagem. Mesma assinatura do drawChibi.
// Visual em src/data/colagem.js → visualAtletas: cartoon bonito, sarado, meio punk/meio chique, meio gasto.
export function drawCollage(ctx, ch, pose, time) {
  pasteCutout(ctx, f => {
    const W = f.canvas.width;
    f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, W, W);
    const C = COL.visualAtletas;
    // 5.0 Artes: atleta inteiro enviado no editor de artes (imagem parada, pés na base, virada para a direita)
    const inteiro = ch.id && arte(`personagens/atletas/${ch.id}`);
    if (inteiro) {
      const t = troca(`personagens/atletas/${ch.id}`), s = (t.escala ?? 1) * W / Math.max(inteiro.width, inteiro.height);
      const w = inteiro.width * s, h = inteiro.height * s, k = W / 256;
      f.translate(W / 2 + (t.x || 0) * k, W - 8 * k + (t.y || 0) * k); f.rotate((t.giro || 0) * Math.PI / 180);
      f.drawImage(inteiro, -w / 2, -h, w, h);
      f.setTransform(1, 0, 0, 1, 0, 0);
      if (ARTES.fotoNasArtes !== false && C && C.ligado !== false) photoFinish(f, W, C.foto);
      return;
    }
    const pecas = ch.id ? pecasDoAtleta(ch.id) : null;
    if (C && C.ligado !== false) {
      const per = (C.atletas || {})[ch.id] || {};
      const look = { ...ch };
      if (per.tatuagem !== undefined) look.tattoo = per.tatuagem || null;
      if (per.corrente !== undefined) look.chain = per.corrente || null;
      const e = C.escala ?? 0.95, fy = W - 8 * W / 256;
      f.translate(W / 2, fy - Math.round(4 * W / 256)); f.scale(e, e); f.translate(-W / 2, -fy);
      drawBrush(f, look, pose, time, {
        cabeca: C.cabeca, contorno: C.contorno, contornoCabeca: C.contornoCabeca, maos: C.maos, pes: C.pes, corpo: C.corpo,
        musculo: per.musculo ?? C.musculo,
        rosto: { real: C.rostoHumano !== false, olhar: per.olhar || (C.padrao || {}).olhar, sorriso: per.sorriso || (C.padrao || {}).sorriso, barba: !!per.barbaPorFazer },
        pecas,
      });
      f.setTransform(1, 0, 0, 1, 0, 0);
      if (!pecas || ARTES.fotoNasArtes !== false) photoFinish(f, W, C.foto);
      if (C.desgaste > 0) { f.save(); f.globalCompositeOperation = 'source-atop'; f.globalAlpha = Math.min(1, C.desgaste); f.fillStyle = wornPattern(f); f.fillRect(0, 0, W, W); f.restore(); }
    } else {
      f.translate(0, -Math.round(4 * W / 256));
      drawBrush(f, ch, pose, time, pecas ? { pecas } : null);
      f.setTransform(1, 0, 0, 1, 0, 0);
    }
  });
}

export function drawCollageBall(ctx) {
  pasteCutout(ctx, f => {
    const W = f.canvas.width;
    f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, W, W);
    f.setTransform(0.84, 0, 0, 0.84, W * 0.08, W * 0.08); // encolhe um pouco para caber a borda
    const bola = arte('personagens/bola/bola'); // 5.0 Artes: bola enviada no editor de artes
    if (bola) {
      const t = troca('personagens/bola/bola'), s = (t.escala ?? 1) * W / Math.max(bola.width, bola.height);
      f.translate(W / 2 + (t.x || 0) * W / 256, W / 2 + (t.y || 0) * W / 256); f.rotate((t.giro || 0) * Math.PI / 180);
      f.drawImage(bola, -bola.width * s / 2, -bola.height * s / 2, bola.width * s, bola.height * s);
    } else drawBall(f);
    f.setTransform(1, 0, 0, 1, 0, 0);
  }, 0.6);
}
