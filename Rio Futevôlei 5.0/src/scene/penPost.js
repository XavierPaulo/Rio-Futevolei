import * as THREE from 'three';

// Pós-processamento "papel e caneta" do cenário 3D:
//  - contornos (detecção de bordas) em tinta de caneta;
//  - sombreamento em hachuras (mais escuro = mais camadas de traço);
//  - a cor de cada região escolhe a caneta: azul (céu/mar), verde (vegetação),
//    vermelha (vermelhos/rosas/laranjas) e preta (escuros e cinzas);
//  - papel com fibra e borda irregular de folha rasgada.
// Os atletas, a bola e os marcadores são desenhados depois, por cima.

const vert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const frag = /* glsl */`
  uniform sampler2D tScene;
  uniform vec2 uRes;
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  // a cena é renderizada em espaço linear; aqui volta para sRGB (como aparece na tela)
  vec3 scene(vec2 uv) { return pow(max(texture2D(tScene, uv).rgb, 0.0), vec3(1.0 / 2.2)); }
  vec3 hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
  }
  // traço de hachura: linhas na direção "ang" com espaçamento "sp" (px), levemente tremidas
  float strokes(vec2 px, float ang, float sp, float seed) {
    vec2 d = vec2(cos(ang), sin(ang));
    float t = dot(px, vec2(-d.y, d.x));
    float wob = (noise(px * 0.05 + seed) - 0.5) * 2.2;
    float f = abs(fract((t + wob) / sp) - 0.5) * sp;
    float line = 1.0 - smoothstep(0.35, 1.05, f);
    // traços com começo e fim (não linhas infinitas)
    float gap = step(0.22, noise(vec2(dot(px, d) * 0.03, floor((t + wob) / sp)) + seed));
    return line * gap;
  }

  void main() {
    vec2 px = vUv * uRes;
    float tq = floor(uTime * 8.0); // "fervura" do traço 8x por segundo
    // mão tremida: a imagem entorta um pouquinho
    vec2 uv = vUv + (vec2(noise(px * 0.02 + tq), noise(px * 0.02 - tq)) - 0.5) * 0.0024;

    vec3 c = scene(uv);
    float L = lum(c);

    // bordas (Sobel na luminância)
    vec2 o = 1.3 / uRes;
    float tl = lum(scene(uv + vec2(-o.x, o.y))), tc = lum(scene(uv + vec2(0, o.y))), tr = lum(scene(uv + vec2(o.x, o.y)));
    float ml = lum(scene(uv + vec2(-o.x, 0))), mr = lum(scene(uv + vec2(o.x, 0)));
    float bl = lum(scene(uv + vec2(-o.x, -o.y))), bc = lum(scene(uv + vec2(0, -o.y))), br = lum(scene(uv + vec2(o.x, -o.y)));
    float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
    float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
    float edge = smoothstep(0.10, 0.32, length(vec2(gx, gy)));

    // escolha da caneta pela cor
    vec3 h = hsv(c);
    vec3 BLUE = vec3(0.114, 0.247, 0.627), RED = vec3(0.76, 0.12, 0.18), GREEN = vec3(0.118, 0.478, 0.235), BLACK = vec3(0.11, 0.105, 0.15);
    vec3 pen = BLACK;
    float hue = h.x * 360.0;
    if (h.y > 0.22 && h.z > 0.2) {
      if (hue < 22.0 || hue > 300.0) pen = RED;
      else if (hue < 75.0) pen = mix(BLUE, BLACK, 0.35); // areia/amarelos: azul acinzentado
      else if (hue < 165.0) pen = GREEN;
      else pen = BLUE;
    }

    // sombreamento em camadas de hachura
    float dark = clamp(1.0 - L * 1.08, 0.0, 1.0);
    float ink = 0.0;
    if (dark > 0.12) ink = max(ink, strokes(px, 0.78, 7.0, 1.0) * 0.55);
    if (dark > 0.32) ink = max(ink, strokes(px, -0.78, 6.0, 7.0) * 0.8);
    if (dark > 0.52) ink = max(ink, strokes(px, 0.1, 5.0, 13.0));
    if (dark > 0.72) ink = max(ink, strokes(px, 1.4, 4.0, 21.0));
    // áreas bem coloridas ganham um pouco mais de traço (mar, vegetação, guarda-sóis)
    if (h.y > 0.45 && dark > 0.05) ink = max(ink, strokes(px, 0.95, 5.5, 3.0) * 0.6);

    // papel: creme com fibra
    vec3 paper = vec3(0.969, 0.949, 0.894);
    paper -= (noise(px * 0.6) - 0.5) * 0.035 + noise(px * 0.02) * 0.025;

    vec3 col = mix(paper, pen, ink * 0.78);
    col = mix(col, mix(pen, BLACK, 0.35), edge * 0.9);

    // borda de folha rasgada, levemente irregular
    vec2 e = min(px, uRes - px);
    float border = min(e.x, e.y);
    float along = e.x < e.y ? px.y : px.x;
    float torn = 10.0 + noise(vec2(along * 0.08, 3.0)) * 10.0 + noise(vec2(along * 0.6, 9.0)) * 3.0;
    float inside = smoothstep(torn - 0.8, torn + 0.8, border);
    col *= mix(0.9, 1.0, smoothstep(torn, torn + 26.0, border)); // papel mais escuro perto da borda
    vec3 desk = vec3(0.22, 0.17, 0.14) * (0.85 + noise(px * 0.01) * 0.3);
    float shadow = smoothstep(torn - 10.0, torn, border) * 0.5;
    vec3 outside = mix(desk, desk * 0.6, shadow);
    gl_FragColor = vec4(mix(outside, col, inside), 1.0);
  }`;

// Estilo "Pincel": render manual com brush pen, limpo e sem papel.
//  - cores simplificadas em faixas de luz e sombra (cor chapada em 2–3 tons);
//  - contornos de pincel grossos e firmes, sem tremido;
//  - uma textura leve de passada de marcador, quase imperceptível.
export const brushFrag = /* glsl */`
  uniform sampler2D tScene;
  uniform vec2 uRes;
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  vec3 scene(vec2 uv) { return pow(max(texture2D(tScene, uv).rgb, 0.0), vec3(1.0 / 2.2)); }
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
  }
  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
  }
  float edgeAt(vec2 uv, float r) {
    vec2 o = r / uRes;
    float tl = lum(scene(uv + vec2(-o.x, o.y))), tc = lum(scene(uv + vec2(0, o.y))), tr = lum(scene(uv + vec2(o.x, o.y)));
    float ml = lum(scene(uv + vec2(-o.x, 0))), mr = lum(scene(uv + vec2(o.x, 0)));
    float bl = lum(scene(uv + vec2(-o.x, -o.y))), bc = lum(scene(uv + vec2(0, -o.y))), br = lum(scene(uv + vec2(o.x, -o.y)));
    float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
    float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
    return length(vec2(gx, gy));
  }

  void main() {
    vec2 px = vUv * uRes;
    vec3 c = scene(vUv);
    // cor chapada: valor em 3 faixas (sombra, meio-tom, luz), saturação um pouco maior
    vec3 h = rgb2hsv(c);
    float v = h.z;
    float band = v < 0.42 ? 0.34 : (v < 0.72 ? 0.66 : 0.95);
    band = mix(band, v, 0.18); // não fica totalmente duro
    h.y = clamp(h.y * 1.12, 0.0, 1.0);
    vec3 col = hsv2rgb(vec3(h.x, h.y, band));
    // passada leve de marcador (direção diagonal)
    float streak = noise(vec2(dot(px, vec2(0.7, 0.7)) * 0.02, dot(px, vec2(-0.7, 0.7)) * 0.35));
    col *= 0.975 + streak * 0.04;
    // contorno de pincel: duas larguras, a mais grossa só nas bordas fortes
    float e1 = smoothstep(0.16, 0.34, edgeAt(vUv, 0.7)); // contorno fino (metade da espessura anterior)
    float e2 = smoothstep(0.32, 0.55, edgeAt(vUv, 1.3));
    float ink = max(e1, e2 * 0.9);
    col = mix(col, vec3(0.102, 0.086, 0.133), ink * 0.92);
    gl_FragColor = vec4(col, 1.0);
  }`;


// 5.0 Estilo "Colagem": o cenário como página de revista impressa e recortada.
//  - cada cor puxa para a tinta mais próxima da paleta (uPal) e fica chapada em faixas de luz;
//  - retícula de gráfica (pontos) nas sombras; vermelho levemente desalinhado (impressão barata);
//  - céu em mosaico de quadradinhos; contorno escuro; fibra de papel.
// Parâmetros em src/data/colagem.js (editor: docs/editor-visual.html).
export const collageFrag = /* glsl */`
  uniform sampler2D tScene;
  uniform vec2 uRes;
  uniform float uTime;
  uniform vec3 uPal[16];
  uniform int uPalN;
  uniform float uFid, uBands, uDotSize, uDotK, uDotAng, uMis, uGrain, uEdge, uMosaic;
  uniform sampler2D tDepth;
  uniform float uNear, uFar, uSkyMode, uRayN, uCut, uInk;
  uniform vec2 uRayC, uShadow;
  uniform vec3 uRay1, uRay2, uCutCol, uSun;
  uniform float uRayK;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  vec3 scene(vec2 uv) { return pow(max(texture2D(tScene, uv).rgb, 0.0), vec3(1.0 / 2.2)); }
  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
  }
  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
  }
  float edgeAt(vec2 uv, float r) {
    vec2 o = r / uRes;
    float tl = lum(scene(uv + vec2(-o.x, o.y))), tc = lum(scene(uv + vec2(0, o.y))), tr = lum(scene(uv + vec2(o.x, o.y)));
    float ml = lum(scene(uv + vec2(-o.x, 0))), mr = lum(scene(uv + vec2(o.x, 0)));
    float bl = lum(scene(uv + vec2(-o.x, -o.y))), bc = lum(scene(uv + vec2(0, -o.y))), br = lum(scene(uv + vec2(o.x, -o.y)));
    float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
    float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
    return length(vec2(gx, gy));
  }
  // tinta da paleta mais próxima (comparando a cor "pura", sem a luz)
  vec3 nearestInk(vec3 c) {
    vec3 best = c; float bd = 1e9;
    for (int i = 0; i < 16; i++) {
      if (i >= uPalN) break;
      vec3 d = uPal[i] - c;
      float dd = dot(d * vec3(1.2, 1.5, 1.0), d);
      if (dd < bd) { bd = dd; best = uPal[i]; }
    }
    return best;
  }

  // profundidade linear (m) — para achar a silhueta de cada objeto do cenário
  float zAt(vec2 uv) { float d = texture2D(tDepth, uv).r; return (uNear * uFar) / max(1e-4, uFar - d * (uFar - uNear)); }
  bool isSky(vec2 uv) { return texture2D(tDepth, uv).r > 0.9999; }

  void main() {
    vec2 px = vUv * uRes;
    vec2 uv = vUv;
    bool sky = isSky(vUv);
    // céu em mosaico de quadradinhos (só onde não há nada na frente)
    if (uSkyMode > 0.5 && uSkyMode < 1.5 && uMosaic > 0.5 && isSky((floor(px / uMosaic) + 0.5) * uMosaic / uRes)) {
      uv = (floor(px / uMosaic) + 0.5) * uMosaic / uRes;
    }
    vec3 c = scene(uv);
    // impressão desalinhada: o vermelho vem de um pouco ao lado
    c.r = scene(uv + vec2(uMis, -uMis * 0.6) / uRes).r;
    // tinta mais próxima, chapada em faixas de luz
    vec3 h = rgb2hsv(c);
    vec3 ink = nearestInk(c);
    vec3 hi = rgb2hsv(ink);
    float v = floor(h.z * uBands + 0.5) / uBands;
    vec3 flatc = hsv2rgb(vec3(mix(h.x, hi.x, uFid * step(0.08, hi.y)), mix(h.y, hi.y, uFid), mix(h.z, v, 0.8)));
    vec3 col = mix(flatc, ink * (0.55 + v * 0.5), uFid * 0.55);
    if (uv != vUv) { vec2 f = fract(px / uMosaic); col *= 0.94 + 0.08 * (f.x * 0.5 + f.y * 0.5); }
    // céu de cartaz hippie: raios saindo de um sol baixo, em duas tintas
    if (sky && uSkyMode > 1.5) {
      vec2 d = (px - uRayC * uRes) / uRes.y;
      float ang = atan(d.y, d.x) + uTime * 0.02;
      float st = step(0.5, fract(ang / 6.2831853 * uRayN));
      float sun = length(d);
      // fim de tarde: horizonte quente perto do sol, topo lavanda; raios suaves por cima
      col = mix(uRay2, uRay1, smoothstep(0.05, 0.9, sun));
      col = mix(col, mix(col, vec3(1.0, 0.97, 0.9), 0.5), st * uRayK * (1.0 - smoothstep(0.2, 1.4, sun)));
      col = mix(col, uSun, (1.0 - smoothstep(0.1, 0.32, sun)) * 0.55);
      col = mix(col, uSun, 1.0 - smoothstep(0.085, 0.095, sun));
    }
    // retícula nas sombras
    float a = radians(uDotAng);
    vec2 r = mat2(cos(a), -sin(a), sin(a), cos(a)) * px / uDotSize;
    vec2 g = fract(r) - 0.5;
    float dark = clamp(1.0 - lum(col) * 1.25, 0.0, 1.0);
    float rad = sqrt(dark) * 0.62;
    float dotm = 1.0 - smoothstep(rad - 0.08, rad + 0.08, length(g));
    col = mix(col, col * 0.35 + vec3(0.06, 0.04, 0.09), dotm * uDotK * step(0.06, dark));
    // contorno de cor
    float e = uv == vUv && !sky ? smoothstep(0.18, 0.42, edgeAt(uv, 1.0)) : 0.0;
    col = mix(col, vec3(0.102, 0.086, 0.133), e * uEdge);
    // recorte de papel: cada objeto do cenário ganha borda branca, contorno grosso e sombra de colado
    if (uCut > 0.5) {
      float zc = zAt(vUv);
      float near = 0.0, edgeIn = 0.0, shadow = 0.0;
      for (int i = 0; i < 12; i++) {
        float t = float(i) / 12.0 * 6.2831853;
        vec2 o = vec2(cos(t), sin(t));
        float zr = zAt(vUv + o * uCut / uRes);
        if (zr < zc - max(0.35, zc * 0.07)) near = 1.0;               // há um objeto mais perto ao lado: aqui é a borda dele
        float zi = zAt(vUv + o * uInk / uRes);
        if (zi > zc + max(0.35, zc * 0.07)) edgeIn = 1.0;             // sou o objeto, e logo ao lado está o fundo: contorno
        float zs = zAt(vUv + (o * uCut - uShadow) / uRes);
        if (zs < zc - max(0.35, zc * 0.07)) shadow = 1.0;
      }
      col = mix(col, col * 0.62, shadow * (1.0 - near) * 0.9);
      col = mix(col, uCutCol, near);
      col = mix(col, vec3(0.102, 0.086, 0.133), edgeIn);
    }
    // fibra do papel e um leve amarelado de revista velha
    col *= 1.0 - (hash(floor(px)) - 0.5) * uGrain - (noise(px * 0.015) - 0.5) * uGrain * 0.6;
    col = mix(col, col * vec3(1.03, 1.0, 0.92), 0.5);
    gl_FragColor = vec4(col, 1.0);
  }`;

export class PenPost {
  constructor(renderer, fragmentShader = frag, extraUniforms = {}) {
    this.renderer = renderer;
    this.target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(4, 4) });
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tScene: { value: this.target.texture }, uRes: { value: new THREE.Vector2(4, 4) }, uTime: { value: 0 }, ...extraUniforms },
      vertexShader: vert, fragmentShader, depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    // Profundidade do cenário devolvida à tela depois do desenho: assim os atletas e a bola
    // continuam passando ATRÁS da rede, dos postes e do resto do cenário quando estão mais longe.
    this.depthScene = new THREE.Scene();
    this.depthScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: { tDepth: { value: this.target.depthTexture } },
      vertexShader: vert,
      fragmentShader: /* glsl */`
        uniform sampler2D tDepth;
        varying vec2 vUv;
        void main() { gl_FragDepth = texture2D(tDepth, vUv).r; gl_FragColor = vec4(0.0); }`,
      colorWrite: false, depthWrite: true, depthTest: true, depthFunc: THREE.AlwaysDepth,
    })));
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  setSize(w, h) {
    const dpr = this.renderer.getPixelRatio();
    this.target.setSize(Math.floor(w * dpr), Math.floor(h * dpr));
    this.mat.uniforms.uRes.value.set(Math.floor(w * dpr), Math.floor(h * dpr));
  }

  // cenário → textura → papel e caneta; depois os objetos do jogo por cima
  render(scene, camera, env, overlay, time) {
    const r = this.renderer;
    this.mat.uniforms.uTime.value = time;
    if (this.mat.uniforms.uNear) { this.mat.uniforms.uNear.value = camera.near; this.mat.uniforms.uFar.value = camera.far; }
    overlay.visible = false;
    r.setRenderTarget(this.target);
    r.render(scene, camera);
    r.setRenderTarget(null);
    overlay.visible = true;
    r.render(this.quadScene, this.quadCam);
    // só os objetos do jogo, sem apagar o desenho, testando contra a profundidade do cenário
    const bg = scene.background;
    scene.background = null;
    env.visible = false;
    r.autoClear = false;
    r.render(this.depthScene, this.quadCam);
    r.render(scene, camera);
    r.autoClear = true;
    env.visible = true;
    scene.background = bg;
  }
}
// 5.0 Colagem: parâmetros do efeito (src/data/colagem.js) nos uniforms do shader
const rgb3 = h => { const n = parseInt(String(h).slice(1), 16) || 0; return new THREE.Vector3((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
export function collageUniforms(C) {
  // cores em sRGB (o shader trabalha em sRGB), sem a conversão automática do THREE.Color
  const pal = (C.paleta || []).slice(0, 16).map(h => { const n = parseInt(String(h).slice(1), 16) || 0; return new THREE.Vector3((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); });
  while (pal.length < 16) pal.push(new THREE.Vector3());
  const R = C.reticula || {};
  return {
    uPal: { value: pal }, uPalN: { value: Math.min(16, (C.paleta || []).length) },
    uFid: { value: C.fidelidade ?? 0.6 }, uBands: { value: Math.max(1, C.faixas ?? 3) },
    uDotSize: { value: Math.max(2, R.tamanho ?? 6) }, uDotK: { value: R.forca ?? 0.5 }, uDotAng: { value: R.angulo ?? 15 },
    uMis: { value: C.desalinho ?? 1.5 }, uGrain: { value: C.granulado ?? 0.07 }, uEdge: { value: C.contorno ?? 0.85 }, uMosaic: { value: C.mosaico ?? 0 },
    uSkyMode: { value: { normal: 0, mosaico: 1, raios: 2 }[(C.ceu || {}).tipo] ?? 1 }, uRayN: { value: (C.ceu || {}).raios ?? 18 },
    uRayC: { value: new THREE.Vector2((C.ceu || {}).solX ?? 0.72, (C.ceu || {}).solY ?? 0.55) },
    uRay1: { value: rgb3((C.ceu || {}).cor1 || '#ff7a2e') }, uRay2: { value: rgb3((C.ceu || {}).cor2 || '#ffb43c') },
    uSun: { value: rgb3((C.ceu || {}).sol || '#fff1c9') }, uRayK: { value: (C.ceu || {}).forcaRaios ?? 0.2 },
    uCut: { value: (C.recorteCenario || {}).borda ?? 0 }, uInk: { value: (C.recorteCenario || {}).contorno ?? 2 },
    uCutCol: { value: rgb3((C.recorteCenario || {}).cor || '#fbf6e8') },
    uShadow: { value: new THREE.Vector2((C.recorteCenario || {}).sombraX ?? 3, -((C.recorteCenario || {}).sombraY ?? 4)) },
    uNear: { value: 0.1 }, uFar: { value: 1000 },
  };
}
