// 4.0: condições dos atletas, consumíveis e clima.
// Usado na partida (Modo Exibição: pausas com consumíveis; clima) e, depois, no Modo História
// (fome, sede e forma física correndo com o relógio do dia; comércio dos bairros).
import { statMods } from './art/characters.js';
import { ITEMS } from './items.js';
import WX from './data/weather.js';

export const STAT_KEYS = ['forca', 'agilidade', 'precisao', 'pique'];

// Condições: fome e sede vão de 0 a 100 (a partir de COND.limit pesam); forma física de 0 a 100
// (abaixo de COND.outOfShape, "fora de forma"). Problemas de malhar demais são marcas (sim/não).
export const COND = { limit: 70, outOfShape: 40 };
export const PENALTY = {
  fome: { forca: -2, agilidade: -2 },
  sede: { pique: -2, precisao: -2 },
  foraDeForma: { forca: -1, agilidade: -1, precisao: -1, pique: -1 },
  lesionado: { agilidade: -1 },
  fadiga: { pique: -1 },
  sono: { forca: -1 },
  ansiedade: { precisao: -1 },
};
export const FLAG_NAMES = { lesionado: 'Lesionado', fadiga: 'Fadiga', sono: 'Sono', ansiedade: 'Ansiedade' };

// Na partida: quanto a fome e a sede sobem a cada ponto disputado (o sol forte dá mais sede)
export const MATCH_DRAIN = { fome: 2, sede: 3, sunSede: WX.climas.sol.efeito.sedeExtra ?? 2 };

// Consumíveis (lanchonete e farmácia): src/data/items.js (editor de itens). buff: atributo, pontos e segundos.
// CONSUMABLES tem todos (para quem já tem na mochila); CONSUMABLE_IDS só os ativos (Exibição).
export const CONSUMABLES = Object.fromEntries(Object.entries(ITEMS).filter(([, i]) => i.shop === 'lanchonete' || i.shop === 'farmacia')
  .map(([id, i]) => [id, { name: i.name, shop: i.shop, info: i.desc, ...(i.effect || {}) }]));
export const CONSUMABLE_IDS = Object.keys(CONSUMABLES).filter(id => ITEMS[id].enabled !== false);

// Climas: de 0 a 2 ao mesmo tempo; chuva e sol forte nunca juntos. Dados em src/data/weather.js
// (editor de clima: nome, ícone, descrição, números dos efeitos, visual e sorteio).
export const WEATHER = Object.fromEntries(Object.entries(WX.climas).map(([k, w]) => [k, { name: w.name, icon: w.icon, info: w.info }]));
export const WEATHER_ON = k => !!WX.climas[k] && WX.climas[k].enabled !== false;
export const WEATHER_FX = {
  rainScatter: WX.climas.chuva.efeito.espalha, windDeg: WX.climas.vento.efeito.graus,
  sunPique: WX.climas.sol.efeito.piquePorToque, sunMax: WX.climas.sol.efeito.piqueMax, visor: WX.climas.sol.efeito.viseira ?? 0.5,
};
export const WEATHER_ROLL = WX.sorteio;
export const WEATHER_VISUAL = Object.fromEntries(Object.entries(WX.climas).map(([k, w]) => [k, w.visual || {}]));
// opções da tela da Exibição (somem as que usam um clima desativado)
export const WEATHER_PRESETS = [
  ['normal', 'Normal', []], ['chuva', WEATHER.chuva.name, ['chuva']], ['sol', WEATHER.sol.name, ['sol']], ['vento', WEATHER.vento.name, ['vento']],
  ['chuva-vento', `${WEATHER.chuva.name} e ${WEATHER.vento.name.toLowerCase()}`, ['chuva', 'vento']], ['sol-vento', `${WEATHER.sol.name} e ${WEATHER.vento.name.toLowerCase()}`, ['sol', 'vento']], ['aleatorio', 'Aleatório', null],
].filter(p => !p[2] || p[2].every(WEATHER_ON));
// sorteio do clima (src/data/weather.js, sorteio em %): dia normal; senão chuva ou sol (o principal),
// e então só o principal, só vento ou os dois. Climas desativados ficam de fora.
export function rollWeather(rnd = Math.random) {
  const S = WX.sorteio;
  if (rnd() * 100 < S.diaNormal) return [];
  const main = rnd() * 100 < S.chuva ? 'chuva' : 'sol';
  const tot = (S.soPrincipal + S.soVento + S.ambos) || 1, r = rnd() * tot;
  const out = r < S.soPrincipal ? [main] : r < S.soPrincipal + S.soVento ? ['vento'] : [main, 'vento'];
  return out.filter(WEATHER_ON);
}
export function weatherOf(preset) {
  const p = WEATHER_PRESETS.find(w => w[0] === preset);
  if (!p) return []; // opção com clima desativado: dia normal
  return p[2] ? [...p[2]] : rollWeather();
}

// estado novo de um atleta (cond = condições; buffs = efeitos temporários)
export function freshCondition(c = {}) {
  // immune: não sente fome, sede nem forma (a Zefa no Modo História) · visor: a viseira corta o sol pela metade
  return { fome: c.fome || 0, sede: c.sede || 0, forma: c.forma ?? 100, flags: { ...(c.flags || {}) }, sunLoss: 0, sunblock: false, immune: !!c.immune, visor: !!c.visor };
}

// atributos de agora: base + efeitos temporários − condições (de 1 a 10)
export function effectiveStats(base, cond, buffs = [], scale = 1) {
  const s = { ...base };
  const add = d => { for (const k in d) s[k] += d[k] * scale; };
  if (cond && !cond.immune) {
    if (cond.fome >= COND.limit) add(PENALTY.fome);
    if (cond.sede >= COND.limit) add(PENALTY.sede);
    if (cond.forma < COND.outOfShape) add(PENALTY.foraDeForma);
    for (const f in cond.flags) if (cond.flags[f] && PENALTY[f]) add(PENALTY[f]);
    s.pique -= cond.sunLoss || 0;
  }
  for (const b of buffs) s[b.stat] += b.v;
  for (const k of STAT_KEYS) s[k] = Math.max(1, Math.min(10, s[k]));
  return s;
}

// recalcula os multiplicadores de jogo do atleta (Player.mods) a partir do estado dele
export function refreshMods(pl, scale = pl.condScale ?? 1) {
  pl.stats = effectiveStats(pl.char.stats, pl.cond, pl.buffs, scale);
  pl.mods = statMods(pl.stats);
}

// usa um consumível no atleta; devolve o texto do efeito
export function consume(pl, id) {
  const c = CONSUMABLES[id];
  if (!c || !pl.cond) return '';
  const out = [];
  if (c.sede) { pl.cond.sede = Math.max(0, pl.cond.sede - c.sede); out.push(`sede −${c.sede}`); }
  if (c.fome) { pl.cond.fome = Math.max(0, pl.cond.fome - c.fome); out.push(`fome −${c.fome}`); }
  if (c.buff) { pl.buffs.push({ ...c.buff }); out.push(`+${c.buff.v} ${c.buff.stat === 'precisao' ? 'Precisão' : c.buff.stat[0].toUpperCase() + c.buff.stat.slice(1)} por ${c.buff.t} s`); }
  if (c.sunblock) { pl.cond.sunblock = true; pl.cond.sunLoss = 0; out.push('protegido do sol'); }
  if (c.cure) { const had = pl.cond.flags[c.cure]; pl.cond.flags[c.cure] = false; out.push(had ? `${FLAG_NAMES[c.cure]} curado` : `sem ${FLAG_NAMES[c.cure]} para curar`); }
  refreshMods(pl);
  return out.join(' · ');
}

// passa o tempo dos efeitos temporários; devolve true se algum acabou
export function tickBuffs(pl, dt) {
  if (!pl.buffs || !pl.buffs.length) return false;
  for (const b of pl.buffs) b.t -= dt;
  const n = pl.buffs.length;
  pl.buffs = pl.buffs.filter(b => b.t > 0);
  return pl.buffs.length !== n;
}
