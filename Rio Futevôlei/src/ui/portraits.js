import { CHARACTERS } from '../art/characters.js';
import { drawAthlete } from '../art/draw.js';
import { poseFor } from '../art/poses.js';
import { settings } from './settings.js';

export const PLAYER_COLORS = { 1: '#ff4d6d', 2: '#3d8bff' };

// Atleta "de mentira" só para desenhar poses fora da partida.
export function dummy(extra = {}) {
  return { idx: 0, team: 0, state: 'ground', speed: 0, runPhase: 0, hold: null, holdT: 0, telegraph: null, swing: null, mood: null, facing: 1, vx: 0, downKind: 'front', ...extra };
}

// Retrato de cada atleta (desenhado uma vez por estilo, como imagem).
const cache = {};
export function portrait(id) {
  const key = settings.art + ':' + id + ':' + (CHARACTERS[id].version || 0);
  if (!cache[key]) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    drawAthlete(c.getContext('2d'), CHARACTERS[id], poseFor(dummy(), 0.3), 0.3);
    cache[key] = c.toDataURL();
  }
  return cache[key];
}
