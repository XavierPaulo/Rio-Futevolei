// Escolhe o desenho dos atletas e da bola conforme o estilo artístico configurado:
// 'pincel' (padrão) · 'caneta' · 'cartoon' · 'colagem' (5.0: recortes de revista).
import { settings } from '../ui/settings.js';
import { drawChibi, drawBall } from './chibi.js';
import { drawPen, drawPenBall } from './pen.js';
import { drawBrush } from './brush.js';
import { drawCollage, drawCollageBall } from './collage.js';

export const isPen = () => settings.art === 'caneta';
export const isCartoon = () => settings.art === 'cartoon';
export const isCollage = () => settings.art === 'colagem';

export function drawAthlete(ctx, ch, pose, time) {
  if (settings.art === 'caneta') return drawPen(ctx, ch, pose, time);
  if (settings.art === 'pincel') return drawBrush(ctx, ch, pose, time);
  if (settings.art === 'colagem') return drawCollage(ctx, ch, pose, time);
  return drawChibi(ctx, ch, pose, time);
}

export function drawBallArt(ctx) {
  if (isCollage()) return drawCollageBall(ctx);
  return isPen() ? drawPenBall(ctx) : drawBall(ctx);
}
