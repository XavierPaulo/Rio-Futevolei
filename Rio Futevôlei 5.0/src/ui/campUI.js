// 5.0: telas do Modo Campeonato, do cara ou coroa (início de cada partida e do set decisivo) e do intervalo
// entre sets. Ligadas ao menu do HUD (src/hud.js) pelos ganchos extItems / extHead / extActivate / extClass.
import { CHARACTERS } from '../art/characters.js';
import { faceIcon } from './portraits.js';
import { LEVEL_NAMES, MIN_LEVEL, MAX_LEVEL } from '../difficulty.js';
import { V5 } from '../v5.js';
import { settings, saveSettings } from './settings.js';
import { SLOTS, slotLabel } from '../story/save.js';
import { loadCamp, saveCamp, standings, nextMatch, formatOf, PHASE_NAME, teamName, campAthletes, CAMP, placeName, medal, isHuman, humanTeams, playersOf, cpuMatches, escada, DIFF_NAME, LEVEL_MODE_NAME, PONTOS } from '../camp.js';
import { seatedPlayers } from '../input.js';
import { PLAYER_COLORS } from './portraits.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const first = id => ((CHARACTERS[id] || { name: id }).name || '').split(' ')[0];
const faces = ids => ids.map(id => `<img class="cp-face" src="${faceIcon(id)}" alt="">`).join('');
const short = ids => ids.map(first).join(' & ');
const money = v => 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR');
const ptag = n => `<span class="ptag" style="--pc:${PLAYER_COLORS[n]}">J${n}</span>`;
const tags = (T, id) => playersOf(T, id).map(ptag).join('');

// moeda do cara ou coroa: face = 'cara' | 'coroa' (null = girando)
export function coinSVG(face) {
  const cara = '<circle cx="50" cy="44" r="15" fill="#a8741a"/><path d="M33 76c3-12 11-17 17-17s14 5 17 17" fill="#a8741a"/>';
  const coroa = '<path d="M28 66 L24 36 L39 50 L50 30 L61 50 L76 36 L72 66 Z" fill="#a8741a"/><rect x="27" y="68" width="46" height="7" rx="3" fill="#a8741a"/>';
  return `<svg class="coin ${face ? '' : 'spin'}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#ffd34d" stroke="#1a1622" stroke-width="4"/><circle cx="50" cy="50" r="38" fill="none" stroke="#d9a21f" stroke-width="3"/>${face === 'coroa' ? coroa : cara}</svg>`;
}

// 5.0: jogadores de cada dupla escolhida (cfg.seat: jogador → dupla) e a configuração para o camp.js
export function campDuplaPlayers(cfg) { const out = Array.from({ length: cfg.nd || 1 }, () => []); for (const n of cfg.players) out[cfg.seat[n]] && out[cfg.seat[n]].push(n); return out; }
export function campCfgOut(cfg) { return { diff: cfg.diff, levelMode: cfg.levelMode, pontos: cfg.pontos, duplas: campDuplaPlayers(cfg).map((players, d) => ({ ids: [...cfg.ids[d]], players })) }; }

// 5.0: chave do mata-mata — 4 duplas de cada lado (quartas), semifinalistas, a final e o campeão no meio
// (e a disputa de 3º lugar embaixo). Coordenadas em % da área da chave. Cada vencedor novo segue a linha até
// a próxima caixa (0,6 s) e aparece nela (0,2 s): 0,8 s no total.
const BK_ANIM = 0.8;
let bkAnim = null; // { ids: Set, t0 } — animação em andamento (a tela é redesenhada a cada movimento no menu)
function bracketHTML(c, T) {
  const q = i => T.matches.find(m => m.phase === 'quartas' && m.slot === i);
  const sm = i => T.matches.find(m => m.phase === 'semi' && m.slot === i);
  const fin = T.matches.find(m => m.phase === 'final'), ter = T.matches.find(m => m.phase === 'terceiro');
  // vencedores novos (ainda não animados): marca como vistos e guarda o começo da animação
  const decided = T.matches.filter(m => m.winner !== null && m.phase !== 'terceiro');
  T.shown = T.shown || [];
  const fresh = decided.filter(m => !T.shown.includes(m.id)).map(m => m.id);
  if (fresh.length) { bkAnim = { ids: new Set(fresh), t0: performance.now() }; T.shown.push(...fresh); saveCamp(c); }
  const el = bkAnim ? (performance.now() - bkAnim.t0) / 1000 : 9;
  const anim = id => bkAnim && bkAnim.ids.has(id) && el < BK_ANIM + 0.1;
  const LY = p => 12.5 + 25 * (p % 4);           // folhas (posição 0..7)
  const SY = i => (i % 2 ? 75 : 25);              // semifinalistas (vencedor das quartas i)
  const FY = j => (j ? 56 : 44);                  // finalistas (vencedor da semi j) na caixa da final
  const lines = [], hi = [];
  // segmento: [x1, y1, x2, y2] (horizontal ou vertical)
  const seg = ([x1, y1, x2, y2], cls, d = null) => {
    const h = y1 === y2, st = h ? `left:${Math.min(x1, x2)}%;top:${y1}%;width:${Math.abs(x2 - x1)}%` : `left:${x1}%;top:${Math.min(y1, y2)}%;height:${Math.abs(y2 - y1)}%`;
    const o = h ? (x2 > x1 ? 'o-l' : 'o-r') : (y2 > y1 ? 'o-t' : 'o-b');
    return `<i class="bk-ln ${h ? 'h' : 'v'} ${cls} ${d !== null ? 'an ' + o : ''}" style="${st}${d !== null ? `;--d:${(d - el).toFixed(3)}s` : ''}"></i>`;
  };
  // caminho de uma folha / caixa até a próxima (3 segmentos em cotovelo)
  const elbow = (x0, y0, xj, y1, x1) => [[x0, y0, xj, y0], [xj, y0, xj, y1], [xj, y1, x1, y1]];
  const pathQ = p => { const i = p >> 1; return p < 4 ? elbow(17, LY(p), 18.75, SY(i), 20.5) : elbow(83, LY(p), 81.25, SY(i), 79.5); };
  const pathS = i => (i < 2 ? elbow(37.5, SY(i), 39.25, FY(0), 41) : elbow(62.5, SY(i), 60.75, FY(1), 59));
  const pathF = () => [[50, 38, 50, 24]];
  const draw = (path, won, id) => {
    for (const sg of path) lines.push(seg(sg, 'base'));
    if (won) path.forEach((sg, k) => hi.push(seg(sg, 'win', anim(id) ? k * (0.6 / path.length) : null)));
  };
  for (let p = 0; p < 8; p++) { const m = q(p >> 1); draw(pathQ(p), m && m.winner !== null && m.winner === T.bracket[p], m && m.id); }
  for (let i = 0; i < 4; i++) { const m = q(i), s2 = sm(i >> 1); draw(pathS(i), !!(m && s2 && s2.winner !== null && s2.winner === m.winner), s2 && s2.id); }
  draw(pathF(), !!(fin && fin.winner !== null), fin && fin.id);
  // caixas
  const who = id => (id === null || id === undefined ? '<span class="bk-q">?</span>'
    : `${isHuman(T, id) && humanTeams(T).length > 1 ? tags(T, id) : ''}${faces(T.teams[id].ids)}<span class="bk-n">${esc(short(T.teams[id].ids))}</span>`);
  const box = (x, yc, id, { lost = false, popId = null, cls = '', h = 18 } = {}) => {
    const pop = popId !== null && anim(popId);
    return `<div class="bk-box ${cls} ${id !== null && id !== undefined && isHuman(T, id) ? 'me' : ''} ${lost ? 'lost' : ''} ${pop ? 'pop' : ''}" style="left:${x}%;top:${yc - h / 2}%;height:${h}%${pop ? `;--d:${(0.6 - el).toFixed(3)}s` : ''}">${who(id)}</div>`;
  };
  const boxes = [];
  for (let p = 0; p < 8; p++) { const m = q(p >> 1), id = T.bracket[p]; boxes.push(box(p < 4 ? 0 : 83, LY(p), id, { lost: !!(m && m.winner !== null && m.winner !== id) })); }
  for (let i = 0; i < 4; i++) {
    const m = q(i), s2 = sm(i >> 1), id = m && m.winner !== null ? m.winner : null;
    boxes.push(box(i < 2 ? 20.5 : 62.5, SY(i), id, { popId: m && m.id, lost: !!(s2 && s2.winner !== null && s2.winner !== id) }));
  }
  // final: uma caixa com os dois finalistas (o da esquerda em cima)
  const fRow = j => { const s2 = sm(j), id = s2 && s2.winner !== null ? s2.winner : null, pop = s2 && anim(s2.id);
    return `<div class="bk-row ${id !== null && isHuman(T, id) ? 'me' : ''} ${fin && fin.winner !== null && fin.winner !== id ? 'lost' : ''} ${pop ? 'pop' : ''}" style="${pop ? `--d:${(0.6 - el).toFixed(3)}s` : ''}">${who(id)}</div>`; };
  const sc = m => (m && m.winner !== null ? `<small class="bk-sc">${m.sets.map(x => x.join('-')).join(' / ')}</small>` : '');
  boxes.push(`<div class="bk-box bk-final" style="left:41%;top:38%;height:24%"><b class="bk-tag">Final</b>${fRow(0)}${fRow(1)}${sc(fin)}</div>`);
  boxes.push(box(41, 16, fin && fin.winner !== null ? fin.winner : null, { popId: fin && fin.id, cls: 'bk-champ', h: 16 }).replace(/">/, '"><b class="bk-tag">🏆 Campeão</b>'));
  const tRow = id => `<div class="bk-row ${id !== null && id !== undefined && isHuman(T, id) ? 'me' : ''} ${ter && ter.winner !== null && ter.winner !== id ? 'lost' : ''}">${who(id)}</div>`;
  boxes.push(`<div class="bk-box bk-third" style="left:41%;top:72%;height:24%"><b class="bk-tag">3º lugar</b>${tRow(ter ? ter.a : null)}${tRow(ter ? ter.b : null)}</div>`);
  return `<div class="bk" aria-label="Chave do campeonato">${lines.join('')}${hi.join('')}${boxes.join('')}</div>`;
}

const DIFFS = ['facil', 'medio', 'dificil'], MODES = ['aleatorio', 'escada'];
export function installCampUI(hud) {
  // ---------- cara ou coroa ----------
  // kind: 'match' (início) · 'set3' (sorteio do set decisivo) · 'choice' (2º set: quem perdeu o sorteio escolhe)
  // Quem ganha escolhe o saque ou o lado da quadra; quem perde escolhe o que sobrou (o lado, ou sacar / receber).
  const CQ = () => V5.caraOuCoroa || {};
  const cpuSaque = () => Math.random() < +(CQ().cpuSaque ?? 0.7);
  hud.startToss = (m, kind, onDone) => {
    // 5.0: Configurações → Ajudas → Sorteio automático: sem a tela; quem ganha é sorteado (o jogador escolhe sacar)
    if (settings.tossAuto || m.tossAuto || !m.teams.some(t => t.human)) {
      const winner = kind === 'choice' ? (m.toss ? m.toss.loser : 1) : (Math.random() < 0.5 ? 0 : 1);
      const saca = m.teams[winner].human || cpuSaque();
      if (kind !== 'choice') m.toss = { winner, loser: 1 - winner };
      onDone(saca ? winner : 1 - winner, null);
      return;
    }
    const humans = m.teams.filter(t => t.human).map(t => t.id);
    const st = hud.tossSt = { m, kind, onDone, humans, picker: humans.length ? humans[0] : 0, call: null, face: null, winner: null, cpuChoice: null,
      pick: null, side0: null, serveTeam: null, log: [] };
    if (kind === 'choice') {
      const chooser = m.toss ? m.toss.loser : 1;
      st.winner = chooser;
      if (!m.teams[chooser].human) st.cpuChoice = cpuSaque() ? 'sacar' : 'receber';
      hud.open('toss-choice');
      return;
    }
    hud.open('toss');
  };
  // lado na tela (-1 = esquerda) do lado da quadra s (-1 / 1)
  const screenOf = s => (hud.sideOnScreen ? hud.sideOnScreen(s) : s) < 0 ? -1 : 1;
  const sideName = sc => (sc < 0 ? 'o lado esquerdo' : 'o lado direito');
  const finish = () => {
    const st = hud.tossSt; hud.tossSt = null;
    if (st.kind !== 'choice') st.m.toss = { winner: st.winner, loser: 1 - st.winner };
    hud.close();
    st.onDone(st.serveTeam, st.side0);
  };
  const finishChoice = serve => {
    const st = hud.tossSt;
    st.serveTeam = serve === 'sacar' ? st.winner : 1 - st.winner;
    finish();
  };
  // time t escolhe o lado da tela sc (-1 esquerda / 1 direita)
  const chooseSide = (t, sc) => {
    const st = hud.tossSt, m = st.m;
    const s = [-1, 1].find(v => screenOf(v) === sc);
    st.side0 = t === 0 ? s : -s;
    st.log.push(`<b>${esc(tn(m, t))}</b> ficou com ${sideName(sc)}`);
  };
  // decisões da CPU em sequência; para quando é a vez de um jogador
  const nextStep = () => {
    const st = hud.tossSt, m = st.m, w = st.winner, l = 1 - w;
    if (st.pick === 'saque') {
      // quem ganhou saca; quem perdeu escolhe o lado
      st.serveTeam = w;
      if (st.side0 === null) {
        if (m.teams[l].human) { st.sideFor = l; hud.open('toss-side'); return; }
        chooseSide(l, Math.random() < 0.5 ? -1 : 1);
      }
      hud.open('toss-done'); return;
    }
    // quem ganhou escolhe o lado; quem perdeu escolhe sacar ou receber
    if (st.side0 === null) {
      if (m.teams[w].human) { st.sideFor = w; hud.open('toss-side'); return; }
      chooseSide(w, Math.random() < 0.5 ? -1 : 1);
    }
    if (st.serveTeam === null) {
      if (m.teams[l].human) { st.serveFor = l; hud.open('toss-serve'); return; }
      const saca = cpuSaque();
      st.serveTeam = saca ? l : w;
      st.log.push(`<b>${esc(tn(m, l))}</b> escolheu ${saca ? 'sacar' : 'receber'}`);
    }
    hud.open('toss-done');
  };
  const winnerPicks = pick => {
    const st = hud.tossSt, m = st.m;
    st.pick = pick;
    st.log.push(`<b>${esc(tn(m, st.winner))}</b> escolheu ${pick === 'saque' ? 'o saque' : 'o lado'}`);
    nextStep();
  };
  const flip = call => {
    const st = hud.tossSt, m = st.m;
    st.call = call;
    st.face = Math.random() < 0.5 ? 'cara' : 'coroa';
    st.winner = st.face === call ? st.picker : 1 - st.picker;
    if (!m.teams[st.winner].human) st.cpuChoice = cpuSaque() ? 'saque' : 'lado';
    hud.open('toss-show');
  };
  // ---------- intervalo entre sets ----------
  hud.setBreak = (m, onDone) => { hud.setBreakSt = { m, onDone }; hud.open('set-break'); };

  // ---------- telas ----------
  const tn = (m, t) => m.teams[t].name;
  const who = (m, t) => { const ps = m.teamPilots(t); return m.teams.every(x => x.human) || ps.length > 1 ? ps.map(n => 'J' + n).join(' e ') : m.teams[t].human ? 'Você' : 'CPU'; };
  hud.extHead = s => {
    const st = hud.tossSt, m = st && st.m;
    const logHTML = () => (st.log.length ? `<p class="sub">${st.log.join(' · ')}</p>` : '');
    if (s === 'toss') return `<h2>CARA OU COROA</h2><p class="sub">${esc(tn(m, 0))} × ${esc(tn(m, 1))}</p><div class="toss-coin">${coinSVG(null)}</div><p class="sub">${st.kind === 'set3' ? 'Sorteio do set decisivo · ' : ''}Quem ganhar escolhe o saque ou o lado · <b>${who(m, st.picker)}</b>, cara ou coroa?</p>`;
    if (s === 'toss-show') {
      const w = st.winner;
      return `<h2>${st.face === 'cara' ? 'CARA' : 'COROA'}!</h2><div class="toss-coin">${coinSVG(st.face)}</div>
        <p class="sub"><b>${who(m, st.picker)}</b> ${who(m, st.picker).includes(' e ') ? 'pediram' : 'pediu'} ${st.call === 'cara' ? 'cara' : 'coroa'} · <b>${esc(tn(m, w))}</b> ${m.teams[w].human ? 'ganhou! O saque ou o lado?' : `ganhou e escolheu <b>${st.cpuChoice === 'saque' ? 'o saque' : 'o lado'}</b>.`}</p>`;
    }
    if (s === 'toss-side') return `<h2>ESCOLHA O LADO</h2>${logHTML()}<p class="sub"><b>${esc(tn(m, st.sideFor))}</b> (${who(m, st.sideFor)}): de que lado da quadra vocês começam?</p>`;
    if (s === 'toss-serve') return `<h2>SACAR OU RECEBER</h2>${logHTML()}<p class="sub"><b>${esc(tn(m, st.serveFor))}</b> (${who(m, st.serveFor)}): sacar ou receber?</p>`;
    if (s === 'toss-done') return `<h2>TUDO CERTO!</h2>${logHTML()}<p class="sub"><b>${esc(tn(m, st.serveTeam))}</b> começa sacando.</p>`;
    if (s === 'toss-choice') {
      const w = st.winner;
      return `<h2>SET ${m.setNo + 2} · ESCOLHA</h2><p class="sub"><b>${esc(tn(m, w))}</b> perdeu o sorteio do 1º set e agora escolhe${m.teams[w].human ? ': sacar ou receber?' : `: <b>${st.cpuChoice === 'sacar' ? 'sacar' : 'receber'}</b>.`}</p>`;
    }
    if (s === 'set-break') {
      const b = hud.setBreakSt, mm = b.m, last = mm.setHistory[mm.setHistory.length - 1] || [0, 0];
      return `<h2>FIM DO ${mm.setNo + 1}º SET</h2><p class="sub">${esc(tn(mm, 0))} <b>${last[0]} × ${last[1]}</b> ${esc(tn(mm, 1))}</p><p class="sub">Sets: <b>${mm.setsWon[0]} × ${mm.setsWon[1]}</b> · intervalo de 3 minutos · o próximo set vai até ${mm.setPoints[mm.setNo + 1]} pontos</p>`;
    }
    // ---------- campeonato ----------
    const c = hud.camp || loadCamp(), T = c.cur;
    if (s === 'camp') return `<h2>MODO CAMPEONATO</h2><p class="sub">Regras oficiais do futevôlei · mata-mata de 8 duplas · premiação no fim · carteira ${money(c.wallet)}</p>`;
    if (s === 'camp-new' || s === 'camp-more') { const cf = hud.campCfg, e = cf ? escada(cf.diff) : [];
      const lv = cf && cf.levelMode === 'escada' ? `Escada: nível ${e.join(', ')} nas chaves 1, 2 e 3` : `Aleatório: cada CPU sorteia de ${Math.min(...e)} a ${Math.max(...e)}`;
      // duplas dos jogadores no resumo: "J1 e J2 na dupla 1"
      const ds = cf ? [...new Set(cf.players.map(n => cf.seat[n]))].sort().map(d => `${cf.players.filter(n => cf.seat[n] === d).map(n => 'J' + n).join(' e ')} na dupla ${d + 1}`).join(' · ') : '';
      if (s === 'camp-more') return `<h2>MAIS OPÇÕES</h2><p class="sub">${cf && cf.players.length > 1 && innerHeight >= 520 ? 'Cada jogador escolhe a sua dupla (jogadores na mesma dupla jogam juntos) · ' : ''}Dificuldade das duplas da CPU · ${lv}</p>`;
      return `<h2>NOVO CAMPEONATO</h2><ul class="camp-sum"><li><b>${DIFF_NAME[cf.diff]}</b> · ${lv}</li><li><b>${cf.pontos} pontos</b> por set${cf.pontos !== 18 ? ' (a final e as trocas de lado acompanham)' : ' (oficial)'}</li>${cf.players.length > 1 ? `<li>${ds}</li>` : ''}</ul>`; }
    if (s === 'camp-confirm') return `<h2>CAMPEONATO EM ANDAMENTO</h2><p class="sub">Começar outro abandona o atual (${esc(PHASE_NAME[T && T.stage] || '')}). Continuar e escolher os atletas?</p>`;
    if (s === 'camp-watch' && T) return `<h2>ASSISTIR</h2><p class="sub">Partidas só da CPU desta chave · na partida, Start resume (o resto é simulado a partir do placar)</p>`;
    if (s === 'camp-rules') {
      const C = CAMP(), P = T && !T.done ? T.pontos : null, f = formatOf('final', P), q = formatOf('quartas', P);
      return `<h2>REGRAS OFICIAIS</h2><ul class="camp-rules">
        <li>Duplas, quadra de 18 × 9 m, rede de 2,20 m, máximo de 3 toques, sem tocar duas vezes seguidas.</li>
        <li>Mata-mata de 8 duplas: chave 1 = quartas de final, chave 2 = semifinal, chave 3 = final e disputa de 3º lugar.</li>
        <li>Quartas, semifinal e 3º lugar: set único de ${q.sets[0]} pontos, 2 de diferença; troca de lado a cada ${q.swaps[0]} pontos.</li>
        <li>Final: melhor de 3 sets (${f.sets.join(', ')}); troca a cada ${f.swaps[0]} (e a cada ${f.swaps[2] || f.swaps[0]} no decisivo).</li>
        <li>${+(C.temposTecnicos ?? 1)} tempo técnico por dupla na partida (no menu de pausa, com a bola parada); troca de lado sem pausa.</li>
        <li>Cara ou coroa no início: quem ganha escolhe o saque ou o lado (a outra dupla escolhe o que sobrou); no 2º set escolhe quem perdeu o sorteio; no 3º, novo sorteio.</li>
        <li>Nível da CPU: Escada (sobe a cada chave) ou Aleatório (sorteado para cada dupla). As partidas só da CPU podem ser assistidas.</li>
        <li>Prêmios: ${(C.premios || []).map((p, i) => `${i + 1}º ${money(p)}`).join(' · ')}.</li></ul>`;
    }
    if (s === 'camp-table' && T) {
      const nm = nextMatch(T);
      const grp = gk => `<table class="camp-tbl"><caption>Grupo ${gk}</caption><tr><th>Dupla</th><th>J</th><th>V</th><th>Sets</th><th>Pts</th></tr>${standings(T, gk).map((r, i) => `<tr class="${isHuman(T, r.id) ? 'me' : ''} ${i < 2 ? 'up' : ''}"><td>${isHuman(T, r.id) && humanTeams(T).length > 1 ? tags(T, r.id) : ''}${faces(T.teams[r.id].ids)}<span>${esc(short(T.teams[r.id].ids))}</span></td><td>${r.j}</td><td>${r.v}</td><td>${r.sg}-${r.sp}</td><td><b>${r.pts}</b></td></tr>`).join('')}</table>`;
      const ko = ph => T.matches.filter(x => x.phase === ph).map(x => `<div class="ko ${isHuman(T, x.a) || isHuman(T, x.b) ? 'me' : ''}"><small>${PHASE_NAME[ph]}</small><span>${faces(T.teams[x.a].ids)} ${esc(short(T.teams[x.a].ids))}</span><b>${x.winner === null ? '×' : x.sets.map(s2 => s2.join('-')).join(' / ')}</b><span>${esc(short(T.teams[x.b].ids))} ${faces(T.teams[x.b].ids)}</span></div>`).join('');
      const body = T.ko ? bracketHTML(c, T) : T.stage === 'grupo' ? `<div class="camp-groups">${grp('A')}${grp('B')}</div>` : `<div class="camp-ko">${ko('semi')}${ko('terceiro')}${ko('final')}</div>`;
      const next = nm ? `<p class="camp-next">${T.ko ? 'Sua partida' : 'Próxima'}: <b>${PHASE_NAME[nm.phase]}${nm.round ? ' · rodada ' + nm.round : ''}</b> · ${esc(short(T.teams[nm.a].ids))} × ${esc(short(T.teams[nm.b].ids))} · ${formatOf(nm.phase, T.pontos).sets.length > 1 ? `melhor de 3 sets (${formatOf(nm.phase, T.pontos).sets.join(', ')})` : 'set único de ' + formatOf(nm.phase, T.pontos).sets[0]}</p>` : '';
      const hs = humanTeams(T), mine = hs.length > 1 ? 'duplas dos jogadores: ' + hs.map(id => `${tags(T, id)}${esc(short(T.teams[id].ids))}`).join(' · ') : `sua dupla: ${faces(T.teams[0].ids)} ${esc(short(T.teams[0].ids))}`;
      return `<h2>${esc(T.name)}</h2><p class="sub">${PHASE_NAME[T.stage] || 'Fim'} · ${mine} · ${T.ko ? `${DIFF_NAME[T.diff]} · ${LEVEL_MODE_NAME[T.levelMode]}` : 'nível ' + T.level}</p>${body}${next}`;
    }
    if (s === 'camp-result' && hud.campResult) {
      const r = hud.campResult;
      const head = r.vsHuman ? `${r.wo ? 'W.O. · ' : ''}${esc(r.winner).toUpperCase()} VENCEU!` : r.wo ? 'W.O.' : r.won ? 'VITÓRIA!' : 'DERROTA...';
      const outs = (r.out || []).map(o => `<p class="sub"><b>${esc(o.name)}</b> terminou em <b>${placeName(o.place)}</b>. O campeonato segue até a final.</p>`).join('');
      return `<h2>${head}</h2><p class="sub">${r.skip ? "Partida resumida (o resto foi simulado) · " : ""}${PHASE_NAME[r.phase]} · ${esc(r.us)} × ${esc(r.them)}</p><p class="camp-sets">${r.sets.map((x, i) => `<span>${i + 1}º set <b>${x[0]} × ${x[1]}</b></span>`).join('')}</p>${outs}`;
    }
    if (s === 'camp-podium' && T && T.podium) {
      const col = (pos, cls) => { const id = T.podium[pos - 1]; const t = T.teams[id]; const prize = (CAMP().premios || [])[pos - 1]; return `<div class="pod ${cls} ${isHuman(T, id) ? 'me' : ''}"><span class="pod-medal">${medal(pos)}</span><span class="pod-faces">${faces(t.ids)}</span><b>${esc(short(t.ids))}</b><span class="pod-step">${pos}º</span><small>${prize ? money(prize) : ''}</small></div>`; };
      return `<h2>PREMIAÇÃO</h2><p class="sub">${esc(T.name)} · campeões: <b>${esc(teamName(T.teams[T.podium[0]]))}</b></p><div class="podium">${col(2, 'p2')}${col(1, 'p1')}${col(3, 'p3')}</div><p class="sub">${humanTeams(T).length > 1 ? humanTeams(T).map(id => `${tags(T, id)}${esc(short(T.teams[id].ids))}: <b>${placeName((T.places || {})[id])}</b>${(T.prizes || {})[id] ? ' · ' + money(T.prizes[id]) : ''}`).join(' · ') : `Sua dupla: <b>${placeName(T.place)}</b>${T.prize ? ` · prêmio <b>${money(T.prize)}</b>` : ''}`} · carteira ${money(c.wallet)}</p>`;
    }
    if (s === 'camp-trophies') {
      const list = (c.trophies || []).slice(0, 6);
      return `<h2>SALA DE TROFÉUS</h2><p class="sub">Carteira: <b>${money(c.wallet)}</b> · ${(c.trophies || []).filter(t => t.place === 1).length} título(s)</p><div class="trophies">${list.length ? list.map(t => `<div class="tro ${t.place === 1 ? 'gold' : ''}"><span class="tro-ico">${medal(t.place) || '🎽'}</span><b>${placeName(t.place)}</b><span>${faces(t.dupla)} ${esc(short(t.dupla))}</span><small>${new Date(t.date).toLocaleDateString('pt-BR')} · ${t.prize ? money(t.prize) : 'sem prêmio'}</small></div>`).join('') : '<p class="sub">Nenhum campeonato terminado ainda.</p>'}</div>${(c.trophies || []).length > 6 ? `<p class="sub">+ ${(c.trophies || []).length - 6} mais antigos</p>` : ''}`;
    }
    if (s === 'camp-deposit') return `<h2>DEPOSITAR NO MODO HISTÓRIA</h2><p class="sub">Leva os ${money(c.wallet)} da carteira para um jogo salvo (a Giulia pode gastar nas lojas)</p>`;
    return null;
  };

  hud.extItems = s => {
    const st = hud.tossSt;
    if (s === 'toss') return [{ id: 'toss-cara', html: 'Cara' }, { id: 'toss-coroa', html: 'Coroa' }];
    if (s === 'toss-show') {
      return st && st.m.teams[st.winner].human ? [{ id: 'toss-saque', html: 'O saque<small>começa sacando; a outra dupla escolhe o lado</small>' }, { id: 'toss-lado', html: 'O lado<small>escolhe o lado; a outra dupla escolhe sacar ou receber</small>' }]
        : [{ id: 'toss-cpu', html: 'Avançar', nav: 'next' }];
    }
    if (s === 'toss-side') return [{ id: 'toss-esq', html: 'Lado esquerdo<small>da tela</small>' }, { id: 'toss-dir', html: 'Lado direito<small>da tela</small>' }];
    if (s === 'toss-serve') return [{ id: 'toss-sv-sacar', html: 'Sacar<small>começa com a bola</small>' }, { id: 'toss-sv-receber', html: 'Receber<small>a outra dupla saca</small>' }];
    if (s === 'toss-done') return [{ id: 'toss-start', html: 'Começar!', nav: 'next' }];
    if (s === 'toss-choice') {
      return st && st.m.teams[st.winner].human ? [{ id: 'toss-sacar', html: 'Sacar<small>começa com a bola</small>' }, { id: 'toss-receber', html: 'Receber<small>a outra dupla saca</small>' }]
        : [{ id: 'toss-cstart', html: 'Começar!', nav: 'next' }];
    }
    if (s === 'set-break') return [{ id: 'set-go', html: 'Avançar', nav: 'next' }];
    // ---------- campeonato ----------
    const c = hud.camp || loadCamp(), T = c.cur;
    if (s === 'camp') return [
      ...(T && !T.done ? [{ id: 'camp-continue', html: `Continuar campeonato<small>${PHASE_NAME[T.stage]} · ${humanTeams(T).map(id => esc(short(T.teams[id].ids))).join(' · ')}</small>` }] : []),
      ...(T && T.done && !T.seen ? [{ id: 'camp-podium', html: 'Ver a premiação<small>último campeonato</small>' }] : []),
      { id: 'camp-new', html: 'Novo campeonato<small>escolha a dupla e a dificuldade</small>' },
      { id: 'camp-trophies', html: `Sala de troféus<small>carteira ${money(c.wallet)}</small>` },
      { id: 'camp-rules', html: 'Regras oficiais<small>como funciona</small>' },
      { id: 'back', html: 'Voltar' },
    ];
    // 5.0 (menus enxutos): Novo campeonato = o resumo e Começar; as escolhas ficam em Mais opções
    if (s === 'camp-new') return [
      { id: 'camp-more', html: `Mais opções<small>${hud.campCfg.players.length > 1 ? 'duplas dos jogadores, ' : ''}dificuldade, nível da CPU e pontos do set</small>`, target: 'camp-more' },
      { id: 'back', html: 'Voltar' },
      { id: 'camp-ath-go', html: 'Começar', nav: 'next' },
    ];
    if (s === 'camp-more') {
      // 5.0: cada jogador (tela Jogadores) escolhe a sua dupla; mesma dupla = jogam juntos
      const cfg = hud.campCfg, N = cfg.players.length;
      const opts = Array.from({ length: N }, (_, i) => ({ value: i, html: String(i + 1) }));
      return [
        ...cfg.players.map(n => ({ type: 'choice', id: 'cdupla' + n, label: `${ptag(n)} joga na dupla`, value: cfg.seat[n], options: opts,
          change: step => { cfg.seat[n] = (cfg.seat[n] + step + N) % N; }, pick: v => { cfg.seat[n] = +v; } })),
        { type: 'choice', id: 'cdiff', label: 'Dificuldade', value: cfg.diff, options: DIFFS.map(k => ({ value: k, html: DIFF_NAME[k] })),
          change: step => { cfg.diff = DIFFS[(DIFFS.indexOf(cfg.diff) + step + 3) % 3]; }, pick: v => { cfg.diff = v; } },
        { type: 'choice', id: 'cmode', label: 'Nível da CPU', value: cfg.levelMode, options: MODES.map(k => ({ value: k, html: LEVEL_MODE_NAME[k] })),
          change: () => { cfg.levelMode = cfg.levelMode === 'escada' ? 'aleatorio' : 'escada'; }, pick: v => { cfg.levelMode = v; } },
        { type: 'choice', id: 'cpts', label: 'Pontos do set', value: cfg.pontos, options: PONTOS.map(p => ({ value: p, html: String(p) })),
          change: step => { cfg.pontos = PONTOS[(PONTOS.indexOf(cfg.pontos) + step + PONTOS.length) % PONTOS.length]; }, pick: v => { cfg.pontos = +v; } },
        { id: 'back', html: 'Voltar' },
      ];
    }
    if (s === 'camp-confirm') return [{ id: 'back', html: 'Voltar' }, { id: 'camp-start', html: 'Começar outro', nav: 'next' }];
    if (s === 'camp-watch') return [
      ...(T ? cpuMatches(T).map(m => ({ id: 'watch:' + m.id, html: `<span class="cw">${faces(T.teams[m.a].ids)} ${esc(short(T.teams[m.a].ids))} × ${esc(short(T.teams[m.b].ids))} ${faces(T.teams[m.b].ids)}</span><small>${PHASE_NAME[m.phase]}</small>` })) : []),
      { id: 'back', html: 'Voltar' },
    ];
    if (s === 'camp-rules' || s === 'camp-trophies') return [{ id: 'back', html: 'Voltar' }];
    if (s === 'camp-table') {
      // 5.0: partidas só da CPU da chave: assistir (as não assistidas são simuladas ao avançar)
      const cpu = T ? cpuMatches(T) : [];
      return [
        { id: 'camp-home', html: 'Sair<small>o campeonato fica salvo</small>', nav: 'back' },
        ...(cpu.length ? [{ id: 'camp-watch', html: `Assistir<small>${cpu.length} ${cpu.length > 1 ? 'partidas' : 'partida'} só da CPU</small>` }] : []),
        ...(T && nextMatch(T) ? [{ id: 'camp-play', html: 'Jogar!', nav: 'next' }]
          : cpu.length ? [{ id: 'camp-adv', html: 'Avançar<small>simula as não assistidas</small>', nav: 'next' }]
            : T && T.done ? [{ id: 'camp-podium', html: 'Premiação', nav: 'next' }] : []),
      ];
    }
    if (s === 'camp-result') return [{ id: 'camp-next', html: 'Avançar', nav: 'next' }];
    if (s === 'camp-podium') return [
      ...(c.wallet > 0 && SLOTS.some(n => !slotLabel(n).empty) ? [{ id: 'camp-deposit', html: `Depositar no Modo História<small>${money(c.wallet)}</small>` }] : []),
      { id: 'camp-trophies', html: 'Sala de troféus' },
      { id: 'camp-home', html: 'Pronto!', nav: 'next' },
    ];
    if (s === 'camp-deposit') return [
      ...SLOTS.map(n => { const l = slotLabel(n); return l.empty ? { id: 'noop', html: `Vaga ${n}<small>vazia</small>`, cls: 'off' } : { id: 'dep:' + n, html: `Vaga ${n}<small>${esc(l.text)}</small>` }; }),
      { id: 'back', html: 'Voltar' },
    ];
    return null;
  };

  hud.extClass = s => (s === 'camp-table' ? 'camp-tl ' : '') + (['camp-table', 'camp-podium', 'camp-trophies', 'camp-rules', 'camp-new', 'camp-more', 'camp-watch'].includes(s) ? 'wide' : '') + (s === 'camp-trophies' ? '' : '');

  hud.extActivate = id => {
    const st = hud.tossSt;
    if (/^toss-/.test(id) && !st) return true; // sorteio já fechado: ignora
    if (id === 'toss-cara' || id === 'toss-coroa') { flip(id === 'toss-cara' ? 'cara' : 'coroa'); return true; }
    if (id === 'toss-saque' || id === 'toss-lado') { winnerPicks(id === 'toss-saque' ? 'saque' : 'lado'); return true; }
    if (id === 'toss-cpu') { winnerPicks(st.cpuChoice || 'saque'); return true; }
    if (id === 'toss-esq' || id === 'toss-dir') { chooseSide(st.sideFor, id === 'toss-esq' ? -1 : 1); nextStep(); return true; }
    if (id === 'toss-sv-sacar' || id === 'toss-sv-receber') {
      const l = st.serveFor, saca = id === 'toss-sv-sacar';
      st.serveTeam = saca ? l : 1 - l;
      st.log.push(`<b>${esc(tn(st.m, l))}</b> escolheu ${saca ? 'sacar' : 'receber'}`);
      nextStep(); return true;
    }
    if (id === 'toss-start') { finish(); return true; }
    if (id === 'toss-sacar' || id === 'toss-receber') { finishChoice(id === 'toss-sacar' ? 'sacar' : 'receber'); return true; }
    if (id === 'toss-cstart') { finishChoice(st.cpuChoice || 'sacar'); return true; }
    if (id === 'set-go') { const b = hud.setBreakSt; hud.setBreakSt = null; hud.close(); b.onDone(); return true; }
    // ---------- campeonato ----------
    if (id === 'camp') { hud.camp = loadCamp(); hud.push('camp'); return true; }
    if (id === 'camp-new') {
      // 5.0: um campo por jogador; as duplas dos jogadores lembram as últimas escolhas
      const all = campAthletes(), players = seatedPlayers().length ? seatedPlayers() : [1];
      const lastSeat = settings.campSeats || {}, lastIds = settings.campDuplas || [settings.campDupla || []];
      const seat = {}; players.forEach((n, i) => { seat[n] = Number.isInteger(lastSeat[n]) && lastSeat[n] < players.length ? lastSeat[n] : (settings.campPlayers === 2 && n === 2 ? 0 : i); });
      if (players.length === 1) seat[players[0]] = 0;
      const used = [];
      const ids = players.map((_, d) => {
        const l = lastIds[d] || [];
        const a = all.includes(l[0]) && !used.includes(l[0]) ? l[0] : all.find(x => !used.includes(x));
        used.push(a);
        const b = all.includes(l[1]) && !used.includes(l[1]) ? l[1] : all.find(x => !used.includes(x));
        used.push(b);
        return [a, b];
      });
      hud.campCfg = { players, seat, ids, diff: DIFF_NAME[settings.campDiff] ? settings.campDiff : 'medio', levelMode: settings.campLevelMode === 'aleatorio' ? 'aleatorio' : 'escada', pontos: PONTOS.includes(+settings.campPontos) ? +settings.campPontos : 18, nd: 1 };
      hud.push('camp-new'); return true;
    }
    if (id === 'camp-more') { hud.push('camp-more'); return true; }
    if (id === 'camp-ath-go') {
      // duplas usadas, renumeradas na ordem (Dupla 1, 2…); cada dupla escolhe os atletas numa tela
      const cfg = hud.campCfg, order = [];
      for (const n of cfg.players) if (!order.includes(cfg.seat[n])) order.push(cfg.seat[n]);
      for (const n of cfg.players) cfg.seat[n] = order.indexOf(cfg.seat[n]);
      cfg.nd = order.length;
      settings.campSeats = { ...cfg.seat }; settings.campPlayers = cfg.players.length; settings.campDiff = cfg.diff; settings.campLevelMode = cfg.levelMode; settings.campPontos = cfg.pontos; saveSettings();
      // 5.0: os atletas são escolhidos na tela de seleção normal, uma dupla por vez
      const T = (hud.camp || loadCamp()).cur;
      if (T && !T.done) { hud.push('camp-confirm'); return true; }
      hud.actions.campPick(cfg); return true;
    }
    if (id === 'camp-start') { hud.actions.campPick(hud.campCfg); return true; }
    if (id === 'camp-watch') { hud.camp = loadCamp(); hud.push('camp-watch'); return true; }
    if (id.startsWith('watch:')) { hud.close(); hud.actions.campWatch(+id.slice(6)); return true; }
    if (id === 'camp-adv') { hud.actions.campAdvance(); return true; }
    if (id === 'camp-continue') { hud.actions.campTable(); return true; }
    if (id === 'camp-rules' || id === 'camp-trophies' || id === 'camp-deposit') { hud.camp = loadCamp(); hud.push(id); return true; }
    if (id === 'camp-play') { hud.close(); hud.actions.campPlay(); return true; }
    if (id === 'camp-next') { hud.actions.campAfterResult(); return true; }
    if (id === 'camp-podium') { hud.actions.campPodium(); return true; }
    if (id === 'camp-home') { hud.actions.campHome(); return true; }
    if (id.startsWith('dep:')) { hud.actions.campDeposit(+id.slice(4)); return true; }
    if (id === 'noop') return true;
    if (id.startsWith('tempo:')) { hud.actions.campTempo(+id.slice(6)); return true; }
    if (id.startsWith('camp-wo:')) { hud.actions.campWO(+id.slice(8)); return true; }
    return false;
  };
}
