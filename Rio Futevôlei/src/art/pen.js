// Estilo "papel e caneta": atletas desenhados como se fossem feitos à mão com
// caneta Bic (azul, vermelha, verde e preta). Proporções 75% realistas
// (cabeça ≈ 1/6 da altura), traço levemente tremido que "ferve" como animação
// desenhada à mão, e roupas preenchidas com hachura na cor da caneta.
// Usa as mesmas poses (ângulos) do estilo cartoon.

export const INK = { blue: '#1d3fa0', red: '#c21f2e', green: '#1e7a3c', black: '#1c1b26' };
const PAPER = '#f7f2e4';
const TAU = Math.PI * 2;
const K = 1.6; // escala das distâncias das poses (pensadas para o corpo do cartoon)
const LW = 1.8; // espessura do traço (o sprite aparece pequeno na quadra)
const BW = 1.25; // "volume" do corpo

// Qual caneta pinta o quê em cada atleta.
const PENS = {
  giulia: { shirt: 'blue', shorts: 'black', hair: 'blue', accent: 'red' },
  zefa: { shirt: 'green', shorts: 'green', hair: 'black', accent: 'red' },
  tubarao: { shirt: 'blue', shorts: 'black', hair: 'blue', accent: 'black' },
  pipoca: { shirt: null, shorts: 'red', hair: 'black', accent: 'red' },
  drauzio: { shirt: 'red', shorts: null, hair: 'black', accent: 'black' },
  varella: { shirt: 'green', shorts: 'black', hair: null, accent: 'black' },
};

// Para atletas criados pelo jogador: a caneta mais próxima de cada cor.
function penOf(hex, hair = false) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (l > 0.85) return null;             // branco: só contorno
  if (l < 0.22 || s < 0.2) return 'black';
  if (h < 20 || h >= 300) return 'red';
  if (h < 70) return l > 0.55 ? null : (hair ? 'black' : 'red'); // amarelos claros ficam sem hachura
  if (h < 170) return 'green';
  return 'blue';
}

function pensFor(ch) {
  if (PENS[ch.id]) return PENS[ch.id];
  return {
    shirt: penOf(ch.top), shorts: penOf(ch.shorts), hair: penOf(ch.hair, true),
    accent: penOf(ch.hatColor || ch.topAccent) || 'red', wrist: penOf(ch.wristColor || ch.topAccent) || 'red',
  };
}

// ---------- utilidades de "traço à mão" ----------
function rng(seed) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const V = (x, y) => ({ x, y });
const from = (p, a, L) => V(p.x + Math.sin(a) * L, p.y + Math.cos(a) * L);
const lerp = (a, b, k) => V(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);

let R = Math.random; // gerador do quadro atual (traço que "ferve")

function wob(v = 1.2) { return (R() - 0.5) * v; }

// Linha de caneta: duas passadas levemente diferentes.
function ink(ctx, pts, color, w = 1.6, close = false) {
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = p.x + wob(), y = p.y + wob();
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    if (close) ctx.closePath();
    ctx.strokeStyle = color;
    ctx.globalAlpha = pass ? 0.45 : 0.95;
    ctx.lineWidth = (pass ? w * 0.7 : w) * LW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Contorno de um membro (cápsula afunilada entre a e b).
function capsulePts(a, b, wa, wb) {
  wa *= BW; wb *= BW;
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const ang = Math.atan2(dy, dx);
  const pts = [];
  pts.push(V(a.x + nx * wa, a.y + ny * wa), V(b.x + nx * wb, b.y + ny * wb));
  for (let i = 1; i < 6; i++) { const t = ang + Math.PI / 2 - (i / 6) * Math.PI; pts.push(V(b.x + Math.cos(t) * wb, b.y + Math.sin(t) * wb)); }
  pts.push(V(b.x - nx * wb, b.y - ny * wb), V(a.x - nx * wa, a.y - ny * wa));
  for (let i = 1; i < 6; i++) { const t = ang - Math.PI / 2 - (i / 6) * Math.PI; pts.push(V(a.x + Math.cos(t) * wa, a.y + Math.sin(t) * wa)); }
  return pts;
}

function pathOf(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

function fillPaper(ctx, pts) { pathOf(ctx, pts); ctx.fillStyle = PAPER; ctx.fill(); }

// Hachura dentro de uma forma.
function hatch(ctx, pts, color, spacing = 3.4, angle = 0.8, cross = false) {
  ctx.save();
  pathOf(ctx, pts);
  ctx.clip();
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = Math.min(...xs) - 20, x1 = Math.max(...xs) + 20, y0 = Math.min(...ys) - 20, y1 = Math.max(...ys) + 20;
  const draw = a => {
    const c = Math.cos(a), s = Math.sin(a);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = Math.hypot(x1 - x0, y1 - y0) / 2;
    ctx.beginPath();
    for (let d = -r; d <= r; d += spacing) {
      const j = wob(0.8);
      ctx.moveTo(cx + c * -r - s * (d + j), cy + s * -r + c * (d + j));
      ctx.lineTo(cx + c * r - s * (d + j), cy + s * r + c * (d + j));
    }
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };
  draw(angle);
  if (cross) draw(angle + 1.3);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Rabisco (cabelo): várias voltas soltas.
function scribble(ctx, cx, cy, rx, ry, color, turns = 7, w = 1.3) {
  ctx.beginPath();
  for (let i = 0; i <= turns * 14; i++) {
    const t = (i / 14) * TAU;
    const rr = 0.55 + 0.45 * Math.abs(Math.sin(i * 0.37 + R()));
    const x = cx + Math.cos(t) * rx * rr + wob(2), y = cy + Math.sin(t) * ry * rr + wob(2);
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.globalAlpha = 0.85; ctx.stroke(); ctx.globalAlpha = 1;
}

// ---------- esqueleto (mesmas poses do cartoon, corpo mais alto) ----------
function skeleton(q) {
  const P = V(q.rootX * K, -86 + q.rootY * K);
  const tu = V(Math.sin(q.torso), -Math.cos(q.torso));
  const N = V(P.x + tu.x * 64, P.y + tu.y * 64);
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
  const H = V(N.x + Math.sin(ha) * 26, N.y - Math.cos(ha) * 26);
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

// ---------- partes do corpo ----------
function drawLeg(ctx, L, pens, back, style = 'faixa') {
  const line = back ? INK.blue + 'aa' : INK.blue;
  const thigh = capsulePts(L.hip, L.knee, 8, 6);
  const shin = capsulePts(L.knee, L.ank, 6, 4.2);
  const foot = capsulePts(L.ank, L.toe, 4, 3.4);
  for (const s of [foot, shin, thigh]) fillPaper(ctx, s);
  ink(ctx, foot, line, 1.4, true);
  ink(ctx, shin, line, 1.5, true);
  ink(ctx, thigh, line, 1.5, true);
  // bermuda cobre o alto da coxa (sunga: só um pedacinho)
  const end = lerp(L.hip, L.knee, style === 'sunga' ? 0.18 : 0.55);
  const top = capsulePts(L.hip, end, 9.5, 8.5);
  const pen = pens.shorts ? INK[pens.shorts] : line;
  fillPaper(ctx, top);
  if (pens.shorts && style !== 'florida') hatch(ctx, top, pen, 3, back ? 1.1 : 0.8);
  if (style === 'florida') for (const k of [0.15, 0.35, 0.5]) {
    const p = lerp(L.hip, L.knee, k);
    ink(ctx, Array.from({ length: 7 }, (_, i) => V(p.x + Math.cos(i / 6 * TAU) * 2.5, p.y + Math.sin(i / 6 * TAU) * 2.5)), pen, 1);
  }
  if (style === 'faixa') ink(ctx, [lerp(L.hip, end, 0.1), end], INK[pens.accent] || INK.red, 1.6);
  ink(ctx, top, pen, 1.4, true);
}

function drawArm(ctx, A, back, sleevePen, wrist, wristPen) {
  const line = back ? INK.blue + 'aa' : INK.blue;
  const up = capsulePts(A.sh, A.el, 5.5, 4.5);
  const fore = capsulePts(A.el, A.ha, 4.5, 3.6);
  fillPaper(ctx, fore); fillPaper(ctx, up);
  ink(ctx, fore, line, 1.4, true);
  ink(ctx, up, line, 1.4, true);
  if (sleevePen !== undefined) {
    const sleeve = capsulePts(A.sh, lerp(A.sh, A.el, 0.5), 7, 6.5);
    fillPaper(ctx, sleeve);
    if (sleevePen) hatch(ctx, sleeve, INK[sleevePen], 3.2, 0.75);
    ink(ctx, sleeve, sleevePen ? INK[sleevePen] : line, 1.3, true);
  }
  ctx.beginPath(); ctx.arc(A.ha.x, A.ha.y, 4.2, 0, TAU); ctx.fillStyle = PAPER; ctx.fill();
  ink(ctx, Array.from({ length: 9 }, (_, i) => V(A.ha.x + Math.cos(i / 8 * TAU) * 4.2, A.ha.y + Math.sin(i / 8 * TAU) * 4.2)), line, 1.2);
  if (wrist) {
    const wc = INK[wristPen] || INK.red;
    const w = capsulePts(lerp(A.el, A.ha, wrist === 'munhequeira' ? 0.62 : 0.7), lerp(A.el, A.ha, 0.9), 5.5, 5);
    if (wrist === 'munhequeira') { fillPaper(ctx, w); hatch(ctx, w, wc, 2, 1.2, true); ink(ctx, w, wc, 1.2, true); }
    else if (wrist === 'relogio') { const c = lerp(A.el, A.ha, 0.72); const face = Array.from({ length: 9 }, (_, i) => V(c.x + Math.cos(i / 8 * TAU) * 4.5, c.y + Math.sin(i / 8 * TAU) * 4.5)); fillPaper(ctx, face); ink(ctx, face, INK.black, 1.3, true); ink(ctx, [c, V(c.x + 2.5, c.y - 1.5)], INK.black, 0.9); }
    else if (wrist === 'pulseiras') for (const [k, col] of [[0.62, INK.red], [0.72, INK.green], [0.82, INK.blue]]) { const a = lerp(A.el, A.ha, k); ink(ctx, [V(a.x - 5, a.y - 1), V(a.x + 5, a.y + 1)], col, 1.3); }
  }
}

function drawTorso(ctx, sk, ch, pens) {
  const { P, N } = sk;
  const d = V(N.x - P.x, N.y - P.y), L = Math.hypot(d.x, d.y) || 1;
  const u = V(d.x / L, d.y / L), n = V(-u.y, u.x);
  const at = (k, w) => { w *= BW; return [V(P.x + d.x * k + n.x * w, P.y + d.y * k + n.y * w), V(P.x + d.x * k - n.x * w, P.y + d.y * k - n.y * w)]; };
  const [a1, a2] = at(-0.05, 12), [b1, b2] = at(0.55, 11), [c1, c2] = at(0.95, 15);
  const body = [a1, b1, c1, c2, b2, a2];
  fillPaper(ctx, body);
  const topStyle = ch.topStyle || 'regata';
  const sunga = ch.shortsStyle === 'sunga';
  // bermuda (sunga: faixa estreita)
  const [s1, s2] = at(sunga ? 0.14 : 0.3, 11.5);
  // camiseta (cropped: só a parte de cima, com a barriga à mostra)
  const [k1, k2] = topStyle === 'cropped' ? at(0.6, 11) : [s1, s2];
  const shirt = [k1, ...(topStyle === 'cropped' ? [] : [b1]), c1, c2, ...(topStyle === 'cropped' ? [] : [b2]), k2];
  if (pens.shirt) hatch(ctx, shirt, INK[pens.shirt], 3.2, 0.75);
  if (topStyle === 'listrada') for (const k of [0.45, 0.6, 0.75]) { const [l1, l2] = at(k, 11); ink(ctx, [l1, l2], INK[pens.accent] || INK.red, 1.6); }
  if (topStyle === 'cropped') ink(ctx, [k1, k2], pens.shirt ? INK[pens.shirt] : INK.blue, 1.3);
  const shorts = [a1, s1, s2, a2];
  if (pens.shorts && ch.shortsStyle !== 'florida') hatch(ctx, shorts, INK[pens.shorts], 2.8, 1.0, true);
  ink(ctx, body, INK.blue, 1.6, true);
  ink(ctx, [s1, s2], pens.shorts ? INK[pens.shorts] : INK.blue, 1.3);
  if (topStyle === 'camiseta') { const c = lerp(P, N, 0.95); ink(ctx, [V(c.x - 5, c.y - 1), V(c.x, c.y + 4), V(c.x + 5, c.y - 1)], INK.blue, 1.2); }
  if (ch.extra === 'tooth') {
    const c = lerp(P, N, 0.9);
    ink(ctx, [V(c.x - 8, c.y - 3), V(c.x, c.y + 4), V(c.x + 8, c.y - 3)], INK.black, 1);
    ink(ctx, [V(c.x - 2, c.y + 4), V(c.x + 2, c.y + 4), V(c.x, c.y + 10)], INK.black, 1.2, true);
  }
}

function drawHair(ctx, ch, pens, back, time) {
  const col = pens.hair ? INK[pens.hair] : INK.blue;
  const acc = INK[pens.accent];
  switch (ch.hairStyle) {
    case 'ponytail':
      if (back) {
        const sway = Math.sin(time * 5) * 3;
        ink(ctx, [V(-10, -16), V(-24, -18 + sway), V(-34, -6 + sway), V(-36, 8 + sway), V(-28, 2 + sway), V(-22, -6), V(-12, -8)], col, 1.5, true);
        scribble(ctx, -26, -6 + sway, 8, 9, col, 5, 1);
      } else {
        scribble(ctx, -2, -13, 15, 7, col, 6, 1.2);
        ink(ctx, [V(-15, -8), V(-8, -18), V(4, -19), V(14, -12)], acc, 2.2); // faixa
      }
      break;
    case 'puff':
      if (back) scribble(ctx, -8, -22, 15, 13, col, 9, 1.2);
      else { scribble(ctx, 0, -13, 15, 6, col, 5, 1.2); ink(ctx, [V(-15, -7), V(-6, -16), V(8, -16), V(15, -9)], acc, 2.4); }
      break;
    case 'mohawk':
      if (!back) {
        const fin = [V(6, -16), V(2, -34), V(-12, -42), V(-8, -28), V(-12, -14)];
        hatch(ctx, fin, col, 2.6, 0.4);
        ink(ctx, fin, col, 1.6, true);
      }
      break;
    case 'bucket':
      if (!back) penHatBucket(ctx, acc);
      else scribble(ctx, -8, -2, 10, 8, col, 4, 1);
      break;
    case 'buzz':
      if (!back) for (let i = 0; i < 9; i++) ink(ctx, [V(-13 + i * 3.4, -15 + Math.abs(i - 4) * 0.8), V(-12 + i * 3.4, -12.5 + Math.abs(i - 4) * 0.8)], col, 0.9);
      break;
    case 'curly':
      if (!back) for (let i = 0; i < 7; i++) scribble(ctx, -12 + i * 4, -14 - Math.sin(i) * 2, 4, 4, col, 2, 1);
      else scribble(ctx, -8, -12, 11, 9, col, 5, 1);
      break;
    case 'long':
      if (back) {
        const sway = Math.sin(time * 4) * 2;
        for (let i = 0; i < 7; i++) ink(ctx, [V(-6 - i * 1.5, -16), V(-14 - i * 1.4, 0), V(-14 - i * 1.2 + sway, 22)], col, 1);
      } else {
        ink(ctx, [V(-16, -4), V(-10, -17), V(4, -20), V(15, -12), V(4, -13), V(-6, -9)], col, 1.3, true);
        ink(ctx, [V(-15, -9), V(-4, -16), V(10, -15), V(16, -10)], acc, 2.4); // faixa
      }
      break;
  }
}

// ---------- chapéus ----------
function penHatBucket(ctx, pen) {
  const crown = [V(-15, -8), V(-13, -24), V(0, -28), V(13, -24), V(15, -8)];
  fillPaper(ctx, crown);
  hatch(ctx, crown, pen, 3.2, 0.6);
  ink(ctx, crown, pen, 1.6);
  ink(ctx, [V(-24, -7), V(-8, -4), V(10, -4), V(26, -8)], pen, 2.2); // aba
  for (const [x, y] of [[-6, -18], [4, -21], [8, -13]]) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fillStyle = PAPER; ctx.fill(); }
}
function penHatCap(ctx, pen) {
  const crown = [V(-16, -8), V(-14, -20), V(-2, -25), V(12, -21), V(16, -9)];
  fillPaper(ctx, crown);
  hatch(ctx, crown, pen, 3, 0.9);
  ink(ctx, crown, pen, 1.6, true);
  const bill = [V(12, -10), V(30, -9), V(28, -6), V(12, -6)];
  fillPaper(ctx, bill);
  hatch(ctx, bill, pen, 2, 0.2, true);
  ink(ctx, bill, pen, 1.5, true);
}
function penHatVisor(ctx, pen) {
  ink(ctx, [V(-15, -8), V(-8, -15), V(4, -17), V(15, -11)], pen, 3);
  const bill = [V(12, -12), V(28, -16), V(27, -12), V(13, -8)];
  fillPaper(ctx, bill);
  hatch(ctx, bill, pen, 2, 0.2, true);
  ink(ctx, bill, pen, 1.4, true);
}
function drawHatPen(ctx, ch, pens) {
  const pen = INK[pens.accent] || INK.red;
  if (ch.headwear === 'bucket') penHatBucket(ctx, pen);
  else if (ch.headwear === 'cap') penHatCap(ctx, pen);
  else if (ch.headwear === 'visor') penHatVisor(ctx, pen);
}

function drawHead(ctx, ch, pens, sk, face, time) {
  ctx.save();
  ctx.translate(sk.H.x, sk.H.y);
  ctx.rotate(sk.headAng);
  drawHair(ctx, ch, pens, true, time);
  // pescoço já coberto pelo tronco; cabeça oval
  const head = Array.from({ length: 20 }, (_, i) => { const t = i / 20 * TAU; return V(Math.cos(t) * 15, Math.sin(t) * 17); });
  fillPaper(ctx, head);
  ink(ctx, head, INK.blue, 1.6, true);
  ink(ctx, [V(-4, -2), V(-6, 2), V(-4, 5)], INK.blue, 1.1); // orelha
  if (ch.extra === 'hoop') ink(ctx, Array.from({ length: 9 }, (_, i) => V(-5 + Math.cos(i / 8 * TAU) * 3, 9 + Math.sin(i / 8 * TAU) * 3)), INK.red, 1);
  // rosto (virado para a direita)
  const E = INK.black;
  if (face === 'dizzy') {
    ink(ctx, [V(4, -4), V(8, 0)], E, 1.2); ink(ctx, [V(8, -4), V(4, 0)], E, 1.2);
    ink(ctx, [V(10, -4), V(13, 0)], E, 1.2); ink(ctx, [V(13, -4), V(10, 0)], E, 1.2);
  } else if (ch.extra === 'shades') {
    const lens = [V(3, -5), V(14, -5), V(14, 0), V(3, 0)];
    hatch(ctx, lens, E, 1.6, 0.2, true);
    ink(ctx, lens, E, 1.3, true);
    ink(ctx, [V(-8, -4), V(3, -4)], E, 1.1);
  } else {
    const blink = ((time * 0.9 + ch.name.length) % 4) < 0.12;
    for (const x of [6, 12.5]) {
      if (blink || face === 'happy') ink(ctx, [V(x - 2, -2), V(x, -3.5), V(x + 2, -2)], E, 1.2);
      else { ctx.beginPath(); ctx.arc(x, -2.2, 1.5, 0, TAU); ctx.fillStyle = E; ctx.fill(); }
    }
    const tilt = face === 'focus' || face === 'shout' ? 1.5 : face === 'sad' ? -1.5 : 0;
    ink(ctx, [V(3.5, -6 - tilt), V(8, -6.5 + tilt)], E, 1.1);
    ink(ctx, [V(10.5, -6.5 + tilt), V(14.5, -6 - tilt)], E, 1.1);
  }
  ink(ctx, [V(15, 0), V(17.5, 4), V(15, 5)], INK.blue, 1.1); // nariz
  if (ch.extra === 'mustache') {
    const m = [V(8, 7), V(12, 5.5), V(17, 7.5), V(16, 9.5), V(12, 8), V(9, 9.5)];
    hatch(ctx, m, E, 1.5, 0.3);
    ink(ctx, m, E, 1.2, true);
  }
  if (face === 'shout' || face === 'happy') {
    const mouth = Array.from({ length: 10 }, (_, i) => { const t = i / 10 * TAU; return V(12 + Math.cos(t) * 2.8, 11 + Math.sin(t) * 2.4); });
    ink(ctx, mouth, INK.red, 1.2, true);
  } else if (face === 'sad') ink(ctx, [V(9, 12), V(12, 10.5), V(15, 12)], INK.red, 1.2);
  else ink(ctx, [V(9, 10.5), V(12, 11.8), V(15, 10.2)], INK.red, 1.2);
  if (ch.extra === 'freckles') for (const [x, y] of [[5, 4], [8, 5], [15, 4]]) { ctx.beginPath(); ctx.arc(x, y, 0.8, 0, TAU); ctx.fillStyle = INK.red; ctx.fill(); }
  drawHair(ctx, ch, pens, false, time);
  drawHatPen(ctx, ch, pens);
  if (ch.extra === 'starshades') {
    for (const x of [-3, 9]) {
      const star = Array.from({ length: 10 }, (_, i) => { const a = i / 10 * TAU - Math.PI / 2; const r = i % 2 ? 2.2 : 5; return V(x + Math.cos(a) * r, -20 + Math.sin(a) * r); });
      ink(ctx, star, INK.red, 1.2, true);
    }
  }
  ctx.restore();
}

// Desenha o atleta no estilo caneta. Mesma assinatura do drawChibi.
export function drawPen(ctx, ch, pose, time) {
  const W = ctx.canvas.width;
  ctx.clearRect(0, 0, W, W);
  // o traço "ferve" 8 vezes por segundo, como animação desenhada à mão
  R = rng(Math.floor(time * 8) * 131 + ch.name.length * 977);
  const pens = pensFor(ch);
  ctx.save();
  ctx.translate(W / 2, W - 8);
  ctx.scale(W / 256, W / 256);
  const sk = skeleton(pose);
  const sleeve = ch.topStyle === 'camiseta' ? pens.shirt : undefined;
  const ss = ch.shortsStyle || 'faixa';
  drawArm(ctx, sk.armB, true, sleeve);
  drawLeg(ctx, sk.legB, pens, true, ss);
  drawTorso(ctx, sk, ch, pens);
  const legOnTop = pose.legF.hip > 1.6 || pose.legF.hip < -1.8 || Math.abs(pose.bodyRot) > 1.2;
  if (!legOnTop) drawLeg(ctx, sk.legF, pens, false, ss);
  drawHead(ctx, ch, pens, sk, pose.face, time);
  if (legOnTop) drawLeg(ctx, sk.legF, pens, false, ss);
  drawArm(ctx, sk.armF, false, sleeve, ch.wrist, pens.wrist);
  ctx.restore();
}

// Bola desenhada a caneta.
export function drawPenBall(ctx) {
  const W = ctx.canvas.width, c = W / 2, r = W * 0.4;
  R = rng(7);
  ctx.clearRect(0, 0, W, W);
  const circle = Array.from({ length: 24 }, (_, i) => V(c + Math.cos(i / 24 * TAU) * r, c + Math.sin(i / 24 * TAU) * r));
  fillPaper(ctx, circle);
  const seamL = Array.from({ length: 12 }, (_, i) => { const t = -0.9 + i / 11 * 1.8; return V(c - r * 1.1 + Math.cos(t) * r * 1.25, c + Math.sin(t) * r * 1.25); });
  const seamR = seamL.map(p => V(2 * c - p.x, p.y));
  ctx.save(); pathOf(ctx, circle); ctx.clip();
  hatch(ctx, [V(c - r, c - r), V(c - r * 0.35, c - r), V(c - r * 0.35, c + r), V(c - r, c + r)], INK.blue, 5, 0.8);
  hatch(ctx, [V(c + r * 0.35, c - r), V(c + r, c - r), V(c + r, c + r), V(c + r * 0.35, c + r)], INK.green, 5, -0.8);
  ctx.restore();
  ink(ctx, seamL, INK.blue, 3);
  ink(ctx, seamR, INK.green, 3);
  ink(ctx, circle, INK.blue, 4.5, true);
}
