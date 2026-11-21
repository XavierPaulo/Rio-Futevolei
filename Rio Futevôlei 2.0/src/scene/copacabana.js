import * as THREE from 'three';
import { COURT } from '../config.js';
import { buildAds } from './ads.js';

// Arena 1: Copacabana. Câmera no lado do calçadão, olhando para o mar:
// Morro do Leme e Pão de Açúcar à esquerda, Forte de Copacabana à direita.

const HORIZON = new THREE.Color('#cfefff');

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

function toonGradient() {
  const t = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

// ruído determinístico barato
function hash(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise3(x, y, z) {
  return Math.sin(x * 1.7 + z * 0.9) * 0.5 + Math.sin(y * 2.3 + x * 1.1) * 0.3 + Math.sin(z * 3.1 + y * 0.7) * 0.2;
}

export function buildCopacabana(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const grad = toonGradient();
  const toon = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: grad, ...o });
  const updaters = [];
  // Objetos altos que podem ficar entre a câmera e a quadra (somem enquanto taparem a visão).
  const occluders = [];
  updaters.push((t, camera) => {
    if (!camera) return;
    const cx = camera.position.x, cz = camera.position.z, len = Math.hypot(cx, cz) || 1;
    for (const o of occluders) {
      const along = (o.x * cx + o.z * cz) / len;             // distância a partir do centro, rumo à câmera
      const off = Math.abs(o.x * cz - o.z * cx) / len;       // distância da linha câmera → centro da quadra
      o.obj.visible = !(along > 2 && along < len + 2 && off < o.r);
    }
  });

  // ---------- céu, névoa, luz ----------
  // Céu em cúpula (cor pela altura no céu, não pela posição na tela): fica certo em
  // qualquer ângulo de câmera, com o horizonte sempre claro onde a névoa termina.
  scene.background = null;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uHorizon: { value: HORIZON.clone() }, uMid: { value: new THREE.Color('#7cc6ff') }, uTop: { value: new THREE.Color('#2f8fff') } },
    vertexShader: /* glsl */`
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uHorizon, uMid, uTop;
      varying vec3 vWorld;
      void main() {
        vec3 d = normalize(vWorld - cameraPosition);
        float e = degrees(asin(clamp(d.y, -1.0, 1.0)));   // elevação no céu (graus)
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 4.0, e));
        col = mix(col, uTop, smoothstep(3.0, 16.0, e));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  root.add(sky);
  updaters.push((t, camera) => { if (camera) sky.position.copy(camera.position); });
  scene.fog = new THREE.Fog(HORIZON, 90, 420);
  scene.add(new THREE.HemisphereLight('#d6f0ff', '#f5c98a', 1.6));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.2);
  sun.position.set(-30, 60, 25);
  scene.add(sun);

  // ---------- areia ----------
  const sandTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f3d9a4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = Math.random();
      g.fillStyle = v < 0.5 ? 'rgba(190,140,80,0.22)' : v < 0.85 ? 'rgba(255,255,255,0.35)' : 'rgba(120,90,60,0.25)';
      g.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
    }
  }, [137, 14]);
  // a praia segue até sumir na névoa (a câmera "por trás" olha ao longo da orla)
  const sandGeo = new THREE.PlaneGeometry(900, 76, 340, 40);
  sandGeo.rotateX(-Math.PI / 2);
  sandGeo.translate(0, 0, 18);
  {
    const pos = sandGeo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      let y = 0;
      const inCourt = Math.abs(x) < 11 && z > -7 && z < 7;
      if (!inCourt) y += (noise3(x * 0.15, 0, z * 0.2) * 0.08 + hash(x, 0, z) * 0.03);
      if (z < -12) y -= ((-12 - z) / 6) * 0.4;
      pos.setY(i, y);
      const wet = THREE.MathUtils.smoothstep(-z, 11, 16);
      const k = 1 - wet * 0.28;
      col[i * 3] = k; col[i * 3 + 1] = k * (1 - wet * 0.04); col[i * 3 + 2] = k * (1 - wet * 0.02);
    }
    sandGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    sandGeo.computeVertexNormals();
  }
  root.add(new THREE.Mesh(sandGeo, toon('#ffffff', { map: sandTex, vertexColors: true })));

  // ---------- mar: ondas de Gerstner chegando na praia, reflexos suaves ----------
  // Seis trens de onda vindos do mar aberto (direção +z, rumo à areia), do swell longo às
  // marolas curtas. Os três maiores deslocam a malha (cristas mais pontudas, vales largos, como
  // ondas de verdade); todos entram na normal calculada por pixel, que dá o brilho e o reflexo.
  const WAVES = /* glsl */`
    // direção (x, z), comprimento de onda (m), altura (m)
    const vec4 W0 = vec4( 0.10, 1.00, 24.0, 0.30);
    const vec4 W1 = vec4(-0.32, 0.95, 15.0, 0.17);
    const vec4 W2 = vec4( 0.42, 0.91,  9.5, 0.08);
    const vec4 W3 = vec4(-0.60, 0.80,  5.5, 0.040);
    const vec4 W4 = vec4( 0.78, 0.62,  3.3, 0.020);
    const vec4 W5 = vec4(-0.18, 0.98,  2.2, 0.010);
    // amplitude cresce do raso para o fundo e some longe da câmera (sem cintilar no horizonte)
    float waveEnv(vec3 wp) {
      float shore = clamp((-wp.z - 14.0) / 18.0, 0.18, 1.0);
      float dist = length(wp.xz - cameraPosition.xz);
      return shore * (1.0 - 0.75 * smoothstep(110.0, 380.0, dist));
    }
    void wave(vec4 w, vec2 p, float t, float amp, inout float h, inout vec2 grad) {
      vec2 d = normalize(w.xy);
      float k = 6.2831853 / w.z;
      float om = sqrt(9.8 * k) * 0.75;
      float th = k * dot(d, p) - om * t;
      h += amp * w.w * cos(th);
      grad += -amp * w.w * k * d * sin(th);
    }
  `;
  const seaMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color('#33cfc1') },
      uDeep: { value: new THREE.Color('#1468c2') },
      uSky: { value: new THREE.Color('#8fcfff') },
      uHorizon: { value: HORIZON.clone() },
      uSun: { value: new THREE.Vector3(-30, 60, 25).normalize() },
    },
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec3 vWorld;
      varying float vH;
      ${WAVES}
      // Gerstner: a superfície anda um pouco na direção da onda perto da crista
      vec3 gerstner(vec4 w, vec2 p, float t, float amp) {
        vec2 d = normalize(w.xy);
        float k = 6.2831853 / w.z;
        float om = sqrt(9.8 * k) * 0.75;
        float th = k * dot(d, p) - om * t;
        float q = 0.55;
        return vec3(-q * amp * w.w * d.x * sin(th), amp * w.w * cos(th), -q * amp * w.w * d.y * sin(th));
      }
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float env = waveEnv(wp.xyz);
        vec3 g = gerstner(W0, wp.xz, uTime, env) + gerstner(W1, wp.xz, uTime, env) + gerstner(W2, wp.xz, uTime, env);
        wp.xyz += g;
        vH = g.y;
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform vec3 uShallow, uDeep, uSky, uHorizon, uSun;
      varying vec3 vWorld;
      varying float vH;
      ${WAVES}
      void main() {
        float env = waveEnv(vWorld);
        float dist = length(vWorld.xz - cameraPosition.xz);
        // ondas curtas só de perto (de longe viram ruído)
        float near = 1.0 - smoothstep(30.0, 110.0, dist);
        float h = 0.0; vec2 grad = vec2(0.0);
        wave(W0, vWorld.xz, uTime, env, h, grad);
        wave(W1, vWorld.xz, uTime, env, h, grad);
        wave(W2, vWorld.xz, uTime, env, h, grad);
        wave(W3, vWorld.xz, uTime, env * near, h, grad);
        wave(W4, vWorld.xz, uTime, env * near, h, grad);
        wave(W5, vWorld.xz, uTime, env * near, h, grad);
        vec3 n = normalize(vec3(-grad.x, 1.0, -grad.y));
        vec3 v = normalize(cameraPosition - vWorld);

        // cor da água: rasa (verde-água) perto da areia, funda (azul) longe; crista mais clara
        float d = -vWorld.z - 15.0;
        float far = clamp(d / 80.0, 0.0, 1.0);
        vec3 water = mix(uShallow, uDeep, pow(far, 0.55));
        water += vec3(0.05, 0.10, 0.08) * smoothstep(0.0, 0.35, vH);
        water *= 0.9 + 0.1 * n.y;

        // reflexo do céu pelo ângulo de visão (Fresnel), suave
        float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
        vec3 sky = mix(uHorizon, uSky, clamp(reflect(-v, n).y * 2.5, 0.0, 1.0));
        vec3 col = mix(water, sky, 0.12 + 0.45 * fres);

        // brilho do sol: largo e fraco (sem pontos estourados)
        vec3 r = reflect(-uSun, n);
        float s = max(dot(r, v), 0.0);
        col += vec3(1.0, 0.97, 0.88) * (pow(s, 60.0) * 0.18 + pow(s, 8.0) * 0.05) * (1.0 - far * 0.5);

        // espuma: carneirinhos nas cristas maiores e arrebentação irregular perto da areia
        float caps = smoothstep(0.28, 0.42, vH) * (0.55 + 0.45 * sin(vWorld.x * 0.35 + uTime * 0.6)) * (1.0 - far);
        float wob = sin(vWorld.x * 0.07 + uTime * 0.25) * 1.6 + sin(vWorld.x * 0.23 - uTime * 0.4) * 0.6;
        float bands = smoothstep(0.72, 1.0, sin(d * 0.55 - uTime * 1.35 + wob)) * (1.0 - smoothstep(1.5, 12.0, d));
        float froth = (1.0 - smoothstep(0.0, 1.6, d + 0.4 * sin(vWorld.x * 0.3 + uTime))) * 0.8;
        col = mix(col, vec3(0.97, 0.99, 1.0), clamp(caps * 0.35 + bands * 0.55 + froth, 0.0, 0.9));

        col = mix(col, uHorizon, smoothstep(90.0, 420.0, dist));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  // malha mais fina (2,5 m) para as ondas longas desenharem a silhueta sem serrilhar
  const seaGeo = new THREE.PlaneGeometry(900, 460, 360, 184);
  seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.position.set(0, -0.12, -14 - 230);
  root.add(sea);
  updaters.push(t => { seaMat.uniforms.uTime.value = t; });

  // espuma na beira
  const foamTex = canvasTex(512, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 16) g.lineTo(x, h * 0.45 + Math.sin(x * 0.09) * 10 + Math.sin(x * 0.23) * 5);
    g.lineTo(w, h); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 80; i++) { g.beginPath(); g.arc(Math.random() * w, h * 0.3 + Math.random() * h * 0.25, 2 + Math.random() * 3, 0, 7); g.fill(); }
  }, [59, 1]);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(900, 3.2), new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, depthWrite: false, fog: true }));
  foam.rotation.x = -Math.PI / 2;
  root.add(foam);
  updaters.push(t => {
    const w = Math.sin(t * 0.7);
    foam.position.set(0, -0.2 + w * 0.05, -15.2 + w * 1.4);
    foam.material.opacity = 0.55 + 0.35 * Math.max(0, w);
    foamTex.offset.x = t * 0.004;
  });

  // ---------- morros ----------
  function mountain({ x, z, sx, sy, sz, seed, green = '#3f9c4c', rock = '#8f8a8c', rocky = 0.3, detail = 4 }) {
    const geo = new THREE.IcosahedronGeometry(1, detail).toNonIndexed();
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const cg = new THREE.Color(green), cr = new THREE.Color(rock), cs = new THREE.Color('#d9c08a');
    for (let i = 0; i < pos.count; i++) {
      let vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
      const n = noise3(vx * 2 + seed, vy * 2, vz * 2 - seed) * 0.12 + hash(Math.round(vx * 9), Math.round(vy * 9), seed) * 0.05;
      vx *= 1 + n; vy *= 1 + n; vz *= 1 + n;
      vy = Math.max(vy, -0.05);
      pos.setXYZ(i, vx, vy, vz);
    }
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal;
    for (let i = 0; i < pos.count; i += 3) {
      const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
      const steep = 1 - Math.abs(nrm.getY(i));
      let c = cg.clone();
      const r = hash(i, seed, 3);
      if (steep > 0.55 + (1 - rocky) * 0.3 || r < rocky * 0.35) c = cr.clone().multiplyScalar(0.9 + r * 0.2);
      if (cy < 0.06) c = cs.clone();
      c.multiplyScalar(0.92 + hash(i, 1, seed) * 0.16);
      for (let k = 0; k < 3; k++) { cols[(i + k) * 3] = c.r; cols[(i + k) * 3 + 1] = c.g; cols[(i + k) * 3 + 2] = c.b; }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const m = new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true, flatShading: true }));
    m.scale.set(sx, sy, sz);
    m.position.set(x, -0.3, z);
    root.add(m);
    return m;
  }
  // Enquadramento: Pão de Açúcar à esquerda e Dois Irmãos à direita, fora da área do placar.
  mountain({ x: -100, z: -112, sx: 34, sy: 12, sz: 24, seed: 1, rocky: 0.35 });          // Morro do Leme
  mountain({ x: -152, z: -262, sx: 17, sy: 30, sz: 18, seed: 2, rocky: 0.95, rock: '#a79a98', detail: 3 }); // Pão de Açúcar
  mountain({ x: -126, z: -250, sx: 20, sy: 14, sz: 18, seed: 3, rocky: 0.4 });          // Morro da Urca
  mountain({ x: 96, z: -118, sx: 30, sy: 10, sz: 22, seed: 4, rocky: 0.5 });            // Forte / Arpoador
  mountain({ x: 150, z: -262, sx: 24, sy: 30, sz: 22, seed: 5, rocky: 0.3 });           // Dois Irmãos
  mountain({ x: 176, z: -268, sx: 20, sy: 26, sz: 20, seed: 9, rocky: 0.3 });
  mountain({ x: -40, z: -210, sx: 12, sy: 9, sz: 10, seed: 6, rocky: 0.5 });            // Cotunduba
  mountain({ x: 40, z: -300, sx: 16, sy: 10, sz: 12, seed: 7, rocky: 0.6 });            // Cagarras
  mountain({ x: 64, z: -290, sx: 9, sy: 6, sz: 8, seed: 8, rocky: 0.6 });

  // forte (bloco branco na ponta)
  const forte = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 8), toon('#f2efe6'));
  forte.position.set(70, 2, -112);
  root.add(forte);

  // ---------- quadra ----------
  const lineMat = toon('#1d5cff');
  const lw = 0.08;
  const addLine = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), lineMat);
    m.position.set(x, 0.012, z);
    root.add(m);
  };
  addLine(COURT.halfLen * 2 + lw, lw, 0, -COURT.halfWid);
  addLine(COURT.halfLen * 2 + lw, lw, 0, COURT.halfWid);
  addLine(lw, COURT.halfWid * 2, -COURT.halfLen, 0);
  addLine(lw, COURT.halfWid * 2, COURT.halfLen, 0);

  // postes
  const poleTex = canvasTex(32, 256, (g, w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#19c26b' : '#ffd21a'; g.fillRect(0, i * h / 8, w, h / 8); }
  });
  for (const z of [-5.3, 5.3]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 2.7, 12), toon('#ffffff', { map: poleTex }));
    pole.position.set(0, 1.35, z);
    root.add(pole);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), toon('#ff5fa2'));
    cap.position.set(0, 2.72, z);
    root.add(cap);
  }
  // rede
  const netTex = canvasTex(1024, 96, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(25,20,45,0.9)';
    g.lineWidth = 1.6;
    const cell = 9.6;
    for (let x = 0; x <= w; x += cell) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += cell) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, 8);
    g.fillStyle = '#1d5cff'; g.fillRect(0, 8, w, 2);
    g.fillStyle = '#ffffff'; g.fillRect(0, h - 5, w, 5);
  });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 1.0), new THREE.MeshBasicMaterial({ map: netTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, fog: true }));
  net.rotation.y = Math.PI / 2;
  net.position.set(0, COURT.netH - 0.5, 0);
  root.add(net);
  // antenas
  const antTex = canvasTex(16, 128, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ff3b4f'; g.fillRect(0, i * h / 8, w, h / 8); } });
  for (const z of [-COURT.halfWid, COURT.halfWid]) {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 6), toon('#ffffff', { map: antTex }));
    a.position.set(0, COURT.netH + 0.1, z);
    root.add(a);
  }

  // ---------- adereços de praia ----------
  function umbrella(x, z, colors, tilt = 0) {
    const g = new THREE.Group();
    const segs = 12;
    const geo = new THREE.ConeGeometry(1.35, 0.55, segs, 1, true).toNonIndexed();
    const cols = new Float32Array(geo.attributes.position.count * 3);
    const cA = new THREE.Color(colors[0]), cB = new THREE.Color(colors[1]);
    for (let i = 0; i < geo.attributes.position.count; i += 3) {
      const face = Math.floor(i / 3);
      const c = (Math.floor(face / 2) % 2) ? cA : cB;
      for (let k = 0; k < 3; k++) { cols[(i + k) * 3] = c.r; cols[(i + k) * 3 + 1] = c.g; cols[(i + k) * 3 + 2] = c.b; }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const top = new THREE.Mesh(geo, toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide }));
    top.position.y = 2.25;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6), toon('#f4f4f4'));
    pole.position.y = 1.15;
    g.add(top, pole);
    g.position.set(x, 0, z);
    g.rotation.z = tilt;
    root.add(g);
  }
  function chair(x, z, color, rot) {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.6), toon(color));
    seat.position.y = 0.3;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.6), toon(color));
    back.position.set(-0.28, 0.55, 0); back.rotation.z = 1.1;
    g.add(seat, back);
    g.position.set(x, 0, z); g.rotation.y = rot;
    root.add(g);
  }
  function palm(x, z, h = 7, lean = 0.15) {
    const g = new THREE.Group();
    const trunkMat = toon('#9c6b3f');
    let px = 0, py = 0;
    const n = 7;
    for (let i = 0; i < n; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - i * 0.008, 0.2 - i * 0.008, h / n + 0.05, 7), trunkMat);
      const a = lean * (i / n) * 1.6;
      px += Math.sin(a) * h / n; py += Math.cos(a) * h / n;
      seg.position.set(px - Math.sin(a) * h / n / 2, py - Math.cos(a) * h / n / 2, 0);
      seg.rotation.z = -a;
      g.add(seg);
    }
    const leafMat = toon('#2f9e44', { side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.45, 3.4, 4, 1), leafMat);
      leaf.scale.z = 0.25;
      leaf.geometry.translate(0, 1.7, 0);
      const pivot = new THREE.Group();
      pivot.position.set(px, py, 0);
      pivot.rotation.y = (i / 8) * Math.PI * 2;
      leaf.rotation.z = -1.9 - (i % 2) * 0.25;
      pivot.add(leaf);
      g.add(pivot);
    }
    for (let i = 0; i < 3; i++) {
      const coco = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), toon('#6b4a1f'));
      coco.position.set(px + Math.cos(i * 2.1) * 0.22, py - 0.25, Math.sin(i * 2.1) * 0.22);
      g.add(coco);
    }
    g.position.set(x, 0, z);
    g.rotation.y = hash(x, z, 1) * 6;
    root.add(g);
    occluders.push({ obj: g, x, z, r: 3.4 });
  }
  function posto(x, z, label) {
    const g = new THREE.Group();
    const legMat = toon('#e9e9e9');
    for (const [lx, lz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), legMat);
      leg.position.set(lx, 1.2, lz);
      g.add(leg);
    }
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), toon('#ff7a1a'));
    cabin.position.y = 3.2;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.9, 4), toon('#ffffff'));
    roof.position.y = 4.45; roof.rotation.y = Math.PI / 4;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.6), new THREE.MeshBasicMaterial({
      map: canvasTex(256, 76, (c, w, h) => {
        c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#e8281f'; c.font = '900 50px Nunito, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(label, w / 2, h / 2 + 3);
      }), fog: true,
    }));
    sign.position.set(0, 3.25, 1.11);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshBasicMaterial({ color: '#e8281f', side: THREE.DoubleSide, fog: true }));
    flag.position.set(0.45, 5.6, 0);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 5), legMat);
    mast.position.y = 5.2;
    g.add(cabin, roof, sign, flag, mast);
    g.position.set(x, 0, z);
    root.add(g);
    updaters.push(t => { flag.rotation.y = Math.sin(t * 3 + x) * 0.25; flag.position.x = 0.45 * Math.cos(flag.rotation.y); });
  }
  function kiosk(x, z) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 2.4, 8), toon('#1fbf6a'));
    base.position.y = 1.2;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.84, 1.84, 0.4, 8), toon('#ffd21a'));
    band.position.y = 2.0;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.3, 8), toon('#ff5a3c'));
    roof.position.y = 3.05;
    g.add(base, band, roof);
    g.position.set(x, 0, z);
    root.add(g);
  }

  const UMB = [['#ff5a3c', '#ffffff'], ['#1d5cff', '#ffd21a'], ['#19c26b', '#ffffff'], ['#ff5fa2', '#ffd21a'], ['#9b5cff', '#ffffff'], ['#ffd21a', '#ff5a3c']];
  const spots = [
    [-15, -3], [-19, -8], [-13, -11], [-24, -4], [-28, -10], [-35, -6], [-44, -9], [-55, -5],
    [15, -4], [20, -9], [14, -12], [26, -5], [31, -11], [38, -7], [47, -10], [58, -6],
    [-6, -12.5], [5, -13], [-60, -12], [66, -12],
  ];
  spots.forEach(([x, z], i) => {
    umbrella(x, z, UMB[i % UMB.length], (hash(x, z, 2) - 0.5) * 0.18);
    if (i % 2 === 0) chair(x + 1.1, z + 0.6, UMB[(i + 2) % UMB.length][0], hash(x, z, 5) * 2);
  });
  // os dois coqueiros perto da quadra ficam atrás das placas de publicidade das linhas de fundo
  [[-14.6, -1.2], [14.8, -1.6], [-18, -13], [21, -13.5], [-40, -2], [44, -2], [-70, -8], [74, -8]].forEach(([x, z], i) => palm(x, z, 6.5 + (i % 3), 0.12 + (i % 2) * 0.1));
  posto(17, -8.5, 'POSTO 5');
  kiosk(-22, -1.5);

  // ---------- barcos e nuvens ----------
  const boats = [];
  for (const [x, z, s] of [[-30, -70, 1], [25, -110, 0.8], [70, -60, 0.9], [-70, -140, 0.7]]) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 1), toon('#ffffff'));
    const sail = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.4, 3), toon('#ff5fa2'));
    sail.position.y = 2; sail.scale.z = 0.15;
    g.add(hull, sail);
    g.scale.setScalar(s * 1.6);
    g.position.set(x, 0, z);
    root.add(g);
    boats.push(g);
  }
  updaters.push(t => boats.forEach((b, i) => { b.position.y = Math.sin(t * 1.2 + i) * 0.2; b.rotation.z = Math.sin(t * 0.9 + i * 2) * 0.06; b.position.x += 0.004 * (i % 2 ? 1 : -1); }));

  const cloudTex = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#ffffff';
    for (const [x, y, r] of [[70, 80, 34], [110, 60, 44], [155, 72, 38], [190, 86, 26], [45, 92, 24], [130, 92, 30]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(180,215,245,0.6)'; g.fillRect(0, 100, w, 28);
  });
  const clouds = [];
  for (const [x, y, z, s] of [[-120, 70, -380, 60], [40, 90, -420, 80], [180, 60, -360, 50], [-240, 95, -420, 70], [300, 80, -440, 70]]) {
    const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, fog: false, depthWrite: false }));
    c.position.set(x, y, z);
    c.scale.set(s, s / 2, 1);
    root.add(c);
    clouds.push(c);
  }
  updaters.push(t => clouds.forEach((c, i) => { c.position.x += 0.01 * (1 + i * 0.3); if (c.position.x > 420) c.position.x = -420; }));

  // sol
  const sunTex = canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.25, 'rgba(255,245,200,0.9)'); gr.addColorStop(1, 'rgba(255,230,160,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
  const sunS = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, fog: false, depthWrite: false, transparent: true }));
  sunS.position.set(-160, 150, -450); sunS.scale.set(90, 90, 1);
  root.add(sunS);

  // ---------- publicidade: placas, bandeirinha da rede e avião com faixa (src/scene/ads.js) ----------
  // fica fora do root do cenário: assim não passa pelo filtro de pincel/caneta e as marcas
  // continuam nítidas (como os atletas), testando profundidade contra o cenário
  const ads = buildAds(scene, { toon });
  updaters.push((t, camera) => ads.update(t, camera));

  return { root, ads, update(t, camera) { for (const u of updaters) u(t, camera); } };
}
