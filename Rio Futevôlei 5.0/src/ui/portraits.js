import { CHARACTERS } from '../art/characters.js';
import { drawAthlete } from '../art/draw.js';
import { poseFor } from '../art/poses.js';
import { settings } from './settings.js';
import { drawChibiHead } from '../art/chibi.js';
import COL from '../data/colagem.js';

export const PLAYER_COLORS = { 1: '#ff4d6d', 2: '#3d8bff', 3: '#2fd36b', 4: '#ffb21a' }; // 5.0: J3 e J4

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

// 5.0: só o rosto do atleta (ícone da barra de especial): desenha apenas a cabeça, com o mesmo código do jogo
// (cabelo, chapéu, acessórios e, no visual Colagem, o rosto "de gente" com o jeito de cada atleta)
const faceCache = {};
export function faceIcon(id) {
  const ch = CHARACTERS[id];
  const key = settings.art + ':' + id + ':' + (ch.version || 0);
  if (faceCache[key]) return faceCache[key];
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d');
  const V = COL.visualAtletas || {}, per = (V.atletas || {})[id] || {};
  const rosto = settings.art === 'colagem' && V.ligado !== false
    ? { real: V.rostoHumano !== false, olhar: per.olhar || (V.padrao || {}).olhar, sorriso: per.sorriso || (V.padrao || {}).sorriso, barba: !!per.barbaPorFazer }
    : null;
  const look = { ...ch };
  if (per.tatuagem !== undefined) look.tattoo = per.tatuagem || null;
  g.translate(44, 56); g.scale(0.62, 0.62);
  drawChibiHead(g, look, 0, 'smile', 0.3, settings.art === 'cartoon' ? 1 : 0.6, rosto);
  return (faceCache[key] = c.toDataURL());
}
