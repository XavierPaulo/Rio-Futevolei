// Edição ao vivo: o editor de golpes (docs/editor-golpes.html, aberto no mesmo servidor do jogo)
// avisa quando grava no jogo, e os golpes e a física mudam na hora, sem recarregar a página.
// O jogo lê os golpes do registro moveDefs e a física de MODEL_PARAMS a cada toque.
import { moveDefs } from '../moves.js';
import { MODEL_PARAMS } from './trajectory.js';
import HITBOX from '../data/hitbox.js';
import AI_TREE from '../data/ai-tree.js';
import { TILT } from '../tilt.js';

export const EDITOR_CHANNEL = 'rf2-golpes';

export function listenEditor(onApply) {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const ch = new BroadcastChannel(EDITOR_CHANNEL);
  ch.onmessage = e => {
    const { moves, models, hitbox, aiTree, tilt } = e.data || {};
    if (tilt) TILT.data = JSON.parse(JSON.stringify(tilt)); // golpes do Modo Tilt
    if (moves) moveDefs.load(moves);
    if (hitbox) Object.assign(HITBOX, hitbox); // largura da hitbox (todos os golpes)
    if (aiTree) for (const k of Object.keys(aiTree)) AI_TREE[k] = aiTree[k]; // árvore de decisão da CPU
    if (models) for (const [id, p] of Object.entries(models)) MODEL_PARAMS[id] = { ...(MODEL_PARAMS[id] || {}), ...p };
    if (onApply) onApply(e.data);
  };
  return () => ch.close();
}
