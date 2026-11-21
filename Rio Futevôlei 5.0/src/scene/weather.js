// 4.0: clima visível na arena — chuva (gotas caindo, céu mais escuro), sol forte (luz mais quente
// e forte) e vento forte (a chuva cai inclinada; o placar mostra o ícone).
import * as THREE from 'three';
import { WEATHER_VISUAL as V } from '../condition.js'; // números do visual: src/data/weather.js (editor de clima)

const RV = V.chuva || {}, SV = V.sol || {}, WV = V.vento || {};
const DROPS = Math.max(0, Math.min(5000, Math.round(RV.gotas ?? 1600)));
const BOX = { x: 15, z: 11, y: 14 };

export function buildWeather(scene) {
  // luzes da arena (Copacabana): guardadas para voltar ao normal
  const hemi = scene.children.find(o => o.isHemisphereLight);
  const sun = scene.children.find(o => o.isDirectionalLight);
  const base = { hemi: hemi ? hemi.intensity : 1, sun: sun ? sun.intensity : 1, sunColor: sun ? sun.color.clone() : null, fog: scene.fog ? scene.fog.color.clone() : null };

  const pos = new Float32Array(DROPS * 6);
  const seed = () => [(Math.random() * 2 - 1) * BOX.x, Math.random() * BOX.y, (Math.random() * 2 - 1) * BOX.z];
  const drops = Array.from({ length: DROPS }, seed);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: RV.corGota || '#cfe3ff', transparent: true, opacity: 0.55, depthWrite: false }));
  rain.frustumCulled = false;
  rain.visible = false;
  scene.add(rain);

  let now = [];
  function set(list = []) {
    now = list;
    const wet = list.includes('chuva'), hot = list.includes('sol');
    rain.visible = wet;
    if (hemi) hemi.intensity = base.hemi * (wet ? RV.luzCeu ?? 0.7 : hot ? SV.luzCeu ?? 1.1 : 1);
    if (sun) {
      sun.intensity = base.sun * (wet ? RV.luzSol ?? 0.35 : hot ? SV.luzSol ?? 1.4 : 1);
      sun.color.copy(base.sunColor);
      if (hot) sun.color.lerp(new THREE.Color(SV.tom || '#ffd08a'), SV.tomMix ?? 0.35);
    }
    if (scene.fog && base.fog) {
      scene.fog.color.copy(base.fog);
      if (wet) scene.fog.color.lerp(new THREE.Color(RV.neblina || '#8b97a6'), RV.neblinaMix ?? 0.6);
    }
  }

  function update(dt) {
    if (!rain.visible) return;
    const wind = now.includes('vento') ? WV.arrasto ?? 6 : 0.8;
    const fall = Math.max(2, RV.queda ?? 17), len = 0.45;
    for (let i = 0; i < DROPS; i++) {
      const d = drops[i];
      d[1] -= fall * dt; d[0] += wind * dt;
      if (d[1] < 0 || d[0] > BOX.x) { const s = seed(); d[0] = s[0] - (wind > 1 ? 4 : 0); d[1] = BOX.y; d[2] = s[2]; }
      const k = i * 6;
      pos[k] = d[0]; pos[k + 1] = d[1]; pos[k + 2] = d[2];
      pos[k + 3] = d[0] - wind * len / fall; pos[k + 4] = d[1] + len; pos[k + 5] = d[2];
    }
    geo.attributes.position.needsUpdate = true;
  }

  return { set, update, get current() { return now; } };
}
