// Tela de seleção de atletas (inspirada em Mortal Kombat 2 / Tekken Tag):
// grade de retratos no centro, a dupla de cada lado em cartas grandes com os
// atributos em destaque, um cursor por jogador escolhendo ao mesmo tempo,
// a CPU escolhendo a dupla dela no modo solo/cooperativo e, no fim, a tela de VS.
import { CHARACTERS, ROSTER, BOSSES, STAT_LABELS } from '../art/characters.js';
import { MOVES } from '../moves.js';
import { drawChibi } from '../art/chibi.js';
import { poseFor } from '../art/poses.js';
import { padIcon } from './padIcons.js';
import { portrait, dummy, PLAYER_COLORS } from './portraits.js';

const SLOTS = [...ROSTER, ...BOSSES]; // 0..11 grade, 12..13 chefes
const COLS = 6;
const STAT_KEYS = ['forca', 'agilidade', 'precisao', 'pique'];
const VS_TIME = 1.7;

const MODE_NAME = { solo: 'Jogar solo', versus: 'Um contra o outro', coop: 'Juntos na mesma dupla' };

export class SelectScreen {
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.className = 'select';
    parent.appendChild(this.el);
    this.active = false;
    this.el.addEventListener('click', e => {
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
  open({ mode, ports, styles, onDone, onCancel, sfx }) {
    Object.assign(this, { mode, ports, styles, onDone, onCancel, sfx });
    this.active = true;
    this.phase = 'pick'; // pick → cpu → ready → vs
    this.t = 0;
    this.teams = [[null, null], [null, null]];
    const c = (n, team, slots, idx) => ({ n, team, slots, idx, done: false, shake: 0 });
    this.cursors = mode === 'versus' ? [c(1, 0, [0, 1], 0), c(2, 1, [0, 1], 1)]
      : mode === 'coop' ? [c(1, 0, [0], 0), c(2, 0, [1], 1)]
        : [c(1, 0, [0, 1], 0)];
    this.cpuTeam = mode === 'versus' ? null : 1;
    this.cpu = null;
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
      </div>`;
    this.el.innerHTML = `
      <div class="sel-screen">
        <h2 class="sel-title">ESCOLHA SUA DUPLA</h2>
        <p class="sel-sub">${MODE_NAME[this.mode]}</p>
        <div class="sel-main">
          <div class="side left">${card(0, 0)}${card(0, 1)}</div>
          <div class="grid-wrap">
            <div class="grid">${ROSTER.map((id, i) => slot(id, i)).join('')}</div>
            <div class="grid boss-row">${BOSSES.map((id, i) => slot(id, ROSTER.length + i)).join('')}</div>
          </div>
          <div class="side right">${card(1, 0)}${card(1, 1)}</div>
        </div>
        <p class="sel-hint"></p>
      </div>
      <div class="vs-screen">
        <div class="vs-team left"></div>
        <div class="vs-mid"><b>VS</b><span>COPACABANA</span></div>
        <div class="vs-team right"></div>
      </div>`;
    this.slotEls = [...this.el.querySelectorAll('[data-slot]')];
    this.cards = [0, 1].map(t => [0, 1].map(k => {
      const el = this.el.querySelector(`.card[data-team="${t}"][data-k="${k}"]`);
      return { el, ctx: el.querySelector('canvas').getContext('2d'), shown: undefined };
    }));
    const ico = (a, n) => padIcon(a, this.styles[n], 18);
    const who = this.cursors.map(c => `<span class="ptag" style="--pc:${PLAYER_COLORS[c.n]}">J${c.n}</span> ${ico('C', c.n)} escolhe · ${ico('B', c.n)} desfaz`).join(' &nbsp; ');
    this.el.querySelector('.sel-hint').innerHTML = who;
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
    const k = this.nextSlot(c);
    const mate = this.teams[c.team][1 - k];
    return mate !== id; // o mesmo atleta não pode estar duas vezes na mesma dupla
  }

  pick(c) {
    if (c.done || this.phase !== 'pick') return;
    const id = SLOTS[c.idx];
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
    if (this.cpuTeam === null) { this.phase = 'ready'; this.t = 0; return; }
    // a CPU "passeia" pela grade e escolhe dois atletas diferentes dos seus adversários
    const free = ROSTER.map((id, i) => ({ id, i })).filter(s => s.id);
    const taken = new Set(this.teams[0]);
    let pool = free.filter(s => !taken.has(s.id));
    if (pool.length < 2) pool = free;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    this.cpu = { idx: shuffled[0].i, targets: [shuffled[0], shuffled[1]], hop: 0, stepT: 0, picked: 0 };
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
    cp.hop = cp.picked === 1 ? 4 : 0;
    cp.stepT = 0.35;
    if (cp.picked === 2) { this.phase = 'ready'; this.t = 0; }
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
    } else if (this.phase === 'cpu') {
      this.updateCpu(dt);
    } else if (this.phase === 'ready' && this.t > 0.5) {
      this.showVs();
    } else if (this.phase === 'vs' && this.t > VS_TIME) {
      const teams = this.teams.map(t => [...t]);
      this.close();
      this.onDone(teams);
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
    if (c && this.phase === 'pick') return { id: SLOTS[c.idx], hover: c.n };
    if (this.phase === 'cpu' && team === this.cpuTeam && this.cpu && this.cpu.picked === k) return { id: SLOTS[this.cpu.idx], hover: 'cpu' };
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
      const id = SLOTS[i];
      el.classList.toggle('chosen', !!id && (this.teams[0].includes(id) || this.teams[1].includes(id)));
    });
    // cartas de cada lado
    for (const team of [0, 1]) {
      for (const k of [0, 1]) {
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
        // atleta animado (parado, respirando; comemora ao ser escolhido)
        const ctx = card.ctx;
        if (st.id) {
          drawChibi(ctx, CHARACTERS[st.id], poseFor(dummy({ idx: k, team }), time + k), time + k);
        } else {
          ctx.clearRect(0, 0, 256, 256);
        }
      }
    }
  }

  whoFor(team, k) {
    if (team === this.cpuTeam) return { label: 'CPU', color: '#5b556e' };
    const c = this.cursors.find(c => c.team === team && c.slots.includes(k));
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
