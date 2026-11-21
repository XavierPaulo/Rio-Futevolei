// Tela de seleção de atletas (inspirada em Mortal Kombat 2 / Tekken Tag):
// grade de retratos no centro, a dupla de cada lado em cartas grandes com os
// atributos em destaque, um cursor por jogador escolhendo ao mesmo tempo,
// a CPU escolhendo a dupla dela no modo solo/cooperativo e, no fim, a tela de VS.
import { CHARACTERS, ROSTER, BOSSES, STAT_LABELS } from '../art/characters.js';
import { MOVES } from '../moves.js';
import { drawAthlete } from '../art/draw.js';
import { poseFor } from '../art/poses.js';
import { padIcon } from './padIcons.js';
import { portrait, dummy, PLAYER_COLORS } from './portraits.js';
import { settings, saveSettings } from './settings.js';
import { LEVEL_NAMES, TIERS, tierOf, MIN_LEVEL, MAX_LEVEL } from '../difficulty.js';

// vagas: 0..11 grade (oficiais + criados pelo jogador), 12..13 chefes — recalculadas a cada abertura
const COLS = 6;
const STAT_KEYS = ['forca', 'agilidade', 'precisao', 'pique'];
const VS_TIME = 1.7;

const MODE_NAME = { solo: 'Jogar solo', versus: 'Um contra o outro', coop: 'Juntos no mesmo time' };
const SIZE_NAME = { 1: '1 contra 1', 2: '2 contra 2', 3: '3 contra 3' };
const TITLE = { 1: 'ESCOLHA SEU ATLETA', 2: 'ESCOLHA SUA DUPLA', 3: 'ESCOLHA SUA TRINCA' };
const range = n => Array.from({ length: n }, (_, i) => i);

export class SelectScreen {
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.className = 'select';
    parent.appendChild(this.el);
    this.active = false;
    this.el.addEventListener('click', e => {
      // ◀ ▶ do nível de um atleta da CPU (no cartão dele)
      const lv = e.target.closest('[data-lvs]');
      if (lv) { this.changeLevel(+lv.dataset.t, +lv.dataset.k, +lv.dataset.lvs); return; }
      const go = e.target.closest('[data-go]');
      if (go) { this.confirmLevels(); return; }
      const s = e.target.closest('[data-slot]');
      if (!s) return;
      // mouse: move o cursor do jogador 1 e confirma
      const c = this.cursors.find(c => c.n === 1 && !c.done) || this.cursors.find(c => !c.done);
      if (!c) return;
      c.idx = +s.dataset.slot;
      this.pick(c);
    });
  }

  // ports: portas dos jogadores · styles: estilo de ícones por jogador (1/2)
  // size: atletas por time (1, 2 ou 3) · control: { 1: 'team' | 'own', 2: ... }
  open({ mode, size = 2, control = {}, ports, styles, onDone, onCancel, sfx }) {
    Object.assign(this, { mode, size, control, ports, styles, onDone, onCancel, sfx });
    this.active = true;
    this.slots = [...ROSTER, ...BOSSES];
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
    // nível de cada vaga da CPU (adversários e parceiros), começando pelo último usado
    this.levels = [0, 1].map(team => range(size).map(k => (this.isMate(team, k) ? settings.mateLevels[k] : settings.oppLevels[k])));
    this.lvFocus = 0; // na etapa de níveis: qual atleta da CPU está sendo ajustado
    this.build();
    this.el.classList.remove('vs');
    this.el.classList.add('show');
  }

  close() { this.active = false; this.el.classList.remove('show'); this.el.innerHTML = ''; }

  // ---------- estrutura ----------
  build() {
    const slot = (id, i) => {
      if (id) return `<div class="sl" data-slot="${i}"><img src="${portrait(id)}" alt=""><span>${CHARACTERS[id].name}</span></div>`;
      const boss = i >= ROSTER.length;
      return `<div class="sl locked ${boss ? 'boss' : ''}" data-slot="${i}"><b>?</b>${boss ? '<span>CHEFE</span>' : ''}</div>`;
    };
    const card = (team, k) => `
      <div class="card" data-team="${team}" data-k="${k}">
        <div class="card-top"><span class="card-who"></span><span class="card-num">${k + 1}º</span></div>
        <canvas width="256" height="256"></canvas>
        <div class="card-name"></div>
        <div class="card-sp"></div>
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
        <p class="sel-sub">${MODE_NAME[this.mode]} · ${SIZE_NAME[this.size]}</p>
        <div class="sel-main">
          <div class="side left" data-n="${this.size}">${range(this.size).map(k => card(0, k)).join('')}</div>
          <div class="grid-wrap">
            <div class="grid">${ROSTER.map((id, i) => slot(id, i)).join('')}</div>
            <div class="grid boss-row">${BOSSES.map((id, i) => slot(id, ROSTER.length + i)).join('')}</div>
            ${this.cpuSlots().length ? `<div class="diff lv-panel" aria-label="Níveis da CPU">
              <div class="diff-head"><b>Nível de cada CPU</b></div>
              <p class="lv-help">Depois de escolher os atletas, ajuste o nível de cada atleta da CPU no cartão dele (1 = Turista … 12 = Lenda).</p>
              <button type="button" class="lv-go" data-go="1" hidden>Começar a partida</button>
            </div>` : ''}
          </div>
          <div class="side right" data-n="${this.size}">${range(this.size).map(k => card(1, k)).join('')}</div>
        </div>
        <p class="sel-hint"></p>
      </div>
      <div class="vs-screen">
        <div class="vs-team left"></div>
        <div class="vs-mid"><b>VS</b><span>COPACABANA</span></div>
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
    this.levelsHint = `<span class="ptag" style="--pc:${PLAYER_COLORS[1]}">J1</span> direcional escolhe a CPU · ${ico('L', 1)} ${ico('R', 1)} nível − / + · ${ico('C', 1)} começa · ${ico('B', 1)} volta`;
    this.el.querySelector('.sel-hint').innerHTML = this.pickHint;
  }

  // ---------- nível de cada atleta da CPU ----------
  // parceiro da CPU no time de um jogador: o 3º do cooperativo e, no controle "só o meu
  // atleta", todos menos o 1º escolhido
  isMate(team, k) {
    if (team === this.cpuTeam) return false;
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

  // terminadas as escolhas: ajusta os níveis (se houver CPU) e depois VS
  afterPicks() {
    if (!this.cpuSlots().length) { this.phase = 'ready'; this.t = 0; return; }
    this.phase = 'levels';
    this.lvFocus = 0;
    this.el.querySelector('.sel-hint').innerHTML = this.levelsHint;
    const go = this.el.querySelector('.lv-go');
    if (go) go.hidden = false;
  }

  confirmLevels() {
    if (this.phase !== 'levels') return;
    this.beep(true);
    this.phase = 'ready';
    this.t = 0;
  }

  // volta da etapa de níveis para as escolhas (desfaz a última escolha do jogador 1 e a CPU escolhe de novo)
  backFromLevels() {
    if (this.cpuTeam !== null) this.teams[this.cpuTeam] = range(this.size).map(() => null);
    this.phase = 'pick';
    this.el.querySelector('.sel-hint').innerHTML = this.pickHint;
    const go = this.el.querySelector('.lv-go');
    if (go) go.hidden = true;
    const c = this.cursors.find(c => c.n === 1) || this.cursors[0];
    this.undo(c);
  }

  // ---------- lógica ----------
  moveCursor(c, dx, dy) {
    let i = c.idx;
    const bossStart = ROSTER.length;
    if (i < bossStart) {
      let row = Math.floor(i / COLS), col = i % COLS;
      if (dx) col = (col + dx + COLS) % COLS;
      if (dy > 0) { if (row === 0) row = 1; else { i = bossStart + (col < COLS / 2 ? 0 : 1); c.idx = i; return; } }
      if (dy < 0) { if (row === 1) row = 0; else { i = bossStart + (col < COLS / 2 ? 0 : 1); c.idx = i; return; } }
      c.idx = row * COLS + col;
    } else {
      if (dx) c.idx = bossStart + ((i - bossStart + 1) % 2);
      else if (dy < 0) c.idx = COLS + (i === bossStart ? 2 : 3);
      else if (dy > 0) c.idx = i === bossStart ? 2 : 3;
    }
  }

  nextSlot(c) { return c.slots.find(k => !this.teams[c.team][k]); }

  canPick(c, id) {
    if (!id) return false;
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
    const taken = new Set(this.teams[0]);
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
    this.teams[1][cp.picked] = target.id;
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
    if (this.phase === 'pick') {
      for (const c of this.cursors) {
        const p = this.ports[c.n];
        if (!p) continue;
        if (!c.done) {
          if (p.pressed('left')) this.moveCursor(c, -1, 0);
          else if (p.pressed('right')) this.moveCursor(c, 1, 0);
          if (p.pressed('up')) this.moveCursor(c, 0, -1);
          else if (p.pressed('down')) this.moveCursor(c, 0, 1);
          if (p.pressed('C') || p.pressed('ok') || p.pressed('A')) this.pick(c);
        }
        if (p.pressed('B') || p.pressed('start')) this.undo(c);
        if (!this.active) return;
        c.shake = Math.max(0, c.shake - dt);
      }
    } else if (this.phase === 'levels') {
      // jogador 1 ajusta o nível de cada atleta da CPU: o direcional escolhe a CPU
      // (↑↓ no mesmo time, ←→ para o outro time) e L1 / R1 diminuem / aumentam o nível
      const p = this.ports[1];
      const slots = this.cpuSlots();
      if (p) {
        const dir = p.pressed('up') ? 'up' : p.pressed('down') ? 'down' : p.pressed('left') ? 'left' : p.pressed('right') ? 'right' : null;
        if (dir) this.moveLevelFocus(slots, dir);
        const f = slots[this.lvFocus];
        if (p.pressed('L')) this.changeLevel(f.team, f.k, -1);
        else if (p.pressed('R')) this.changeLevel(f.team, f.k, 1);
        if (p.pressed('C') || p.pressed('ok') || p.pressed('A')) this.confirmLevels();
        else if (p.pressed('B') || p.pressed('start')) this.backFromLevels();
      }
    } else if (this.phase === 'cpu') {
      this.updateCpu(dt);
    } else if (this.phase === 'ready' && this.t > 0.5) {
      this.showVs();
    } else if (this.phase === 'vs' && this.t > VS_TIME) {
      const teams = this.teams.map(t => [...t]);
      // nível só das vagas da CPU: { time: [nível por atleta] }
      const levels = { 0: [], 1: [] };
      for (const { team, k } of this.cpuSlots()) levels[team][k] = this.levels[team][k];
      this.close();
      this.onDone(teams, levels);
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
          card.el.querySelector('.card-sp').textContent = ch ? `Especial: ${MOVES[ch.special].name.replace('!', '')}` : '';
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
          const slots = this.phase === 'levels' ? this.cpuSlots() : [];
          const f = slots[this.lvFocus];
          card.el.classList.toggle('lv-focus', !!f && f.team === team && f.k === k);
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

  whoFor(team, k) {
    const cpu = { label: 'CPU', color: '#5b556e' };
    if (team === this.cpuTeam) return cpu;
    const c = this.cursors.find(c => c.team === team && c.slots.includes(k));
    // atleta do time do jogador que fica com a CPU: o 3º do cooperativo e, no controle
    // "só o meu atleta", todos menos o 1º escolhido
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
