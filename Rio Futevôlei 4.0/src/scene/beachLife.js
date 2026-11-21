// 4.0: vida praiana — de tempos em tempos (30 s a 1 min) alguém passa pela arena, longe da quadra:
// siri, gaivota (voando), vendedor ambulante, banhista, cachorro caramelo ou tartaruga (na água).
import * as THREE from 'three';

// emoji, altura do chão (m), tamanho (m), velocidade (m/s), faixa de z (lado do mar fica em z < 0)
const CRITTERS = [
  { id: 'siri', icon: '🦀', y: 0.25, size: 0.6, speed: 1.4, z: [-11, -8], hop: 0.05 },
  { id: 'gaivota', icon: '🕊️', y: 6, size: 1, speed: 5, z: [-10, -4], hop: 0.4 },
  { id: 'vendedor', icon: '🧑‍🍳', y: 0.95, size: 1.9, speed: 1.2, z: [-12, -9], hop: 0.06, tag: '🥤' },
  { id: 'banhista', icon: '🏊', y: 0.2, size: 1.2, speed: 1.5, z: [-19, -16], hop: 0.08 },
  { id: 'cachorro', icon: '🐕', y: 0.45, size: 0.9, speed: 3.2, z: [-11, -8], hop: 0.12, tint: true },
  { id: 'tartaruga', icon: '🐢', y: 0.05, size: 0.8, speed: 0.6, z: [-22, -18], hop: 0.02 },
];

function emojiTex(icon, tag, tint) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.font = '100px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(icon, 64, 70);
  if (tag) { g.font = '44px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; g.fillText(tag, 100, 96); }
  if (tint) { // cachorro caramelo
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(214, 140, 60, 0.55)'; g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildBeachLife(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const mats = Object.fromEntries(CRITTERS.map(k => [k.id, new THREE.SpriteMaterial({ map: emojiTex(k.icon, k.tag, k.tint), transparent: true, depthWrite: false })]));
  const live = [];
  let wait = 8 + Math.random() * 10; // o primeiro aparece logo
  function spawn() {
    const k = CRITTERS[Math.floor(Math.random() * CRITTERS.length)];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const s = new THREE.Sprite(mats[k.id]);
    s.scale.set(k.size * -dir, k.size, 1); // emojis olham para a esquerda: vira conforme o caminho
    const z = k.z[0] + Math.random() * (k.z[1] - k.z[0]);
    s.position.set(-dir * 30, k.y, z);
    root.add(s);
    live.push({ k, s, dir, t: 0 });
  }
  function update(dt, enabled = true) {
    root.visible = enabled;
    if (!enabled) return;
    wait -= dt;
    if (wait <= 0) { spawn(); wait = 30 + Math.random() * 30; }
    for (let i = live.length - 1; i >= 0; i--) {
      const c = live[i];
      c.t += dt;
      c.s.position.x += c.dir * c.k.speed * dt;
      c.s.position.y = c.k.y + Math.abs(Math.sin(c.t * 6)) * c.k.hop;
      if (Math.abs(c.s.position.x) > 31) { root.remove(c.s); live.splice(i, 1); }
    }
  }
  return { update };
}
