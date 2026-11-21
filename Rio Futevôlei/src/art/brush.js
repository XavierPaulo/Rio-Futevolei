// Estilo "Pincel": render manual com brush pen. Mesmas proporções do estilo
// caneta (75% realista), um pouco mais cartunizado: cabeça ~10% maior e formas
// arredondadas. Cores chapadas em 2 tons (luz e sombra) e contorno de pincel
// preto, mais grosso do lado da sombra. Sem tremido nem hachura: traço limpo.
// A cabeça (cabelos, rosto, chapéus, acessórios) reaproveita o desenho cartoon,
// então todas as opções do criador de atleta funcionam aqui também.
import { drawChibiHead } from './chibi.js';

const INK = '#1a1622';
const K = 1.6;            // escala das distâncias das poses
const HEAD = 0.43;        // escala da cabeça do cartoon (raio 46 → ~20 px)
const OUTW = 2.6;         // espessura do contorno
const SHIFT = { x: 0.9, y: 1.1 }; // contorno mais grosso para baixo/trás (lado da sombra)
const TAU = Math.PI * 2;

const V = (x, y) => ({ x, y });
const from = (p, a, L) => V(p.x + Math.sin(a) * L, p.y + Math.cos(a) * L);
const lerp = (a, b, k) => V(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
// escurece uma cor (#rrggbb ou rgb(r,g,b)) por um fator k
function shade(color, k) {
  let r, g, b;
  if (color[0] === '#') { const n = parseInt(color.slice(1), 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; }
  else [r, g, b] = color.match(/\d+/g).map(Number);
  const f = c => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

function skeleton(q) {
  const P = V(q.rootX * K, -86 + q.rootY * K);
  const tu = V(Math.sin(q.torso), -Math.cos(q.torso));
  const N = V(P.x + tu.x * 62, P.y + tu.y * 62);
  const leg = (dx, L) => {
    const hip = V(P.x + dx, P.y + 4);
    const knee = from(hip, L.hip, 42);
    const shin = L.hip - L.knee;
    const ank = from(knee, shin, 40);
    const toe = V(ank.x + Math.cos(shin) * 13, ank.y - Math.sin(shin) * 13);
    return { hip, knee, ank, toe };
  };
  const arm = (dx, A) => {
    const sh = V(N.x - tu.x * 6 + dx, N.y - tu.y * 6);
    const el = from(sh, A.sh, 30);
    const ha = from(el, A.sh + A.el, 28);
    return { sh, el, ha };
  };
  const ha = q.torso + q.neck;
  const H = V(N.x + Math.sin(ha) * 22, N.y - Math.cos(ha) * 22);
  const sk = { P, N, H, headAng: ha + q.bodyRot, legF: leg(5, q.legF), legB: leg(-5, q.legB), armF: arm(6, q.armF), armB: arm(-6, q.armB) };
  if (q.bodyRot) {
    const c = Math.cos(q.bodyRot), s = Math.sin(q.bodyRot);
    const C = V(P.x, P.y - 36 * K);
    const rot = p => { const dx = p.x - C.x, dy = p.y - C.y; p.x = C.x + dx * c - dy * s; p.y = C.y + dx * s + dy * c; };
    [P, N, H].forEach(rot);
    for (const l of [sk.legF, sk.legB]) Object.values(l).forEach(rot);
    for (const a of [sk.armF, sk.armB]) Object.values(a).forEach(rot);
  }
  return sk;
}

// ---------- formas ----------
function capsule(a, b, wa, wb) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const ang = Math.atan2(dy, dx);
  const pts = [V(a.x + nx * wa, a.y + ny * wa), V(b.x + nx * wb, b.y + ny * wb)];
  for (let i = 1; i < 8; i++) { const t = ang + Math.PI / 2 - (i / 8) * Math.PI; pts.push(V(b.x + Math.cos(t) * wb, b.y + Math.sin(t) * wb)); }
  pts.push(V(b.x - nx * wb, b.y - ny * wb), V(a.x - nx * wa, a.y - ny * wa));
  for (let i = 1; i < 8; i++) { const t = ang - Math.PI / 2 - (i / 8) * Math.PI; pts.push(V(a.x + Math.cos(t) * wa, a.y + Math.sin(t) * wa)); }
  return pts;
}
function path(ctx, pts, dx = 0, dy = 0) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x + dx, p.y + dy) : ctx.moveTo(p.x + dx, p.y + dy)));
  ctx.closePath();
}

// Uma peça: contorno de pincel (mais grosso no lado da sombra) + cor chapada + sombra.
// outer = a mesma forma um pouco maior; light = deslocamento da área iluminada.
function part(ctx, outer, inner, color, { light = V(2.6, -2.4), shadow = 0.8 } = {}) {
  path(ctx, outer, SHIFT.x, SHIFT.y); ctx.fillStyle = INK; ctx.fill();
  path(ctx, outer); ctx.fill();
  path(ctx, inner); ctx.fillStyle = shade(color, shadow); ctx.fill();
  ctx.save();
  path(ctx, inner); ctx.clip();
  path(ctx, inner, light.x, light.y); ctx.fillStyle = color; ctx.fill();
  ctx.restore();
}

function limb(ctx, a, b, wa, wb, color, opts) {
  part(ctx, capsule(a, b, wa + OUTW, wb + OUTW), capsule(a, b, wa, wb), color, opts);
}

// ---------- corpo ----------
function drawLeg(ctx, L, ch, back) {
  const k = back ? 0.82 : 1;
  const skin = shade(ch.skin, k), shorts = shade(ch.shorts, k), acc = shade(ch.shortsAccent, k);
  const style = ch.shortsStyle || 'faixa';
  limb(ctx, L.ank, L.toe, 5, 4, skin);
  limb(ctx, L.knee, L.ank, 7, 5, skin);
  limb(ctx, L.hip, L.knee, 9.5, 7, skin);
  const end = lerp(L.hip, L.knee, style === 'sunga' ? 0.2 : 0.58);
  limb(ctx, L.hip, end, 11, 10, shorts);
  if (style === 'faixa') { ctx.strokeStyle = acc; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); const a = lerp(L.hip, end, 0.15); ctx.moveTo(a.x + 5, a.y); ctx.lineTo(end.x + 5, end.y); ctx.stroke(); }
  if (style === 'florida') for (const t of [0.25, 0.55, 0.85]) { const p = lerp(L.hip, end, t); ctx.beginPath(); ctx.arc(p.x + (t > 0.5 ? 3 : -3), p.y, 2.2, 0, TAU); ctx.fillStyle = acc; ctx.fill(); }
}

function drawArm(ctx, A, ch, back, sleeve) {
  const k = back ? 0.82 : 1;
  const skin = shade(ch.skin, k);
  limb(ctx, A.el, A.ha, 5.2, 4.2, skin);
  limb(ctx, A.sh, A.el, 6.4, 5.2, skin);
  // mão
  const hand = capsule(A.ha, A.ha, 5.6, 5.6), handO = capsule(A.ha, A.ha, 5.6 + OUTW, 5.6 + OUTW);
  part(ctx, handO, hand, skin);
  if (sleeve) limb(ctx, A.sh, lerp(A.sh, A.el, 0.5), 8, 7.5, shade(ch.top, k));
  if (!back && ch.wrist) {
    const w = ch.wristColor || ch.topAccent;
    if (ch.wrist === 'munhequeira') limb(ctx, lerp(A.el, A.ha, 0.62), lerp(A.el, A.ha, 0.88), 6.2, 5.6, w);
    else if (ch.wrist === 'relogio') { const c = lerp(A.el, A.ha, 0.72); part(ctx, capsule(c, c, 5 + OUTW, 5 + OUTW), capsule(c, c, 5, 5), '#2a2a3a'); ctx.beginPath(); ctx.arc(c.x, c.y, 2.4, 0, TAU); ctx.fillStyle = '#9be7ff'; ctx.fill(); }
    else if (ch.wrist === 'pulseiras') [[0.6, '#ffd21a'], [0.72, w], [0.84, '#1fbf6a']].forEach(([t, col]) => { const a = lerp(A.el, A.ha, t - 0.03), b = lerp(A.el, A.ha, t + 0.03); limb(ctx, a, b, 5.4, 5.4, col); });
  }
}

function drawTorso(ctx, sk, ch) {
  const { P, N } = sk;
  const d = V(N.x - P.x, N.y - P.y), L = Math.hypot(d.x, d.y) || 1;
  const n = V(-d.y / L, d.x / L);
  const ring = (ws, extra = 0) => {
    // contorno do tronco: [k, meia largura] de baixo para cima, arredondado
    const left = ws.map(([k, w]) => V(P.x + d.x * k + n.x * (w + extra), P.y + d.y * k + n.y * (w + extra)));
    const right = ws.map(([k, w]) => V(P.x + d.x * k - n.x * (w + extra), P.y + d.y * k - n.y * (w + extra))).reverse();
    return [...left, ...right];
  };
  const body = [[-0.06, 13], [0.15, 14], [0.5, 13], [0.8, 16], [0.95, 15], [1.0, 11]];
  const topStyle = ch.topStyle || 'regata';
  // pele (aparece no cropped)
  part(ctx, ring(body, OUTW), ring(body), ch.skin);
  // blusa
  const shirtFrom = topStyle === 'cropped' ? 0.55 : 0.12;
  const shirt = body.filter(([k]) => k >= shirtFrom);
  shirt.unshift([shirtFrom, 14]);
  part(ctx, ring(shirt, OUTW), ring(shirt), ch.top);
  const across = (k, w, color) => { const m = V(P.x + d.x * k, P.y + d.y * k); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(m.x - n.x * 12, m.y - n.y * 12); ctx.lineTo(m.x + n.x * 12, m.y + n.y * 12); ctx.stroke(); };
  if (topStyle === 'regata') across(0.55, 3.5, ch.topAccent);
  if (topStyle === 'listrada') { across(0.4, 3.2, ch.topAccent); across(0.58, 3.2, ch.topAccent); across(0.76, 3.2, ch.topAccent); }
  if (topStyle === 'camiseta') { const c = V(P.x + d.x * 0.97, P.y + d.y * 0.97); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x + 2, c.y + 2, 5, 0.2, Math.PI - 0.2); ctx.stroke(); }
  // bermuda (cintura)
  const sunga = ch.shortsStyle === 'sunga';
  const shorts = [[-0.08, 13.5], [sunga ? 0.08 : 0.16, 14.5]];
  part(ctx, ring(shorts, OUTW), ring(shorts), ch.shorts);
  if (ch.extra === 'tooth') {
    const c = V(P.x + d.x * 0.9, P.y + d.y * 0.9);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(c.x, c.y - 2, 9, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x - 3, c.y + 7); ctx.lineTo(c.x + 3, c.y + 7); ctx.lineTo(c.x, c.y + 13); ctx.closePath(); ctx.fillStyle = '#fffbea'; ctx.fill(); ctx.stroke();
  }
}

function drawHead(ctx, ch, sk, face, time) {
  // pescoço
  limb(ctx, sk.N, lerp(sk.N, sk.H, 0.7), 5, 5, shade(ch.skin, 0.88));
  ctx.save();
  ctx.translate(sk.H.x, sk.H.y);
  ctx.scale(HEAD, HEAD);
  drawChibiHead(ctx, ch, sk.headAng, face, time);
  ctx.restore();
}

// Desenha o atleta no estilo Pincel. Mesma assinatura do drawChibi.
export function drawBrush(ctx, ch, pose, time) {
  const W = ctx.canvas.width;
  ctx.clearRect(0, 0, W, W);
  ctx.save();
  ctx.translate(W / 2, W - 8);
  ctx.scale(W / 256, W / 256);
  ctx.lineJoin = 'round';
  const sk = skeleton(pose);
  const sleeve = ch.topStyle === 'camiseta';
  drawArm(ctx, sk.armB, ch, true, sleeve);
  drawLeg(ctx, sk.legB, ch, true);
  drawTorso(ctx, sk, ch);
  const legOnTop = pose.legF.hip > 1.6 || pose.legF.hip < -1.8 || Math.abs(pose.bodyRot) > 1.2;
  if (!legOnTop) drawLeg(ctx, sk.legF, ch, false);
  drawHead(ctx, ch, sk, pose.face, time);
  if (legOnTop) drawLeg(ctx, sk.legF, ch, false);
  drawArm(ctx, sk.armF, ch, false, sleeve);
  ctx.restore();
}
