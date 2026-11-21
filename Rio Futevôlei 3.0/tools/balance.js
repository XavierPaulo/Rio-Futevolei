// Teste de equilíbrio da dificuldade (ferramenta de desenvolvimento, fica fora do ZIP do itch).
// No console do jogo rodando localmente:
//   const { bench } = await import('./tools/balance.js');
//   console.log(await bench({ skills: [0.7, 0.9], games: 4 }));
// Um "jogador simulado" que acerta uma porcentagem das bolas (skill) e mira em lugares
// variados enfrenta a CPU de cada nível; o resultado é a média de pontos por partida.
import { Match } from '../src/match.js';
import { MOVES, pickMove } from '../src/moves.js';
import { CHARACTERS } from '../src/art/characters.js';

function makeBot(m, skill) {
  const inp = { x: 0, z: 0, _p: new Set(), _r: new Set(), _d: new Set(), pressed(k) { return this._p.has(k); }, released(k) { return this._r.has(k); }, down(k) { return this._d.has(k); } };
  let lastPath = null, willMiss = false, hold = 0;
  return () => {
    inp._p.clear(); inp._r.clear(); inp.x = inp.z = 0;
    const pl = m.controlledOf(0);
    if (m.state === 'serve' && m.server === pl) {
      if (!inp._d.has('A')) { inp._p.add('A'); inp._d.add('A'); hold = 10; }
      else if (--hold <= 0) { inp._d.delete('A'); inp._r.add('A'); inp.x = (Math.random() - 0.3) * -pl.side; inp.z = Math.random() * 2 - 1; }
      return inp;
    }
    if (m.ball.path !== lastPath) { lastPath = m.ball.path; willMiss = Math.random() > skill; }
    const tgt = m.ball.live ? m.ball.contactPoint(1.1, pl.side) : null;
    if (!tgt || willMiss) return inp;
    const gx = tgt.x - pl.facing * 0.3 - pl.x, gz = tgt.z - pl.z, d = Math.hypot(gx, gz);
    if (d > 0.1) { inp.x = gx / d; inp.z = gz / d; }
    const touch = Math.min(m.touchNoFor(pl), 3);
    const btn = touch === 3 && Math.random() < 0.3 ? 'B' : 'A';
    const mv = MOVES[pickMove(btn, pl.state === 'air', touch)];
    if (inp._d.has(btn)) {
      inp._d.delete(btn); inp._r.add(btn);
      if (touch === 3) { const a = Math.random() * Math.PI * 2; inp.x = Math.cos(a); inp.z = Math.sin(a); }
    } else if (!pl.swing && m.inZone(pl, mv)) { inp._p.add(btn); inp._d.add(btn); }
    return inp;
  };
}

// Porcentagem de pontos que a CPU ganha com parâmetros p contra o jogador de referência.
async function shareFor(p, skill, games) {
  const C = CHARACTERS;
  let h = 0, c = 0;
  for (let g = 0; g < games; g++) {
    const m = new Match([[C.giulia, C.zefa], [C.tubarao, C.pipoca]], { mode: 'solo', params: p });
    m.begin();
    const bot = makeBot(m, skill);
    let steps = 0;
    while (m.state !== 'over' && steps < 120 * 60 * 20) { m.step(1 / 120, { 1: bot() }); m.events.length = 0; steps++; }
    h += m.teams[0].score; c += m.teams[1].score;
    await new Promise(r => setTimeout(r));
  }
  return c / Math.max(1, h + c);
}

// Calibra os 12 níveis: mede a força da CPU em vários pontos da progressão e escolhe,
// para cada nível, o ponto em que a % de pontos da CPU sobe em degraus iguais.
// Devolve a lista LEVEL_K para colar em src/difficulty.js.
export async function calibrate({ skill = 0.85, games = 6, samples = 13 } = {}) {
  const { paramsAt } = await import('../src/difficulty.js');
  const ks = Array.from({ length: samples }, (_, i) => i / (samples - 1));
  const raw = [];
  for (const k of ks) raw.push(await shareFor(paramsAt(k), skill, games));
  // curva monótona (a medição tem ruído): média com vizinhos + máximo acumulado
  const smooth = raw.map((v, i) => (raw[Math.max(0, i - 1)] + 2 * v + raw[Math.min(raw.length - 1, i + 1)]) / 4);
  for (let i = 1; i < smooth.length; i++) smooth[i] = Math.max(smooth[i], smooth[i - 1] + 1e-4);
  const lo = smooth[0], hi = smooth[smooth.length - 1];
  const levelK = [];
  for (let l = 0; l < 12; l++) {
    const target = lo + (hi - lo) * l / 11;
    let i = 0;
    while (i < smooth.length - 2 && smooth[i + 1] < target) i++;
    const t = (target - smooth[i]) / Math.max(1e-6, smooth[i + 1] - smooth[i]);
    levelK.push(+(ks[i] + (ks[i + 1] - ks[i]) * Math.max(0, Math.min(1, t))).toFixed(3));
  }
  return {
    curve: ks.map((k, i) => `k=${k.toFixed(2)}: CPU ganha ${(raw[i] * 100).toFixed(0)}% dos pontos (suavizado ${(smooth[i] * 100).toFixed(0)}%)`).join('\n'),
    levelK,
  };
}

// Confere os níveis já calibrados: % de pontos da CPU em cada nível.
export async function verify({ skill = 0.85, games = 6 } = {}) {
  const { cpuParams } = await import('../src/difficulty.js');
  const rows = [];
  for (let l = 1; l <= 12; l++) rows.push({ level: l, share: await shareFor(cpuParams(l), skill, games) });
  return rows;
}

export async function bench({ skills = [0.7, 0.9], games = 4, levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] } = {}) {
  const C = CHARACTERS;
  const rows = [];
  for (const level of levels) {
    const cells = [];
    for (const skill of skills) {
      let won = 0, h = 0, c = 0;
      for (let g = 0; g < games; g++) {
        const m = new Match([[C.giulia, C.zefa], [C.tubarao, C.pipoca]], { mode: 'solo', level });
        m.begin();
        const bot = makeBot(m, skill);
        let steps = 0;
        while (m.state !== 'over' && steps < 120 * 60 * 20) { m.step(1 / 120, { 1: bot() }); m.events.length = 0; steps++; }
        h += m.teams[0].score; c += m.teams[1].score; if (m.winner === 1) won++;
        await new Promise(r => setTimeout(r)); // deixa a página respirar
      }
      cells.push(`acerta ${Math.round(skill * 100)}%: CPU venceu ${won}/${games}, pontos ${(h / games).toFixed(1)} x ${(c / games).toFixed(1)}`);
    }
    rows.push(`nível ${String(level).padStart(2)} | ${cells.join(' | ')}`);
  }
  return rows.join('\n');
}
