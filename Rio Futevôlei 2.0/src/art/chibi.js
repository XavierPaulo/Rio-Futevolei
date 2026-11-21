// Desenho procedural dos atletas superdeformed (cabeção, corpo pequeno,
// contorno grosso estilo adesivo). Personagem sempre desenhado virado para a direita;
// o espelhamento é feito no plano 3D.

const OUT = '#221433';
const TAU = Math.PI * 2;

const V = (x, y) => ({ x, y });
const lerp = (a, b, k) => V(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
const from = (p, a, L) => V(p.x + Math.sin(a) * L, p.y + Math.cos(a) * L);

function skeleton(q) {
  const P = V(q.rootX, -54 + q.rootY);
  const tu = V(Math.sin(q.torso), -Math.cos(q.torso));
  const N = V(P.x + tu.x * 40, P.y + tu.y * 40);
  const leg = (dx, L) => {
    const hip = V(P.x + dx, P.y + 4);
    const knee = from(hip, L.hip, 25);
    const shin = L.hip - L.knee;
    const ank = from(knee, shin, 24);
    const toe = V(ank.x + Math.cos(shin) * 11, ank.y - Math.sin(shin) * 11);
    return { hip, knee, ank, toe };
  };
  const arm = (dx, A) => {
    const sh = V(P.x + tu.x * 32 + dx, P.y + tu.y * 32);
    const el = from(sh, A.sh, 17);
    const ha = from(el, A.sh + A.el, 16);
    return { sh, el, ha };
  };
  const ha = q.torso + q.neck;
  const H = V(N.x + Math.sin(ha) * 40, N.y - Math.cos(ha) * 40);
  const sk = {
    P, N, H, headAng: ha + q.bodyRot,
    legF: leg(5, q.legF), legB: leg(-5, q.legB),
    armF: arm(4, q.armF), armB: arm(-4, q.armB),
  };
  // gira o corpo todo em torno do centro do corpo (acima da pélvis), para caber no quadro
  if (q.bodyRot) {
    const c = Math.cos(q.bodyRot), s = Math.sin(q.bodyRot);
    const C = V(P.x, P.y - 36);
    const rot = p => { const dx = p.x - C.x, dy = p.y - C.y; p.x = C.x + dx * c - dy * s; p.y = C.y + dx * s + dy * c; };
    [P, N, H].forEach(rot);
    for (const l of [sk.legF, sk.legB]) Object.values(l).forEach(rot);
    for (const a of [sk.armF, sk.armB]) Object.values(a).forEach(rot);
  }
  return sk;
}

function stroke(ctx, pts, w, color, outline = 7) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  if (outline) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = w + outline;
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

function dot(ctx, p, r, color, outline = 3.5) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  if (outline) { ctx.strokeStyle = OUT; ctx.lineWidth = outline; ctx.stroke(); }
}

function ellipse(ctx, x, y, rx, ry, rot, fill, outline = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (outline) { ctx.strokeStyle = OUT; ctx.lineWidth = outline; ctx.stroke(); }
}

function shadeColor(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// bermuda: 'faixa' (faixa lateral) · 'lisa' · 'florida' (estampada) · 'sunga'
function drawLeg(ctx, L, skin, shorts, accent, style = 'faixa') {
  stroke(ctx, [L.hip, L.knee, L.ank], 15, skin);
  stroke(ctx, [L.ank, L.toe], 11, skin);
  const top = lerp(L.hip, L.knee, style === 'sunga' ? 0.2 : 0.62);
  stroke(ctx, [L.hip, top], style === 'sunga' ? 19 : 22, shorts);
  if (style === 'faixa') stroke(ctx, [lerp(L.hip, L.knee, 0.52), top], 22, accent, 0);
  if (style === 'florida') for (const k of [0.18, 0.42]) dot(ctx, lerp(L.hip, L.knee, k), 3, accent, 0);
}

// sleeve: cor da manga (camiseta) · wrist: acessório de pulso
function drawArm(ctx, A, skin, sleeve, wrist, wristColor) {
  stroke(ctx, [A.sh, A.el, A.ha], 12, skin);
  dot(ctx, A.ha, 7.5, skin);
  if (sleeve) stroke(ctx, [A.sh, lerp(A.sh, A.el, 0.55)], 17, sleeve);
  if (wrist === 'munhequeira') stroke(ctx, [lerp(A.el, A.ha, 0.62), lerp(A.el, A.ha, 0.9)], 15, wristColor, 4);
  else if (wrist === 'relogio') { dot(ctx, lerp(A.el, A.ha, 0.72), 6, '#1d1a2b', 2.5); dot(ctx, lerp(A.el, A.ha, 0.72), 2.5, '#9be7ff', 0); }
  else if (wrist === 'pulseiras') {
    stroke(ctx, [lerp(A.el, A.ha, 0.6), lerp(A.el, A.ha, 0.66)], 14, '#ffd21a', 2);
    stroke(ctx, [lerp(A.el, A.ha, 0.72), lerp(A.el, A.ha, 0.78)], 14, wristColor, 2);
    stroke(ctx, [lerp(A.el, A.ha, 0.84), lerp(A.el, A.ha, 0.9)], 14, '#1fbf6a', 2);
  }
}

// blusa: 'regata' · 'camiseta' · 'cropped' · 'listrada'
function drawTorso(ctx, sk, ch) {
  const { P, N } = sk;
  const d = V(N.x - P.x, N.y - P.y);
  const len = Math.hypot(d.x, d.y) || 1;
  const u = V(d.x / len, d.y / len);
  const n = V(-u.y, u.x);
  const top = ch.topStyle || 'regata';
  const across = (k, w, color) => { const m = lerp(P, N, k); stroke(ctx, [V(m.x - n.x * 17, m.y - n.y * 17), V(m.x + n.x * 17, m.y + n.y * 17)], w, color, 0); };
  if (top === 'cropped') {
    stroke(ctx, [lerp(P, N, 0.05), lerp(P, N, 0.92)], 40, ch.skin);
    stroke(ctx, [lerp(P, N, 0.5), lerp(P, N, 0.92)], 40, ch.top);
  } else {
    stroke(ctx, [lerp(P, N, 0.05), lerp(P, N, 0.92)], 40, ch.top);
  }
  if (top === 'regata') across(0.5, 6, ch.topAccent);
  if (top === 'listrada') { across(0.32, 5, ch.topAccent); across(0.52, 5, ch.topAccent); across(0.72, 5, ch.topAccent); }
  if (top === 'camiseta') { const c = lerp(P, N, 0.9); ctx.strokeStyle = ch.topAccent; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x + 4, c.y - 2, 7, 0.3, Math.PI - 0.3); ctx.stroke(); }
  // shorts
  const sunga = ch.shortsStyle === 'sunga';
  stroke(ctx, [V(P.x - u.x * 3, P.y - u.y * 3), V(P.x + u.x * (sunga ? 5 : 10), P.y + u.y * (sunga ? 5 : 10))], sunga ? 40 : 43, ch.shorts);
  if (ch.shortsStyle === 'florida') for (const [a, b] of [[-10, 2], [6, 6], [14, -2]]) dot(ctx, V(P.x + n.x * a + u.x * b, P.y + n.y * a + u.y * b), 3, ch.shortsAccent, 0);
  if (ch.extra === 'tooth') {
    const c = lerp(P, N, 0.86);
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(c.x + 2, c.y - 2, 12, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c.x - 2, c.y + 9); ctx.lineTo(c.x + 8, c.y + 9); ctx.lineTo(c.x + 3, c.y + 20); ctx.closePath();
    ctx.fillStyle = '#fffbea'; ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
  }
}

// ---------------- cabeça ----------------
const R = 46;

function bumpy(ctx, cx, cy, r, n, color, lw = 6, bump = 0.32) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    pts.push(V(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  const draw = extra => {
    ctx.beginPath();
    ctx.arc(cx, cy, r + extra, 0, TAU);
    for (const p of pts) { ctx.moveTo(p.x + r * bump + extra, p.y); ctx.arc(p.x, p.y, r * bump + extra, 0, TAU); }
    ctx.fill();
  };
  ctx.fillStyle = OUT; draw(lw * OUTK / 2); // contorno (mais fino no Pincel)
  ctx.fillStyle = color; draw(0);
}

function star(ctx, x, y, r, rot, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = rot + (i / 10) * TAU - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 3.5; ctx.stroke();
}

function hairBack(ctx, ch, time) {
  const sway = Math.sin(time * 5) * 4;
  switch (ch.hairStyle) {
    case 'ponytail': {
      ctx.beginPath();
      ctx.moveTo(-18, -40);
      ctx.quadraticCurveTo(-66, -66 + sway, -88, -22 + sway);
      ctx.quadraticCurveTo(-76, -26 + sway, -84, 4 + sway);
      ctx.quadraticCurveTo(-62, -12 + sway * 0.5, -30, -10);
      ctx.closePath();
      ctx.fillStyle = ch.hair; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = ch.hairHi; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-40, -44); ctx.quadraticCurveTo(-64, -54 + sway, -76, -26 + sway); ctx.stroke();
      dot(ctx, V(-4, -4), R + 5, ch.hair, 6);
      dot(ctx, V(-24, -40), 8, '#ff5fa2');
      break;
    }
    case 'puff':
      bumpy(ctx, -18, -48, 34, 10, ch.hair);
      dot(ctx, V(-2, -4), R + 4, ch.hair, 6);
      ctx.strokeStyle = ch.hairHi; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(-24, -56, 18, 3.6, 4.6); ctx.stroke();
      break;
    case 'mohawk':
    case 'buzz':
      ctx.beginPath(); ctx.arc(-2, -4, R + 3, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath();
      ctx.fillStyle = shadeColor(ch.hair, ch.hairStyle === 'buzz' ? 0.75 : 0.55); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke();
      break;
    case 'curly':
      // cabelo crespo curto: coroa de cachos
      dot(ctx, V(-3, -6), R + 4, ch.hair, 6);
      for (let i = 0; i <= 9; i++) {
        const a = Math.PI * 0.9 + (i / 9) * Math.PI * 1.2;
        dot(ctx, V(Math.cos(a) * (R + 2) - 3, Math.sin(a) * (R + 2) - 8), 12, ch.hair, 4);
      }
      break;
    case 'long': {
      // cabelão liso caindo até os ombros, balançando
      const sway = Math.sin(time * 4) * 3;
      ctx.beginPath();
      ctx.moveTo(-40, -30);
      ctx.quadraticCurveTo(-62, 10, -48 + sway, 62);
      ctx.lineTo(-22 + sway, 58);
      ctx.quadraticCurveTo(-18, 20, -6, 10);
      ctx.lineTo(10, -40);
      ctx.closePath();
      ctx.fillStyle = ch.hair; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = ch.hairHi; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-44, -10); ctx.quadraticCurveTo(-52, 20, -42 + sway, 52); ctx.stroke();
      dot(ctx, V(-3, -5), R + 4, ch.hair, 6);
      break;
    }
    case 'bucket': {
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI * 0.45 + (i / 12) * Math.PI * 0.95;
        const r = i % 2 ? R + 2 : R + 12;
        ctx.lineTo(Math.cos(a) * r - 4, Math.sin(a) * r - 6);
      }
      ctx.closePath();
      ctx.fillStyle = ch.hair; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke();
      break;
    }
  }
}

function hairFront(ctx, ch) {
  switch (ch.hairStyle) {
    case 'ponytail': {
      const a0 = Math.PI * 1.02, a1 = Math.PI * 1.9, N = 9;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) { const a = a0 + (a1 - a0) * i / N; ctx.lineTo(Math.cos(a) * (R + 5), Math.sin(a) * (R + 5) - 2); }
      for (let i = N; i >= 0; i--) {
        const a = a0 + (a1 - a0) * i / N;
        const r = i % 2 ? R * 0.78 : R * 0.5;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r - 2);
      }
      ctx.closePath();
      ctx.fillStyle = ch.hair; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = ch.hairHi; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, -2, R - 1, Math.PI * 1.2, Math.PI * 1.42); ctx.stroke();
      // headband
      ctx.strokeStyle = OUT; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.arc(0, -2, R * 0.86, Math.PI * 1.08, Math.PI * 1.62); ctx.stroke();
      ctx.strokeStyle = '#ff5fa2'; ctx.lineWidth = 7; ctx.stroke();
      break;
    }
    case 'puff':
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * 1.05 + (i / 8) * Math.PI * 0.8;
        dot(ctx, V(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86 - 3), 10, ch.hair, 3);
      }
      ctx.strokeStyle = OUT; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.arc(0, -2, R * 0.8, Math.PI * 1.12, Math.PI * 1.85); ctx.stroke();
      ctx.strokeStyle = ch.band; ctx.lineWidth = 9; ctx.stroke();
      ctx.fillStyle = ch.band;
      ctx.beginPath(); ctx.moveTo(-36, -20); ctx.lineTo(-58, -30); ctx.lineTo(-52, -10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
      break;
    case 'mohawk': {
      // barbatana de tubarão
      ctx.beginPath();
      ctx.moveTo(16, -40);
      ctx.quadraticCurveTo(12, -94, -30, -110);
      ctx.quadraticCurveTo(-22, -68, -38, -26);
      ctx.closePath();
      ctx.fillStyle = ch.hair; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = ch.hairHi; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(8, -46); ctx.quadraticCurveTo(4, -86, -24, -102); ctx.stroke();
      ctx.fillStyle = shadeColor(ch.hair, 0.55);
      for (let i = 0; i < 6; i++) ctx.fillRect(18 + i * 4, -34 + (i % 2) * 3, 2.2, 2.2);
      break;
    }
    case 'curly':
      for (let i = 0; i <= 6; i++) {
        const a = Math.PI * 1.15 + (i / 6) * Math.PI * 0.7;
        dot(ctx, V(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8 - 4), 9, ch.hair, 3);
      }
      break;
    case 'long':
      // franja de lado + faixa na testa
      ctx.beginPath();
      ctx.moveTo(-R - 2, -6);
      ctx.quadraticCurveTo(-30, -58, 24, -44);
      ctx.quadraticCurveTo(10, -30, 30, -18);
      ctx.quadraticCurveTo(-4, -30, -20, -16);
      ctx.quadraticCurveTo(-30, -10, -R + 4, 6);
      ctx.closePath();
      ctx.fillStyle = ch.hair; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = OUT; ctx.lineWidth = 11;
      ctx.beginPath(); ctx.arc(0, -2, R * 0.9, Math.PI * 1.1, Math.PI * 1.75); ctx.stroke();
      ctx.strokeStyle = ch.band; ctx.lineWidth = 6; ctx.stroke();
      break;
    case 'bucket': {
      // tufos sob o chapéu
      ctx.fillStyle = ch.hair;
      ctx.beginPath(); ctx.moveTo(8, -22); ctx.lineTo(20, -2); ctx.lineTo(24, -22); ctx.lineTo(36, -4); ctx.lineTo(38, -22); ctx.closePath();
      ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.stroke();
      hatBucket(ctx, ch.hat);
      break;
    }
    case 'buzz':
      // raspado: só pontinhos de cabelo na testa
      ctx.fillStyle = shadeColor(ch.hair, 0.8);
      for (let i = 0; i < 10; i++) ctx.fillRect(-20 + i * 5, -34 + (i % 2) * 4, 2.4, 2.4);
      break;
  }
}

// ---------- chapéus ----------
function hatBucket(ctx, color) {
  ctx.beginPath();
  ctx.moveTo(-40, -22);
  ctx.quadraticCurveTo(-44, -66, -4, -70);
  ctx.quadraticCurveTo(38, -66, 38, -22);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = '#ffffff';
  for (const [x, y] of [[-24, -40], [-2, -54], [18, -38], [-10, -30], [4, -34], [-26, -56]]) {
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill();
  }
  ellipse(ctx, 2, -21, 60, 11, 0.04, color, 6);
  ellipse(ctx, 2, -23, 48, 5, 0.04, 'rgba(0,0,0,0.12)');
}

function hatCap(ctx, color) {
  // boné: copa arredondada + aba para a frente
  ctx.beginPath();
  ctx.moveTo(-R - 2, -14);
  ctx.quadraticCurveTo(-R, -R - 12, 0, -R - 8);
  ctx.quadraticCurveTo(R + 2, -R - 4, R + 2, -14);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke();
  ellipse(ctx, R + 14, -14, 26, 7, 0.08, shadeColor(color, 0.8), 5);
  dot(ctx, V(-2, -R - 8), 5, shadeColor(color, 0.7), 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-2, -R - 6); ctx.quadraticCurveTo(8, -34, 10, -16); ctx.stroke();
}

function hatVisor(ctx, color) {
  // viseira: faixa na testa + aba
  ctx.strokeStyle = OUT; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.arc(0, -2, R * 0.93, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.stroke();
  ellipse(ctx, R + 8, -26, 24, 6, 0.25, color, 5);
}

function drawHat(ctx, ch) {
  if (ch.headwear === 'bucket') hatBucket(ctx, ch.hatColor);
  else if (ch.headwear === 'cap') hatCap(ctx, ch.hatColor);
  else if (ch.headwear === 'visor') hatVisor(ctx, ch.hatColor);
}

function drawFace(ctx, ch, face, time) {
  const blink = ((time * 0.9 + ch.name.length) % 4) < 0.12;
  const eyes = [[10, 8, 1], [33, 8, 0.82]];
  if (face === 'happy') {
    ctx.strokeStyle = OUT; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    for (const [x, y, s] of eyes) { ctx.beginPath(); ctx.arc(x, y + 4, 8 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  } else if (face === 'dizzy') {
    ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (const [x, y, s] of eyes) {
      const r = 7 * s;
      ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
    }
  } else if (blink) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (const [x, y, s] of eyes) { ctx.beginPath(); ctx.moveTo(x - 7 * s, y + 3); ctx.lineTo(x + 7 * s, y + 3); ctx.stroke(); }
  } else {
    for (const [x, y, s] of eyes) {
      const ry = face === 'sad' ? 9 : 12;
      ellipse(ctx, x, y, 7.5 * s, ry, 0, OUT);
      ellipse(ctx, x, y + ry * 0.35, 5.5 * s, ry * 0.5, 0, ch.eyes);
      ellipse(ctx, x - 2 * s, y - ry * 0.4, 3 * s, 3.4, 0, '#ffffff');
      ellipse(ctx, x + 2.5 * s, y + ry * 0.45, 1.5 * s, 1.5, 0, '#ffffff');
    }
  }
  // sobrancelhas
  ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.lineCap = 'round';
  const browTilt = face === 'focus' || face === 'shout' ? 0.35 : face === 'sad' ? -0.35 : 0;
  eyes.forEach(([x, y, s], i) => {
    const inner = y - 17 + browTilt * 5, outer = y - 17 - browTilt * 5;
    ctx.beginPath();
    ctx.moveTo(x - 7 * s, i === 0 ? outer : inner);
    ctx.lineTo(x + 7 * s, i === 0 ? inner : outer);
    ctx.stroke();
  });
  // bochechas
  ctx.globalAlpha = 0.45;
  ellipse(ctx, 2, 25, 8, 4.5, 0, '#ff7a9c');
  ellipse(ctx, 38, 25, 6, 4, 0, '#ff7a9c');
  ctx.globalAlpha = 1;
  if (ch.extra === 'freckles') {
    ctx.fillStyle = shadeColor(ch.skin, 0.72);
    for (const [x, y] of [[-2, 20], [4, 23], [0, 26], [34, 21], [39, 24]]) { ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill(); }
  }
  // boca
  const mx = 23, my = 28;
  ctx.strokeStyle = OUT; ctx.lineWidth = 4;
  if (face === 'shout' || face === 'happy') {
    ctx.beginPath();
    ctx.moveTo(mx - 8, my - 3);
    ctx.quadraticCurveTo(mx, my - 5, mx + 8, my - 3);
    ctx.quadraticCurveTo(mx + 6, my + 11, mx - 1, my + 11);
    ctx.quadraticCurveTo(mx - 8, my + 9, mx - 8, my - 3);
    ctx.fillStyle = '#7a1030'; ctx.fill(); ctx.stroke();
    ellipse(ctx, mx, my + 7, 4, 2.5, 0, '#ff6f8e');
  } else if (face === 'sad') {
    ctx.beginPath(); ctx.arc(mx, my + 6, 6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  } else if (face === 'focus') {
    ctx.beginPath(); ctx.moveTo(mx - 4, my); ctx.lineTo(mx + 5, my - 1); ctx.stroke();
  } else if (face === 'dizzy') {
    ctx.beginPath(); ctx.moveTo(mx - 7, my); ctx.quadraticCurveTo(mx - 3, my - 4, mx, my); ctx.quadraticCurveTo(mx + 3, my + 4, mx + 7, my); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(mx, my - 4, 7, Math.PI * 0.2, Math.PI * 0.85); ctx.stroke();
  }
}

// Cabeça completa (cabelo, rosto, chapéu, acessórios) — também usada pelo estilo Pincel.
// outline: escala da espessura dos contornos pretos (o Pincel usa metade); as cores não mudam.
let OUTK = 1;
export function drawChibiHead(ctx, ch, headAng, face, time, outline = 1) {
  if (outline === 1) { drawHead(ctx, ch, { H: V(0, 0), headAng }, face, time); return; }
  OUTK = outline;
  const stroke = ctx.stroke;
  // só os traços na cor do contorno ficam mais finos
  ctx.stroke = function (...args) {
    if (this.strokeStyle !== OUT) return stroke.apply(this, args);
    const w = this.lineWidth;
    this.lineWidth = w * outline;
    stroke.apply(this, args);
    this.lineWidth = w;
  };
  try { drawHead(ctx, ch, { H: V(0, 0), headAng }, face, time); } finally { delete ctx.stroke; OUTK = 1; }
}

function drawHead(ctx, ch, sk, face, time) {
  ctx.save();
  ctx.translate(sk.H.x, sk.H.y);
  ctx.rotate(sk.headAng);
  hairBack(ctx, ch, time);
  dot(ctx, V(0, 0), R, ch.skin, 6);
  // sombra de cel-shading na nuca
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, R - 3, 0, TAU); ctx.clip();
  ctx.fillStyle = 'rgba(90,30,70,0.13)';
  ctx.beginPath(); ctx.arc(-R * 0.75, R * 0.2, R * 0.85, 0, TAU); ctx.fill();
  ctx.restore();
  // orelha
  ellipse(ctx, -15, 8, 7, 10, 0, ch.skin, 3.5);
  if (ch.extra === 'hoop') { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-15, 24, 6, 0, TAU); ctx.stroke(); }
  hairFront(ctx, ch);
  drawFace(ctx, ch, face, time);
  drawHat(ctx, ch);
  if (ch.extra === 'mustache') {
    // bigodão
    ctx.beginPath();
    ctx.moveTo(10, 21);
    ctx.quadraticCurveTo(22, 14, 36, 21);
    ctx.quadraticCurveTo(38, 27, 32, 26);
    ctx.quadraticCurveTo(23, 21, 14, 26);
    ctx.quadraticCurveTo(8, 27, 10, 21);
    ctx.fillStyle = ch.hair; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
  }
  if (ch.extra === 'shades' && face !== 'dizzy') {
    // óculos escuros radicais
    ctx.strokeStyle = OUT; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-12, 4); ctx.lineTo(44, 4); ctx.stroke();
    for (const [x, w] of [[10, 12], [33, 10]]) {
      ctx.beginPath(); ctx.ellipse(x, 8, w, 8, 0, 0, TAU);
      ctx.fillStyle = '#1d1a2b'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(160,255,120,0.7)';
      ctx.beginPath(); ctx.ellipse(x - w * 0.35, 5, w * 0.3, 2.2, -0.3, 0, TAU); ctx.fill();
    }
  }
  if (ch.extra === 'starshades') {
    ctx.strokeStyle = OUT; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-6, -36); ctx.lineTo(22, -34); ctx.stroke();
    star(ctx, -8, -38, 11, -0.2, '#ff5fa2');
    star(ctx, 22, -36, 10, 0.2, '#ff5fa2');
  }
  ctx.restore();
}

export function drawChibi(ctx, ch, pose, time) {
  const W = ctx.canvas.width;
  ctx.clearRect(0, 0, W, W);
  ctx.save();
  ctx.translate(W / 2, W - 10);
  ctx.scale(W / 256, W / 256);
  const sk = skeleton(pose);
  const shade = ch.skinShade;
  const sleeve = ch.topStyle === 'camiseta';
  const ss = ch.shortsStyle || 'faixa';
  drawArm(ctx, sk.armB, shade, sleeve && shadeColor(ch.top, 0.75), null);
  drawLeg(ctx, sk.legB, shade, shadeColor(ch.shorts, 0.75), shadeColor(ch.shortsAccent, 0.75), ss);
  drawTorso(ctx, sk, ch);
  // perna levantada (shark, bicicleta) vai por cima do cabeção
  const legOnTop = pose.legF.hip > 1.6 || pose.legF.hip < -1.8 || Math.abs(pose.bodyRot) > 1.2;
  if (!legOnTop) drawLeg(ctx, sk.legF, ch.skin, ch.shorts, ch.shortsAccent, ss);
  drawHead(ctx, ch, sk, pose.face, time);
  if (legOnTop) drawLeg(ctx, sk.legF, ch.skin, ch.shorts, ch.shortsAccent, ss);
  drawArm(ctx, sk.armF, ch.skin, sleeve && ch.top, ch.wrist, ch.wristColor || ch.topAccent);
  ctx.restore();
}

// Bola de futevôlei (amarela com gomos azul e verde).
export function drawBall(ctx) {
  const W = ctx.canvas.width, r = W * 0.42, c = W / 2;
  ctx.clearRect(0, 0, W, W);
  ctx.save();
  ctx.beginPath(); ctx.arc(c, c, r, 0, TAU); ctx.fillStyle = '#ffd21a'; ctx.fill();
  ctx.clip();
  ctx.lineWidth = r * 0.34;
  ctx.strokeStyle = '#1f6fff';
  ctx.beginPath(); ctx.arc(c - r * 1.1, c, r * 1.25, -0.9, 0.9); ctx.stroke();
  ctx.strokeStyle = '#19c26b';
  ctx.beginPath(); ctx.arc(c + r * 1.1, c, r * 1.25, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath(); ctx.ellipse(c - r * 0.35, c - r * 0.4, r * 0.3, r * 0.18, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(c, c, r, 0, TAU); ctx.strokeStyle = OUT; ctx.lineWidth = W * 0.06; ctx.stroke();
}
