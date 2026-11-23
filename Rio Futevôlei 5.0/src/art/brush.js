// Estilo "Pincel": render manual com brush pen. Mesmas proporções do estilo
// caneta (75% realista), um pouco mais cartunizado: cabeça ~10% maior e formas
// arredondadas. Cores chapadas em 2 tons (luz e sombra) e contorno de pincel
// preto, mais grosso do lado da sombra. Sem tremido nem hachura: traço limpo.
// A cabeça (cabelos, rosto, chapéus, acessórios) reaproveita o desenho cartoon,
// então todas as opções do criador de atleta funcionam aqui também.
import { drawChibiHead } from './chibi.js';

const INK = '#1a1622';
const K = 1.6;            // escala das distâncias das poses
// (let: o estilo Colagem desenha o mesmo corpo em versão caricata — drawBrush(..., opts))
let HEAD = 0.43;          // escala da cabeça do cartoon (raio 46 → ~20 px)
let OUTW = 1.3;           // espessura do contorno (metade da versão anterior)
let HANDK = 1, FOOTK = 1, HEADOUT = 0.5, CARIC = null, BODY = 1, MUSC = 0, PEC = null; // PEC: peças trocadas por imagem (editor de artes) // MUSC: atleta sarado (0–1) // BODY: comprimento do tronco, pernas e braços
const SHIFT = { x: 0.45, y: 0.55 }; // contorno mais grosso para baixo/trás (lado da sombra)
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
  const P = V(q.rootX * K, -86 * BODY + q.rootY * K);
  const tu = V(Math.sin(q.torso), -Math.cos(q.torso));
  const N = V(P.x + tu.x * 62 * BODY, P.y + tu.y * 62 * BODY);
  const leg = (dx, L) => {
    const hip = V(P.x + dx, P.y + 4);
    const knee = from(hip, L.hip, 42 * BODY);
    const shin = L.hip - L.knee;
    const ank = from(knee, shin, 40 * BODY);
    const toe = V(ank.x + Math.cos(shin) * 13, ank.y - Math.sin(shin) * 13);
    return { hip, knee, ank, toe };
  };
  const arm = (dx, A) => {
    const sh = V(N.x - tu.x * 6 + dx, N.y - tu.y * 6);
    const el = from(sh, A.sh, 30 * BODY);
    const ha = from(el, A.sh + A.el, 28 * BODY);
    return { sh, el, ha };
  };
  const ha = q.torso + q.neck;
  const hd = 22 * HEAD / 0.43; // cabeça maior fica mais longe do pescoço
  const H = V(N.x + Math.sin(ha) * hd, N.y - Math.cos(ha) * hd);
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

// 5.0 Artes: peça trocada por imagem (src/art/artes.js). A imagem fica em pé ao longo do osso a→b:
// topo = a, base = b, cobrindo também a ponta arredondada (wa antes de a, wb depois de b).
// t = { escala, x, y, giro } do editor de artes; back = membro de trás (um pouco mais escuro).
function boneImg(ctx, pc, a, b, wa, wb, back) {
  const { img, t } = pc, s = t.escala ?? 1;
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  const h = (L + wa + wb) * s, w = h * img.width / (img.height || 1);
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(Math.atan2(dy, dx) - Math.PI / 2 + (t.giro || 0) * Math.PI / 180);
  if (back && 'filter' in ctx) ctx.filter = 'brightness(0.82)';
  ctx.drawImage(img, -w / 2 + (t.x || 0), (L + wb - wa) / 2 - h / 2 + (t.y || 0), w, h); // escala a partir do meio da peça
  ctx.restore();
}
// imagem centrada num ponto (cabeça, mão), girada pelo ângulo ang; size = lado da imagem com escala 1
function pointImg(ctx, pc, c, ang, size, back) {
  const { img, t } = pc, s = t.escala ?? 1;
  const h = size * s, w = h * img.width / (img.height || 1);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(ang + (t.giro || 0) * Math.PI / 180);
  if (back && 'filter' in ctx) ctx.filter = 'brightness(0.82)';
  ctx.drawImage(img, -w / 2 + (t.x || 0), -h / 2 + (t.y || 0), w, h);
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
  const P = PEC || {};
  if (P.pe) {
    // pé: deitado, calcanhar à esquerda e ponta à direita, ao longo de tornozelo→ponta
    const r = 5 * Math.sqrt(FOOTK), toe = FOOTK === 1 ? L.toe : lerp(L.ank, L.toe, FOOTK);
    ctx.save(); ctx.translate(L.ank.x, L.ank.y); ctx.rotate(Math.atan2(toe.y - L.ank.y, toe.x - L.ank.x));
    const { img, t } = P.pe, s = t.escala ?? 1, len = (Math.hypot(toe.x - L.ank.x, toe.y - L.ank.y) + r * 2.2) * s, hh = len * img.height / (img.width || 1);
    ctx.rotate((t.giro || 0) * Math.PI / 180);
    if (back && 'filter' in ctx) ctx.filter = 'brightness(0.82)';
    ctx.drawImage(img, -r * s + (t.x || 0), -hh / 2 + (t.y || 0), len, hh);
    ctx.restore();
  } else {
  limb(ctx, L.ank, FOOTK === 1 ? L.toe : lerp(L.ank, L.toe, FOOTK), 5 * Math.sqrt(FOOTK), 4 * FOOTK, skin);
  // 5.0 Colagem: pé de pato (nadadeira) calçado na areia (Seu Pé de Pato)
  if (ch.fins) {
    const dx = L.toe.x - L.ank.x, dy = L.toe.y - L.ank.y, Ln = Math.hypot(dx, dy) || 1, ux = dx / Ln, uy = dy / Ln, nx = -uy, ny = ux;
    const tip = V(L.toe.x + ux * 16, L.toe.y + uy * 16);
    const fin = [V(L.ank.x + nx * 4, L.ank.y + ny * 4), V(tip.x + nx * 8, tip.y + ny * 8), V(tip.x + ux * 2, tip.y + uy * 2), V(tip.x - nx * 8, tip.y - ny * 8), V(L.ank.x - nx * 4, L.ank.y - ny * 4)];
    const finO = fin.map(p => V(p.x + (p.x - L.ank.x) * 0.08, p.y + (p.y - L.ank.y) * 0.08));
    part(ctx, finO, fin, shade(ch.fins, k));
    ctx.strokeStyle = shade(ch.fins, 0.7 * k); ctx.lineWidth = 1.4;
    for (const s of [-4, 0, 4]) { ctx.beginPath(); ctx.moveTo(L.toe.x + nx * s * 0.5, L.toe.y + ny * s * 0.5); ctx.lineTo(tip.x + nx * s, tip.y + ny * s); ctx.stroke(); }
  }
  }
  if (P.canela) boneImg(ctx, P.canela, L.knee, L.ank, 7 + MUSC * 1.6, 5 + MUSC * 0.3, back);
  else limb(ctx, L.knee, L.ank, 7 + MUSC * 1.6, 5 + MUSC * 0.3, skin); // panturrilha
  if (P.coxa) { boneImg(ctx, P.coxa, L.hip, L.knee, 11, 7 + MUSC * 0.6, back); return; } // a coxa enviada já traz a bermuda
  limb(ctx, L.hip, L.knee, 9.5 + MUSC * 1.6, 7 + MUSC * 0.6, skin);
  const end = lerp(L.hip, L.knee, style === 'sunga' ? 0.2 : 0.58);
  limb(ctx, L.hip, end, 11, 10, shorts);
  if (style === 'faixa') { ctx.strokeStyle = acc; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); const a = lerp(L.hip, end, 0.15); ctx.moveTo(a.x + 5, a.y); ctx.lineTo(end.x + 5, end.y); ctx.stroke(); }
  if (style === 'florida') for (const t of [0.25, 0.55, 0.85]) { const p = lerp(L.hip, end, t); ctx.beginPath(); ctx.arc(p.x + (t > 0.5 ? 3 : -3), p.y, 2.2, 0, TAU); ctx.fillStyle = acc; ctx.fill(); }
}

function drawArm(ctx, A, ch, back, sleeve) {
  const k = back ? 0.82 : 1;
  const skin = shade(ch.skin, k);
  const P = PEC || {};
  if (P.antebraco) boneImg(ctx, P.antebraco, A.el, A.ha, 5.2 + MUSC * 1.2, 4.2 + MUSC * 0.4, back);
  else limb(ctx, A.el, A.ha, 5.2 + MUSC * 1.2, 4.2 + MUSC * 0.4, skin);
  // braço de academia: mais grosso no meio (bíceps), afinando no cotovelo
  if (P.braco) boneImg(ctx, P.braco, A.sh, A.el, 6.4 + MUSC * 1.9, 5.2 + MUSC * 0.7, back);
  else if (MUSC > 0) { const mid = lerp(A.sh, A.el, 0.45); limb(ctx, mid, A.el, 6.4 + MUSC * 1.9, 5.2 + MUSC * 0.7, skin); limb(ctx, A.sh, mid, 6.4 + MUSC * 1.4, 6.4 + MUSC * 1.9, skin); }
  else limb(ctx, A.sh, A.el, 6.4, 5.2, skin);
  // 5.0 Colagem: tatuagem de traço no braço da frente (punk)
  if (!back && ch.tattoo && !P.braco) {
    const c = lerp(A.sh, A.el, 0.45), dx = A.el.x - A.sh.x, dy = A.el.y - A.sh.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    ctx.strokeStyle = ch.tattoo; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU * 2 / 5, rr = 3.6; const x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x - uy * 6 + ux * 6, c.y + ux * 6 + uy * 6); ctx.lineTo(c.x + uy * 6 + ux * 6, c.y - ux * 6 + uy * 6); ctx.stroke();
  }
  // mão
  const hr = 5.6 * HANDK, hand = capsule(A.ha, A.ha, hr, hr), handO = capsule(A.ha, A.ha, hr + OUTW, hr + OUTW);
  if (P.mao) pointImg(ctx, P.mao, A.ha, Math.atan2(A.ha.y - A.el.y, A.ha.x - A.el.x) - Math.PI / 2, (hr + OUTW) * 2.4, back);
  else part(ctx, handO, hand, skin);
  if (P.braco) return; // o braço enviado já traz a manga; antebraço enviado traz os acessórios do pulso
  if (sleeve) limb(ctx, A.sh, lerp(A.sh, A.el, 0.5), 8, 7.5, shade(ch.top, k));
  if (!back && ch.wrist && !P.antebraco) {
    const w = ch.wristColor || ch.topAccent;
    if (ch.wrist === 'munhequeira') limb(ctx, lerp(A.el, A.ha, 0.62), lerp(A.el, A.ha, 0.88), 6.2, 5.6, w);
    else if (ch.wrist === 'spikes') {
      // 5.0 Colagem: pulseira de spikes (Tito)
      const a = lerp(A.el, A.ha, 0.6), b = lerp(A.el, A.ha, 0.86);
      limb(ctx, a, b, 6.4, 5.8, '#1d1a22');
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      for (const t of [0.2, 0.5, 0.8]) {
        const m = lerp(a, b, t);
        for (const s of [1, -1]) {
          const base = V(m.x + nx * 6 * s, m.y + ny * 6 * s);
          ctx.beginPath(); ctx.moveTo(base.x - dx / L * 2.2, base.y - dy / L * 2.2); ctx.lineTo(base.x + nx * 4.5 * s, base.y + ny * 4.5 * s); ctx.lineTo(base.x + dx / L * 2.2, base.y + dy / L * 2.2);
          ctx.closePath(); ctx.fillStyle = '#e8e8ee'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.stroke();
        }
      }
    }
    else if (ch.wrist === 'relogio') { const c = lerp(A.el, A.ha, 0.72); part(ctx, capsule(c, c, 5 + OUTW, 5 + OUTW), capsule(c, c, 5, 5), '#2a2a3a'); ctx.beginPath(); ctx.arc(c.x, c.y, 2.4, 0, TAU); ctx.fillStyle = '#9be7ff'; ctx.fill(); }
    else if (ch.wrist === 'pulseiras') [[0.6, '#ffd21a'], [0.72, w], [0.84, '#1fbf6a']].forEach(([t, col]) => { const a = lerp(A.el, A.ha, t - 0.03), b = lerp(A.el, A.ha, t + 0.03); limb(ctx, a, b, 5.4, 5.4, col); });
  }
}

function drawTorso(ctx, sk, ch) {
  const { P, N } = sk;
  if (PEC && PEC.tronco) { // tronco enviado: blusa, bermuda e acessórios do peito vêm na imagem
    const L = Math.hypot(N.x - P.x, N.y - P.y) || 1;
    boneImg(ctx, PEC.tronco, N, P, L * 0.04, L * 0.1);
    return;
  }
  const d = V(N.x - P.x, N.y - P.y), L = Math.hypot(d.x, d.y) || 1;
  const n = V(-d.y / L, d.x / L);
  const ring = (ws, extra = 0) => {
    // contorno do tronco: [k, meia largura] de baixo para cima, arredondado
    const left = ws.map(([k, w]) => V(P.x + d.x * k + n.x * (w + extra), P.y + d.y * k + n.y * (w + extra)));
    const right = ws.map(([k, w]) => V(P.x + d.x * k - n.x * (w + extra), P.y + d.y * k - n.y * (w + extra))).reverse();
    return [...left, ...right];
  };
  // sarado: ombros largos e cintura fina (corpo em V)
  const body = [[-0.06, 13], [0.15, 14 - MUSC], [0.5, 13 - MUSC * 0.5], [0.8, 16 + MUSC * 4], [0.95, 15 + MUSC * 4.5], [1.0, 11 + MUSC * 2]];
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
  // 5.0 Colagem: blusa de girafa (Dadá) — manchas irregulares na cor de destaque
  if (topStyle === 'girafa') {
    ctx.save(); path(ctx, ring(shirt)); ctx.clip();
    const spots = [[0.3, -7, 5], [0.34, 6, 4], [0.52, -1, 5.5], [0.7, -8, 4.5], [0.72, 7, 5], [0.88, -1, 4]];
    for (const [k, w, r] of spots) {
      const m = V(P.x + d.x * k + n.x * w, P.y + d.y * k + n.y * w);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + k * 9, rr = r * (0.75 + ((i * 7 + k * 31) % 5) * 0.09); ctx.lineTo(m.x + Math.cos(a) * rr, m.y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fillStyle = ch.topAccent; ctx.fill();
    }
    ctx.restore();
  }
  // 5.0 Colagem: manto com moedas de ouro costuradas (Mestre Arcano)
  if (topStyle === 'moedas') {
    for (const [k, w] of [[0.3, -6], [0.3, 6], [0.5, 0], [0.7, -7], [0.7, 7], [0.88, 0]]) {
      const m = V(P.x + d.x * k + n.x * w, P.y + d.y * k + n.y * w);
      ctx.beginPath(); ctx.arc(m.x, m.y, 2.8, 0, TAU); ctx.fillStyle = ch.topAccent; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.stroke();
    }
  }
  if (topStyle === 'camiseta') { const c = V(P.x + d.x * 0.97, P.y + d.y * 0.97); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x + 2, c.y + 2, 5, 0.2, Math.PI - 0.2); ctx.stroke(); }
  // bermuda (cintura)
  const sunga = ch.shortsStyle === 'sunga';
  const shorts = [[-0.08, 13.5], [sunga ? 0.08 : 0.16, 14.5]];
  part(ctx, ring(shorts, OUTW), ring(shorts), ch.shorts);
  // 5.0 Colagem: corrente de ouro no pescoço (chique)
  if (ch.chain) {
    const a = V(P.x + d.x * 0.97 + n.x * 9, P.y + d.y * 0.97 + n.y * 9), b = V(P.x + d.x * 0.97 - n.x * 9, P.y + d.y * 0.97 - n.y * 9);
    const lo = V(P.x + d.x * 0.78, P.y + d.y * 0.78);
    ctx.strokeStyle = '#7a5a10'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(lo.x, lo.y, b.x, b.y); ctx.stroke();
    ctx.strokeStyle = ch.chain; ctx.lineWidth = 2; ctx.setLineDash([2.2, 1.4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(lo.x * 0.5 + (a.x + b.x) * 0.25, lo.y * 0.5 + (a.y + b.y) * 0.25 + 1.5, 2.4, 0, TAU); ctx.fillStyle = ch.chain; ctx.fill(); ctx.strokeStyle = '#7a5a10'; ctx.lineWidth = 0.8; ctx.stroke();
  }
  // 5.0 Colagem: câmera fotográfica pendurada no peito (Tito)
  if (ch.prop === 'camera') {
    const a = V(P.x + d.x * 0.98 - n.x * 9, P.y + d.y * 0.98 - n.y * 9), c = V(P.x + d.x * 0.6 + n.x * 6, P.y + d.y * 0.6 + n.y * 6);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y - 4); ctx.stroke();
    const body = [V(c.x - 8, c.y - 5), V(c.x + 8, c.y - 5), V(c.x + 8, c.y + 6), V(c.x - 8, c.y + 6)];
    const bodyO = [V(c.x - 9.3, c.y - 6.3), V(c.x + 9.3, c.y - 6.3), V(c.x + 9.3, c.y + 7.3), V(c.x - 9.3, c.y + 7.3)];
    part(ctx, bodyO, body, '#2a2a33');
    ctx.fillStyle = '#d8d8d8'; ctx.fillRect(c.x - 8, c.y - 5, 16, 3); // faixa prateada
    ctx.beginPath(); ctx.arc(c.x + 1, c.y + 1.5, 4.6, 0, TAU); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.arc(c.x + 1, c.y + 1.5, 2.6, 0, TAU); ctx.fillStyle = '#5b7bd6'; ctx.fill();
    ctx.beginPath(); ctx.arc(c.x, c.y + 0.6, 0.9, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
  }
  if (ch.extra === 'tooth') {
    const c = V(P.x + d.x * 0.9, P.y + d.y * 0.9);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(c.x, c.y - 2, 9, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x - 3, c.y + 7); ctx.lineTo(c.x + 3, c.y + 7); ctx.lineTo(c.x, c.y + 13); ctx.closePath(); ctx.fillStyle = '#fffbea'; ctx.fill(); ctx.stroke();
  }
}

function drawHead(ctx, ch, sk, face, time) {
  // pescoço
  limb(ctx, sk.N, lerp(sk.N, sk.H, 0.7), 5, 5, shade(ch.skin, 0.88));
  if (PEC && PEC.cabeca) { pointImg(ctx, PEC.cabeca, sk.H, sk.headAng, 46 * HEAD * 2.6); return; } // cabeça enviada (cabelo, rosto e chapéu)
  ctx.save();
  ctx.translate(sk.H.x, sk.H.y);
  ctx.scale(HEAD, HEAD);
  drawChibiHead(ctx, ch, sk.headAng, face, time, HEADOUT, CARIC); // contorno da cabeça pela metade, como o corpo
  ctx.restore();
}

// Desenha o atleta no estilo Pincel. Mesma assinatura do drawChibi.
// opts (estilo Colagem): { cabeca, contorno, contornoCabeca, maos, pes, rosto } — versão caricata
export function drawBrush(ctx, ch, pose, time, opts = null) {
  const o = opts || {};
  HEAD = o.cabeca ?? 0.43; OUTW = o.contorno ?? 1.3; HEADOUT = o.contornoCabeca ?? 0.5; HANDK = o.maos ?? 1; FOOTK = o.pes ?? 1; CARIC = o.rosto || null; BODY = o.corpo ?? 1; MUSC = o.musculo ?? 0; PEC = o.pecas || null;
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
