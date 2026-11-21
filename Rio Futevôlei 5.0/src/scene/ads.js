import * as THREE from 'three';
import { brands, rotation, pickLineup } from '../engine/brands.js';
import { drawBrandStrip, drawLogo, onLogoImage } from '../art/logos.js';

// Publicidade na arena: as marcas de src/data/brands.js aparecem em
//   • placas em volta da quadra (rodízio de marcas, como placa de LED)
//   • faixa puxada por um avião que cruza o céu a cada minuto (uma marca por passagem)
//   • bandeirinha no poste da rede do lado mais afastado (troca de marca de tempos em tempos)
// Com o rodízio, cada marca aparece bem mais de 5 vezes numa partida.
export const ADS = {
  boardSwap: 15,     // s entre trocas das placas
  flagSwap: 20,      // s entre trocas da bandeirinha
  planeEvery: 60,    // s entre passagens do avião
  planeFirst: 12,    // s até a primeira passagem
  planeTime: 18,     // s que o avião leva para cruzar o céu
  debugK: null,      // testes: fixa o avião nesta fração da passagem (0 a 1)
};

const BOARD = { w: 3.0, h: 0.8, y: 0.5 };
// placas: fileira do fundo (lado do mar) e uma fileira atrás de cada linha de fundo
const BOARD_SPOTS = [
  ...[-10.5, -7.5, -4.5, -1.5, 1.5, 4.5, 7.5, 10.5].map(x => ({ x, z: -7.2, ry: 0 })),
  ...[-4.5, -1.5, 1.5, 4.5].map(z => ({ x: -12.3, z, ry: Math.PI / 2 })),
  ...[-4.5, -1.5, 1.5, 4.5].map(z => ({ x: 12.3, z, ry: -Math.PI / 2 })),
];

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// bandeira: logo em cima, nome embaixo
function drawFlag(g, brand, w, h) {
  const c = brand.colors;
  g.fillStyle = c.bg; g.fillRect(0, 0, w, h);
  g.fillStyle = c.accent; g.fillRect(0, h * 0.9, w, h * 0.1);
  const ls = h * 0.6;
  g.beginPath(); g.arc(w / 2, h * 0.36, ls * 0.52, 0, Math.PI * 2); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fill();
  drawLogo(g, brand, w / 2 - ls * 0.42, h * 0.36 - ls * 0.42, ls * 0.84);
  let size = h * 0.2;
  g.font = `${size}px 'Lilita One', 'Arial Black', sans-serif`;
  while (g.measureText(brand.name).width > w * 0.92 && size > 8) { size -= 1; g.font = `${size}px 'Lilita One', 'Arial Black', sans-serif`; }
  g.textAlign = 'center';
  g.lineWidth = size * 0.14; g.strokeStyle = '#1a1622'; g.lineJoin = 'round';
  g.strokeText(brand.name, w / 2, h * 0.84);
  g.fillStyle = c.fg; g.fillText(brand.name, w / 2, h * 0.84);
}

// pano que ondula: desloca os vértices numa onda que cresce a partir da ponta presa
function waveCloth(geo, base, len, t, amp, freq, speed, axis = 'z') {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3], y = base[i * 3 + 1];
    const k = Math.abs(x) / len;
    const off = Math.sin(Math.abs(x) * freq - t * speed + y * 0.6) * amp * k;
    pos.setXYZ(i, x, y + (axis === 'y' ? off : 0), axis === 'z' ? off : 0);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

export function buildAds(root, { toon }) {
  const group = new THREE.Group();
  root.add(group);

  // texturas por marca (recriadas quando uma marca muda ou a fonte termina de carregar)
  const cache = new Map();
  const texFor = (brand, kind) => {
    const key = brand.id + ':' + kind;
    if (!cache.has(key)) {
      cache.set(key, kind === 'board' ? canvasTexture(512, 136, (g, w, h) => drawBrandStrip(g, brand, w, h))
        : kind === 'banner' ? canvasTexture(1024, 180, (g, w, h) => drawBrandStrip(g, brand, w, h))
          : canvasTexture(256, 176, (g, w, h) => drawFlag(g, brand, w, h)));
    }
    return cache.get(key);
  };
  const invalidate = () => { for (const t of cache.values()) t.dispose(); cache.clear(); shown.clear(); };
  const shown = new Map(); // material → marca mostrada agora
  const show = (mat, brand, kind) => {
    if (!brand || shown.get(mat) === brand.id + kind) return;
    shown.set(mat, brand.id + kind);
    mat.map = texFor(brand, kind);
    mat.needsUpdate = true;
  };
  brands.onChange(invalidate);
  onLogoImage(invalidate); // logo enviado como imagem terminou de carregar
  if (document.fonts) document.fonts.load("40px 'Lilita One'").then(invalidate, () => {});

  // ---------- placas ----------
  const frameMat = toon('#26213a');
  const boards = BOARD_SPOTS.map(spot => {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ fog: true });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w, BOARD.h), mat);
    face.position.z = 0.04;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w, BOARD.h), mat);
    back.position.z = -0.04; back.rotation.y = Math.PI;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(BOARD.w + 0.1, BOARD.h + 0.1, 0.06), frameMat);
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, BOARD.y, 0.06), frameMat);
      leg.position.set(sx * (BOARD.w / 2 - 0.15), -BOARD.y / 2, 0);
      g.add(leg);
    }
    g.add(frame, face, back);
    g.position.set(spot.x, BOARD.y + BOARD.h / 2 - 0.1, spot.z);
    g.rotation.y = spot.ry;
    group.add(g);
    return mat;
  });

  // ---------- bandeirinha no poste afastado da rede (z negativo, lado do mar) ----------
  const FLAG = { x: 0, z: -5.3, top: 4.1, w: 1.35, h: 0.92 };
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, FLAG.top - 2.6, 6), toon('#e9e9e9'));
  mast.position.set(FLAG.x, (FLAG.top + 2.6) / 2, FLAG.z);
  group.add(mast);
  const flagGeo = new THREE.PlaneGeometry(FLAG.w, FLAG.h, 12, 4);
  flagGeo.translate(FLAG.w / 2, 0, 0); // presa no mastro pela borda esquerda
  const flagBase = Float32Array.from(flagGeo.attributes.position.array);
  const flagMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: true });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(FLAG.x, FLAG.top - FLAG.h / 2, FLAG.z);
  group.add(flag);

  // ---------- avião com faixa ----------
  const plane = new THREE.Group();
  // 5.0: monomotor de asa alta (como os aviões que puxam faixa na orla): fuselagem afinando até a
  // cauda, asa com montantes, estabilizadores, trem de pouso, cabine com janelas e hélice de 2 pás
  const white = toon('#f4f4f2'), red = toon('#d8322f'), dark = toon('#26213a'), glass = toon('#3f6d8f'), metal = toon('#b9bec6');
  const model = new THREE.Group(); // só o avião é ampliado; a faixa tem tamanho próprio
  // fuselagem: perfil girado (eixo do avião = x; nariz em +x)
  const prof = [[0.02, -2.35], [0.09, -2.25], [0.2, -1.7], [0.33, -0.9], [0.43, -0.2], [0.46, 0.6], [0.44, 1.35], [0.37, 1.85], [0.28, 2.05], [0.05, 2.08]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const fuseGeo = new THREE.LatheGeometry(prof, 18);
  fuseGeo.rotateZ(-Math.PI / 2);
  const fuse = new THREE.Mesh(fuseGeo, white);
  fuse.scale.set(1, 1.08, 0.92);
  // faixa vermelha ao longo do corpo e capô vermelho
  const stripeGeo = new THREE.LatheGeometry(prof.slice(2, 8).map(v => new THREE.Vector2(v.x + 0.012, v.y)), 18, Math.PI * 0.42, Math.PI * 0.16);
  stripeGeo.rotateZ(-Math.PI / 2);
  const stripeA = new THREE.Mesh(stripeGeo, red); stripeA.scale.copy(fuse.scale);
  const stripeB = stripeA.clone(); stripeB.rotation.x = Math.PI;
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.48, 0.42, 18, 1, true), red);
  cowl.rotation.z = -Math.PI / 2; cowl.position.x = 1.86;
  // cabine: janelas dos lados e para-brisa inclinado
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.26, 0.86), glass);
  win.position.set(0.55, 0.2, 0);
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.62), glass);
  shield.position.set(1.18, 0.33, 0); shield.rotation.z = -0.62;
  // asa alta com pontas arredondadas (vista de cima) e pontas vermelhas
  const half = 3.7, chord = 0.95;
  const ws = new THREE.Shape();
  ws.moveTo(-chord / 2, -half + 0.25); ws.lineTo(-chord / 2, half - 0.25); ws.quadraticCurveTo(-chord / 2, half, 0, half);
  ws.quadraticCurveTo(chord / 2, half, chord / 2, half - 0.25); ws.lineTo(chord / 2, -half + 0.25);
  ws.quadraticCurveTo(chord / 2, -half, 0, -half); ws.quadraticCurveTo(-chord / 2, -half, -chord / 2, -half + 0.25);
  const wingGeo = new THREE.ExtrudeGeometry(ws, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 2 });
  wingGeo.rotateX(Math.PI / 2);
  const wing = new THREE.Mesh(wingGeo, white);
  wing.position.set(0.55, 0.56, 0);
  for (const sz of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(chord * 0.98, 0.1, 0.55), red);
    tip.position.set(0.55, 0.53, sz * (half - 0.45));
    model.add(tip);
    // montante: do pé da fuselagem até o meio da asa
    const a0 = new THREE.Vector3(0.45, -0.22, sz * 0.38), a1 = new THREE.Vector3(0.6, 0.5, sz * 1.9);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, a0.distanceTo(a1), 5), metal);
    strut.position.copy(a0).add(a1).multiplyScalar(0.5);
    strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a1.clone().sub(a0).normalize());
    model.add(strut);
    // trem de pouso: perna e roda
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 5), metal);
    leg.position.set(1.15, -0.55, sz * 0.42); leg.rotation.x = sz * 0.45;
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 12), dark);
    wheel.rotation.x = Math.PI / 2; wheel.position.set(1.15, -0.82, sz * 0.56);
    model.add(leg, wheel);
  }
  const tailWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), dark);
  tailWheel.rotation.x = Math.PI / 2; tailWheel.position.set(-2.05, -0.2, 0);
  // estabilizador horizontal (trapézio) e deriva
  const hs = new THREE.Shape();
  hs.moveTo(0, -1.25); hs.lineTo(0.42, -1.2); hs.lineTo(0.7, 0); hs.lineTo(0.42, 1.2); hs.lineTo(0, 1.25); hs.lineTo(0, -1.25);
  const hGeo = new THREE.ExtrudeGeometry(hs, { depth: 0.04, bevelEnabled: false });
  hGeo.rotateX(Math.PI / 2);
  const tailWing = new THREE.Mesh(hGeo, white);
  tailWing.position.set(-2.32, 0.08, 0);
  const vs = new THREE.Shape();
  vs.moveTo(-2.36, 0.05); vs.lineTo(-1.55, 0.12); vs.quadraticCurveTo(-1.9, 0.5, -2.12, 0.98); vs.lineTo(-2.42, 1.0); vs.lineTo(-2.36, 0.05);
  const vGeo = new THREE.ExtrudeGeometry(vs, { depth: 0.05, bevelEnabled: false });
  vGeo.translate(0, 0, -0.025);
  const fin = new THREE.Mesh(vGeo, red);
  // hélice: cubo cônico e duas pás (gira em torno do eixo do avião)
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.32, 12), red);
  spinner.rotation.z = -Math.PI / 2; spinner.position.x = 2.2;
  const prop = new THREE.Group();
  for (const sy of [-1, 1]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.82, 0.13), dark);
    blade.position.y = sy * 0.45; blade.rotation.y = sy * 0.35;
    prop.add(blade);
  }
  prop.position.x = 2.12;
  model.add(fuse, stripeA, stripeB, cowl, win, shield, wing, tailWheel, tailWing, fin, spinner, prop);
  model.scale.setScalar(2.4);
  plane.add(model);
  const TAIL = -2.2 * 2.4;
  const BANNER = { gap: 3.2, w: 15, h: 2.6 };
  const bannerGeo = new THREE.PlaneGeometry(BANNER.w, BANNER.h, 24, 2);
  bannerGeo.translate(-BANNER.w / 2, 0, 0); // a faixa vai atrás do avião (x negativo)
  const bannerBase = Float32Array.from(bannerGeo.attributes.position.array);
  const bannerMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: true });
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(TAIL - BANNER.gap, -0.6, 0);
  const ropeGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(TAIL, 0, 0), new THREE.Vector3(TAIL - BANNER.gap, -0.6, 0)]);
  plane.add(banner, new THREE.Line(ropeGeo, new THREE.LineBasicMaterial({ color: '#26213a' })));
  plane.visible = false;
  plane.scale.setScalar(1.3);
  group.add(plane);
  let flight = null; // { start, end, t0, brand }
  let passes = 0;
  let lineup = pickLineup(); // as marcas desta partida (ver reshuffle)

  const fwd = new THREE.Vector3();
  return {
    group,
    update(t, camera) {
      const list = rotation(lineup);
      if (!list.length) return;
      // placas: cada uma com uma marca, todas andam uma posição a cada troca
      const step = Math.floor(t / ADS.boardSwap);
      boards.forEach((mat, i) => show(mat, list[(i + step) % list.length], 'board'));
      // bandeirinha: troca de marca e tremula; vira para a câmera para ficar legível
      show(flagMat, list[Math.floor(t / ADS.flagSwap + 4) % list.length], 'flag');
      waveCloth(flagGeo, flagBase, FLAG.w, t, 0.09, 6, 7);
      if (camera) flag.rotation.y = Math.atan2(camera.position.x - FLAG.x, camera.position.z - FLAG.z);

      // avião: cruza o céu na frente da câmera, da esquerda para a direita da tela
      const due = t >= ADS.planeFirst && Math.floor((t - ADS.planeFirst) / ADS.planeEvery) >= passes;
      if (!flight && due && camera) {
        // altura pela abertura real da câmera: o avião cruza o terço de cima da tela em
        // qualquer formato de tela e em qualquer câmera (lateral ou por trás)
        const D = 80;
        const dir = camera.getWorldDirection(new THREE.Vector3());
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const lift = D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2) * 0.62);
        fwd.copy(dir).setY(0).normalize();
        const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
        const halfW = (D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect) + 30;
        const center = camera.position.clone().addScaledVector(dir, D).addScaledVector(up, lift);
        flight = {
          start: center.clone().addScaledVector(right, -halfW), end: center.clone().addScaledVector(right, halfW),
          t0: t, brand: list[passes % list.length], ry: Math.atan2(-right.z, right.x),
        };
        passes++;
        show(bannerMat, flight.brand, 'banner');
        plane.rotation.set(0, flight.ry, 0);
        plane.visible = true;
      }
      if (flight) {
        const k = ADS.debugK ?? (t - flight.t0) / ADS.planeTime; // debugK: posição fixa (testes)
        if (k >= 1 || k < 0) { flight = null; plane.visible = false; }
        else {
          plane.position.lerpVectors(flight.start, flight.end, k);
          plane.position.y += Math.sin(t * 0.8) * 0.6;
          plane.rotation.x = Math.sin(t * 1.3) * 0.05;
          prop.rotation.x = t * 40;
          waveCloth(bannerGeo, bannerBase, BANNER.w, t, 0.35, 0.9, 6);
        }
      }
    },
    // quantas vezes cada marca já apareceu no avião (para testes)
    get passes() { return passes; },
    // nova partida: sorteia as marcas dela (avião em voo termina com a faixa que já tem)
    reshuffle() { lineup = pickLineup(); },
    get lineup() { return [...lineup]; },
  };
}
