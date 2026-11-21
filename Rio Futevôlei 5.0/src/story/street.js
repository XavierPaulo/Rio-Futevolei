// 4.0 Modo História — o bairro em vista de lado (2.5D): da esquerda para a direita, praia com o CT,
// calçadão de ondas, 1º quarteirão (2 prédios), esquina com ponto de ônibus, 2º quarteirão (3 prédios).
// A Giulia anda pela calçada (eixo x); portas, o CT e o ponto de ônibus são pontos de interação.
import * as THREE from 'three';
import { drawAthlete } from '../art/draw.js';
import { poseFor } from '../art/poses.js';
import { dummy } from '../ui/portraits.js';
import { settings } from '../ui/settings.js';

const SPRITE = { cartoon: { size: 2.5, feet: 10 }, pincel: { size: 3.05, feet: 8 }, colagem: { size: 3.05, feet: 8 } };
const CANVAS = 256;
export const WALK_Z = 2;          // linha da calçada onde os atletas andam
export const BOUNDS = [-24, 56];  // até onde dá para andar
const BLOCK1 = [0, 19.5], ROAD = [20, 27.5], BLOCK2 = [28, 56.5];

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const flat = color => new THREE.MeshBasicMaterial({ color });
function shade(hex, k) {
  const c = new THREE.Color(hex); c.multiplyScalar(k); return c;
}

// fachada de um prédio: parede, janelas, porta e placa com o nome
function facadeTex(b, w, h) {
  const PX = 64;
  return canvasTex(Math.round(w * PX), Math.round(h * PX), (g, W, H) => {
    g.fillStyle = b.color; g.fillRect(0, 0, W, H);
    // faixa do telhado
    g.fillStyle = b.roof; g.fillRect(0, 0, W, PX * 0.45);
    // janelas (andares de cima)
    const floors = Math.max(1, Math.round(h / 3) - 1);
    for (let f = 0; f < floors; f++) {
      const y = PX * 0.9 + f * PX * 2.6;
      for (let x = PX * 0.7; x < W - PX * 1.2; x += PX * 1.9) {
        g.fillStyle = '#6aa9c9'; g.fillRect(x, y, PX * 1.1, PX * 1.3);
        g.strokeStyle = '#f5f1e8'; g.lineWidth = 6; g.strokeRect(x, y, PX * 1.1, PX * 1.3);
        g.beginPath(); g.moveTo(x + PX * 0.55, y); g.lineTo(x + PX * 0.55, y + PX * 1.3); g.moveTo(x, y + PX * 0.65); g.lineTo(x + PX * 1.1, y + PX * 0.65); g.stroke();
      }
    }
    // porta
    const dw = PX * 1.4, dh = PX * 2.4, dx = W / 2 - dw / 2, dy = H - dh;
    g.fillStyle = '#e8813a'; g.fillRect(dx, dy, dw, dh);
    g.strokeStyle = '#8a4a1c'; g.lineWidth = 6; g.strokeRect(dx, dy, dw, dh);
    g.fillStyle = '#4a2a10'; g.beginPath(); g.arc(dx + dw * 0.8, dy + dh * 0.55, 6, 0, 7); g.fill();
    // vitrines ao lado da porta (comércio) ou janelas (casa)
    for (const side of [-1, 1]) {
      const vx = W / 2 + side * PX * 2.3 - PX * 0.9;
      g.fillStyle = b.id === 'casa' ? '#6aa9c9' : '#cfeaf5'; g.fillRect(vx, H - PX * 2.1, PX * 1.8, PX * 1.3);
      g.strokeStyle = '#f5f1e8'; g.lineWidth = 6; g.strokeRect(vx, H - PX * 2.1, PX * 1.8, PX * 1.3);
    }
    // placa
    const label = b.name;
    g.font = `900 ${PX * 0.62}px Nunito, sans-serif`;
    const tw = g.measureText(label).width + PX * 0.8;
    const sy = dy - PX * 0.95;
    g.fillStyle = b.roof; g.fillRect(W / 2 - tw / 2, sy, tw, PX * 0.8);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, W / 2, sy + PX * 0.42);
  });
}

// calçadão de ondas pretas e brancas (Copacabana / orla)
function wavesTex() {
  const t = canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#1d1a22'; g.lineWidth = 34;
    for (let y = -64; y < H + 64; y += 128) {
      g.beginPath();
      for (let x = 0; x <= W; x += 4) g.lineTo(x, y + Math.sin(x / W * Math.PI * 2) * 34);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// cores e nome da fachada de cada tipo de prédio
const BUILDING = {
  casa: { id: 'casa', name: 'Casa da Giulia', color: '#f2c4a0', roof: '#c96f4a' },
  predio: { id: 'predio', name: 'Residencial', color: '#d8d2c4', roof: '#8a8478' },
  lanchonete: { id: 'lanchonete', name: 'Lanchonete', color: '#ffe08a', roof: '#e8281f' },
  moda: { id: 'moda', name: 'Moda', color: '#f6b8d6', roof: '#9b5cff' },
  loterica: { id: 'loterica', name: 'Lotérica', color: '#bfe8a8', roof: '#1fbf6a' },
  spa: { id: 'spa', name: 'Spa', color: '#bfe3f2', roof: '#1d5cff' },
  farmacia: { id: 'farmacia', name: 'Farmácia', color: '#ffffff', roof: '#1fbf6a' },
  esportes: { id: 'esportes', name: 'Artigos Esportivos', color: '#ecef6a', roof: '#1d5cff' },
  academia: { id: 'academia', name: 'Academia', color: '#a8f0c8', roof: '#1d1a22' },
};

// atleta desenhado num plano (mesmo desenho da partida)
export class Actor {
  constructor(char, x, z = WALK_Z) {
    const spr = SPRITE[settings.art] || SPRITE.cartoon;
    this.char = char; this.x = x; this.z = z; this.facing = 1; this.speed = 0; this.runPhase = 0; this.mood = null;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = CANVAS;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(spr.size, spr.size);
    geo.translate(0, spr.size / 2 - spr.size * spr.feet / CANVAS, 0);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }));
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
  }
  setChar(char) { this.char = char; }
  update(dt, time) {
    if (this.speed > 0.1) this.runPhase += this.speed * dt * 2.1;
    const d = dummy({ speed: this.speed, runPhase: this.runPhase, facing: this.facing, mood: this.mood, idx: 0, team: 0 });
    drawAthlete(this.ctx, this.char, poseFor(d, time), time);
    this.tex.needsUpdate = true;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.scale.x = this.facing < 0 ? -1 : 1;
    this.shadow.position.set(this.x, 0.03, this.z);
  }
}

// hood: dados do bairro (src/story/data.js, HOODS): comércios, paisagem, CT, casa e CT privado
export function buildStreet(hood) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8fd3ff');
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 800);
  const root = new THREE.Group();
  scene.add(root);
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); root.add(m); return m; };

  // paisagem de fundo de cada bairro (formas simples: morros, pedras, prédios, ilhas)
  const dome = (r, color, x, z, sx = 1, sy = 1, sz = 1) => { const m = add(new THREE.SphereGeometry(r, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), flat(color), x, 0, z); m.scale.set(sx, sy, sz); return m; };
  const tower = (w, h, color, x, z) => add(new THREE.BoxGeometry(w, h, w * 0.8), flat(color), x, h / 2, z);
  const lifeguard = (label, x, z) => {
    add(new THREE.BoxGeometry(2.4, 2, 2), new THREE.MeshBasicMaterial({ map: canvasTex(128, 96, (g, W, H) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); g.fillStyle = '#e8281f'; g.fillRect(0, H * 0.62, W, H * 0.38);
      g.fillStyle = '#1d1a22'; g.font = '900 48px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, W / 2, H * 0.34);
    }) }), x, 3.6, z);
    for (const dx of [-0.9, 0.9]) add(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 6), flat('#f5f1e8'), x + dx, 1.3, z);
  };
  const B = hood.backdrop;
  // mar ao fundo (no CT privado de Jacarepaguá, o bairro verde até as montanhas)
  const sea = add(new THREE.PlaneGeometry(900, 330), flat(hood.private ? '#7fa060' : B === 'baia' ? '#4a9cc4' : '#3fa3d6'), 20, -0.02, -155);
  sea.rotation.x = -Math.PI / 2;
  if (B === 'paoDeAcucar' || B === 'enseada' || B === 'aterro') {
    // Pão de Açúcar e Morro da Urca (de perto na Urca; do outro lado da enseada em Botafogo e no Aterro)
    const far = B === 'paoDeAcucar' ? 1 : 1.5, sx = B === 'paoDeAcucar' ? -70 : B === 'enseada' ? -20 : 30;
    dome(30, '#6f7f5c', sx, -230 * far, 0.75, 2.4, 0.75);
    dome(40, '#5d6b4c', sx + 60, -250 * far, 1.4, 1.1, 0.8);
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(sx, 70, -228 * far), new THREE.Vector3(sx + 60, 44, -240 * far)]), new THREE.LineBasicMaterial({ color: '#333333' })));
    if (B === 'enseada') for (let i = 0; i < 5; i++) add(new THREE.ConeGeometry(1.2, 3, 3), flat('#ffffff'), -60 + i * 18, 1.5, -90 - i * 10); // veleiros
    if (B === 'aterro') { const park = add(new THREE.PlaneGeometry(400, 40), flat('#6fbf5a'), 0, 0.02, -60); park.rotation.x = -Math.PI / 2; }
  } else if (B === 'pedraLeme') {
    dome(26, '#5f5a50', -48, -70, 1.1, 1.6, 0.9); // a Pedra do Leme, na ponta da praia
  } else if (B === 'posto9' || B === 'leblon') {
    // Morro Dois Irmãos ao fundo (mais perto no Leblon); posto de salva-vidas na areia
    const k = B === 'leblon' ? 0.75 : 1;
    dome(34, '#55704a', -120 * k, -260 * k, 0.8, 2.3, 0.8);
    dome(28, '#4d6643', -80 * k, -265 * k, 0.8, 2.6, 0.8);
    if (B === 'posto9') lifeguard('9', -20, -6);
    else for (let i = 0; i < 4; i++) tower(12, 26 + i * 4, '#e9e4da', 80 + i * 22, -120); // prédios elegantes da orla
  } else if (B === 'posto5') {
    lifeguard('5', -20, -6);
    dome(30, '#5d7a52', 60, -220, 1.4, 1.2, 0.8);
    for (let i = 0; i < 6; i++) tower(14, 24 + (i % 3) * 8, i % 2 ? '#f2e3c9' : '#e6eef2', 30 + i * 18, -110);
  } else if (B === 'pedraGavea') {
    // Pedra da Gávea (topo achatado) e uma asa-delta no céu
    add(new THREE.CylinderGeometry(42, 62, 70, 24), flat('#6a6455'), -40, 35, -260);
    dome(42, '#58704a', -40, -260, 1, 0.4, 1).position.y = 70;
    const wing = add(new THREE.ConeGeometry(3, 1.2, 3), flat('#ff5a3c'), 10, 34, -120); wing.rotation.z = Math.PI / 2;
  } else if (B === 'pedraPontal') {
    dome(14, '#6f6656', -36, -48, 1, 1.4, 1); // a Pedra do Pontal, pertinho da areia
  } else if (B === 'condominios') {
    for (let i = 0; i < 9; i++) tower(10 + (i % 3) * 3, 30 + (i * 7) % 26, i % 2 ? '#cfe3f0' : '#e8e8f0', -60 + i * 20, -140 - (i % 2) * 20);
  } else if (B === 'montanhas') {
    for (let i = 0; i < 6; i++) dome(50 + (i % 3) * 14, i % 2 ? '#4f7a46' : '#5d8a50', -140 + i * 60, -230 - (i % 2) * 30, 1.2, 1 + (i % 3) * 0.25, 0.8);
  } else if (B === 'baia') {
    for (let i = 0; i < 4; i++) dome(10 + i * 4, '#5d7a52', -80 + i * 55, -120 - i * 25, 1.3, 0.6, 1); // ilhas da baía
    for (let i = 0; i < 2; i++) add(new THREE.BoxGeometry(14, 4, 3), flat(i ? '#e8281f' : '#1d5cff'), -40 + i * 70, 2, -90 - i * 15); // navios
  }

  // chão: praia (ou o CT privado), calçadão, calçada e rua
  if (hood.private) {
    const club = add(new THREE.PlaneGeometry(40, 70), flat('#7fae6a'), -26, 0, -11);
    club.rotation.x = -Math.PI / 2;
    const sandBox = add(new THREE.PlaneGeometry(18, 12), flat('#ecd9a6'), -16, 0.01, -8);
    sandBox.rotation.x = -Math.PI / 2;
    // alambrado do clube
    const fence = new THREE.MeshBasicMaterial({ map: canvasTex(256, 128, (g, W, H) => {
      g.strokeStyle = '#4a4a4a'; g.lineWidth = 3;
      for (let x = -H; x < W + H; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H, H); g.moveTo(x + H, 0); g.lineTo(x, H); g.stroke(); }
      g.fillStyle = '#2a6a3a'; g.fillRect(0, 0, W, 10);
    }), transparent: true, side: THREE.DoubleSide });
    add(new THREE.PlaneGeometry(36, 4), fence, -24, 2, -16);
  } else {
    const sand = add(new THREE.PlaneGeometry(40, 70), flat('#ecd9a6'), -26, 0, -11);
    sand.rotation.x = -Math.PI / 2;
    const calc = new THREE.Mesh(new THREE.PlaneGeometry(6, 60), new THREE.MeshBasicMaterial({ map: (() => { const t = wavesTex(); t.repeat.set(1, 10); return t; })() }));
    calc.rotation.x = -Math.PI / 2; calc.position.set(-3, 0.01, -16); root.add(calc);
  }
  const walk = add(new THREE.PlaneGeometry(BLOCK2[1] + 1, 4), flat('#d9d9d4'), BLOCK2[1] / 2 - 0.5, 0.01, 2);
  walk.rotation.x = -Math.PI / 2;
  const road = add(new THREE.PlaneGeometry(BLOCK2[1] + 40, 14), flat('#6b6b6b'), BLOCK2[1] / 2 + 19, 0.005, 11);
  road.rotation.x = -Math.PI / 2;
  // rua transversal entre os quarteirões
  const cross = add(new THREE.PlaneGeometry(ROAD[1] - ROAD[0], 40), flat('#5a5a5a'), (ROAD[0] + ROAD[1]) / 2, 0.012, -16);
  cross.rotation.x = -Math.PI / 2;
  add(new THREE.BoxGeometry(BLOCK2[1] + 1, 0.18, 0.25), flat('#bdbdb5'), BLOCK2[1] / 2 - 0.5, 0.09, 4); // meio-fio

  // prédios: 2 no 1º quarteirão (a casa da Giulia ou um prédio residencial + 1 comércio), 3 no 2º
  const doors = [];
  const place = (b, x0, x1) => {
    const w = x1 - x0, h = b.id === 'casa' ? 7.5 : b.id === 'predio' ? 10.5 : 6 + (b.name.length % 3) * 1.5, d = 10;
    const front = new THREE.MeshBasicMaterial({ map: facadeTex(b, w, h) });
    const side = flat(shade(b.color, 0.82));
    const mats = [side, side, flat(shade(b.roof, 0.9)), side, front, side];
    add(new THREE.BoxGeometry(w, h, d), mats, (x0 + x1) / 2, h / 2, -d / 2);
    if (b.id !== 'predio') doors.push({ id: b.id, name: b.name, x: (x0 + x1) / 2 });
  };
  const bs = [hood.home ? BUILDING.casa : BUILDING.predio, ...hood.shops.map(k => BUILDING[k])];
  place(bs[0], 0, 9.5); place(bs[1], 10, 19.5);
  place(bs[2], 28, 37); place(bs[3], 37.5, 46.5); place(bs[4], 47, 56.5);

  // obras no asfalto (Urca, até o fim do campeonato do CT): cones e cavalete
  const works = new THREE.Group(); root.add(works);
  const cone = new THREE.ConeGeometry(0.3, 0.8, 12), orange = flat('#ff7a1a');
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(cone, orange); c.position.set(ROAD[0] + 1 + i * 1.8, 0.4, 6.5); works.add(c); }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(5, 0.35, 0.1), new THREE.MeshBasicMaterial({ map: canvasTex(256, 32, (g, W, H) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ff4a1a'; g.fillRect(i * 32, 0, 32, H); }
    g.fillStyle = '#1d1a22'; g.font = '900 22px Nunito, sans-serif'; g.textAlign = 'center'; g.fillText('OBRAS', W / 2, 24);
  }) }));
  bar.position.set((ROAD[0] + ROAD[1]) / 2, 1, 7); works.add(bar);
  works.visible = false;

  // ponto de ônibus (esquina do 2º quarteirão)
  const busX = ROAD[1] + 0.2;
  add(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), flat('#9a9a9a'), busX, 1.3, 3.6);
  add(new THREE.CircleGeometry(0.5, 32), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g, W) => {
    g.fillStyle = '#ffd21a'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 2, 0, 7); g.fill();
    g.fillStyle = '#1d1a22'; g.fillRect(36, 34, 56, 50); g.fillStyle = '#ffd21a'; g.fillRect(42, 40, 44, 20);
    g.fillStyle = '#1d1a22'; g.beginPath(); g.arc(48, 92, 7, 0, 7); g.arc(80, 92, 7, 0, 7); g.fill();
  }) }), busX, 2.75, 3.62);
  doors.push({ id: 'bus', name: 'Ponto de ônibus', x: busX });

  // CT na praia (ou no clube): quadrinha com rede e a placa vermelha "CT"
  const lines = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const cx0 = -23, cx1 = -9, cz0 = -12, cz1 = -4;
  for (const [x0, z0, x1, z1] of [[cx0, cz0, cx1, cz0], [cx0, cz1, cx1, cz1], [cx0, cz0, cx0, cz1], [cx1, cz0, cx1, cz1]]) {
    const m = add(new THREE.PlaneGeometry(Math.max(0.12, Math.abs(x1 - x0)), Math.max(0.12, Math.abs(z1 - z0))), lines, (x0 + x1) / 2, 0.02, (z0 + z1) / 2);
    m.rotation.x = -Math.PI / 2;
  }
  const netX = (cx0 + cx1) / 2;
  for (const z of [cz0 - 0.3, cz1 + 0.3]) add(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 8), flat('#1fbf6a'), netX, 1.2, z);
  const net = add(new THREE.PlaneGeometry(cz1 - cz0 + 0.6, 0.9), new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (g, W, H) => {
    g.strokeStyle = '#1d1a22'; g.lineWidth = 2;
    for (let x = 0; x <= W; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y <= H; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, 8);
  }), transparent: true, side: THREE.DoubleSide }), netX, 1.95, (cz0 + cz1) / 2);
  net.rotation.y = Math.PI / 2;
  const ctX = -6.5;
  add(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), flat('#9a9a9a'), ctX, 1.2, 0.6);
  add(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g, W) => {
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 1, 0, 7); g.fill();
    g.fillStyle = '#e8281f'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 10, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.font = '900 46px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CT', W / 2, W / 2 + 2);
  }) }), ctX, 2.6, 0.62);
  doors.push({ id: 'ct', name: hood.ct, x: ctX });

  // atletas na cena
  const actors = new Set();
  const addActor = a => { actors.add(a); root.add(a.mesh); root.add(a.shadow); return a; };
  const removeActor = a => { actors.delete(a); root.remove(a.mesh); root.remove(a.shadow); };

  // câmera de lado, acompanhando o x pedido (limitado ao bairro)
  let camX = 4;
  function frame(x, dt, instant = false) {
    const goal = Math.max(-14, Math.min(48, x));
    camX = instant ? goal : camX + (goal - camX) * Math.min(1, dt * 4);
    camera.position.set(camX, 4.6, 21);
    camera.lookAt(camX, 3.4, 0);
  }
  frame(camX, 0, true);

  // céu conforme a hora do dia (min desde 0h)
  const sky = [[6 * 60, '#ffc89a'], [7 * 60, '#9fdcff'], [17 * 60, '#8fd3ff'], [18.5 * 60, '#ff9e6b'], [20 * 60, '#3a3270'], [22 * 60, '#141233']];
  function setHour(min) {
    let a = sky[0], b = sky[sky.length - 1];
    for (let i = 0; i < sky.length - 1; i++) if (min >= sky[i][0] && min <= sky[i + 1][0]) { a = sky[i]; b = sky[i + 1]; break; }
    const k = b[0] === a[0] ? 0 : Math.max(0, Math.min(1, (min - a[0]) / (b[0] - a[0])));
    scene.background.set(a[1]).lerp(new THREE.Color(b[1]), k);
  }

  function update(dt, time) { for (const a of actors) a.update(dt, time); }
  function setAspect(asp) { camera.aspect = asp; camera.updateProjectionMatrix(); }

  return { scene, camera, doors, addActor, removeActor, frame, setHour, update, setAspect, setRoadWorks: on => { works.visible = !!on; }, spots: { ct: ctX, court: netX, bus: busX } };
}
