import * as THREE from 'three';
import { createRegistry } from './registry.js';
import CAMERA_DATA from '../data/cameras.js';

// Câmeras: definições no registro + o "rig" que move a câmera do Three.js.
export const cameras = createRegistry('camera', {
  name: { type: 'text', label: 'Nome' },
  desc: { type: 'text', label: 'Descrição' },
  anchor: { type: 'choice', label: 'Âncora', options: ['world', 'home'] },
  position: { type: 'vec3', label: 'Posição' },
  target: { type: 'vec3', label: 'Alvo' },
  fov: { type: 'number', label: 'Abertura (°)', min: 10, max: 100 },
  minHFov: { type: 'number', label: 'Largura mínima (°)', min: 10, max: 140 },
  follow: {
    type: 'group', label: 'Seguir a bola', fields: {
      pan: { type: 'number', label: 'Acompanha de lado' }, panMax: { type: 'number', label: 'Limite (m)' },
      back: { type: 'number', label: 'Recuo (m)' }, lift: { type: 'number', label: 'Sobe o olhar' }, liftMax: { type: 'number', label: 'Limite (m)' },
    },
  },
  facing: { type: 'choice', label: 'Virada dos atletas', options: ['screen'] },
});
cameras.load(CAMERA_DATA);
export const DEFAULT_CAMERA = 'lateral';

const TRANSITION = 1.1; // s: troca de câmera ou de lado (a câmera orbita em volta da quadra)
const UP = new THREE.Vector3(0, 1, 0);
const smooth = t => t * t * (3 - 2 * t);
const lerpAngle = (a, b, t) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

// Enquadramento em coordenadas "orbitais" (alvo + ângulo/distância/altura), para que a
// transição gire em volta da quadra em vez de atravessá-la.
function orbitOf(def, homeSide) {
  const flip = def.anchor === 'home' && homeSide === 1 ? -1 : 1; // 180° em volta do centro
  const [px, py, pz] = def.position, [tx, ty, tz] = def.target;
  const target = new THREE.Vector3(tx * flip, ty, tz * flip);
  const ox = px * flip - target.x, oz = pz * flip - target.z;
  return { target, yaw: Math.atan2(ox, oz), dist: Math.hypot(ox, oz), h: py - ty, fov: def.fov, minHFov: def.minHFov };
}
const positionOf = o => new THREE.Vector3(o.target.x + Math.sin(o.yaw) * o.dist, o.target.y + o.h, o.target.z + Math.cos(o.yaw) * o.dist);

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.key = null;   // câmera + lado atual
    this.from = null;  // enquadramento no início da transição
    this.pose = null;  // enquadramento atual
    this.t = 1;
    this.off = { pan: 0, back: 0, lift: 0 };
    this.aspect = 16 / 9;
    this.right = new THREE.Vector3(1, 0, 0); // direita da tela no chão (câmera real, para a virada dos atletas)
    this.basis = { right: { x: 1, z: 0 }, fwd: { x: 0, z: -1 } }; // eixos dos controles (alinhados à quadra)
    cameras.onChange(() => { this.key = null; }); // definição editada: reenquadra
  }

  setAspect(aspect) { this.aspect = aspect; }

  // opts: { id, homeSide, ball, follow, shake }
  update(dt, { id, homeSide = -1, ball, follow = false, shake = 0 }) {
    const def = cameras.get(id) || cameras.get(DEFAULT_CAMERA);
    const goal = orbitOf(def, homeSide);
    const key = `${def.id}:${def.anchor === 'home' ? homeSide : 0}`;
    if (key !== this.key) {
      if (this.pose && this.key !== null) { this.from = this.pose; this.t = 0; } else this.t = 1;
      this.key = key;
      this.setBasis(goal);
    } else if (this.t >= 1 && this.pose) {
      this.setBasis(goal); // segue a definição (o editor pode mexer ao vivo)
    }
    this.t = Math.min(1, this.t + dt / TRANSITION);
    const e = smooth(this.t);
    const f = this.from;
    this.pose = this.t >= 1 || !f ? goal : {
      target: f.target.clone().lerp(goal.target, e),
      yaw: lerpAngle(f.yaw, goal.yaw, e),
      dist: f.dist + (goal.dist - f.dist) * e,
      h: f.h + (goal.h - f.h) * e,
      fov: f.fov + (goal.fov - f.fov) * e,
      minHFov: f.minHFov + (goal.minHFov - f.minHFov) * e,
    };
    const p = this.pose;
    const pos = positionOf(p);
    const fwd = p.target.clone().sub(pos).setY(0).normalize();
    this.right.set(-fwd.z, 0, fwd.x);

    // seguindo a bola: acompanha de lado, recua um pouco e sobe o olhar com a bola alta
    const fo = def.follow || {};
    const o = this.off;
    const toB = ball ? new THREE.Vector3(ball.x, 0, ball.z).sub(p.target) : null;
    const clamp = (v, m) => Math.max(-m, Math.min(m, v));
    const tPan = follow && toB ? clamp(toB.dot(this.right) * (fo.pan || 0), fo.panMax || 0) : 0;
    const tBack = follow ? fo.back || 0 : 0;
    const tLift = follow && ball ? Math.max(0, Math.min(fo.liftMax || 0, (ball.y - 2) * (fo.lift || 0))) : 0;
    const k = Math.min(1, dt * 2.2);
    o.pan += (tPan - o.pan) * k;
    o.back += (tBack - o.back) * k;
    o.lift += (tLift - o.lift) * k;

    const sk = shake * shake * 2.5;
    const jitter = () => (Math.random() - 0.5) * sk;
    const cam = this.camera;
    cam.position.copy(pos)
      .addScaledVector(this.right, o.pan + jitter())
      .addScaledVector(fwd, -o.back)
      .addScaledVector(UP, o.lift * 0.5 + jitter());
    cam.lookAt(p.target.clone().addScaledVector(this.right, o.pan).addScaledVector(UP, o.lift));

    // abertura: a mínima da câmera, ou a que mantém a largura da quadra visível
    const vFromH = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(p.minHFov) / 2) / this.aspect));
    const fov = Math.max(p.fov, vFromH);
    if (Math.abs(cam.fov - fov) > 1e-3 || cam.aspect !== this.aspect) {
      cam.fov = fov;
      cam.aspect = this.aspect;
      cam.updateProjectionMatrix();
    }
  }

  // Eixos dos controles: os da câmera de destino, alinhados ao eixo da quadra mais próximo
  // (assim "cima" é sempre exatamente em direção ao fundo da tela, sem diagonal).
  setBasis(o) {
    const pos = positionOf(o);
    let fx = o.target.x - pos.x, fz = o.target.z - pos.z;
    if (Math.abs(fx) > Math.abs(fz)) { fx = Math.sign(fx); fz = 0; } else { fz = Math.sign(fz); fx = 0; }
    this.basis = { fwd: { x: fx, z: fz }, right: { x: -fz, z: fx } };
  }

  // Direcional da tela (x = direita, z = baixo) → direção no chão da quadra.
  toWorld(sx, sz) {
    const { right: r, fwd: f } = this.basis;
    return { x: r.x * sx - f.x * sz, z: r.z * sx - f.z * sz };
  }

  // Lado da tela para onde aponta uma direção no chão: 1 = direita, -1 = esquerda, 0 = indefinido.
  screenSide(x, z) {
    const len = Math.hypot(x, z);
    if (len < 1e-6) return 0;
    const d = (x * this.right.x + z * this.right.z) / len;
    return Math.abs(d) < 0.08 ? 0 : Math.sign(d);
  }
}
