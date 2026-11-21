// Trajetórias da bola (2.0) com física real: gravidade, arrasto do ar e efeito.
// Com arrasto linear (dv/dt = −k·v), os eixos se separam e têm fórmula fechada:
//   horizontal: x(t) = x0 + vx0 · E(t),  E(t) = (1 − e^(−k t)) / k   (sem ar: E = t)
//   vertical:   y(t) = y0 + (vy0 + g/k) · E(t) − g t / k            (sem ar: y0 + vy0 t − g t²/2)
// O golpe diz a altura máxima; o jogo acha a velocidade vertical que chega a ela (bisseção), o
// tempo até a bola descer à altura de chegada, e a velocidade horizontal que leva ao destino.
import MODEL_DATA, { PARAM_INFO } from '../data/trajectories.js';
export { PARAM_INFO };

// Parâmetros vivos (o editor de golpes pode trocar; a próxima bola já usa)
export const MODEL_PARAMS = JSON.parse(JSON.stringify(MODEL_DATA));
export const gravity = () => (MODEL_PARAMS.mundo && MODEL_PARAMS.mundo.gravity) || 9;

export const MODELS = {
  balistica: { name: 'Parábola balística', hint: 'só gravidade, sem efeito' },
  arrasto: { name: 'Parábola com arrasto', hint: 'o ar freia: pico adiante, queda mais em pé' },
  topspin: { name: 'Efeito para baixo (topspin)', hint: 'sai forte e mergulha' },
  backspin: { name: 'Efeito para trás (backspin)', hint: 'curva mais longa e achatada' },
  cravada: { name: 'Cravada', hint: 'sai para baixo e acelera' },
  balao: { name: 'Balão / lob alto', hint: 'sobe muito e cai quase na vertical' },
  largadinha: { name: 'Largadinha', hint: 'curta, pico logo depois do contato' },
  sidespin: { name: 'Efeito lateral (sidespin)', hint: 'faz curva para o lado' },
  flutuante: { name: 'Saque flutuante', hint: 'sem rotação, balança de lado' },
};
export const MODEL_IDS = Object.keys(MODELS);
// Velocidade da bola de cada golpe (traj.pace): o mesmo caminho (altura máxima e destino)
// percorrido mais depressa ou mais devagar.
export const PACE = {
  rapida: { name: 'Rápida', rate: 1.3 },
  normal: { name: 'Normal', rate: 1 },
  lenta: { name: 'Lenta', rate: 0.7 },
};
export const paceRate = id => (PACE[id] || PACE.normal).rate;
// nomes antigos (1ª versão da 2.0) → modelos físicos
const LEGACY = { simetrica: 'balistica', impulso: 'topspin', assimetrica: 'arrasto', plato: 'backspin', linear: 'cravada', suave: 'largadinha' };
export const modelId = id => (MODELS[id] ? id : LEGACY[id] || 'balistica');

const E = (k, t) => (k > 1e-6 ? (1 - Math.exp(-k * t)) / k : t);
// subida/descida com arrasto: altura ganha e velocidade vertical no instante t
function yAt(y0, vy0, g, k, t) { return k > 1e-6 ? y0 + (vy0 + g / k) * E(k, t) - g * t / k : y0 + vy0 * t - g * t * t / 2; }
// termo lateral de uma aceleração constante a (efeito lateral) com arrasto: z += a · F(t)
const F = (k, t) => (k > 1e-6 ? (t - E(k, t)) / k : t * t / 2);
function apexOf(vy0, g, k) {
  if (vy0 <= 0) return { t: 0, h: 0 };
  const t = k > 1e-6 ? Math.log(1 + k * vy0 / g) / k : vy0 / g;
  return { t, h: yAt(0, vy0, g, k, t) };
}

// Altura da bola ao cruzar a rede (x = 0), ou null se ela não cruza.
export function netCrossY(sc) {
  if (Math.sign(sc.p0.x) === Math.sign(sc.p0.x + sc.vx0 * E(sc.k, sc.T)) || !sc.vx0) return null;
  const e = -sc.p0.x / sc.vx0;
  const t = sc.k > 1e-6 ? -Math.log(1 - sc.k * e) / sc.k : e;
  return Number.isFinite(t) ? yAt(sc.p0.y, sc.vy0, sc.g, sc.k, t) : null;
}

// Resolve a trajetória: tr = { to: {x,z}, model, apex, launch, bend, pace } a partir de p0 = {x,y,z}.
// O resultado traz rate (velocidade do golpe): o tempo de voo real é T / rate.
// speed = Força do atleta (1 = Força 5): chute mais forte sai mais reto (pico mais baixo) e rápido.
// netClear (altura, m): para a bola que vai para o outro lado, o jogo sobe o pico o mínimo
// necessário para passar a fita, como um jogador faz — menos na cravada, que pode bater na rede.
export function solve(tr, p0, speed = 1, opts = {}) {
  const sc = solveNet(tr, p0, speed, opts);
  sc.rate = paceRate(tr.pace);
  return sc;
}
function solveNet(tr, p0, speed, { netClear = null } = {}) {
  const sc = solveRaw(tr, p0, speed);
  if (netClear == null || sc.model === 'cravada') return sc;
  const y = netCrossY(sc);
  if (y == null || y >= netClear) return sc;
  // sobe o pico até cruzar a rede com folga (no máximo +6 m acima do pico pedido)
  const base = Math.max(tr.apex || 0, p0.y);
  let lo = 0, hi = 6, best = solveRaw({ ...tr, apex: base + hi }, p0, 1);
  if ((netCrossY(best) ?? netClear) < netClear) return sc; // nem assim passa: deixa como está
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const s2 = solveRaw({ ...tr, apex: base + mid }, p0, 1);
    if ((netCrossY(s2) ?? netClear) >= netClear) { hi = mid; best = s2; } else lo = mid;
  }
  return best;
}

function solveRaw(tr, p0, speed = 1) {
  const id = modelId(tr.model);
  const mp = MODEL_PARAMS[id] || {};
  const k = Math.max(0, mp.drag || 0);
  const g = Math.max(2, gravity() + (mp.spin || 0));
  const y1 = tr.y1 ?? 0.15;
  let vy0;
  if (id === 'cravada') {
    vy0 = -Math.abs(tr.launch ?? 3) * speed;
  } else {
    const base = Math.max(p0.y, y1);
    const H = Math.max(base + 0.05, base + (Math.max(tr.apex || 0, base) - base) / (speed * speed));
    const need = H - p0.y;
    let lo = 0, hi = 60;
    for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (apexOf(mid, g, k).h < need) lo = mid; else hi = mid; }
    vy0 = (lo + hi) / 2;
  }
  // tempo até descer à altura de chegada (depois do pico)
  const ta = apexOf(vy0, g, k).t;
  let lo = ta, hi = ta + 0.05;
  while (yAt(p0.y, vy0, g, k, hi) > y1 && hi < 30) hi += 0.25;
  for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (yAt(p0.y, vy0, g, k, mid) > y1) lo = mid; else hi = mid; }
  const T = Math.max(0.15, (lo + hi) / 2);
  const ET = E(k, T);
  const az = 8 * (tr.bend || 0) / (T * T); // curva lateral: desvio de "bend" m no meio do caminho
  return {
    p0: { ...p0 }, to: { ...tr.to }, model: id, T, k, g, vy0, y1,
    vx0: (tr.to.x - p0.x) / ET,
    vz0: (tr.to.z - p0.z - az * F(k, T)) / ET,
    az, wobble: mp.wobble || 0, freq: mp.freq || 1,
  };
}

// Posição no instante tau (0..1 do tempo de voo) de uma trajetória resolvida.
export function pointAt(sc, tau) {
  const t = Math.max(0, Math.min(1, tau)) * sc.T;
  const e = E(sc.k, t);
  const wob = sc.wobble ? sc.wobble * Math.sin(2 * Math.PI * sc.freq * t) * Math.sin(Math.PI * t / sc.T) : 0;
  return {
    x: sc.p0.x + sc.vx0 * e,
    y: yAt(sc.p0.y, sc.vy0, sc.g, sc.k, t),
    z: sc.p0.z + sc.vz0 * e + sc.az * F(sc.k, t) + wob,
  };
}
