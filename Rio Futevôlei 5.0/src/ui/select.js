// Tela de seleção de atletas (inspirada em Mortal Kombat 2 / Tekken Tag):
// grade de retratos no centro, a dupla de cada lado em cartas grandes com os
// atributos em destaque, um cursor por jogador escolhendo ao mesmo tempo,
// a CPU escolhendo a dupla dela no modo solo/cooperativo e, no fim, a tela de VS.
import { CHARACTERS, ROSTER, CUSTOM_ROSTER, BOSSES, STAT_LABELS } from '../art/characters.js';
import { fitInto } from './fit.js';
import { MOVES } from '../moves.js';
import { drawAthlete } from '../art/draw.js';
import { poseFor } from '../art/poses.js';
import { padIcon } from './padIcons.js';
import { portrait, dummy, PLAYER_COLORS } from './portraits.js';
import { settings, saveSettings } from './settings.js';
import { LEVEL_NAMES, TIERS, tierOf, MIN_LEVEL, MAX_LEVEL } from '../difficulty.js';
import { TILT, tiltSpecial } from '../tilt.js';
import { HOODS } from '../story/data.js';
import { SLOTS, SLOT_KEYS, specialsFor, choicesFor, normalizeSpecials, V5, menuHoldTime } from '../v5.js';
import { SPECIAL_INFO } from '../art/custom.js';
import { seatedPlayers } from '../input.js';

// vagas: 0..11 oficiais, 12..17 jogadores criados (fileira própria, embaixo), 18..19 chefes —
// recalculadas a cada abertura
const COLS = 6;
const STAT_KEYS = ['forca', 'agilidade', 'precisao', 'pique'];
const VS_TIME = 1.7;

const MODE_NAME = { solo: 'Jogar solo', versus: 'Um contra o outro', coop: 'Juntos no mesmo time', multi: 'Multiplayer', camp: 'Campeonato' };
const SIZE_NAME = { 1: '1 contra 1', 2: '2 contra 2', 3: '3 contra 3' };
const TITLE = { 1: 'ESCOLHA SEU ATLETA', 2: 'ESCOLHA SUA DUPLA', 3: 'ESCOLHA SUA TRINCA' };
const range = n => Array.from({ length: n }, (_, i) => i);

export class SelectScreen {
  constructor(parent) {
    addEventListener('resize', () => { if (this.el) this.el.querySelectorAll('.sp-panel').forEach(d => fitInto(d, d.firstElementChild)); });
    this.el = document.createElement('div');
    this.el.className = 'select';
    parent.appendChild(this.el);
    this.active = false;
    this.el.addEventListener('click', e => {
      // 5.0 multi: escolha do lado (clique troca o lado; Começar confirma todos)
      if (this.phase === 'side') { const t = e.target.closest('[data-sd]'); if (t) this.setSide(+t.dataset.n, +t.dataset.sd); if (e.target.closest('[data-sgo]')) this.confirmSides(true); return; }
      // ◀ ▶ do nível de um atleta da CPU (no cartão dele)
      const lv = e.target.closest('[data-lvs]');
      if (lv) { this.changeLevel(+lv.dataset.t, +lv.dataset.k, +lv.dataset.lvs); return; }
      // ◀ ▶ do especial de ataque / defesa (Modo Tilt)
      const pr = e.target.closest('.spp-row');
      if (pr && this.phase === 'specials') { const n = +pr.closest('.sp-panel').dataset.n; if (this.spFocus[n]) this.spFocus[n].r = +pr.dataset.r; }
      const ts = e.target.closest('[data-tsp]');
      if (ts) { if (this.phase === 'specials' || this.phase === 'levels') this.cycleSpecial(+ts.dataset.t, +ts.dataset.k, ts.dataset.tsp, +ts.dataset.d); return; }
      const go = e.target.closest('[data-go]');
      if (go) { this.confirmLevels(); return; }
      const wsp = e.target.closest('[data-wsp]');
      if (wsp) { this.toggleWantSp(+wsp.dataset.wsp); return; }
      const s = e.target.closest('[data-slot]');
      if (!s) return;
      // mouse: move o cursor do jogador 1 e confirma
      const c = this.cursors.find(c => c.n === this.lead && !c.done) || this.cursors.find(c => !c.done);
      if (!c) return;
      c.idx = +s.dataset.slot;
      this.pick(c);
    });
  }

  // ports: portas dos jogadores · styles: estilo de ícones por jogador (1/2)
  // size: atletas por time (1, 2 ou 3) · control: { 1: 'team' | 'own', 2: ... }
  // tilt: Modo Tilt — depois de escolher os atletas, cada jogador escolhe o especial de ataque e o
  // de defesa de cada atleta dele (listas em src/data/tilt.js)
  // camp (5.0 Modo Campeonato): { players: [jogadores da dupla], allowed: [atletas que podem jogar],
  //   taken: [atletas das outras duplas], label } — só a dupla dos jogadores (sem adversário, sem VS)
  // cpuLevel (5.0 Exibição): nível único de todas as CPUs (sem a etapa de níveis); null = um por atleta
  open({ mode, size = 2, control = {}, ports, styles, onDone, onCancel, sfx, tilt = false, camp = null, cpuLevel = null }) {
    Object.assign(this, { mode, size, control, ports, styles, onDone, onCancel, sfx, tilt, camp, cpuLevel });
    this.wantSp = {}; // 5.0: jogadores que apertaram Y (trocar especiais); sem Y, ficam os últimos usados
    this.el.classList.toggle('camp', !!camp);
    this.tsp = [range(size).map(() => null), range(size).map(() => null)]; // { attack, defense } por atleta
    this.spFocus = {}; this.spDone = {};
    this.active = true;
    this.slots = [...ROSTER, ...CUSTOM_ROSTER, ...BOSSES];
    this.phase = 'pick'; // pick → cpu → ready → vs
    this.t = 0;
    this.teams = [range(size).map(() => null), range(size).map(() => null)];
    const c = (n, team, slots, idx) => ({ n, team, slots, idx, done: false, shake: 0 });
    // no cooperativo cada jogador escolhe o seu atleta; o 3º da trinca (da CPU) fica com o jogador 1
    this.cursors = mode === 'versus' ? [c(1, 0, range(size), 0), c(2, 1, range(size), 1)]
      : mode === 'coop' ? [c(1, 0, size === 3 ? [0, 2] : [0], 0), c(2, 0, [1], 1)]
        : [c(1, 0, range(size), 0)];
    this.cpuTeam = mode === 'versus' ? null : 1;
    this.cpu = null;
    this.lead = 1;       // 5.0: quem ajusta o nível dos adversários da CPU (o menor número em jogo)
    this.humans = null;  // 5.0 multi: { 0: [jogadores], 1: [...] }
    this.sides = null;
    if (camp) {
      // 5.0 Campeonato: 1 jogador escolhe os 2 atletas; 2 jogadores, um atleta cada
      const ps = camp.players;
      this.humans = { 0: [...ps], 1: [] };
      this.lead = ps[0];
      this.cpuTeam = null;
      this.cursors = ps.length === 1 ? [c(ps[0], 0, range(size), 0)] : ps.map((n, k) => c(n, 0, [k], k));
    }
    if (mode === 'multi') {
      // 5.0: 3 ou 4 jogadores — primeiro cada um escolhe o lado (esquerda = time 0, direita = time 1)
      this.players = seatedPlayers();
      this.lead = this.players[0] || 1;
      this.sideOf = {}; this.sideReady = {};
      this.players.forEach((n, i) => { this.sideOf[n] = i % 2; });
      this.cursors = [];
      this.phase = 'side';
      this.sideNote = '';
      this.sideKey = null; // 5.0: a tela foi limpa no close(): desenha de novo mesmo com o mesmo conteúdo
      this.el.classList.remove('vs');
      this.el.classList.add('show');
      this.renderSide();
      return;
    }
    // nível de cada vaga da CPU (adversários e parceiros), começando pelo último usado
    this.initLevels();
    this.lvFocus = 0; // na etapa de níveis: qual atleta da CPU está sendo ajustado
    this.build();
    this.el.classList.remove('vs');
    this.el.classList.add('show');
  }

  // 5.0: nível único (tela Partida) ou o último usado em cada vaga
  initLevels() {
    const one = this.cpuLevel;
    this.levels = [0, 1].map(team => range(this.size).map(k => (one ? one : this.isMate(team, k) ? settings.mateLevels[k] : settings.oppLevels[k])));
  }
  // 5.0: Y — o jogador quer trocar os especiais (abre a tela de especiais depois dos atletas)
  toggleWantSp(n) {
    if (!this.tilt || (this.phase !== 'pick' && this.phase !== 'cpu')) return;
    this.wantSp[n] = !this.wantSp[n];
    this.beep(true, 0.5);
    this.updatePickHint();
  }
  updatePickHint() {
    const h = this.el.querySelector('.sel-hint');
    if (h && (this.phase === 'pick' || this.phase === 'cpu')) h.innerHTML = this.pickHint + (this.tilt ? ' &nbsp; ' + this.cursorsN().map(n => `<button type="button" class="wsp ${this.wantSp[n] ? 'on' : ''}" data-wsp="${n}"><span class="ptag" style="--pc:${PLAYER_COLORS[n]}">J${n}</span> ${padIcon('D', this.styles[n], 18)} ${this.wantSp[n] ? '✔ vai trocar os especiais' : 'trocar especiais'}</button>`).join(' ') : '');
  }
  cursorsN() { return [...new Set(this.cursors.map(c => (this.mode === 'coop' ? 1 : c.n)))]; }

  close() { this.active = false; this.el.classList.remove('show'); this.el.innerHTML = ''; }

  // ---------- 5.0: multi — cada jogador escolhe o lado ----------
  setSide(n, team) { if (this.sideReady[n]) return; if (this.sideOf[n] !== team) { this.sideOf[n] = team; this.beep(true, 0.4); } }
  sideCount(team) { return this.players.filter(n => this.sideOf[n] === team).length; }
  // force: o botão Começar (mouse) confirma todo mundo de uma vez
  confirmSides(force = false) {
    if (force) this.players.forEach(n => { this.sideReady[n] = true; });
    if (!this.players.every(n => this.sideReady[n])) return;
    const over = [0, 1].find(t => this.sideCount(t) > this.size);
    if (over !== undefined) {
      this.sideNote = `No máximo ${this.size} por lado`;
      this.players.forEach(n => { this.sideReady[n] = false; });
      this.beep(false);
      return;
    }
    this.applySides();
  }
  applySides() {
    const size = this.size, c = (n, team, slots, idx) => ({ n, team, slots, idx, done: false, shake: 0 });
    this.humans = { 0: this.players.filter(n => this.sideOf[n] === 0), 1: this.players.filter(n => this.sideOf[n] === 1) };
    this.sides = { 0: [...this.humans[0]], 1: [...this.humans[1]] };
    this.cursors = [];
    for (const team of [0, 1]) {
      const hs = this.humans[team];
      if (hs.length === 1) this.cursors.push(c(hs[0], team, range(size), team));
      // 2 ou mais no time: cada um escolhe o seu atleta; o 1º também escolhe o que sobra (da CPU)
      else hs.forEach((n, k) => this.cursors.push(c(n, team, k === 0 ? [0, ...range(size).slice(hs.length)] : [k], k + team)));
    }
    this.cpuTeam = !this.humans[0].length ? 0 : !this.humans[1].length ? 1 : null;
    this.initLevels();
    this.phase = 'pick';
    this.beep(true);
    this.build();
  }
  renderSide() {
    const tagOf = n => `<span class="ptag" style="--pc:${PLAYER_COLORS[n]}">J${n}</span>`;
    const col = team => `<div class="sd-col">${this.players.filter(n => this.sideOf[n] === team).map(n => `<button type="button" class="sd-p ${this.sideReady[n] ? 'ok' : ''}" data-n="${n}" data-sd="${1 - team}">${tagOf(n)}${this.sideReady[n] ? ' ✔' : ''}</button>`).join('') || '<span class="sd-cpu">CPU</span>'}</div>`;
    const ico = (a, n) => padIcon(a, this.styles[n], 18);
    const html = `<div class="sel-screen sd-screen"><h2 class="sel-title">ESCOLHAM O LADO</h2>
      <p class="sel-sub">${SIZE_NAME[this.size]} · no máximo ${this.size} por lado · vaga sem jogador fica com a CPU</p>
      <div class="sd-teams"><div class="sd-team"><b>Time da esquerda</b>${col(0)}</div><div class="sd-team"><b>Time da direita</b>${col(1)}</div></div>
      <p class="sel-hint">${this.players.map(n => `${tagOf(n)} ◀ ▶ lado · ${ico('C', n)} pronto · ${this.startIco(n)} começar · ${ico('B', n)} desfaz`).join(' &nbsp; ')}</p>
      <p class="sd-note">${this.sideNote}</p><button type="button" class="menu-btn sd-go" data-sgo="1">Começar</button></div>`;
    if (html !== this.sideKey) { this.sideKey = html; this.el.innerHTML = html; }
  }
  updateSide() {
    for (const n of this.players) {
      const p = this.ports[n];
      if (!p) continue;
      // 5.0 (padrão de controle): ◀▶ move o jogador de lado · A pronto · Start começa · B (ou Esc) desfaz / volta
      const k = p.menu();
      if (!this.sideReady[n]) {
        if (k.left) this.setSide(n, 0);
        else if (k.right) this.setSide(n, 1);
        if (k.a) { this.sideReady[n] = true; this.sideNote = ''; this.beep(true); }
        else if (k.b && n === this.lead && !this.players.some(x => this.sideReady[x])) { this.close(); this.onCancel(); return; }
      } else if (k.b) { this.sideReady[n] = false; this.beep(true, 0.3); }
      if (k.start) { this.confirmSides(true); if (this.phase !== 'side') return; } // Start: Começar
    }
    this.confirmSides();
    if (this.phase === 'side') this.renderSide();
  }

  // ---------- estrutura ----------
  build() {
    const slot = (id, i) => {
      if (id) return `<div class="sl" data-slot="${i}"><img src="${portrait(id)}" alt=""><span>${CHARACTERS[id].name}</span></div>`;
      const boss = i >= ROSTER.length + CUSTOM_ROSTER.length, own = !boss && i >= ROSTER.length;
      if (own) return `<div class="sl locked own" data-slot="${i}"><b>+</b><span>vaga livre</span></div>`;
      return `<div class="sl locked ${boss ? 'boss' : ''}" data-slot="${i}"><b>?</b>${boss ? '<span>CHEFE</span>' : ''}</div>`;
    };
    const card = (team, k) => `
      <div class="card" data-team="${team}" data-k="${k}">
        <div class="card-top"><span class="card-who"></span><span class="card-num">${k + 1}º</span></div>
        <canvas width="256" height="256"></canvas>
        <div class="card-name"></div>
        <div class="card-sp"></div>
        ${this.tilt ? `<div class="card-tsp">${SLOT_KEYS.map(row => `<div class="tsp-row" data-row="${row}">
          <button type="button" class="arrow" data-tsp="${row}" data-d="-1" data-t="${team}" data-k="${k}" aria-label="Especial anterior">◀</button>
          <span class="tsp-txt"><small>${SLOTS[row].label} · ${SLOTS[row].pad}</small><b></b></span>
          <button type="button" class="arrow" data-tsp="${row}" data-d="1" data-t="${team}" data-k="${k}" aria-label="Próximo especial">▶</button>
        </div>`).join('')}</div>` : ''}
        <div class="stats">${STAT_KEYS.map(s => `<div class="st"><em>${STAT_LABELS[s]}</em><span class="segs">${'<i></i>'.repeat(10)}</span><b></b></div>`).join('')}</div>
        ${this.isCpu(team, k) ? `<div class="card-lv">
          <button type="button" class="arrow" data-lvs="-1" data-t="${team}" data-k="${k}" aria-label="Nível mais fácil">◀</button>
          <span class="lv-txt"></span>
          <button type="button" class="arrow" data-lvs="1" data-t="${team}" data-k="${k}" aria-label="Nível mais difícil">▶</button>
        </div>` : ''}
      </div>`;
    this.el.innerHTML = `
      <div class="sel-screen">
        <h2 class="sel-title">${TITLE[this.size]}</h2>
        <p class="sel-sub">${this.camp ? this.camp.label : `${MODE_NAME[this.mode]} · ${SIZE_NAME[this.size]}`}</p>
        <div class="sel-main">
          <div class="side left" data-n="${this.size}">${range(this.size).map(k => card(0, k)).join('')}</div>
          <div class="grid-wrap">
            <div class="grid">${ROSTER.map((id, i) => slot(id, i)).join('')}</div>
            <p class="grid-label">Seus jogadores · crie em Criar Jogador</p>
            <div class="grid own-row">${CUSTOM_ROSTER.map((id, i) => slot(id, ROSTER.length + i)).join('')}</div>
            <div class="grid boss-row">${BOSSES.map((id, i) => slot(id, ROSTER.length + CUSTOM_ROSTER.length + i)).join('')}</div>
            ${this.cpuSlots().length ? `<div class="diff lv-panel" aria-label="Níveis da CPU">
              <div class="diff-head"><b>${this.cpuLevel ? 'Nível da CPU' : 'Nível de cada CPU'}</b></div>
              <p class="lv-help">${this.cpuLevel ? `Todas as CPUs no nível ${this.cpuLevel} (${LEVEL_NAMES[this.cpuLevel - 1]}). Um nível por atleta: Exibição → Mais opções.` : 'Depois de escolher os atletas, ajuste o nível de cada atleta da CPU no cartão dele (1 = Turista … 12 = Lenda).'}</p>
              <button type="button" class="lv-go" data-go="1" hidden>Começar a partida</button>
            </div>` : ''}
          </div>
          <div class="side right" data-n="${this.size}">${range(this.size).map(k => card(1, k)).join('')}</div>
        </div>
        <p class="sel-hint"></p>
      </div>
      <div class="vs-screen">
        <div class="vs-team left"></div>
        <div class="vs-mid"><b>VS</b><span>${((HOODS[settings.exhArena] || HOODS.copacabana).name).toUpperCase()}</span></div>
        <div class="vs-team right"></div>
      </div>`;
    this.slotEls = [...this.el.querySelectorAll('[data-slot]')];
    this.cards = [0, 1].map(t => range(this.size).map(k => {
      const el = this.el.querySelector(`.card[data-team="${t}"][data-k="${k}"]`);
      return { el, ctx: el.querySelector('canvas').getContext('2d'), shown: undefined };
    }));
    const ico = (a, n) => padIcon(a, this.styles[n], 18);
    const who = this.cursors.map(c => `<span class="ptag" style="--pc:${PLAYER_COLORS[c.n]}">J${c.n}</span> ${ico('C', c.n)} escolhe · ${ico('B', c.n)} desfaz`).join(' &nbsp; ');
    const ownHint = this.mode !== 'coop' && this.size > 1 && this.cursors.some(c => this.control[c.n] === 'own')
      ? ' &nbsp; o 1º escolhido é o seu; os outros ficam com a CPU' : '';
    this.pickHint = who + ownHint;
    const L = this.lead;
    this.levelsHint = `<span class="ptag" style="--pc:${PLAYER_COLORS[L]}">J${L}</span> direcional escolhe a CPU · ${ico('A', L)} ${ico('L', L)} nível − · ${ico('C', L)} ${ico('R', L)} nível + · ${this.startIco(L)} começa · ${ico('B', L)} volta`;
    this.updatePickHint();
  }

  // ---------- nível de cada atleta da CPU ----------
  // parceiro da CPU no time de um jogador: o 3º do cooperativo e, no controle "só o meu
  // atleta", todos menos o 1º escolhido
  isMate(team, k) {
    if (team === this.cpuTeam) return false;
    if (this.humans) { const hs = this.humans[team]; return hs.length > 1 && k >= hs.length; }
    const c = this.cursors.find(c => c.team === team && c.slots.includes(k));
    return this.mode === 'coop' ? k === 2 : !!c && this.control[c.n] === 'own' && k > 0;
  }
  isCpu(team, k) { return team === this.cpuTeam || this.isMate(team, k); }
  // vagas da CPU na ordem da etapa de níveis: primeiro os parceiros, depois os adversários
  cpuSlots() {
    const out = [];
    for (const team of [0, 1]) for (const k of range(this.size)) if (this.isMate(team, k)) out.push({ team, k });
    if (this.cpuTeam !== null) for (const k of range(this.size)) out.push({ team: this.cpuTeam, k });
    return out;
  }

  // foco da etapa de níveis: ↑↓ anda entre as CPUs do mesmo time, ←→ passa para o outro time
  // (na vaga mais próxima); sem CPU naquela direção, ↑↓ dá a volta e ←→ fica onde está
  moveLevelFocus(slots, dir) {
    const cur = slots[this.lvFocus];
    let next = -1;
    if (dir === 'up' || dir === 'down') {
      const same = slots.map((s, i) => ({ ...s, i })).filter(s => s.team === cur.team);
      const at = same.findIndex(s => s.i === this.lvFocus);
      if (same.length > 1) next = same[(at + (dir === 'down' ? 1 : -1) + same.length) % same.length].i;
    } else {
      const other = slots.map((s, i) => ({ ...s, i })).filter(s => s.team !== cur.team && (dir === 'right' ? s.team > cur.team : s.team < cur.team));
      if (other.length) next = other.reduce((a, b) => (Math.abs(b.k - cur.k) < Math.abs(a.k - cur.k) ? b : a)).i;
    }
    if (next < 0 || next === this.lvFocus) { this.beep(false); return; }
    this.lvFocus = next;
    this.beep(true, 0.3);
  }

  changeLevel(team, k, step) {
    if (!this.isCpu(team, k)) return;
    const cur = this.levels[team][k];
    const v = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, cur + step));
    if (v === cur) { this.beep(false); return; }
    this.levels[team][k] = v;
    // lembra para a próxima partida
    (this.isMate(team, k) ? settings.mateLevels : settings.oppLevels)[k] = v;
    saveSettings();
    this.beep(true, 0.5);
  }

  // ---------- 5.0: especiais e nível, em sequência ----------
  // Depois de escolher os atletas, cada jogador passa pelos atletas do time dele (inclusive o
  // parceiro da CPU): ataque 1 → ataque 2 → defesa 1 → defesa 2 → nível (só CPU). O jogador 1
  // termina com o nível de cada adversário da CPU. A / X (ou L1 / R1) muda, Start confirma e passa, B volta.
  ownerOf(team, k) {
    if (team === this.cpuTeam) return this.lead;
    if (this.humans) { const hs = this.humans[team]; return hs[k] || hs[0]; }
    const c = this.cursors.find(c => c.team === team && c.slots.includes(k)) || this.cursors.find(c => c.team === team);
    return this.mode === 'coop' ? 1 : c && c.n;
  }
  // páginas do painel de cada jogador: um atleta do time por página (inclusive o parceiro da CPU) e,
  // para o jogador 1, uma página com o nível de cada adversário da CPU
  spPages(n) {
    const pages = [];
    for (const team of [0, 1]) {
      if (team === this.cpuTeam) continue;
      for (const k of range(this.size)) {
        if (this.ownerOf(team, k) !== n) continue;
        const items = (this.tilt && this.wantSp[n] ? (this.novoOf(n) ? ['a1', 'd1'] : SLOT_KEYS) : []).map(row => ({ team, k, row }));
        if (this.isCpu(team, k) && !this.cpuLevel) items.push({ team, k, row: 'lv' });
        if (items.length) pages.push({ team, k, items });
      }
    }
    if (n === this.lead && this.cpuTeam !== null && !this.cpuLevel) pages.push({ team: this.cpuTeam, k: null, items: range(this.size).map(k => ({ team: this.cpuTeam, k, row: 'lv' })) });
    // 5.0: tela baixa (celular deitado) — em vez de encolher, divide cada atleta em Ataque / Defesa / Nível
    if (innerHeight >= 520) return pages;
    const out = [];
    for (const pg of pages) {
      const groups = pg.k === null ? [] : [['Ataque', pg.items.filter(it => it.row[0] === 'a')], ['Defesa', pg.items.filter(it => it.row[0] === 'd')], ['Nível', pg.items.filter(it => it.row === 'lv')]];
      if (pg.k === null) for (let i = 0; i < pg.items.length; i += 2) groups.push(['', pg.items.slice(i, i + 2)]);
      // 5.0: 3 ou 4 jogadores ao mesmo tempo (painéis estreitos): um item por página
      const many = new Set(this.cursors.map(c => c.n)).size >= 3;
      for (const [part, items] of groups) {
        if (!items.length) continue;
        if (many) items.forEach(it => out.push({ ...pg, items: [it], part }));
        else out.push({ ...pg, items, part });
      }
    }
    return out;
  }
  // (compatível) todas as linhas do jogador, em ordem
  spSlots(n) { return this.spPages(n).flatMap(p => p.items); }
  spPlayers() { return this.cursorsN().filter(n => this.spPages(n).length); } // multi: cada jogador
  initSpecials() {
    for (const team of [0, 1]) for (const k of range(this.size)) {
      const id = this.teams[team][k], own = id && CHARACTERS[id].special;
      const cpu = this.isCpu(team, k), last = !cpu && id && settings.lastSpecials && settings.lastSpecials[id];
      this.tsp[team][k] = normalizeSpecials(last || {}, own, { random: cpu }); // 5.0: as últimas escolhas de cada atleta
    }
  }
  // 5.0: modo de controle do jogador (Configurações → Controles)
  novoOf(n) { return ((settings.ctrlModes || {})[n]) === 'novo'; }
  cycleSpecial(team, k, row, d) {
    if (row === 'lv') { this.changeLevel(team, k, d); return; }
    // 5.0: qualquer especial do tipo, menos o que já está no outro botão (50% / 100%) do mesmo tipo
    // (modo Novo: um especial de cada tipo, qualquer um da lista)
    const sp = this.tsp[team][k], all = specialsFor(row);
    if (!sp || !all.length) { this.beep(false); return; }
    const ok = new Set(this.novoOf(this.ownerOf(team, k)) ? all : choicesFor(row, sp));
    let i = all.indexOf(sp[row]);
    for (let n = 0; n < all.length; n++) { i = (i + d + all.length) % all.length; if (ok.has(all[i])) break; }
    if (!ok.has(all[i]) || all[i] === sp[row]) { this.beep(false); return; }
    sp[row] = all[i];
    this.beep(true, 0.5);
    this.note = { text: 'Especial trocado', t: performance.now() };
  }
  // terminadas as escolhas dos atletas: especiais e níveis em sequência; depois o VS
  afterPicks() {
    this.initSpecials();
    const players = this.spPlayers();
    if (!players.length) { this.phase = 'ready'; this.t = 0; return; }
    this.phase = 'specials';
    this.spFocus = {}; this.spDone = {};
    for (const n of players) this.spFocus[n] = { p: 0, r: 0 };
    const ico = (a, n) => padIcon(a, this.styles[n], 18);
    this.el.querySelector('.sel-hint').innerHTML = players.map(n => `<span class="ptag" style="--pc:${PLAYER_COLORS[n]}">J${n}</span> ↑↓ escolhe a linha · ${ico('C', n)} troca ▶ · ${ico('A', n)} troca ◀ · ${this.startIco(n)} Avançar / Pronto! · ${ico('B', n)} volta`).join(' &nbsp; ');
    this.buildPanels();
    const go = this.el.querySelector('.lv-go');
    if (go) go.hidden = false;
  }
  afterSpecials() {
    // 5.0: guarda as escolhas de cada atleta humano para a próxima partida
    settings.lastSpecials = settings.lastSpecials || {};
    for (const team of [0, 1]) for (const k of range(this.size)) {
      const id = this.teams[team][k];
      if (id && !this.isCpu(team, k) && this.tsp[team][k]) settings.lastSpecials[id] = { ...this.tsp[team][k] };
    }
    saveSettings();
    this.phase = 'ready'; this.t = 0;
    this.el.querySelectorAll('.sp-screen, .sp-panel').forEach(e => e.remove());
  }

  confirmLevels() {
    if (this.phase !== 'levels' && this.phase !== 'specials') return;
    this.beep(true);
    this.phase = 'ready';
    this.t = 0;
  }

  // volta da escolha de especiais (Modo Tilt) para as escolhas de atletas
  backFromSpecials() {
    this.phase = 'levels'; // reaproveita a volta da etapa de níveis
    this.backFromLevels();
  }

  // volta da etapa de níveis para as escolhas (desfaz a última escolha do jogador 1 e a CPU escolhe de novo)
  backFromLevels() {
    if (this.cpuTeam !== null) this.teams[this.cpuTeam] = range(this.size).map(() => null);
    this.phase = 'pick';
    this.updatePickHint();
    const go = this.el.querySelector('.lv-go');
    if (go) go.hidden = true;
    const c = this.cursors.find(c => c.n === this.lead) || this.cursors[0];
    this.undo(c);
  }

  // ---------- lógica ----------
  moveCursor(c, dx, dy) {
    let i = c.idx;
    // fileiras de 6: oficiais (2), jogadores criados (1) e, embaixo de tudo, os 2 chefes
    const bossStart = ROSTER.length + CUSTOM_ROSTER.length, rows = bossStart / COLS;
    if (i < bossStart) {
      let row = Math.floor(i / COLS), col = i % COLS;
      if (dx) col = (col + dx + COLS) % COLS;
      if (dy > 0) { if (row < rows - 1) row++; else { c.idx = bossStart + (col < COLS / 2 ? 0 : 1); return; } }
      if (dy < 0) { if (row > 0) row--; else { c.idx = bossStart + (col < COLS / 2 ? 0 : 1); return; } }
      c.idx = row * COLS + col;
    } else {
      if (dx) c.idx = bossStart + ((i - bossStart + 1) % 2);
      else if (dy < 0) c.idx = (rows - 1) * COLS + (i === bossStart ? 2 : 3);
      else if (dy > 0) c.idx = i === bossStart ? 2 : 3;
    }
  }

  nextSlot(c) { return c.slots.find(k => !this.teams[c.team][k]); }

  canPick(c, id) {
    if (!id) return false;
    // 5.0 Campeonato: só os atletas do campeonato, e não os das outras duplas de jogadores
    if (this.camp && (!this.camp.allowed.includes(id) || this.camp.taken.includes(id))) return false;
    return !this.teams[c.team].includes(id); // o mesmo atleta não pode estar duas vezes no mesmo time
  }

  pick(c) {
    if (c.done || this.phase !== 'pick') return;
    const id = this.slots[c.idx];
    if (!this.canPick(c, id)) { c.shake = 0.3; this.beep(false); return; }
    this.teams[c.team][this.nextSlot(c)] = id;
    this.beep(true);
    if (this.nextSlot(c) === undefined) c.done = true;
    if (this.cursors.every(x => x.done)) this.startCpu();
  }

  undo(c) {
    if (this.phase !== 'pick') return;
    const filled = c.slots.filter(k => this.teams[c.team][k]);
    if (filled.length) {
      this.teams[c.team][filled[filled.length - 1]] = null;
      c.done = false;
      return;
    }
    if (this.cursors.every(x => x.slots.every(k => !this.teams[x.team][k]))) {
      this.close();
      this.onCancel();
    }
  }

  startCpu() {
    if (this.cpuTeam === null) { this.afterPicks(); return; }
    // a CPU "passeia" pela grade e escolhe atletas diferentes dos seus adversários
    const free = ROSTER.map((id, i) => ({ id, i })).filter(s => s.id);
    const taken = new Set(this.teams[1 - this.cpuTeam]);
    let pool = free.filter(s => !taken.has(s.id));
    if (pool.length < this.size) pool = free;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    this.cpu = { idx: shuffled[0].i, targets: shuffled.slice(0, this.size), hop: 0, stepT: 0, picked: 0 };
    this.phase = 'cpu';
    this.t = 0;
  }

  updateCpu(dt) {
    const cp = this.cpu;
    cp.stepT -= dt;
    if (cp.stepT > 0) return;
    cp.stepT = 0.09;
    cp.hop++;
    const free = ROSTER.map((id, i) => ({ id, i })).filter(s => s.id);
    if (cp.hop < 7) { cp.idx = free[Math.floor(Math.random() * free.length)].i; this.beep(true, 0.25); return; }
    const target = cp.targets[cp.picked];
    cp.idx = target.i;
    this.teams[this.cpuTeam][cp.picked] = target.id;
    this.beep(true);
    cp.picked++;
    cp.hop = cp.picked >= 1 ? 4 : 0;
    cp.stepT = 0.35;
    if (cp.picked === this.size) this.afterPicks();
  }

  beep(ok, vol = 1) {
    if (this.sfx) this.sfx.onEvent({ type: ok ? 'select' : 'deny', vol });
  }

  update(dt, time) {
    if (!this.active) return;
    this.t += dt;
    if (this.phase === 'side') { this.updateSide(); return; }
    if (this.phase === 'pick') {
      for (const c of this.cursors) {
        const p = this.ports[c.n];
        if (!p) continue;
        // 5.0 (padrão de controle): direcional navega · A escolhe · B (ou Esc) desfaz
        const k = p.menu();
        if (!c.done) {
          if (k.left) this.moveCursor(c, -1, 0);
          else if (k.right) this.moveCursor(c, 1, 0);
          if (k.up) this.moveCursor(c, 0, -1);
          else if (k.down) this.moveCursor(c, 0, 1);
          if (k.a) this.pick(c);
        }
        if (p.pressed('D')) this.toggleWantSp(this.mode === 'coop' ? 1 : c.n);
        if (k.b) this.undo(c);
        if (!this.active) return;
        c.shake = Math.max(0, c.shake - dt);
      }
    } else if (this.phase === 'levels') {
      // jogador 1 ajusta o nível de cada atleta da CPU: o direcional escolhe a CPU
      // (↑↓ no mesmo time, ←→ para o outro time) e L1 / R1 diminuem / aumentam o nível
      const p = this.ports[this.lead];
      const slots = this.cpuSlots();
      // 5.0 (padrão de controle): A aumenta / X diminui o nível (L1 / R1 continuam) · Start confirma · B volta
      if (p) {
        const k = p.menu();
        const dir = k.up ? 'up' : k.down ? 'down' : k.left ? 'left' : k.right ? 'right' : null;
        if (dir) this.moveLevelFocus(slots, dir);
        const f = slots[this.lvFocus];
        if (p.pressed('L') || k.x) this.changeLevel(f.team, f.k, -1);
        else if (p.pressed('R') || k.a) this.changeLevel(f.team, f.k, 1);
        if (k.start) this.confirmLevels();
        else if (k.b) this.backFromLevels();
      }
    } else if (this.phase === 'specials') {
      // 5.0: painel de cada jogador
      for (const n of this.spPlayers()) {
        const p = this.ports[n];
        if (!p) continue;
        const pages = this.spPages(n), f = this.spFocus[n];
        // 5.0 (padrão de controle): ↑↓ escolhe a linha · A troca ▶ · X troca ◀ · Start página seguinte / Pronto!
        // (segurar 2 s, editável: Pronto! direto) · B (ou Esc) volta
        const k = p.menu();
        if (this.spDone[n]) { if (k.b) { this.spDone[n] = false; this.beep(true, 0.3); } continue; }
        const page = pages[f.p], it = page.items[f.r];
        if (k.up) { f.r = (f.r - 1 + page.items.length) % page.items.length; this.beep(true, 0.3); }
        else if (k.down) { f.r = (f.r + 1) % page.items.length; this.beep(true, 0.3); }
        this.holdA = this.holdA || {};
        this.holdA[n] = k.start ? 0.001 : (k.holdStart && this.holdA[n] > 0 ? this.holdA[n] + dt : 0);
        if (this.holdA[n] >= menuHoldTime()) { this.holdA[n] = 0; this.spDone[n] = true; this.note = { text: 'Pronto!', t: performance.now() }; this.beep(true); continue; }
        if (k.start) {
          if (f.p < pages.length - 1) { f.p++; f.r = 0; this.beep(true, 0.5); }
          else { this.spDone[n] = true; this.beep(true); }
        } else if (k.a) this.cycleSpecial(it.team, it.k, it.row, 1);
        else if (k.x) this.cycleSpecial(it.team, it.k, it.row, -1);
        else if (k.b) {
          if (f.p > 0) { f.p--; f.r = 0; this.beep(true, 0.3); }
          else { this.backFromSpecials(); return; }
        }
      }
      if (this.phase === 'specials' && this.spPlayers().every(n => this.spDone[n])) this.afterSpecials();
    } else if (this.phase === 'cpu') {
      for (const n of this.cursorsN()) { const p = this.ports[n]; if (p && p.pressed('D')) this.toggleWantSp(n); }
      this.updateCpu(dt);
    } else if (this.phase === 'ready' && this.camp) {
      // 5.0 Campeonato: sem VS (o adversário vem da chave)
      const ids = [...this.teams[0]], sp = this.tilt ? this.tsp[0].map(x => ({ ...x })) : null;
      this.close();
      this.onDone(ids, sp);
      return;
    } else if (this.phase === 'ready' && this.t > 0.5) {
      this.showVs();
    } else if (this.phase === 'vs' && this.t > VS_TIME) {
      const teams = this.teams.map(t => [...t]);
      // nível só das vagas da CPU: { time: [nível por atleta] }
      const levels = { 0: [], 1: [] };
      for (const { team, k } of this.cpuSlots()) levels[team][k] = this.levels[team][k];
      // Modo Tilt: especiais de cada atleta { time: [{ attack, defense }] }
      const tiltSpecials = this.tilt ? { 0: this.tsp[0].map(s => ({ ...s })), 1: this.tsp[1].map(s => ({ ...s })) } : null;
      const sides = this.sides;
      this.close();
      this.onDone(teams, levels, tiltSpecials, sides);
      return;
    }
    this.render(time);
  }

  // ---------- desenho ----------
  cardState(team, k) {
    const id = this.teams[team][k];
    if (id) return { id, picked: true };
    // cursor escolhendo esta carta agora?
    const c = this.cursors.find(c => c.team === team && !c.done && this.nextSlot(c) === k);
    if (c && this.phase === 'pick') return { id: this.slots[c.idx], hover: c.n };
    if (this.phase === 'cpu' && team === this.cpuTeam && this.cpu && this.cpu.picked === k) return { id: this.slots[this.cpu.idx], hover: 'cpu' };
    return { id: null };
  }

  render(time) {
    this.el.classList.toggle('sp-phase', this.phase === 'specials');
    if (this.phase === 'specials') this.renderPanels();
    // cursores na grade
    this.slotEls.forEach((el, i) => {
      const on = this.cursors.filter(c => c.idx === i && !c.done && this.phase === 'pick').map(c => c.n);
      const cpuOn = this.phase === 'cpu' && this.cpu && this.cpu.idx === i;
      el.classList.toggle('c1', on.includes(1));
      el.classList.toggle('c2', on.includes(2));
      el.classList.toggle('ccpu', !!cpuOn);
      const shaking = this.cursors.some(c => c.idx === i && c.shake > 0);
      el.classList.toggle('deny', shaking);
      const id = this.slots[i];
      el.classList.toggle('chosen', !!id && (this.teams[0].includes(id) || this.teams[1].includes(id)));
    });
    // cartas de cada lado
    for (const team of [0, 1]) {
      for (const k of range(this.size)) {
        const card = this.cards[team][k];
        const st = this.cardState(team, k);
        const who = this.whoFor(team, k);
        card.el.classList.toggle('empty', !st.id);
        card.el.classList.toggle('picked', !!st.picked);
        card.el.classList.toggle('hover', !!st.hover);
        card.el.style.setProperty('--pc', who.color);
        const key = `${st.id}|${!!st.picked}|${who.label}`;
        if (card.shown !== key) {
          card.shown = key;
          card.el.querySelector('.card-who').innerHTML = who.label;
          const ch = st.id && CHARACTERS[st.id];
          card.el.querySelector('.card-name').textContent = ch ? ch.name : '?';
          card.el.querySelector('.card-name').style.color = ch ? ch.color : '';
          card.el.querySelector('.card-sp').textContent = ch && !this.tilt ? `Especial: ${MOVES[ch.special].name.replace('!', '')}` : '';
          card.el.querySelectorAll('.st').forEach((row, s) => {
            const v = ch ? ch.stats[STAT_KEYS[s]] : 0;
            row.querySelectorAll('.segs i').forEach((seg, j) => seg.classList.toggle('on', j < v));
            row.querySelector('b').textContent = ch ? v : '–';
          });
        }
        // nível do atleta da CPU (a cor segue a faixa: Iniciante … Lenda)
        if (this.isCpu(team, k)) {
          const lv = this.levels[team][k];
          const txt = `<b>${lv}</b><small>${LEVEL_NAMES[lv - 1]}</small>`;
          const el = card.el.querySelector('.lv-txt');
          if (el.innerHTML !== txt) { el.innerHTML = txt; card.el.dataset.tier = TIERS.indexOf(tierOf(lv)); }
          card.el.classList.toggle('lv-focus', this.isFocused(team, k, 'lv'));
        }
        // Modo Tilt: especiais de ataque e de defesa do atleta (com o foco de quem está escolhendo)
        if (this.tilt) {
          const box = card.el.querySelector('.card-tsp');
          const sp = this.tsp[team][k];
          box.hidden = !sp || this.phase === 'pick' || this.phase === 'cpu';
          if (sp) for (const row of SLOT_KEYS) {
            const el = box.querySelector(`.tsp-row[data-row="${row}"]`);
            const tsd = tiltSpecial(sp[row]), name = tsd && tsd.name ? tsd.name : MOVES[sp[row]] ? MOVES[sp[row]].name.replace('!', '') : '—';
            const b = el.querySelector('b');
            if (b.textContent !== name) b.textContent = name;
            el.classList.toggle('focus', this.isFocused(team, k, row));
          }
        }
        // atleta animado (parado, respirando; comemora ao ser escolhido)
        const ctx = card.ctx;
        if (st.id) {
          drawAthlete(ctx, CHARACTERS[st.id], poseFor(dummy({ idx: k, team }), time + k), time + k);
        } else {
          ctx.clearRect(0, 0, 256, 256);
        }
      }
    }
  }

  isFocused(team, k, row) {
    return this.phase === 'specials' && Object.entries(this.spFocus).some(([n, f]) => {
      const pg = this.spPages(+n)[f.p], it = pg && pg.items[f.r];
      return !this.spDone[n] && it && it.team === team && it.k === k && it.row === row;
    });
  }

  // ---------- 5.0: painel grande dos especiais (no centro) ----------
  buildPanels() {
    this.el.querySelectorAll('.sp-screen, .sp-panel').forEach(e => e.remove());
    // 5.0: escolha de especiais e níveis numa tela própria (não mais um painel por cima da seleção)
    const scr = document.createElement('div');
    scr.className = 'sp-screen';
    scr.innerHTML = `<h2 class="sel-title">ESPECIAIS E NÍVEIS</h2><p class="sel-sub">${MODE_NAME[this.mode]} · ${SIZE_NAME[this.size]}</p><div class="sp-panels"></div>`;
    this.el.append(scr);
    const wrap = scr.querySelector('.sp-panels');
    wrap.classList.toggle('many', this.spPlayers().length >= 3); // 5.0: 3 ou 4 painéis — linha em 2 andares
    const players = this.spPlayers();
    players.forEach((n, i) => {
      const d = document.createElement('div');
      d.className = 'sp-panel' + (players.length > 1 ? (i ? ' right' : ' left') : '');
      d.dataset.n = n;
      d.style.setProperty('--pc', PLAYER_COLORS[n]);
      wrap.append(d);
    });
    this.panelKey = {};
  }
  spName(id) {
    const d = tiltSpecial(id);
    return id ? (d && d.name) || (MOVES[id] ? MOVES[id].name.replace('!', '') : id) : '—';
  }
  renderPanels() {
    for (const d of this.el.querySelectorAll('.sp-panel')) {
      const n = +d.dataset.n, pages = this.spPages(n), f = this.spFocus[n];
      if (!f || !pages[f.p]) continue;
      const pg = pages[f.p], done = !!this.spDone[n];
      const lvTxt = (team, k) => { const lv = this.levels[team][k]; return lv + ' · ' + LEVEL_NAMES[lv - 1]; };
      const rows = pg.items.map((it, r) => {
        const on = !done && r === f.r;
        if (it.row === 'lv') {
          const who = pg.k === null ? CHARACTERS[this.teams[it.team][it.k]].name : 'Nível da CPU';
          return `<div class="spp-row ${on ? 'on' : ''}" data-r="${r}"><span class="spp-lbl">${who}</span>
            <button type="button" class="arrow" data-tsp="lv" data-d="-1" data-t="${it.team}" data-k="${it.k}" aria-label="Nível mais fácil">◀</button>
            <b class="spp-val">${lvTxt(it.team, it.k)}</b>
            <button type="button" class="arrow" data-tsp="lv" data-d="1" data-t="${it.team}" data-k="${it.k}" aria-label="Nível mais difícil">▶</button></div>`;
        }
        const sp = this.tsp[it.team][it.k] || {}, id = sp[it.row], S = SLOTS[it.row];
        const cost = +(V5.custo[S.nivel] ?? S.nivel), novo = this.novoOf(n);
        const lbl = novo ? `Especial de ${S.tipo}<small>${this.padPair(n, S.key, 1)} · 50% ou 100% pela barra · ${this.padPair(n, 'L2', 1)} + ${this.padPair(n, S.key, 1)} troca no jogo</small>` : `${S.label}<small>${this.padPair(n, S.key)} · gasta ${cost}%</small>`;
        return `<div class="spp-row ${on ? 'on' : ''} ${S.tipo}" data-r="${r}"><span class="spp-lbl">${lbl}</span>
          <button type="button" class="arrow" data-tsp="${it.row}" data-d="-1" data-t="${it.team}" data-k="${it.k}" aria-label="Especial anterior">◀</button>
          <b class="spp-val">${this.spName(id)}</b>
          <button type="button" class="arrow" data-tsp="${it.row}" data-d="1" data-t="${it.team}" data-k="${it.k}" aria-label="Próximo especial">▶</button></div>`; // 5.0: sem as barrinhas de atributos do especial (Precisão / Força / Hitbox)
      }).join('');
      const ch = pg.k !== null && CHARACTERS[this.teams[pg.team][pg.k]];
      const title = (pg.k === null ? 'Adversários da CPU · nível' : (ch ? ch.name : '') + (this.isCpu(pg.team, pg.k) ? ' <small>(CPU do seu time)</small>' : '')) + (pg.part ? ' · ' + pg.part : '');
      // descrição fixa embaixo (do item marcado), aviso curto ao trocar e "segure A: Pronto!"
      const cur = pg.items[f.r] || {};
      const curId = cur.row && cur.row !== 'lv' ? (this.tsp[cur.team][cur.k] || {})[cur.row] : null;
      const desc = cur.row === 'lv' ? 'Nível da CPU: de 1 (Turista) a 12 (Lenda).' : curId ? (SPECIAL_INFO[curId] || this.spName(curId)) : '';
      const note = this.note && performance.now() - this.note.t < 1200 ? `<span class="spp-note">✔ ${this.note.text}</span>` : '';
      const hold = this.holdA && this.holdA[n] > 0.15 ? `<span class="spp-hold"><i style="width:${Math.min(100, this.holdA[n] / menuHoldTime() * 100).toFixed(0)}%"></i>Segure ${this.startIco(n, 16)}: Pronto!</span>` : '';
      const html = `<div class="spp-head">${ch ? `<img src="${portrait(ch.id)}" alt="">` : ''}<div><small>J${n} · ${f.p + 1} de ${pages.length}</small><h3>${title}</h3></div></div>${rows}
        <p class="spp-desc">${desc}</p>${note}${hold}
        <div class="spp-nav">${done ? '<span class="spp-wait">Pronto! Esperando…</span>' : `<span class="spp-nb back">${this.padPair(n, 'B', 1)} Voltar</span><span class="spp-nb next">${f.p < pages.length - 1 ? 'Avançar' : 'Pronto!'} ${this.startIco(n, 16)}</span>`}</div>`;
      // 5.0: nada de rolagem — se não couber, o conteúdo do painel encolhe
      if (this.panelKey[n] !== html) { this.panelKey[n] = html; d.innerHTML = `<div class="fit-in">${html}</div>`; d._fitSz = ''; }
      const sz = d.clientWidth + 'x' + d.clientHeight; // refaz o encaixe quando o painel muda de tamanho
      if (d._fitSz !== sz) { d._fitSz = sz; fitInto(d, d.firstElementChild); }
      d.classList.toggle('done', done);
    }
  }
  // 5.0: barrinhas do nível do botão (precisão = área, força, hitbox), comparadas ao especial de 100%
  levelBars(nivel) {
    const L = (V5.niveis || {})[nivel] || {}, T = (V5.niveis || {})[100] || {};
    const prec = Math.min(1, (+(T.area ?? 0.45)) / Math.max(0.05, +(L.area ?? 1)));
    const forca = Math.min(1, (+(L.velocidade ?? 1.3) - 1) / Math.max(0.05, +(T.velocidade ?? 1.45) - 1));
    const hit = Math.min(1, +(L.hitbox ?? 1) / Math.max(0.05, +(T.hitbox ?? 1)));
    const bar = (lbl, v) => `<span class="lvb"><em>${lbl}</em><i><b style="width:${Math.round(v * 100)}%"></b></i></span>`;
    return `<span class="spp-bars">${bar('Precisão', prec)}${bar('Força', forca)}${bar('Hitbox', hit)}</span>`;
  }
  // ícone(s) do botão no estilo do controle do jogador (Xbox, PlayStation ou teclado)
  // 5.0 (padrão de controle): ícone do Start nos menus (no teclado é o P; o Esc vale como B)
  startIco(n, size = 18) { return /^(full|kb1|kb2)$/.test(this.styles[n]) ? '<kbd class="key-cap">Enter</kbd>' : padIcon('start', this.styles[n], size); }
  padPair(n, action, times = 2) { const i = padIcon(action, this.styles[n], 16); return times === 2 ? i + i : i; }

  whoFor(team, k) {
    const cpu = { label: 'CPU', color: '#5b556e' };
    if (team === this.cpuTeam) return cpu;
    const c = this.cursors.find(c => c.team === team && c.slots.includes(k));
    // atleta do time do jogador que fica com a CPU: o 3º do cooperativo e, no controle
    // "só o meu atleta", todos menos o 1º escolhido
    if (this.humans) { const o = this.ownerOf(team, k); return this.isMate(team, k) ? { label: `J${o} · CPU`, color: '#5b556e' } : { label: `J${o}`, color: PLAYER_COLORS[o] }; }
    if (this.mode === 'coop' ? k === 2 : (this.control[c.n] === 'own' && k > 0)) return { label: `J${c.n} · CPU`, color: '#5b556e' };
    return { label: `J${c.n}`, color: PLAYER_COLORS[c.n] };
  }

  showVs() {
    this.phase = 'vs';
    this.t = 0;
    const side = team => this.teams[team].map(id => `<div class="vs-f"><img src="${portrait(id)}" alt=""><b style="color:${CHARACTERS[id].color}">${CHARACTERS[id].name}</b></div>`).join('');
    this.el.querySelector('.vs-team.left').innerHTML = side(0);
    this.el.querySelector('.vs-team.right').innerHTML = side(1);
    this.el.classList.add('vs');
    this.beep(true);
    if (this.sfx) this.sfx.onEvent({ type: 'vs' });
  }
}
