// Escolhe o desenho dos atletas e da bola conforme o estilo artístico configurado:
// 'pincel' (padrão) · 'caneta' · 'cartoon'.
import { settings } from '../ui/settings.js';
import { drawChibi, drawBall } from './chibi.js';
import { drawPen, drawPenBall } from './pen.js';
import { drawBrush } from './brush.js';

export const isPen = () => settings.art === 'caneta';
export const isCartoon = () => settings.art === 'cartoon';

export function drawAthlete(ctx, ch, pose, time) {
  if (settings.art === 'caneta') return drawPen(ctx, ch, pose, time);
  if (settings.art === 'pincel') return drawBrush(ctx, ch, pose, time);
  return drawChibi(ctx, ch, pose, time);
}

export function drawBallArt(ctx) {
  return isPen() ? drawPenBall(ctx) : drawBall(ctx);
}
