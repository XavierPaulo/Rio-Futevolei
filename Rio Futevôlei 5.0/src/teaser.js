// 5.0 Teaser: clipe de rock dos anos 90 (1:30) com o próprio motor do jogo e trilha ska-rock
// (src/teaserMusic.js). Cortes no tempo da música, câmeras de clipe (rasante, drone, giro, close, câmera
// torta, olho de peixe), câmera lenta nos especiais, carimbos, flashes, tela dividida, caleidoscópio,
// rastro e cara de fita VHS. Feliz, pesado, alucinante e de concreto ao mesmo tempo.
//
// Aberto pela tela docs/teaser.html (../?teaser&slave): lá ficam a música e o relógio, mandados para cá por
// postMessage { teaser: 'time', t, playing }. Aberto direto (../?teaser), toca sozinho com um clique.
// Responde { teaser: 'state', t, total, scene, paused, scenes } para o player montar os capítulos.
import * as THREE from 'three';
import DATA from './data/teaser.js';
import { SkaTrack, ARRANGEMENTS } from './teaserMusic.js';
import { CHARACTERS, ROSTER } from './art/characters.js';
import { drawAthlete } from './art/draw.js';
import { poseFor } from './art/poses.js';
import { dummy } from './ui/portraits.js';
import V5 from './data/partida5.js';
import { MOVES } from './moves.js';
import { HOODS, HOOD_ORDER } from './story/data.js';
import { muxMP4 } from './mp4mux.js';

const AIR = ['header', 'shark', 'bicicleta'];
const pick = (a, i) => a[((Math.floor(i) % a.length) + a.length) % a.length];

export function startTeaser(G) {
  const Q = new URLSearchParams(location.search), slave = Q.has('slave');
  // versão: '90' (clipe de 1:30) ou '30' (clipe de 30 s, só rock) — ?teaser&v=30
  const VERSION = Q.get('v') === '30' ? '30' : '90', SECTIONS = ARRANGEMENTS[VERSION];
  const BPM = DATA.bpm || 160, BEAT = 60 / BPM;
  const track = slave ? null : new SkaTrack(DATA, SECTIONS);
  const TOTAL = SECTIONS[SECTIONS.length - 1].to * 4 * BEAT; // compassos de 4 tempos
  const gameCanvas = document.querySelector('canvas');
  const baseFov = G.camera.fov, originalArt = G.settings.art;
  const cast = ROSTER.filter(id => id && CHARACTERS[id]);
  const specials = Object.entries(V5.especiais || {}).filter(([id, e]) => e.ativo !== false && MOVES[id]).map(([id, e]) => ({ id, tipo: e.tipo, name: MOVES[id].name, anim: MOVES[id].anim, defense: e.tipo === 'defesa' }));
  const owner = id => cast.find(c => CHARACTERS[c].special === id) || pick(cast, id.length * 5);
  const hoods = HOOD_ORDER.filter(h => HOODS[h]);
  const words = DATA.carimbos && DATA.carimbos.length ? DATA.carimbos : ['DEMAIS!'];
  G.hud.close();
  G.setArt('colagem');
  document.body.classList.add('teaser-on');

  // ---------- camada do clipe ----------
  const css = document.createElement('style');
  css.textContent = `
    body.teaser-on #hud { visibility: hidden; }
    body.teaser-on { background: #000; }
    #teaser { position: fixed; inset: 0; z-index: 60; pointer-events: none; overflow: hidden; }
    #teaser canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
    #teaser .go { position: absolute; left: 3vw; bottom: 4vh; pointer-events: auto; cursor: pointer; } /* aberto direto: botão pequeno no canto, sem cobrir o clipe */
    #teaser .go b { font: 26px 'Lilita One', sans-serif; color: #e3f230; -webkit-text-stroke: 3px #1a1622; text-shadow: 6px 6px 0 #d9261c; transform: rotate(-4deg); }
  `;
  document.head.append(css);
  const root = document.createElement('div'); root.id = 'teaser';
  root.innerHTML = '<canvas class="fx"></canvas>' + (slave ? '' : '<div class="go"><b>▶ TOCAR</b></div>');
  document.body.append(root);
  const cv = root.querySelector('canvas.fx'), g = cv.getContext('2d');
  let DPR = 1;
  const fit = () => { DPR = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * DPR; cv.height = innerHeight * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0); };
  fit(); addEventListener('resize', fit);
  const W = () => innerWidth, H = () => innerHeight;
  if (!slave) root.querySelector('.go').onclick = e => { e.currentTarget.remove(); track.play(0); };

  const trail = document.createElement('canvas'), tg = trail.getContext('2d');
  const sprite = document.createElement('canvas'); sprite.width = sprite.height = 512;
  const noise = document.createElement('canvas'); noise.width = noise.height = 160;
  { const n = noise.getContext('2d'), im = n.createImageData(160, 160); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } n.putImageData(im, 0, 0); }

  // ---------- desenho ----------
  function athlete(id, x, y, size, o = {}) {
    const ch = CHARACTERS[id]; if (!ch) return;
    const st = o.anim ? { state: AIR.includes(o.anim) ? 'air' : 'ground', swing: { anim: o.anim, kind: o.kind || 'attack', t: o.t ?? 0.5 } } : { mood: o.mood || null };
    drawAthlete(sprite.getContext('2d'), ch, poseFor(dummy(st), o.time ?? 0), o.time ?? 0);
    g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.flip) g.scale(-1, 1);
    if (o.crop) g.drawImage(sprite, 128, 20, 256, 256, -size / 2, -size / 2, size, size);
    else g.drawImage(sprite, -size / 2, -size, size, size);
    g.restore();
  }
  // letras de cartaz: separação de cores (impressão desalinhada), contorno grosso e caixa opcional
  function slam(text, x, y, size, o = {}) {
    g.save(); g.translate(x, y); g.rotate(o.rot ?? -0.06); g.scale(o.scale ?? 1, o.scale ?? 1);
    g.font = `${size}px 'Lilita One', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (o.box) { const w = g.measureText(text).width; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-w / 2 - size * 0.18 + 8, -size * 0.6 + 9, w + size * 0.36, size * 1.15); g.fillStyle = o.box; g.fillRect(-w / 2 - size * 0.18, -size * 0.6, w + size * 0.36, size * 1.15); }
    g.globalAlpha = 0.85; g.fillStyle = '#ff2a6d'; g.fillText(text, -size * 0.05, size * 0.03); g.fillStyle = '#25e0ff'; g.fillText(text, size * 0.05, -size * 0.02); g.globalAlpha = 1;
    g.lineWidth = size * 0.1; g.strokeStyle = '#1a1622'; g.strokeText(text, 0, 0);
    g.fillStyle = o.color || '#e3f230'; g.fillText(text, 0, 0);
    g.restore();
  }
  function burst(cx, cy, t, cols, n = 18) {
    const R = Math.hypot(W(), H());
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + t * 0.6, a1 = a0 + Math.PI / n;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); g.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); g.closePath();
      g.fillStyle = cols[i % cols.length]; g.fill();
    }
  }
  function halftone(col, t, alpha = 0.25) {
    g.save(); g.globalAlpha = alpha; g.fillStyle = col;
    const s = 14, w = W(), h = H();
    for (let y = 0; y < h + s; y += s) for (let x = (y / s) % 2 ? s / 2 : 0; x < w + s; x += s) { const r = (Math.sin(x * 0.01 + t * 2) + Math.cos(y * 0.013 - t * 1.5) + 2) * 1.6; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  // o quadro do jogo (o teaser desenha depois do jogo no mesmo quadro, então a imagem ainda está lá)
  const feed = (x, y, w, h, filter) => { if (!gameCanvas) return; g.save(); if (filter) g.filter = filter; g.drawImage(gameCanvas, x, y, w, h); g.restore(); };

  // ---------- câmeras de clipe (sobrescrevem a câmera do jogo depois do rig) ----------
  const tmpQ = new THREE.Quaternion(), V = new THREE.Vector3();
  let camMode = null, camT = 0, camWho = 0, camRoll = 0, shake = 0;
  const pl = i => { const m = G.match; return m && m.players[Math.floor(i) % m.players.length]; };
  G.setCamera((cam, dt) => {
    camT += dt;
    if (!camMode) { if (cam.fov !== baseFov) { cam.fov = baseFov; cam.updateProjectionMatrix(); } return; }
    const m = G.match; if (!m) return;
    const p = pl(camWho), b = m.ball.pos, a = camT;
    const side = p && p.team === 0 ? -1 : 1;
    let fov = 50;
    if (camMode === 'drone') { cam.position.set(Math.sin(a * 0.25) * 6, 17, 9 + Math.cos(a * 0.2) * 3); cam.lookAt(0, 0, 0); fov = 55; }
    else if (camMode === 'low' && p) { cam.position.set(p.x - side * 3.2 + Math.sin(a) * 0.4, 0.35, p.z + 4.2); cam.lookAt(p.x, 1.5, p.z); fov = 58; }
    else if (camMode === 'orbit') { const r = 13, ang = a * 0.55; cam.position.set(Math.cos(ang) * r, 3.4, Math.sin(ang) * r * 0.75 + 4); cam.lookAt(b.x * 0.4, 1.2, b.z * 0.4); fov = 48; }
    else if (camMode === 'close' && p) { cam.position.set(p.x - side * 1.6, 1.9, p.z + 3.0); cam.lookAt(p.x, 1.6, p.z); fov = 42; }
    else if (camMode === 'ball') { cam.position.set(b.x * 0.85, Math.max(1.2, b.y + 0.6), b.z + 5.5); cam.lookAt(b.x, b.y, b.z); fov = 55; }
    else if (camMode === 'fish' && p) { cam.position.set(p.x - side * 1.2, 0.5, p.z + 1.8); cam.lookAt(p.x + side * 2, 1.3, p.z - 1); fov = 100; }
    else if (camMode === 'scenic') { const px = Math.sin(a * 0.18) * 5; cam.position.set(px, 3.2, 15); cam.lookAt(px * 2 + (camWho % 2 ? 25 : -15), 20, -180); fov = 46; }
    else if (camMode === 'net') { cam.position.set(0.3, 2.6, 2.2); cam.lookAt(side * 6, 0.8, 0); fov = 75; }
    if (shake) cam.position.add(V.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0));
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    // os atletas (placas viradas para a câmera) acompanham, sem o giro da câmera torta
    tmpQ.copy(cam.quaternion);
    for (const v of G.view.views || []) v.mesh.quaternion.copy(tmpQ);
    if (camRoll) cam.rotateZ(camRoll);
  });

  // lances de verdade: especial (a câmera lenta já vem do jogo) e ponto ganham carimbo e flash
  let stamp = null, flash = 0, clock = 0;
  G.onEvent(e => {
    if (e.type === 'special' && e.move) { stamp = { text: e.move.name, t: 0, big: true }; flash = 1; }
    else if (e.type === 'point') { stamp = { text: pick(words, clock * 7), t: 0 }; flash = 0.6; }
  });
  const juice = () => { const m = G.match; if (m) for (const p of m.players) p.meter = 100; }; // CPU com barra cheia: mais especiais

  // ---------- o roteiro, em tempos (beats) da música ----------
  const SH = [];
  const add = (b0, len, kind, o = {}) => SH.push({ b0, len, kind, ...o });
  const zonesList = ['superior', 'tronco', 'inferior'].filter(z => V5.golpesZona && V5.golpesZona[z]);
  if (VERSION === '30') {
    // ---- 30 segundos, rock do começo ao fim (80 tempos) ----
    add(0, 2, 'landscape', { hood: 'urca', who: 0 }); add(2, 2, 'landscape', { hood: 'ipanema', who: 1 });           // riff: o Rio
    ['RIO', 'FUTE', 'VÔLEI', '5.0'].forEach((w, i) => add(4 + i, 1, 'title', { word: w, i }));                         // título no tempo
    [['low', 0], ['orbit'], ['close', 2], ['ball'], ['fish', 1], ['net'], ['low', 3, 0.22], ['drone']]                 // pancada: melhores lances
      .forEach(([cam, who, roll], i) => add(8 + i * 2, 2, 'cam', { cam, who: who || 0, roll: roll || 0, juice: true, word: i % 3 === 1 ? words[i % words.length] : null }));
    zonesList.forEach((z, i) => add(24 + i * 4, 4, 'moves', { zone: z, zi: i }));                                       // golpes comuns
    add(36, 2, 'cam', { cam: 'close', who: 0, juice: true }); add(38, 2, 'cam', { cam: 'ball', juice: true });
    cast.slice(0, 8).forEach((id, i) => add(40 + i, 1, 'photo', { id, i }));                                            // breque: fotos, uma por batida
    specials.slice(0, 8).forEach((sp, i) => add(48 + i * 2, 2, 'special', { s: sp, i, fast: true }));                   // solo: os especiais
    cast.slice(8, 12).forEach((id, i) => add(64 + i * 2, 2, 'photo', { id, i: i + 8, hood: ['saoConrado', 'botafogo', 'leblon', 'flamengo'][i] })); // fotos nas paisagens
    add(72, 4, 'stop', { word: 'FUTEVÔLEI', i: 1 }); add(76, 4, 'end');                                                 // final
  } else {
  for (let b = 0; b < 8; b += 2) add(b, 2, 'faces', { i: b / 2 });               // intro: rostos no chiado
  for (let b = 8; b < 12; b++) add(b, 1, 'faces', { i: b });
  ['RIO', 'FUTE', 'VÔLEI', '5.0'].forEach((w, i) => add(12 + i, 1, 'title', { word: w, i })); // título batendo
  [['drone'], ['low', 0], ['orbit'], ['close', 2], ['ball'], ['low', 3, 0.22], ['fish', 1], ['net']] // verso: a praia
    .forEach(([cam, who, roll], i) => add(16 + i * 4, 4, 'cam', { cam, who: who || 0, roll: roll || 0, word: i % 3 === 2 ? words[i % words.length] : null }));
  specials.slice(0, 8).forEach((s, i) => add(48 + i * 4, 4, 'special', { s, i }));   // refrão: os especiais
  add(80, 8, 'split'); add(88, 4, 'cam', { cam: 'close', who: 1 }); add(92, 4, 'kaleido', { cam: 'orbit' }); // verso 2
  add(96, 4, 'cam', { cam: 'low', who: 2, roll: -0.25 }); add(100, 4, 'cam', { cam: 'ball' }); add(104, 4, 'kaleido', { cam: 'drone' }); add(108, 4, 'cam', { cam: 'fish', who: 3 });
  add(112, 16, 'dub', { cam: 'orbit' });                                            // parte lenta
  for (let b = 128; b < 136; b++) add(b, 1, 'faces', { i: b, zoom: true });         // subida: rostos acelerando
  for (let b = 136; b < 144; b += 0.5) add(b, 0.5, 'faces', { i: b * 2, zoom: true });
  add(144, 4, 'cam', { cam: 'low', who: 0, juice: true }); add(148, 4, 'cam', { cam: 'orbit', juice: true }); add(152, 4, 'cam', { cam: 'close', who: 2, juice: true }); // refrão 2
  add(156, 4, 'cam', { cam: 'ball', juice: true }); add(160, 8, 'grid'); add(168, 4, 'cam', { cam: 'fish', who: 0, juice: true }); add(172, 4, 'kaleido', { cam: 'low' });
  for (let b = 176; b < 208; b += 2) add(b, 2, 'punk', { i: (b - 176) / 2 });       // ponte punk
  specials.slice(0, 4).forEach((s, i) => add(208 + i * 2, 2, 'special', { s, i: i + 3, fast: true })); // refrão final
  add(216, 8, 'grid', { all: true });
  ['RIO', 'FUTEVÔLEI', '5.0'].forEach((w, i) => add(224 + i * 4, 4, 'stop', { word: w, i })); // final: paradas
  add(236, 4, 'end');
  }
  const shotAt = b => { for (let i = SH.length - 1; i >= 0; i--) if (b >= SH[i].b0) return SH[i]; return SH[0]; };
  const scenes = SECTIONS.map(s => ({ name: s.name, start: s.from * 4 * BEAT, dur: (s.to - s.from) * 4 * BEAT }));

  // ---------- troca de corte ----------
  let punkDirty = false, cur = null, lastT = -1, playing = false, extT = 0, extAt = 0, matchIdx = -1;
  const teams = [[['tito', 'dada'], ['rosa', 'pePato']], [['arcano', 'carneiro'], ['giulia', 'tubarao']], [['zefa', 'drauzio'], ['varella', 'pipoca']]].map(t => t.map(x => x.filter(id => CHARACTERS[id])));
  function ensureMatch(i) { if (matchIdx !== i) { matchIdx = i; G.newMatch(teams[i % teams.length]); } }
  function enterShot(s) {
    // saindo da ponte punk (ou pulando de capítulo): volta Copacabana, sem clima, no visual Colagem
    const scenic = s.kind === 'landscape' || (s.kind === 'photo' && s.hood);
    if (s.kind !== 'punk' && !scenic && punkDirty) { punkDirty = false; G.arena.setHood('copacabana'); G.weatherFx.set([]); G.setArt('colagem'); }
    camMode = null; camRoll = 0; shake = 0;
    if (['cam', 'kaleido', 'dub', 'split', 'punk', 'stop'].includes(s.kind)) {
      ensureMatch(VERSION === '30' ? (s.b0 < 40 ? 0 : 1) : s.b0 < 112 ? 0 : s.b0 < 176 ? 1 : 2);
      camMode = s.kind === 'split' || s.kind === 'stop' ? null : (s.cam || 'orbit'); camWho = s.who || 0; camRoll = s.roll || 0; camT = 0;
      if (s.word) stamp = { text: s.word, t: 0 };
    }
    if (scenic) {
      punkDirty = true; ensureMatch(VERSION === '30' ? (s.b0 < 40 ? 0 : 1) : 2);
      G.arena.setHood(s.hood); G.weatherFx.set([]); G.setArt('colagem');
      camMode = 'scenic'; camWho = s.who || s.i || 0; camT = 0;
      if (s.kind === 'landscape') stamp = { text: HOODS[s.hood] ? HOODS[s.hood].name.toUpperCase() : 'RIO', t: 0, small: true };
    }
    if (s.kind === 'punk') {
      punkDirty = true;
      const id = pick(hoods, s.i * 5 + 1); G.arena.setHood(id);
      G.weatherFx.set(s.i % 4 === 1 ? ['chuva'] : s.i % 4 === 3 ? ['sol'] : []);
      G.setArt(['colagem', 'pincel', 'cartoon', 'colagem'][Math.floor(s.i / 2) % 4]);
      camMode = pick(['low', 'net', 'fish', 'drone', 'close', 'ball'], s.i); camWho = s.i; camRoll = s.i % 3 === 0 ? 0.3 : s.i % 3 === 1 ? -0.2 : 0; shake = 0.25;
      stamp = { text: HOODS[id].name.toUpperCase(), t: 0, small: true };
    }
  }

  // ---------- cada quadro ----------
  function draw(t, dt) {
    const b = t / BEAT, beatPhase = b % 1, bar = Math.floor(b / 4);
    const sec = SECTIONS.find(s => bar >= s.from && bar < s.to) || SECTIONS[SECTIONS.length - 1];
    const s = shotAt(b);
    if (s !== cur) { enterShot(s); cur = s; }
    const u = Math.min(1, Math.max(0, (b - s.b0) / s.len));
    const w = W(), h = H();
    if (s.juice || sec.name.startsWith('Refrão') || sec.name === 'Pancada' || sec.name === 'Solo') juice();
    const m = G.match;
    if (m) m.timeScale = s.kind === 'dub' ? 0.32 : s.kind === 'stop' ? ((b - s.b0) < 0.25 ? 1 : 0.02) : (m.slowT > 0 ? m.timeScale : 1);

    // filtro e soco de zoom no quadro do jogo
    const punch = ['rock', 'punk', 'stops'].includes(sec.drums) ? Math.max(0, 1 - beatPhase * 4) : 0;
    let filter = 'saturate(1.25) contrast(1.08)';
    if (s.kind === 'dub') filter = 'grayscale(1) contrast(1.5) brightness(1.05)';
    if (s.kind === 'punk') filter = `saturate(1.6) contrast(1.2) hue-rotate(${(s.i * 47) % 360}deg)`;
    if (s.kind === 'stop') filter = 'saturate(2) contrast(1.4)';
    if (gameCanvas) { gameCanvas.style.filter = filter; gameCanvas.style.transform = `scale(${1 + punch * 0.045})`; }

    g.clearRect(0, 0, w, h);
    if (s.kind === 'faces') {
      g.fillStyle = '#0d0b10'; g.fillRect(0, 0, w, h);
      const id = pick(cast, s.i * 7 + 3), col = CHARACTERS[id].color || '#ff7a2e';
      burst(w / 2, h / 2, t, [col, '#1a1622'], 14);
      halftone('#000', t, 0.35);
      const size = Math.min(w, h) * (s.zoom ? 0.75 + u * 0.4 : 0.9);
      athlete(id, w / 2, h / 2, size, { crop: true, mood: s.i % 2 ? 'happy' : null, time: t, rot: (s.i % 2 ? 1 : -1) * 0.06 });
      slam(CHARACTERS[id].name.toUpperCase(), w / 2, h * 0.86, Math.min(70, w * 0.07), { rot: (s.i % 2 ? 0.05 : -0.05), box: '#1a1622', color: col });
    } else if (s.kind === 'title') {
      g.fillStyle = ['#d9261c', '#ff7a2e', '#1f2a66', '#e3f230'][s.i]; g.fillRect(0, 0, w, h);
      burst(w / 2, h / 2, t * 2, ['rgba(255,255,255,.14)', 'rgba(0,0,0,0)'], 20);
      halftone('#1a1622', t, 0.18);
      slam(s.word, w / 2, h / 2, Math.min(h * 0.5, w * 0.28), { scale: 1.25 - Math.min(1, u * 4) * 0.25, rot: [-0.08, 0.06, -0.04, 0.1][s.i], color: s.i === 3 ? '#1a1622' : '#fbf6e8' });
    } else if (s.kind === 'landscape') {
      // o Rio em cartão-postal: só um véu quente de fim de tarde e o nome do lugar
      const vg = g.createLinearGradient(0, 0, 0, h); vg.addColorStop(0, 'rgba(255,140,60,.18)'); vg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
      slam('RIO DE JANEIRO', w * 0.5, h * 0.2, Math.min(80, w * 0.07), { rot: -0.05, color: '#fbf6e8', scale: 1 + Math.max(0, 0.25 - u) });
    } else if (s.kind === 'photo') {
      // foto do atleta (polaroide colada), com a personalidade dele
      const ch = CHARACTERS[s.id], col = ch.color || '#ff7a2e';
      if (!s.hood) { g.fillStyle = col; g.fillRect(0, 0, w, h); burst(w / 2, h / 2, t * 0.8, ['rgba(255,255,255,.16)', 'rgba(0,0,0,.12)'], 16); halftone('#1a1622', t, 0.18); }
      else { g.fillStyle = 'rgba(10,8,14,.18)'; g.fillRect(0, 0, w, h); }
      const pw = Math.min(w * 0.36, h * 0.56), ph = pw * 1.2, cx = s.hood ? w * (s.i % 2 ? 0.68 : 0.32) : w * 0.4, cy = h * 0.47;
      const slap = Math.max(0, 1 - u * 5), rot = (s.i % 2 ? 0.07 : -0.06) + slap * 0.25;
      g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(1 + slap * 0.2, 1 + slap * 0.2);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-pw / 2 + 10, -ph / 2 + 12, pw, ph);
      g.fillStyle = '#fbf8f0'; g.fillRect(-pw / 2, -ph / 2, pw, ph);
      const iw = pw * 0.88, ih = pw * 0.88, ix = -iw / 2, iy = -ph / 2 + pw * 0.06;
      const bg = g.createLinearGradient(0, iy, 0, iy + ih); bg.addColorStop(0, '#ffb27a'); bg.addColorStop(0.6, '#8a90dc'); bg.addColorStop(1, '#e9cf9a'); g.fillStyle = bg; g.fillRect(ix, iy, iw, ih);
      g.save(); g.beginPath(); g.rect(ix, iy, iw, ih); g.clip();
      const sp = MOVES[ch.special], pose = s.i % 3 === 1 && sp ? { anim: sp.anim, kind: sp.defense ? 'defense' : 'attack', t: 0.45, time: t } : { mood: s.i % 3 === 2 ? null : 'happy', time: t };
      athlete(s.id, 0, iy + ih * 1.55, ih * 1.75, pose);
      g.restore();
      g.fillStyle = 'rgba(255,240,200,.55)'; g.save(); g.rotate(-0.2); g.fillRect(-pw * 0.18, -ph / 2 - 12, pw * 0.36, 26); g.restore(); // fita adesiva
      g.font = `${Math.round(pw * 0.11)}px 'Permanent Marker', 'Lilita One', sans-serif`; g.fillStyle = '#1a1622'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(ch.name, 0, iy + ih + (ph - pw * 0.06 - ih) / 2);
      g.restore();
      const per = (ch.bio || (DATA.personalidades || {})[s.id] || '').split(/[.:]/)[0];
      if (per) { const tx = s.hood ? (s.i % 2 ? w * 0.3 : w * 0.7) : w * 0.76, ty = h * 0.5; g.save(); g.font = `800 ${Math.max(14, Math.round(h * 0.03))}px 'Nunito', sans-serif`; const lines = []; let line = ''; for (const wd of per.split(' ')) { const tt = line ? line + ' ' + wd : wd; if (g.measureText(tt).width > w * 0.3 && line) { lines.push(line); line = wd; } else line = tt; } if (line) lines.push(line); const lh = h * 0.042, bw = w * 0.32, bh = lines.length * lh + 20; g.translate(tx, ty); g.rotate(s.i % 2 ? -0.03 : 0.03); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-bw / 2 + 6, -bh / 2 + 7, bw, bh); g.fillStyle = '#e3f230'; g.fillRect(-bw / 2, -bh / 2, bw, bh); g.fillStyle = '#1a1622'; g.textAlign = 'center'; g.textBaseline = 'middle'; lines.forEach((l, j) => g.fillText(l, 0, -bh / 2 + 10 + lh * (j + 0.5))); g.restore(); }
    } else if (s.kind === 'moves') {
      // golpes comuns de cada parte da hitbox: 1º, 2º e 3º toque, em 3 telas
      const z = s.zone, zc = ((V5.zonas || {})[z] || {}).cor || '#ff7a2e', who = ['tito', 'dada', 'rosa', 'pePato', 'arcano', 'carneiro', 'giulia', 'zefa', 'tubarao'];
      g.fillStyle = '#0d0b10'; g.fillRect(0, 0, w, h);
      for (let toque = 1; toque <= 3; toque++) {
        const list = V5.golpesZona[z][toque] || [], gg = list[Math.floor(b) % Math.max(1, list.length)] || list[0]; if (!gg) continue;
        const x0 = (toque - 1) * w / 3, pwid = w / 3;
        g.fillStyle = (toque + Math.floor(b)) % 2 ? zc : '#f4ecd8'; g.fillRect(x0 + 4, 4, pwid - 8, h - 8);
        g.save(); g.beginPath(); g.rect(x0 + 4, 4, pwid - 8, h - 8); g.clip();
        halftone('#1a1622', t + toque, 0.12);
        athlete(pick(who, s.zi * 3 + toque), x0 + pwid / 2, h * 0.9, Math.min(h * 0.82, pwid * 1.1), { anim: gg.anim, t: b % 1, time: t });
        g.restore();
        slam(`${toque}º TOQUE`, x0 + pwid / 2, h * 0.1, Math.min(30, w * 0.028), { rot: 0.03, box: '#1a1622', color: '#fbf6e8' });
        slam(gg.nome.toUpperCase(), x0 + pwid / 2, h * 0.92, Math.min(34, w * 0.03), { rot: toque % 2 ? -0.04 : 0.04, box: '#e3f230', color: '#1a1622' });
      }
      if (u < 0.3) slam(`GOLPES · ${({ superior: 'CABEÇA', tronco: 'TRONCO', inferior: 'PÉS' })[z] || z}`, w / 2, h * 0.5, Math.min(70, w * 0.065), { rot: -0.06, color: zc, scale: 1 + Math.max(0, 0.3 - u * 1.5) });
    } else if (s.kind === 'special') {
      const sp = s.s, who = owner(sp.id), col = sp.defense ? ['#8c8fd8', '#1f2a66'] : ['#ff7a2e', '#d9261c'];
      burst(w * 0.42, h * 0.6, t * (s.fast ? 3 : 1.5), col, 22);
      halftone('#1a1622', t, 0.3);
      g.strokeStyle = 'rgba(251,246,232,.7)'; g.lineWidth = 3; // linhas de velocidade
      for (let i = 0; i < 18; i++) { const y = ((i * 97 + t * 900) % (h + 100)) - 50, x = (i * 173) % w; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 140, y); g.stroke(); }
      athlete(who, w * 0.4, h * 1.02, Math.min(h * 1.0, w * 0.6), { anim: sp.anim, kind: sp.defense ? 'defense' : 'attack', t: Math.min(1, u * 1.25), time: t, flip: s.i % 2 === 1 });
      if (u > 0.45 && u < 0.52) flash = Math.max(flash, 0.8); // impacto
      slam(sp.name, w * 0.68, h * 0.2, Math.min(90, w * 0.075), { rot: -0.08, box: '#1a1622', color: sp.defense ? '#fbf6e8' : '#e3f230', scale: 1 + Math.max(0, 0.3 - u) });
      slam(sp.defense ? 'DEFESA' : 'ATAQUE', w * 0.74, h * 0.33, Math.min(34, w * 0.03), { rot: 0.04, box: '#e3f230', color: '#1a1622' });
    } else if (s.kind === 'split') {
      const hw = w / 2, hh = h / 2, fil = ['saturate(1.4)', 'hue-rotate(120deg) saturate(1.6)', 'grayscale(1) contrast(1.6)', 'hue-rotate(240deg) saturate(1.6)'];
      for (let i = 0; i < 4; i++) feed((i % 2) * hw, Math.floor(i / 2) * hh, hw, hh, fil[(i + Math.floor(b)) % 4]);
      g.fillStyle = '#1a1622'; g.fillRect(hw - 4, 0, 8, h); g.fillRect(0, hh - 4, w, 8);
    } else if (s.kind === 'kaleido') {
      const f = `saturate(1.8) hue-rotate(${Math.round(t * 90) % 360}deg)`;
      feed(0, 0, w / 2, h / 2, f);
      g.save(); g.translate(w, 0); g.scale(-1, 1); feed(0, 0, w / 2, h / 2, f); g.restore();
      g.save(); g.translate(0, h); g.scale(1, -1); feed(0, 0, w / 2, h / 2, f); g.restore();
      g.save(); g.translate(w, h); g.scale(-1, -1); feed(0, 0, w / 2, h / 2, f); g.restore();
    } else if (s.kind === 'dub') {
      if (trail.width !== cv.width || trail.height !== cv.height) { trail.width = cv.width; trail.height = cv.height; }
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.72; g.drawImage(trail, 6 * DPR * Math.sin(t * 2), 0); g.restore();
      g.save(); g.globalAlpha = 0.4; g.globalCompositeOperation = 'screen'; feed(0, 0, w, h, 'grayscale(1) contrast(1.6)'); g.restore();
      tg.clearRect(0, 0, trail.width, trail.height); tg.drawImage(cv, 0, 0);
      slam(['RIO', 'DE', 'JANEIRO', 'FIM DE TARDE'][Math.min(3, Math.floor(u * 4))], w / 2, h * 0.5, Math.min(120, w * 0.11), { rot: -0.03, color: '#fbf6e8' });
    } else if (s.kind === 'grid') {
      const list = s.all ? cast : cast.slice(0, 8), cols = 4, rows = Math.ceil(list.length / cols);
      g.fillStyle = '#0d0b10'; g.fillRect(0, 0, w, h);
      const cw = w / cols, chh = h / rows;
      list.forEach((id, i) => {
        const x = (i % cols) * cw, y = Math.floor(i / cols) * chh, c = CHARACTERS[id], sp = MOVES[c.special];
        g.fillStyle = (i + Math.floor(b)) % 2 ? (c.color || '#ff7a2e') : '#f4ecd8'; g.fillRect(x + 3, y + 3, cw - 6, chh - 6);
        g.save(); g.beginPath(); g.rect(x + 3, y + 3, cw - 6, chh - 6); g.clip();
        athlete(id, x + cw / 2, y + chh * 1.02, chh * 1.05, sp ? { anim: sp.anim, kind: sp.defense ? 'defense' : 'attack', t: (b * 0.5 + i * 0.13) % 1, time: t } : { time: t });
        g.restore();
      });
    } else if (s.kind === 'stop') {
      const hit = Math.max(0, 1 - (b - s.b0) * 1.5);
      g.fillStyle = `rgba(13,11,16,${0.3 + 0.3 * (1 - hit)})`; g.fillRect(0, 0, w, h);
      slam(s.word, w / 2, h / 2, Math.min(h * 0.32, w * (s.word.length > 4 ? 0.13 : 0.26)), { scale: 1 + hit * 0.4, rot: [-0.06, 0.04, -0.1][s.i], color: ['#e3f230', '#ff7a2e', '#fbf6e8'][s.i], box: s.i === 1 ? '#1a1622' : null });
      if (hit > 0.95) flash = 1;
    } else if (s.kind === 'end') {
      g.fillStyle = '#0d0b10'; g.fillRect(0, 0, w, h);
      burst(w / 2, h * 0.38, t * 0.5, ['#ff7a2e', '#d9261c'], 24);
      const n = cast.length, size = Math.min(h * 0.38, w / n * 2.1);
      cast.forEach((id, i) => athlete(id, w * (i + 0.5) / n, h * 1.0, size, { mood: 'happy', time: t + i }));
      slam('RIO FUTEVÔLEI', w / 2, h * 0.3, Math.min(110, w * 0.09), { rot: -0.05, box: '#1a1622', color: '#e3f230' });
      slam('5.0', w * 0.72, h * 0.47, Math.min(80, w * 0.07), { rot: 0.1, color: '#fbf6e8' });
      const fade = Math.max(0, (u - 0.75) / 0.25); if (fade) { g.fillStyle = `rgba(0,0,0,${fade})`; g.fillRect(0, 0, w, h); }
    }

    // carimbo
    if (stamp) {
      stamp.t += dt;
      const k = stamp.t, sz = stamp.small ? Math.min(46, w * 0.045) : stamp.big ? Math.min(100, w * 0.085) : Math.min(72, w * 0.065);
      if (k >= 1.1) stamp = null;
      else if (!['special', 'title', 'stop', 'end', 'faces', 'grid', 'photo', 'moves'].includes(s.kind)) slam(stamp.text, w * 0.5, h * (stamp.small ? 0.82 : 0.24), sz, { scale: 1 + Math.max(0, 0.35 - k * 1.5), rot: -0.07 + (stamp.text.length % 3) * 0.04, box: stamp.small ? '#1a1622' : null, color: stamp.big ? '#e3f230' : '#fbf6e8' });
    }
    // flash nas viradas e nos impactos
    if (beatPhase < 0.08 && Math.floor(b) % 4 === 0 && (sec.drums === 'rock' || sec.drums === 'punk')) flash = Math.max(flash, 0.35);
    if (flash > 0) { g.fillStyle = `rgba(255,252,240,${flash * 0.8})`; g.fillRect(0, 0, w, h); flash = Math.max(0, flash - dt * 4); }

    // fita VHS: chiado, linhas, faixa rolando, cantos escuros, texto e contador
    const vhs = DATA.vhs || {};
    g.save(); g.globalAlpha = (vhs.chiado ?? 0.35) * 0.35; g.globalCompositeOperation = 'overlay';
    g.translate(-Math.random() * 160, -Math.random() * 160); g.fillStyle = g.createPattern(noise, 'repeat'); g.fillRect(0, 0, w + 160, h + 160); g.restore();
    if ((vhs.linhas ?? 0.35) > 0) { g.fillStyle = `rgba(0,0,0,${(vhs.linhas ?? 0.35) * 0.35})`; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1); }
    const band = (t * 120) % (h + 80) - 40; g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, band, w, 26);
    const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    g.font = `bold ${Math.max(12, Math.round(h * 0.03))}px 'Courier New', monospace`; g.textAlign = 'left'; g.fillStyle = '#e8f0ff'; g.shadowColor = '#000'; g.shadowBlur = 4;
    g.fillText(vhs.canto || '▶ PLAY  SP', w * 0.04, h * 0.08);
    g.textAlign = 'right'; g.fillText(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}:${String(Math.floor((t % 1) * 30)).padStart(2, '0')}`, w * 0.96, h * 0.93);
    g.shadowBlur = 0;
  }

  // ---------- relógio: o da música (no player, mandado por ele; aberto direto, o próprio) ----------
  addEventListener('message', e => { const m = e.data || {}; if (m.teaser === 'time') { extT = m.t; extAt = performance.now(); playing = !!m.playing; } });
  let last = performance.now(), sent = 0;
  let exporting = false;
  function tick(now) {
    if (exporting) { requestAnimationFrame(tick); return; }
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!slave) playing = track.playing;
    let t = slave ? (playing ? extT + (now - extAt) / 1000 : extT) : track.time;
    t = Math.max(0, Math.min(TOTAL - 0.001, t));
    if (t < lastT - 0.5 || t > lastT + 2) { cur = null; } // pulou de capítulo: refaz o corte
    lastT = t; clock = t;
    G.hud.close();
    draw(t, dt);
    if (now - sent > 200 && parent !== window) {
      sent = now;
      const sceneIdx = Math.max(0, scenes.findIndex(sc => t >= sc.start && t < sc.start + sc.dur));
      parent.postMessage({ teaser: 'state', t, total: TOTAL, scene: sceneIdx, paused: !playing, scenes }, '*');
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  addEventListener('beforeunload', () => G.setArt(originalArt));

  // ---------- exportar MP4 (H.264 + AAC, 1280×720, 30 quadros/s) ----------
  // Cada quadro é feito à mão, com passo fixo: o jogo anda 1/30 s, o clipe desenha, e o quadro composto
  // (jogo com filtro e soco de zoom + camada do clipe) vai para o codificador do navegador. Não depende do tempo real.
  const yieldNow = () => new Promise(r => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
  async function renderAudio(sr) {
    const off = new OfflineAudioContext(2, Math.ceil(sr * (TOTAL + 0.5)), sr);
    const AC = window.AudioContext; window.AudioContext = function () { return off; };
    const tr = new SkaTrack(JSON.parse(JSON.stringify(DATA)), SECTIONS);
    try { tr.ensure(); } finally { window.AudioContext = AC; }
    tr.bus = off.createGain(); tr.bus.connect(tr.out);
    tr.dub = off.createDelay(1); tr.dub.delayTime.value = tr.beat * 0.75;
    const fb = off.createGain(); fb.gain.value = Math.min(0.8, DATA.eco ?? 0.45); tr.dub.connect(fb); fb.connect(tr.dub); tr.dub.connect(tr.bus);
    tr.chains();
    for (let i = 0; i < tr.bars * 4; i++) tr.beatAt(i, i * tr.beat);
    return off.startRendering();
  }
  async function exportMP4(onProgress = () => {}) {
    const FPS = 30, OW = 1280, OH = 720, N = Math.round(TOTAL * FPS), SR = 48000;
    // 1) áudio: a mesma trilha, gravada fora do tempo real
    onProgress(0, 'gravando a música');
    const abuf = await renderAudio(SR);
    const aSamples = []; let asc = null;
    const aenc = new AudioEncoder({ output: (chunk, meta) => { if (meta && meta.decoderConfig && meta.decoderConfig.description) asc = new Uint8Array(meta.decoderConfig.description); const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); aSamples.push({ data: d }); }, error: e => { throw e; } });
    aenc.configure({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 2, bitrate: 192000 });
    const L = abuf.getChannelData(0), R = abuf.getChannelData(1), total = Math.round(TOTAL * SR);
    for (let o = 0; o < total; o += 4800) {
      const n = Math.min(4800, total - o), pl = new Float32Array(n * 2); pl.set(L.subarray(o, o + n), 0); pl.set(R.subarray(o, o + n), n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(o / SR * 1e6), data: pl });
      aenc.encode(ad); ad.close();
    }
    await aenc.flush(); aenc.close();
    // 2) vídeo: quadro a quadro
    const vSamples = []; let avcC = null;
    const venc = new VideoEncoder({ output: (chunk, meta) => { if (meta && meta.decoderConfig && meta.decoderConfig.description) avcC = new Uint8Array(meta.decoderConfig.description); const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); vSamples.push({ data: d, key: chunk.type === 'key' }); }, error: e => { throw e; } });
    venc.configure({ codec: 'avc1.42E01F', width: OW, height: OH, bitrate: 5_000_000, framerate: FPS, avc: { format: 'avc' }, latencyMode: 'quality' });
    const out = document.createElement('canvas'); out.width = OW; out.height = OH; const og = out.getContext('2d');
    exporting = true; G.setExportMode(true);
    cur = null; matchIdx = -1; stamp = null; flash = 0; punkDirty = true; lastT = -1;
    try {
      for (let i = 0; i < N; i++) {
        const t = i / FPS;
        G.frameStep(1 / FPS);         // o jogo anda e desenha (câmera de clipe incluída)
        clock = t; lastT = t; draw(t, 1 / FPS); // o clipe desenha por cima
        og.fillStyle = '#000'; og.fillRect(0, 0, OW, OH);
        const k = +((gameCanvas.style.transform || '').match(/scale\(([\d.]+)\)/) || [0, 1])[1];
        og.save(); og.filter = gameCanvas.style.filter || 'none';
        og.translate(OW / 2, OH / 2); og.scale(k, k); og.drawImage(gameCanvas, -OW / 2, -OH / 2, OW, OH); og.restore();
        og.drawImage(cv, 0, 0, OW, OH);
        const vf = new VideoFrame(out, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / FPS) });
        venc.encode(vf, { keyFrame: i % (FPS * 2) === 0 }); vf.close();
        while (venc.encodeQueueSize > 4) await yieldNow();
        if (i % 15 === 0) { onProgress(i / N, 'gravando o vídeo'); await yieldNow(); }
      }
      await venc.flush(); venc.close();
    } finally { exporting = false; G.setExportMode(false); }
    onProgress(1, 'montando o arquivo');
    return muxMP4({ video: { width: OW, height: OH, fps: FPS, avcC, samples: vSamples }, audio: { sampleRate: SR, channels: 2, asc, samples: aSamples } });
  }
  // o player pede a exportação: { teaser: 'export' } → { teaser: 'exportProgress', p, msg } → { teaser: 'exportDone', url, path } (ou erro)
  addEventListener('message', async e => {
    if ((e.data || {}).teaser !== 'export') return;
    const reply = m => parent.postMessage(m, '*');
    try {
      const blob = await exportMP4((p, msg) => reply({ teaser: 'exportProgress', p, msg }));
      const name = `rio-futevolei-teaser-${VERSION === '30' ? '30s' : '1min30'}.mp4`;
      let path = null;
      try { const r = await fetch('/api/video?nome=' + encodeURIComponent(name), { method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body: blob }); const j = await r.json(); if (j.ok) path = j.path; } catch (err) { /* sem servidor: só o download */ }
      reply({ teaser: 'exportDone', url: URL.createObjectURL(blob), name, path, size: blob.size });
    } catch (err) { reply({ teaser: 'exportError', msg: String(err && err.message || err) }); }
  });
  window.__teaserExport = exportMP4;
}
