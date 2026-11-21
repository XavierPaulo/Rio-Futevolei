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
  const white = toon('#ffffff'), red = toon('#ff3b4f'), blue = toon('#1d5cff');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.3, 4.2, 10), white);
  body.rotation.z = Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), red);
  nose.position.x = 2.1;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 6.4), red);
  wing.position.set(0.4, 0.15, 0);
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 2.2), blue);
  tailWing.position.set(-1.9, 0.1, 0);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.08), blue);
  fin.position.set(-1.9, 0.55, 0);
  const prop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.6, 0.18), toon('#26213a'));
  prop.position.x = 2.5;
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), toon('#9be7ff'));
  cockpit.position.set(0.9, 0.38, 0);
  const model = new THREE.Group(); // só o avião é ampliado; a faixa tem tamanho próprio
  model.add(body, nose, wing, tailWing, fin, prop, cockpit);
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
