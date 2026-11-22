import { SPECIAL, POINTS_TO_WIN, TRAINING } from './config.js';
import { settings, saveSettings, DEVICES, EXH_POINTS, aimModeOf } from './ui/settings.js';
import { itemIcon } from './items.js';
import { formations, SLOTS as SP_SLOTS, SLOT_KEYS, specialsFor, storyOptions, storySlots } from './v5.js';
import { CONSUMABLES, CONSUMABLE_IDS, WEATHER, WEATHER_PRESETS, WEATHER_ROLL, COND, FLAG_NAMES } from './condition.js';
import { SLOTS, slotLabel } from './story/save.js';
import { DIFFICULTY, HOODS, HOOD_ORDER } from './story/data.js';
import { TILT } from './tilt.js';
import { portrait as pic } from './ui/portraits.js';
import { CHARACTERS } from './art/characters.js';
import { padIcon, devicePreview } from './ui/padIcons.js';
import { portrait, faceIcon, PLAYER_COLORS } from './ui/portraits.js';
import { listCustom, MAX_CUSTOM } from './art/custom.js';
import { connectedPads, padProfile, rawPressed, saveCalibration, clearCalibration, seatedPlayers, seats, styleOf, setPadStyle } from './input.js';
import { cameras } from './engine/camera.js';
import COLAGEM from './data/colagem.js';
import { heightOf, actionsAt, ACTION_NAMES, V5 } from './v5.js';
import { LEVEL_NAMES } from './difficulty.js';

// Passos da calibração: cada um pede um botão pela POSIÇÃO no controle.
const CALIB_STEPS = [
  { std: 0, pos: 'down', text: 'botão de BAIXO', does: 'pulo / especial' },
  { std: 1, pos: 'right', text: 'botão da DIREITA', does: 'toque preciso' },
  { std: 2, pos: 'left', text: 'botão da ESQUERDA', does: 'toque forte' },
  { std: 3, pos: 'up', text: 'botão de CIMA', does: 'carrinho' },
  { std: 4, pos: 'L1', text: 'gatilho L1 / LB', does: 'especial de ataque 1 (dois toques)' },
  { std: 5, pos: 'R1', text: 'gatilho R1 / RB', does: 'especial de defesa 1 (dois toques)' },
  { std: 6, pos: 'L2', text: 'gatilho L2 / LT', does: 'ajudas visuais' },
  { std: 7, pos: 'R2', text: 'gatilho R2 / RT', does: 'formação' },
  { std: 9, pos: 'start', text: 'botão START / OPTIONS', does: 'pausa' },
];
// 5.0: o que cada botão faz vem da aba Controle do editor da Partida (os botões podem ser trocados)
for (const s of CALIB_STEPS) Object.defineProperty(s, 'does', { get: () => actionsAt(s.std).map(a => ACTION_NAMES[a]).join(' · ') || 'sem uso no jogo' });

// Desenho dos 4 botões de face com o pedido em destaque (vale para qualquer marca).
function faceDiagram(pos) {
  const dot = (cx, cy, on) => `<circle cx="${cx}" cy="${cy}" r="9" fill="${on ? '#ffd21a' : '#1d1a2b'}" stroke="#fff" stroke-opacity="0.6" stroke-width="2"/>`;
  const face = `<svg width="84" height="84" viewBox="0 0 84 84">${dot(42, 14, pos === 'up')}${dot(70, 42, pos === 'right')}${dot(14, 42, pos === 'left')}${dot(42, 70, pos === 'down')}</svg>`;
  const pill = (label, on) => `<span class="pad-pill ${on ? 'hot' : ''}">${label}</span>`;
  if (['up', 'right', 'left', 'down'].includes(pos)) return face;
  return `<div class="calib-pills">${pill('L1', pos === 'L1')}${pill('R1', pos === 'R1')}${pill('L2', pos === 'L2')}${pill('R2', pos === 'R2')}${pill('START', pos === 'start')}</div>`;
}

export { PLAYER_COLORS };

const tag = n => `<span class="ptag" style="--pc:${PLAYER_COLORS[n]}">J${n}</span>`;

// Legenda dos golpes possíveis em cada toque ([ação, nome]; 'CA' = no ar + A).
const LEGEND = {
  1: [['A', 'Peito'], ['B', 'Pé'], ['CA', 'Cabeça'], ['CB', 'Shark (bloqueio)'], ['D', 'Carrinho']],
  2: [['A', 'Ombro'], ['B', 'Na fita'], ['CA', 'Ataque de segunda'], ['CB', 'Levantada de cabeça'], ['D', 'Carrinho']],
  3: [['A', 'Chute colocado'], ['B', 'Pingo'], ['CA', 'Cabeçada'], ['CB', 'Shark Attack'], ['D', 'Carrinho']],
};

export class Hud {
  constructor() {
    this.el = document.getElementById('hud');
    addEventListener('resize', () => { if (this.stack) this.fitOverlay(); }); // 5.0: o menu sempre cabe na janela
    const team = i => `<div class="team t${i}"><div class="name"></div><div class="meters"></div><div class="touches"></div><div class="mvname"></div></div>`;
    this.el.innerHTML = `
      <div class="board">
        ${team(0)}
        <div class="score"><span class="s0">0</span><em>×</em><span class="s1">0</span><small class="setinfo"></small></div>
        ${team(1)}
      </div>
      <div class="wx"></div>
      <div class="topstatus"></div><div class="buffs b0"></div><div class="buffs b1"></div>
      <div class="ticker"></div>
      <div class="callout"></div>
      <div class="formation f0"></div>
      <div class="formation f1"></div>
      <div class="legend"></div>
      <div class="slow"></div>
      <div class="overlay"></div>`;
    this.q = s => this.el.querySelector(s);
    this.overlay = this.q('.overlay');
    this.callout = this.q('.callout');
    this.ticker = this.q('.ticker');
    this.calloutT = 0;
    this.tickerT = 0;
    this.styles = { 1: 'ps', 2: 'ps', 3: 'ps', 4: 'ps' }; // estilo de ícones de cada jogador (definido pelo main)
    this.actions = {};                  // select / resume / quit / again / devicesChanged
    this.stack = null;                  // pilha de telas do menu
    this.idx = 0;
    this.lastButton = null;             // teste do controle (configurações)
    this.overlay.addEventListener('click', e => {
      if (this.twOwner && this.twOwner()) return; // 5.0: pausa técnica — só o controle do jogador do atleta
      const ch = e.target.closest('[data-step]');
      if (ch) { this.idx = +ch.dataset.idx; this.change(+ch.dataset.step); return; }
      const opt = e.target.closest('[data-pick]');
      if (opt) { this.idx = +opt.dataset.idx; this.pick(opt.dataset.pick); return; }
      const b = e.target.closest('[data-idx]');
      if (b) { this.idx = +b.dataset.idx; this.confirm(); return; }
      const d = e.target.closest('[data-id]');
      if (d) this.activate(d.dataset.id);
    });
    this.overlay.addEventListener('mousemove', e => {
      if (this.twOwner && this.twOwner()) return;
      const b = e.target.closest('[data-idx]');
      if (b && this.stack && +b.dataset.idx !== this.idx) { this.idx = +b.dataset.idx; this.render(); }
    });
  }

  ico(action, n = 1, size) { return padIcon(action, this.styles[n], size); }
  setStyles(styles) { this.styles = { ...styles }; this.refreshSlow(); this.lastFormation = null; this.lastLegend = null; }
  refreshSlow() {
    const f = this.slowF || 1;
    this.q('.slow').innerHTML = `CÂMERA LENTA ${Math.round(f * 100)}% · ${this.ico('L')} ${f === 0.5 ? 'desliga' : 'mais lenta'}`;
  }

  // ================= menus =================
  open(screen) { this.stack = [screen]; this.idx = 0; this.render(); }
  push(screen, idx = 0) { this.stack.push(screen); this.idx = idx; this.render(); }
  get screen() { return this.stack ? this.stack[this.stack.length - 1] : null; }
  close() { this.stack = null; this.hideOverlay(); }

  back() {
    if (!this.stack) return;
    // pausa técnica: Voltar volta para o atleta anterior antes de sair da tela
    if (this.screen === 'timeout-pick' && this.tw) { if (this.tw.i > 0) { this.tw.i--; this.idx = 0; this.render(); } return; }
    if (this.stack.length > 1) {
      const from = this.stack.pop();
      this.idx = Math.max(0, this.items().findIndex(it => it.target === from));
      this.render();
    } else if (this.screen === 'pause' || this.screen === 'swapbag') {
      this.activate('resume');
    }
  }

  // 5.0: ↑↓ andam pela posição na tela, não pela ordem da lista (em grade, ↓ ia para o vizinho do lado).
  // Vai para o item de fato acima/abaixo na mesma coluna; no fim da coluna, ↓ vai para o topo da coluna
  // seguinte e ↑ no topo volta para o fim da anterior. Depois da última coluna vem a barra Voltar/Avançar,
  // e da barra ↓ dá a volta para o topo. Sem nada desenhado (ex.: calibrar), segue a ordem da lista.
  move(d) {
    if (!this.stack) return;
    const n = this.items().length;
    const linear = () => { this.idx = (this.idx + d + n) % n; this.render(); };
    const box = e => { const b = e.getBoundingClientRect(); return { e, i: +e.dataset.idx, l: b.left, r: b.right, t: b.top, b: b.bottom, cx: (b.left + b.right) / 2, cy: (b.top + b.bottom) / 2, h: b.height }; };
    const all = [...this.overlay.querySelectorAll('[data-idx].menu-btn, [data-idx].menu-row')].filter(e => e.getClientRects().length).map(box);
    const c = all.find(o => o.i === this.idx);
    if (!c || all.length < 2) return linear();
    const inNav = o => !!o.e.closest('.menu-nav');
    const list = all.filter(o => !inNav(o) && o !== c), nav = all.filter(o => inNav(o) && o !== c);
    // mesma coluna: se cruzam na horizontal por mais de 1/4 da largura (o item em foco fica um pouco maior)
    const over = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > Math.min(a.r - a.l, b.r - b.l) * 0.25;
    const below = o => o.cy > c.cy + Math.min(o.h, c.h) * 0.5, above = o => o.cy < c.cy - Math.min(o.h, c.h) * 0.5;
    // a linha mais próxima; nela, o item mais perto na horizontal (saindo de uma linha larga, o da esquerda)
    const near = arr => {
      if (!arr.length) return null;
      const dy = Math.min(...arr.map(o => Math.abs(o.cy - c.cy))), row = arr.filter(o => Math.abs(o.cy - c.cy) - dy < 8);
      if (row.length > 1 && row.every(o => o.r - o.l < (c.r - c.l) * 0.75)) return row.reduce((a, o) => (o.l < a.l ? o : a));
      return row.reduce((a, o) => (Math.abs(o.cx - c.cx) < Math.abs(a.cx - c.cx) ? o : a));
    };
    const score = arr => arr.reduce((a, o) => (!a || Math.abs(o.cy - c.cy) + 2 * Math.abs(o.cx - c.cx) < Math.abs(a.cy - c.cy) + 2 * Math.abs(a.cx - c.cx) ? o : a), null);
    const closest = arr => arr.reduce((a, o) => (Math.abs(o.cx - c.cx) < Math.abs(a.cx - c.cx) ? o : a));
    const topOf = arr => arr.reduce((a, o) => (!a || o.t < a.t - 2 || (Math.abs(o.t - a.t) <= 2 && o.l < a.l) ? o : a), null);
    const bottomOf = arr => arr.reduce((a, o) => (!a || o.b > a.b + 2 || (Math.abs(o.b - a.b) <= 2 && o.r > a.r) ? o : a), null);
    // coluna vizinha da lista: à direita (d > 0) ou à esquerda (d < 0) do item atual
    const nextCol = side => {
      const cand = list.filter(o => !over(o, c) && (side > 0 ? o.cx > c.cx : o.cx < c.cx));
      if (!cand.length) return [];
      const lead = cand.reduce((a, o) => (side > 0 ? (o.cx < a.cx ? o : a) : (o.cx > a.cx ? o : a)));
      return cand.filter(o => over(o, lead));
    };
    let to = null;
    if (!inNav(c)) {
      const same = list.filter(o => over(o, c) && (d > 0 ? below(o) : above(o)));
      if (same.length) to = near(same);
      else if (d > 0) {
        const col = nextCol(1);
        to = col.length ? topOf(col) : nav.length ? closest(nav) : topOf(list);
      } else {
        const col = nextCol(-1);
        to = col.length ? bottomOf(col) : (nav.length ? closest(nav) : bottomOf(list));
      }
    } else if (d > 0) to = topOf(list.length ? list : nav); // da barra, ↓ dá a volta para o topo
    else { const up = list.filter(above); to = near(up.filter(o => over(o, c))) || score(up) || bottomOf(list.length ? list : nav); }
    if (!to) return linear();
    this.idx = to.i;
    this.render();
  }

  confirm() {
    const it = this.items()[this.idx];
    if (!it) return;
    if (it.type === 'choice') this.change(1);
    else this.activate(it.id);
  }

  // 5.0: segurar A por 1 s — passa por todos os Avançar com as escolhas atuais e aperta o Pronto!
  rush() {
    for (let n = 0; n < 8 && this.stack; n++) {
      const items = this.items(), i = items.findIndex(it => it.nav === 'next');
      if (i < 0) return;
      const last = /Pronto/.test(items[i].html);
      this.idx = i; this.confirm();
      if (last) return;
    }
  }
  // 5.0: botão A do controle — vai direto no Avançar / Pronto! da tela; sem ele, confirma o item escolhido
  primary() {
    if (!this.stack) return;
    const i = this.items().findIndex(it => it.nav === 'next');
    if (i >= 0) this.idx = i;
    this.confirm();
  }

  change(step) {
    const it = this.items()[this.idx];
    if (!it || it.type !== 'choice') return;
    it.change(step);
    if (!String(this.screen).startsWith('toss')) this.note = { idx: this.idx, t: performance.now() }; // ("✔ salvo" só nas opções que ficam gravadas)
    this.render();
  }

  pick(value) {
    const it = this.items()[this.idx];
    if (it && it.pick) { it.pick(value); this.render(); }
  }

  activate(id) {
    if (this.extActivate && this.extActivate(id)) return; // 5.0: Campeonato, cara ou coroa, intervalo de set
    if (id.startsWith('edit:')) { this.close(); this.actions.create(id.slice(5) || null); return; }
    // Exibição: liga/desliga um consumível das pausas
    if (id.startsWith('item:')) {
      const k = id.slice(5), on = settings.exhItems.includes(k);
      settings.exhItems = on ? settings.exhItems.filter(x => x !== k) : CONSUMABLE_IDS.filter(x => x === k || settings.exhItems.includes(x));
      saveSettings(); this.render(); return;
    }
    // pausa técnica: time → consumível → atleta
    // 5.0: pausa técnica em passos — cada atleta do time escolhe 1 consumível (ou nada); no fim, a CPU também
    // consome (com 30% de chance de não pegar nada)
    if (id.startsWith('timeout:')) {
      const ti = +id.slice(8), m = this.match;
      const own = m.teamPlayers(ti).filter(pl => !pl.ai);
      this.tw = { team: ti, list: own.length ? own : m.teamPlayers(ti), i: 0, picks: {} };
      this.push('timeout-pick'); return;
    }
    if (id.startsWith('tpick:')) {
      const tw = this.tw, k = id.slice(6);
      tw.picks[tw.i] = k === 'none' ? null : k;
      this.idx = this.items().findIndex(it => it.id === 'tw-next'); this.render(); return;
    }
    if (id.startsWith('use:')) {
      this.toItem = id.slice(4);
      const tp = this.match.teamPlayers(this.toTeam);
      if (tp.length === 1) this.useItem(tp[0]); else this.push('timeout-who');
      return;
    }
    // Modo História: a Giulia come/bebe da mochila na troca de lado
    if (id.startsWith('eat:')) { this.swapBag.eat(id.slice(4)); this.render(); return; }
    if (id.startsWith('load:')) { this.close(); this.actions.storyLoad(+id.slice(5)); return; }
    if (id.startsWith('who:')) { this.useItem(this.match.teamPlayers(this.toTeam)[+id.slice(4)]); return; }
    if (id.startsWith('cast:')) { this.toast(`${CHARACTERS[id.slice(5)].name} já está na grade de seleção da Exibição`); return; }
    if (id.startsWith('idea:')) { this.toast('Sugestão: para virar atleta, é só pedir (e ajustar o texto em src/data/colagem.js)'); return; }
    switch (id) {
      case 'tw-next': {
        const tw = this.tw;
        if (!(tw.i in tw.picks)) tw.picks[tw.i] = null;
        if (tw.i < tw.list.length - 1) { tw.i++; this.idx = 0; this.render(); break; }
        const m = this.match;
        this.twResults = [...(this.twResults || []), ...m.consumePicks(tw.list.map((pl, i) => ({ pl, id: tw.picks[i] })))];
        if (this.twQueue && this.twQueue.length) { this.tw = this.makeTw(this.twQueue.shift()); this.idx = 0; this.render(); break; }
        const res = [...this.twResults, ...(this.twCpu ? this.twCpu.flatMap(t => m.cpuConsume(t)) : m.cpuConsume())];
        this.tw = null; this.twResults = []; this.close(); this.actions.resume();
        this.toast((this.twCpu ? 'TEMPO TÉCNICO · ' : 'PAUSA TÉCNICA · ') + (res.length ? res.join(' · ') : 'ninguém consumiu nada'), 4);
        break;
      }
      case 'set-controls': case 'set-visual': case 'set-help': case 'set-ctrlmode': case 'set-padstyle': case 'set-aim': case 'controls': case 'tips': case 'visual-cast': case 'setup-match':
        this.push(id); break;
      case 'setup-items': this.push('items'); break;
      case 'visual': this.push('visual'); break;
      case 'visual-ideias': this.push('visual-ideias'); break;
      case 'visual-exh':
        settings.art = 'colagem'; saveSettings();
        if (this.actions.styleChanged) this.actions.styleChanged();
        this.push('exh');
        break;
      case 'creators': this.push('creators'); break;
      case 'play': case 'athletes': case 'exh-more': this.push(id); break;
      case 'story': this.push('story'); break;
      case 'story-new': {
        const free = SLOTS.find(n => slotLabel(n).empty);
        this.storyCfg = { players: 1, difficulty: 'medio', slot: free || 1 };
        this.push('story-new');
        break;
      }
      case 'story-load': this.push('story-load'); break;
      case 'story-go':
        // 5.0: 2 jogadores com só 1 reconhecido: abre a tela Jogadores para reconhecer o J2 (volta para esta tela)
        if (this.storyCfg.players === 2 && seatedPlayers().length < 2) { this.toast('Falta o 2º jogador: reconheça o controle dele'); this.actions.players(); break; }
        this.close(); this.actions.storyNew(this.storyCfg); break;
      case 'vs-go': { const go = this.storyVs.go; this.close(); go(); break; }
      case 'exh': this.variant = 'exh'; this.kids = false; this.push('exh'); break;
      case 'tutorial': this.close(); this.actions.tutorial(); break;
      case 'skip-step': this.close(); this.actions.skipStep(); break;
      case 'items': this.push('items'); break;
      case 'items-all': settings.exhItems = [...CONSUMABLE_IDS]; saveSettings(); this.render(); break;
      case 'items-none': settings.exhItems = []; saveSettings(); this.render(); break;
      case 'exh-solo': case 'exh-versus': case 'exh-coop': case 'exh-multi':
        this.variant = 'exh'; this.kids = false;
        this.setupMode = id.slice(4);
        if ((this.setupMode === 'coop' || this.setupMode === 'multi') && settings.teamSize < 2) { settings.teamSize = 2; saveSettings(); }
        this.push('setup');
        break;
      // modo escolhido: antes da seleção, a tela de formato (1x1/2x2/3x3) e controle
      case 'solo': case 'versus': case 'coop':
      case 'kids-solo': case 'kids-versus': case 'kids-coop':
      case 'tilt-solo': case 'tilt-versus': case 'tilt-coop':
        // Kids Mode / Modo Tilt: os mesmos modos de partida, com outras regras (src/kids.js, src/tilt.js)
        this.variant = id.startsWith('kids-') ? 'kids' : id.startsWith('tilt-') ? 'tilt' : null;
        this.kids = this.variant === 'kids';
        this.setupMode = id.replace(/^(kids|tilt)-/, '');
        if (this.setupMode === 'coop' && settings.teamSize < 2) { settings.teamSize = 2; saveSettings(); }
        this.push('setup');
        break;
      case 'go':
        // 5.0 Exibição: o modo vem dos jogadores reconhecidos (1 = solo; 2 ou mais = cada um escolhe o lado)
        if (this.variant === 'exh') this.setupMode = seatedPlayers().length >= 2 ? 'multi' : 'solo';
        this.close(); this.actions.select(this.setupMode, this.variant); break;
      case 'two': this.push('two'); break;
      case 'kids': this.push('kids'); break;
      case 'tilt': this.push('tilt'); break;
      case 'settings': this.push('settings'); break;
      case 'players': this.actions.players(); break; // (a tela Jogadores guarda o menu e volta para ele)
      case 'calibrate': this.startCalibration(); break;
      case 'calib-cancel': this.calib = null; this.back(); break;
      case 'calib-reset':
        if (this.calib && this.calib.padId) clearCalibration(this.calib.padId);
        else connectedPads().forEach(gp => clearCalibration(gp.id));
        this.calib = null; this.back();
        this.toast('Controle voltou ao mapa automático');
        break;
      case 'back': this.back(); break;
      case 'resume': this.close(); this.actions.resume(); break;
      case 'quit': this.actions.quit(); break;
      case 'again': this.close(); this.actions.again(); break;
    }
  }

  // Itens de cada tela.
  items() {
    const s = this.screen;
    if (this.extItems) { const x = this.extItems(s); if (x) return x; }
    // 5.0 (menus enxutos): 4 itens; os modos ficam em Jogar e os atletas em Atletas
    if (s === 'title') return [
      { id: 'play', html: 'Jogar<small>Exibição · Campeonato · História</small>', target: 'play' },
      { id: 'athletes', html: 'Atletas<small>criar jogador · atletas da Colagem</small>', target: 'athletes' },
      { id: 'tutorial', html: 'Tutorial', tip: 'Aprenda os comandos' },
      { id: 'settings', html: 'Configurações', tip: 'Controles, câmera, estilo artístico e ajudas', target: 'settings' },
    ];
    if (s === 'play') return [
      { id: 'exh', html: 'Modo Exibição<small>uma partida rápida</small>', target: 'exh' },
      { id: 'camp', html: 'Modo Campeonato<small>regras oficiais e premiação</small>', target: 'camp' },
      { id: 'story', html: 'Modo História<small>a saga de Giulia para se tornar Rainha da Areia</small>', target: 'story' },
      { id: 'back', html: 'Voltar' },
    ];
    if (s === 'athletes') return [
      { id: 'creators', html: 'Criar Jogador<small>crie seu próprio atleta</small>', target: 'creators' },
      { id: 'visual-cast', html: `Atletas da Colagem<small>${(COLAGEM.atletas || []).length} atletas e a personalidade de cada um</small>`, target: 'visual-cast' },
      { id: 'visual-ideias', html: `Mais atletas sugeridos<small>${(COLAGEM.sugestoes || []).length} ideias com a mesma identidade</small>`, target: 'visual-ideias' },
      { id: 'back', html: 'Voltar' },
    ];
    // 5.0 Visual Colagem: liga o estilo, mostra os atletas novos e as sugestões (src/data/colagem.js)
    if (s === 'visual') {
      const styleChanged = () => { if (this.actions.styleChanged) this.actions.styleChanged(); };
      const opts = [['colagem', 'Colagem'], ['pincel', 'Pincel'], ['cartoon', 'Cartoon']];
      return [
        {
          type: 'choice', id: 'art', label: 'Estilo artístico<small>o fundo do menu já mostra o estilo escolhido</small>',
          options: opts.map(([value, html]) => ({ value, html })), value: settings.art,
          change: step => { const vs = opts.map(o => o[0]); settings.art = vs[(vs.indexOf(settings.art) + step + vs.length) % vs.length]; saveSettings(); styleChanged(); },
          pick: v => { settings.art = v; saveSettings(); styleChanged(); },
        },
        { id: 'visual-exh', html: 'Jogar Exibição na Colagem<small>liga o visual e abre o Modo Exibição</small>' },
        { id: 'visual-cast', html: `Atletas da Colagem<small>${(COLAGEM.atletas || []).length} atletas e a personalidade de cada um</small>`, target: 'visual-cast' },
        { id: 'visual-ideias', html: `Mais atletas sugeridos<small>${(COLAGEM.sugestoes || []).length} ideias com a mesma identidade</small>`, target: 'visual-ideias' },
        { id: 'back', html: 'Voltar' },
      ];
    }
    if (s === 'visual-cast') return [
      ...(COLAGEM.atletas || []).filter(id => CHARACTERS[id]).map(id => {
        const ch = CHARACTERS[id];
        return { id: 'cast:' + id, html: `<span class="cr-li vis-cast"><img src="${portrait(id)}" alt=""><span><b>${ch.name}</b> · ${heightOf(ch).toFixed(2).replace('.', ',')} m<small>${ch.bio || ''}</small></span></span>` };
      }),
      { id: 'back', html: 'Voltar' },
    ];
    if (s === 'visual-ideias') return [
      ...(COLAGEM.sugestoes || []).map((g, i) => ({ id: 'idea:' + i, cls: 'vis-idea', html: `<b>${g.nome}</b><small><i>ref.: ${g.ref}</i><br>${g.personalidade}<br><em>${g.visual}</em></small>` })),
      { id: 'back', html: 'Voltar' },
    ];
    if (s === 'story') {
      const any = SLOTS.some(n => !slotLabel(n).empty);
      return [
        { id: 'story-new', html: 'Novo jogo<small>começa na Urca, com Giulia e Zefa</small>' },
        { id: 'story-load', html: `Continuar<small>${any ? 'jogos salvos' : 'nenhum jogo salvo ainda'}</small>`, cls: any ? '' : 'off', target: 'story-load' },
        { id: 'back', html: 'Voltar' },
      ];
    }
    if (s === 'story-new') {
      const c = this.storyCfg;
      const row = (key, label, options) => ({
        type: 'choice', id: key, label, options: options.map(([value, html]) => ({ value, html })), value: c[key],
        change: step => { const vs = options.map(o => o[0]); c[key] = vs[(vs.indexOf(c[key]) + step + vs.length) % vs.length]; },
        pick: v => { c[key] = typeof options[0][0] === 'number' ? Number(v) : v; },
      });
      const lab = slotLabel(c.slot);
      return [
        row('players', `Jogadores<small>${c.players === 2 ? 'o jogador 1 é a Giulia e o jogador 2 controla a Zefa' : 'você joga com a Giulia; a Zefa fica com a CPU'}</small>`, [[1, '1 jogador'], [2, '2 jogadores']]),
        row('difficulty', `Dificuldade<small>${DIFFICULTY[c.difficulty].info}</small>`, Object.entries(DIFFICULTY).map(([k, d]) => [k, d.name])),
        row('slot', `Vaga do jogo salvo<small>${lab.empty ? 'vazia' : 'já tem um jogo: ' + lab.text + ' — será apagado'}</small>`, SLOTS.map(n => [n, 'Vaga ' + n])),
        { id: 'story-go', html: 'Pronto!', nav: 'next' },
        { id: 'back', html: 'Voltar' },
      ];
    }
    if (s === 'storyvs') return [...this.specialRows(this.storyVs.specials, null), { id: 'vs-go', html: 'Pronto!', nav: 'next' }];
    if (s === 'swapbag') return [
      ...this.specialRows(this.swapBag.specials, this.swapBag.players),
      ...this.swapBag.list.map(it => ({ id: 'eat:' + it.id, html: `${it.name} ×${it.count}<small>${it.info}</small>` })),
      { id: 'resume', html: 'Pronto!', nav: 'next' },
    ];
    if (s === 'story-load') return [
      ...SLOTS.filter(n => !slotLabel(n).empty).map(n => ({ id: 'load:' + n, html: `Vaga ${n}<small>${slotLabel(n).text}</small>` })),
      { id: 'back', html: 'Voltar' },
    ];
    // 5.0 (menus enxutos): Exibição numa tela só. O modo vem dos jogadores reconhecidos (1 = solo; 2 ou mais =
    // cada um escolhe o lado na seleção); o resto fica em Mais opções
    if (s === 'exh' || s === 'exh-more') {
      const pick = (key, label, options, after) => ({
        type: 'choice', id: key, label,
        options: options.map(([value, html]) => ({ value, html })),
        value: settings[key],
        change: step => { const vs = options.map(o => o[0]); const i = vs.indexOf(settings[key]); settings[key] = vs[(i + step + vs.length) % vs.length]; saveSettings(); if (after) after(); },
        pick: v => { settings[key] = typeof options[0][0] === 'number' ? Number(v) : typeof options[0][0] === 'boolean' ? v === 'true' : v; saveSettings(); if (after) after(); },
      });
      const ps = seatedPlayers().length ? seatedPlayers() : [1], many = ps.length >= 3;
      if (many && settings.teamSize < 2) { settings.teamSize = 2; saveSettings(); }
      if (s === 'exh') return [
        { id: 'players', html: `Jogadores<small>${ps.map(n => 'J' + n).join(' · ')}${ps.length > 1 ? ' · cada um escolhe o lado' : ' contra a CPU'} · reconhecer mais jogadores</small>` },
        pick('exhPoints', 'Pontos da partida<small>vence quem chegar lá com 2 de vantagem</small>', EXH_POINTS.map(p => [p, String(p)])),
        pick('exhArena', `Arena<small>${HOODS[settings.exhArena] ? HOODS[settings.exhArena].ct + ' · ' + HOODS[settings.exhArena].name : ''}</small>`, ['copacabana', ...HOOD_ORDER.filter(h => h !== 'copacabana')].map(h => [h, HOODS[h].name])),
        ...(settings.cpuPerAthlete ? [] : [pick('cpuLevel', `Nível da CPU<small>${LEVEL_NAMES[settings.cpuLevel - 1]} · vale para todas as CPUs</small>`, LEVEL_NAMES.map((_, i) => [i + 1, String(i + 1)]))]),
        { id: 'exh-more', html: 'Mais opções<small>clima, formato, controle, nível de cada CPU, sorteio e consumíveis</small>', target: 'exh-more' },
        { id: 'back', html: 'Voltar' },
        { id: 'go', html: 'Pronto!', nav: 'next' },
      ];
      const size = settings.teamSize;
      return [
        pick('exhWeather', `Condições climáticas<small>${(WEATHER[settings.exhWeather.split('-')[0]] ? settings.exhWeather.split('-').map(k => WEATHER[k] && WEATHER[k].info).filter(Boolean).join(' · ') : settings.exhWeather === 'aleatorio' ? `sorteado: ${WEATHER_ROLL.diaNormal}% de dia normal, até 2 climas` : 'sem efeito de clima')}</small>`, WEATHER_PRESETS.map(([k, name]) => [k, name])),
        pick('teamSize', 'Formato<small>atletas por time</small>', (many ? [2, 3] : [1, 2, 3]).map(n => [n, innerHeight < 520 ? n + ' × ' + n : n + ' contra ' + n])),
        ...(ps.length === 1 && size > 1 ? [pick('control1', `Controle<small>${size === 2 ? 'a dupla inteira (troca de atleta sozinho) ou só o 1º atleta escolhido' : 'o time inteiro (troca de atleta sozinho) ou só o 1º atleta escolhido'}</small>`, [['team', size === 2 ? 'A dupla toda' : 'O time todo'], ['own', 'Só o meu atleta']])] : []),
        pick('cpuPerAthlete', `Nível de cada CPU<small>${settings.cpuPerAthlete ? 'ajustado atleta por atleta na seleção' : 'o mesmo para todas (tela anterior)'}</small>`, [[false, 'Igual para todos'], [true, 'Um por atleta']]),
        pick('exhToss', `Sorteio<small>${settings.exhToss === 'completo' ? 'cara ou coroa: quem ganha escolhe o saque ou o lado' : 'automático: sem a tela de cara ou coroa'}</small>`, [['auto', 'Automático'], ['completo', 'Cara ou coroa']]),
        { id: 'items', html: `Consumíveis<small>${settings.exhItems.filter(k => CONSUMABLE_IDS.includes(k)).length} de ${CONSUMABLE_IDS.length} liberados nas pausas técnicas</small>`, target: 'items' },
        { id: 'back', html: 'Voltar' },
      ];
    }
    if (s === 'items') return [
      ...CONSUMABLE_IDS.map(k => ({ id: 'item:' + k, cls: settings.exhItems.includes(k) ? 'on' : 'off', html: `${settings.exhItems.includes(k) ? '✔' : '✕'} ${itemIcon(k)}${CONSUMABLES[k].name}<small>${CONSUMABLES[k].info}</small>` })),
      { id: 'items-all', html: 'Liberar todos' },
      { id: 'items-none', html: 'Nenhum<small>partida sem pausas</small>' },
      { id: 'back', html: 'Voltar' },
    ];
    if (s === 'timeout-pick') {
      const tw = this.tw, m = this.match, cur = tw.picks[tw.i];
      return [
        ...m.consumables.map(k => ({ id: 'tpick:' + k, cls: cur === k ? 'on' : '', html: `${cur === k ? '✔ ' : ''}${itemIcon(k)}${CONSUMABLES[k].name}<small>${CONSUMABLES[k].info}</small>` })),
        { id: 'tpick:none', cls: cur === null ? 'on' : '', html: `${cur === null ? '✔ ' : ''}Nada<small>guarda para a próxima pausa</small>` },
        ...(tw.i > 0 ? [{ id: 'back', html: 'Voltar' }] : []),
        { id: 'tw-next', html: tw.i < tw.list.length - 1 ? 'Avançar' : 'Pronto!', nav: 'next' },
      ];
    }
    if (s === 'timeout') {
      const m = this.match;
      return [...m.consumables.map(k => ({ id: 'use:' + k, html: `${itemIcon(k)}${CONSUMABLES[k].name}<small>${CONSUMABLES[k].info}</small>` })), { id: 'back', html: 'Voltar' }];
    }
    if (s === 'timeout-who') {
      const m = this.match;
      return [...m.teamPlayers(this.toTeam).map((p, i) => ({ id: 'who:' + i, html: `${p.char.name}<small>${this.condText(p)}</small>` })), { id: 'back', html: 'Voltar' }];
    }
    if (s === 'creators') {
      const list = listCustom();
      return [
        ...list.map(r => ({ id: 'edit:' + r.id, html: `<span class="cr-li"><img src="${portrait(r.id)}" alt="">${r.name}</span><small>editar</small>` })),
        ...(list.length < MAX_CUSTOM ? [{ id: 'edit:', html: `+ Novo jogador<small>${MAX_CUSTOM - list.length} de ${MAX_CUSTOM} vaga(s) livre(s)</small>` }] : []),
        { id: 'back', html: 'Voltar' },
      ];
    }
    if (s === 'setup') {
      const mode = this.setupMode;
      const pick = (key, label, options) => ({
        type: 'choice', id: key, label,
        options: options.map(([value, html]) => ({ value, html })),
        value: settings[key],
        change: step => { const vs = options.map(o => o[0]); const i = vs.indexOf(settings[key]); settings[key] = vs[(i + step + vs.length) % vs.length]; saveSettings(); },
        // o clique entrega o valor como texto: volta a ser número quando a opção é numérica
        pick: v => { settings[key] = typeof options[0][0] === 'number' ? Number(v) : v; saveSettings(); },
      });
      const sizes = mode === 'coop' || mode === 'multi'
        ? [[2, '2 contra 2'], [3, '3 contra 3']]
        : [[1, '1 contra 1'], [2, '2 contra 2'], [3, '3 contra 3']];
      const size = settings.teamSize;
      const ctl = n => pick('control' + n, `${mode === 'versus' ? tag(n) + ' ' : ''}Controle<small>${size === 2 ? 'a dupla inteira (troca de atleta sozinho) ou só o 1º atleta escolhido' : 'o time inteiro (troca de atleta sozinho) ou só o 1º atleta escolhido'}</small>`,
        [['team', size === 2 ? 'A dupla toda' : 'O time todo'], ['own', 'Só o meu atleta']]);
      const title = { solo: 'Jogar solo', versus: 'Um contra o outro', coop: 'Juntos no mesmo time', multi: 'cada jogador escolhe o lado na seleção (no máximo ' + size + ' por lado)' }[mode];
      return [
        pick('teamSize', `Formato<small>${mode === 'coop' ? `cada jogador controla o seu atleta${size === 3 ? '; o 3º fica com a CPU' : ''}` : title}</small>`, sizes),
        ...(size > 1 && mode !== 'coop' && mode !== 'multi' ? [ctl(1)] : []),
        ...(size > 1 && mode === 'versus' ? [ctl(2)] : []),
        ...(this.variant === 'exh'
          ? [{ id: 'setup-match', html: 'Avançar', nav: 'next', target: 'setup-match' }]
          : [{ id: 'go', html: 'Pronto!', nav: 'next' }]),
        { id: 'back', html: 'Voltar' },
      ];
    }
    if (s === 'setup-match') {
      const pick = (key, label, options) => ({
        type: 'choice', id: key, label,
        options: options.map(([value, html]) => ({ value, html })),
        value: settings[key],
        change: step => { const vs = options.map(o => o[0]); const i = vs.indexOf(settings[key]); settings[key] = vs[(i + step + vs.length) % vs.length]; saveSettings(); },
        pick: v => { settings[key] = typeof options[0][0] === 'number' ? Number(v) : v; saveSettings(); },
      });
      return [
          pick('exhPoints', 'Pontos da partida<small>vence quem chegar lá com 2 de vantagem</small>', EXH_POINTS.map(p => [p, String(p)])),
          pick('exhArena', `Arena<small>${HOODS[settings.exhArena] ? HOODS[settings.exhArena].ct + ' · ' + HOODS[settings.exhArena].name : ''}</small>`, ['copacabana', ...HOOD_ORDER.filter(h => h !== 'copacabana')].map(h => [h, HOODS[h].name])),
          pick('exhWeather', `Condições climáticas<small>${(WEATHER[settings.exhWeather.split('-')[0]] ? settings.exhWeather.split('-').map(k => WEATHER[k] && WEATHER[k].info).filter(Boolean).join(' · ') : settings.exhWeather === 'aleatorio' ? `sorteado: ${WEATHER_ROLL.diaNormal}% de dia normal, até 2 climas` : 'sem efeito de clima')}</small>`, WEATHER_PRESETS.map(([k, name]) => [k, name])),
        { id: 'back', html: 'Voltar' },
        { id: 'setup-items', html: 'Avançar', nav: 'next', target: 'items' },
      ];
    }
    if (s === 'kids') {
      const [a, b, c, d] = ['A', 'B', 'C', 'D'].map(k => this.ico(k));
      return [
        { id: 'kids-solo', html: `Jogar solo<small>metade da quadra: ${d} de cima · ${c} de baixo · ${a} da direita · ${b} da esquerda</small>` },
        { id: 'kids-versus', html: `Dois jogadores: um contra o outro<small>cada jogador no seu time</small>` },
        { id: 'kids-coop', html: `Dois jogadores: juntos no mesmo time<small>cada jogador controla um atleta, contra a CPU</small>` },
        { id: 'back', html: 'Voltar' },
      ];
    }
    if (s === 'tilt') {
      const [a, b] = ['A', 'B'].map(k => this.ico(k));
      return [
        { id: 'tilt-solo', html: `Jogar solo<small>${a} bola rápida e longa · ${b} bola alta e precisa · mira em 360°</small>` },
        { id: 'tilt-versus', html: `Dois jogadores: um contra o outro<small>cada jogador no seu time</small>` },
        { id: 'tilt-coop', html: `Dois jogadores: juntos no mesmo time<small>cada jogador controla um atleta, contra a CPU</small>` },
        { id: 'back', html: 'Voltar' },
      ];
    }
    if (s === 'two') return [
      { id: 'versus', html: `Um contra o outro<small>cada jogador no seu time</small>` },
      { id: 'coop', html: `Juntos no mesmo time<small>cada jogador controla um atleta, contra a CPU</small>` },
      { id: 'back', html: 'Voltar' },
    ];
    if (['settings', 'set-controls', 'set-visual', 'set-help', 'set-ctrlmode', 'set-padstyle', 'set-aim'].includes(s)) {
      const device = n => ({
        type: 'choice', id: 'dev' + n,
        label: `${tag(n)} Controle`,
        options: DEVICES.map(d => ({ value: d, html: devicePreview(d) })),
        value: settings['p' + n],
        change: step => { const i = DEVICES.indexOf(settings['p' + n]); settings['p' + n] = DEVICES[(i + step + DEVICES.length) % DEVICES.length]; settings.devChosen = true; this.devicesChanged(); },
        pick: v => { settings['p' + n] = v; settings.devChosen = true; this.devicesChanged(); },
      });
      const toggle = (key, label) => ({
        type: 'choice', id: key, label,
        options: [{ value: 'on', html: 'Ligado' }, { value: 'off', html: 'Desligado' }],
        value: settings[key] ? 'on' : 'off',
        change: () => { settings[key] = !settings[key]; saveSettings(); },
        pick: v => { settings[key] = v === 'on'; saveSettings(); },
        ...(key === 'hitbox' ? { options: [{ value: 'on', html: 'Mostrar' }, { value: 'off', html: 'Ocultar' }] } : {}),
      });
      // escolha entre valores (texto)
      const choice = (key, label, options, after) => ({
        type: 'choice', id: key, label,
        options: options.map(([value, html]) => ({ value, html })),
        value: settings[key],
        change: step => { const vs = options.map(o => o[0]); const i = vs.indexOf(settings[key]); settings[key] = vs[(i + step + vs.length) % vs.length]; saveSettings(); if (after) after(); },
        pick: v => { settings[key] = v; saveSettings(); if (after) after(); },
      });
      const styleChanged = () => { if (this.actions.styleChanged) this.actions.styleChanged(); };
      if (s === 'settings') return [
        { id: 'set-controls', html: 'Controles<small>o controle de cada jogador e a calibração</small>', target: 'set-controls' },
        { id: 'set-visual', html: 'Visual e câmera<small>estilo artístico, ângulo e movimento da câmera</small>', target: 'set-visual' },
        { id: 'set-help', html: 'Ajudas<small>ajudas visuais, legenda, hitbox, sorteio automático e diagnóstico da CPU</small>', target: 'set-help' },
        { id: 'back', html: 'Voltar' },
      ];
      if (s === 'set-controls') return [
        // 5.0: cada jogador (J1 a J4) com o seu dispositivo — tela Jogadores
        { id: 'players', html: `Jogadores e controles<small>${this.playersText ? this.playersText() : 'quem joga com qual controle'}</small>` },
        { id: 'set-padstyle', html: `Tipo de controle (botões)<small>${(seatedPlayers().length ? seatedPlayers() : [1]).map(n => 'J' + n + ': ' + (seats[n] && seats[n].kind === 'kb' ? 'teclado' : styleOf(n, settings.p1 === 'xbox' ? 'xbox' : 'ps') === 'ps' ? 'PlayStation' : 'Xbox')).join(' · ')}</small>`, target: 'set-padstyle' },
        { id: 'set-aim', html: `Mira do ataque<small>${(seatedPlayers().length ? seatedPlayers() : [1]).map(n => 'J' + n + ': ' + (this.aimOf(n) === 'direto' ? 'Direta' : 'Girando')).join(' · ')}</small>`, target: 'set-aim' },
        { id: 'set-ctrlmode', html: `Modo de controle<small>${(seatedPlayers().length ? seatedPlayers() : [1]).map(n => 'J' + n + ': ' + (settings.ctrlModes[n] === 'novo' ? 'Novo' : 'Clássico')).join(' · ')}</small>`, target: 'set-ctrlmode' },
        { id: 'calibrate', html: 'Calibrar controle<small>aperte cada botão uma vez — funciona com qualquer marca</small>' },
        { id: 'back', html: 'Voltar' },
      ];
      // 5.0: mira do ataque de cada jogador (Direta: a seta vai na hora para o analógico · Girando: a seta gira até lá)
      if (s === 'set-aim') return [
        ...(seatedPlayers().length ? seatedPlayers() : [1]).map(n => ({
          type: 'choice', id: 'aim' + n, label: `${tag(n)} Mira do ataque<small>${this.aimOf(n) === 'direto' ? 'a seta aponta na hora para o analógico; sem direção, reto para a rede' : 'a seta gira até onde o analógico aponta'}${(settings.aimModes || {})[n] ? '' : ' · padrão do modo ' + (settings.ctrlModes[n] === 'novo' ? 'Novo' : 'Clássico')}</small>`,
          options: [{ value: 'direto', html: 'Direta' }, { value: 'giro', html: 'Girando' }], value: this.aimOf(n),
          change: () => { settings.aimModes = { ...settings.aimModes, [n]: this.aimOf(n) === 'direto' ? 'giro' : 'direto' }; saveSettings(); },
          pick: v => { settings.aimModes = { ...settings.aimModes, [n]: v }; saveSettings(); },
        })),
        { id: 'back', html: 'Voltar' },
      ];
      // 5.0: tipo de botões de cada controle (Xbox / PlayStation): ícones e nomes dos botões em todo o jogo
      if (s === 'set-padstyle') return [
        ...(seatedPlayers().length ? seatedPlayers() : [1]).map(n => (seats[n] && seats[n].kind === 'pad' ? {
          type: 'choice', id: 'pst' + n, label: `${tag(n)} Botões do controle<small>ícones e nomes dos botões no jogo</small>`,
          options: [{ value: 'xbox', html: 'Xbox' }, { value: 'ps', html: 'PlayStation' }], value: styleOf(n, 'xbox'),
          change: () => { this.setPadStyleOf(n, styleOf(n, 'xbox') === 'ps' ? 'xbox' : 'ps'); },
          pick: v => { this.setPadStyleOf(n, v); },
        } : { id: 'noop', cls: 'off', html: `${tag(n)} Teclado<small>${seats[n] ? 'as teclas aparecem como no teclado' : 'sem dispositivo · entre na tela Jogadores'}</small>` })),
        { id: 'back', html: 'Voltar' },
      ];
      // 5.0: modo de controle de cada jogador reconhecido (Clássico: dois toques · Novo: LB / RB, LT troca, Select ajudas)
      if (s === 'set-ctrlmode') return [
        ...(seatedPlayers().length ? seatedPlayers() : [1]).map(n => ({
          type: 'choice', id: 'ctrl' + n, label: `${tag(n)} Modo de controle<small>${settings.ctrlModes[n] === 'novo' ? `especial no ${this.ico('L', n, 16)} / ${this.ico('R', n, 16)} · segure ${this.ico('L2', n, 16)} e aperte ${this.ico('L', n, 16)} / ${this.ico('R', n, 16)} para trocar · ${this.ico('sel', n, 16)} ajudas` : `especiais com dois toques (${this.ico('L', n, 16)}${this.ico('L', n, 16)} ${this.ico('A', n, 16)}${this.ico('A', n, 16)} ${this.ico('R', n, 16)}${this.ico('R', n, 16)} ${this.ico('B', n, 16)}${this.ico('B', n, 16)}) · ${this.ico('L2', n, 16)} ajudas`}</small>`,
          options: [{ value: 'classico', html: 'Clássico' }, { value: 'novo', html: 'Novo' }], value: settings.ctrlModes[n] || 'classico',
          change: () => { settings.ctrlModes = { ...settings.ctrlModes, [n]: settings.ctrlModes[n] === 'novo' ? 'classico' : 'novo' }; saveSettings(); },
          pick: v => { settings.ctrlModes = { ...settings.ctrlModes, [n]: v }; saveSettings(); },
        })),
        { id: 'back', html: 'Voltar' },
      ];
      if (s === 'set-visual') return [
        choice('art', 'Estilo artístico<small>arte do jogo inteiro</small>', [['pincel', 'Pincel'], ['cartoon', 'Cartoon'], ['colagem', 'Colagem']], styleChanged),
        choice('view', 'Ângulo da câmera<small>lateral (de lado) ou por trás da sua dupla, como no tênis</small>', cameras.list().map(c => [c.id, c.name])),
        choice('camera', 'Movimento da câmera', [['follow', 'Seguindo a bola'], ['fixed', 'Fixa']]),
        { id: 'back', html: 'Voltar' },
      ];
      return [
        toggle('assists', `Ajudas visuais ${this.ico('L2')}<small>arco da trajetória · alvo no chão</small>`),
        toggle('legend', 'Legenda de golpes<small>golpes possíveis no toque atual</small>'),
        toggle('hitbox', 'Hitbox dos golpes<small>área de contato do golpe ativo</small>'),
        toggle('tossAuto', 'Sorteio automático<small>sem cara ou coroa: quem saca é sorteado</small>'),
        toggle('cpuDebug', 'Diagnóstico da CPU<small>o que a CPU faz e quadros por segundo</small>'),
        { id: 'back', html: 'Voltar' },
      ];
    }
    if (s === 'pause') return [
      { id: 'resume', html: 'Continuar' },
      ...(this.match && this.match.practice ? [{ id: 'skip-step', html: 'Pular esta etapa do tutorial' }] : []),
      { id: 'controls', html: 'Comandos<small>botões e dicas</small>', target: 'controls' },
      { id: 'settings', html: 'Configurações', target: 'settings' },
      ...(this.match && this.match.camp ? (() => {
        // 5.0: um tempo técnico e um W.O. para cada dupla humana (duas duplas de jogadores: com o nome de cada uma)
        const m = this.match, dead = m.state !== 'rally', hs = m.teams.filter(t => t.human).map(t => t.id), two = hs.length > 1;
        const who = ti => (two ? ` · ${m.teamPilots(ti).map(n => 'J' + n).join(' e ')}` : '');
        return [
          ...hs.map(ti => { const left = m.tempos[ti] || 0; return { id: left && dead ? 'tempo:' + ti : 'noop', cls: left && dead ? '' : 'off', html: `Tempo técnico${who(ti)}<small>${left ? (dead ? `resta ${left} · consumíveis` : 'só com a bola parada') : 'já usado nesta partida'}</small>` }; }),
          ...hs.map(ti => ({ id: 'camp-wo:' + ti, html: `Desistir da partida${who(ti)}<small>W.O.: derrota no placar máximo</small>` })),
          { id: 'camp-home', html: 'Sair para o início<small>a partida recomeça quando voltar</small>' },
        ];
      })() : [{ id: 'quit', html: this.match && this.match.story ? 'Desistir da partida<small>conta como derrota</small>' : 'Sair para o início' }]),
    ];
    if (s === 'controls') return [{ id: 'tips', html: 'Dicas', target: 'tips' }, { id: 'back', html: 'Voltar' }];
    if (s === 'tips') return [{ id: 'back', html: 'Voltar' }];
    if (s === 'over') return [
      { id: 'again', html: 'Jogar de novo' },
      { id: 'quit', html: 'Voltar ao início' },
    ];
    return [];
  }

  // ================= calibração do controle =================
  startCalibration() {
    // o controle que apertar o primeiro botão é o calibrado
    const prev = new Map(connectedPads().map(gp => [gp.id, rawPressed(gp)]));
    this.calib = { step: 0, padId: null, map: {}, prev, doneT: 0 };
    this.push('calibrate');
  }

  calibTick(dt) {
    const c = this.calib;
    if (!c || this.screen !== 'calibrate') return;
    if (c.doneT > 0) {
      c.doneT -= dt;
      if (c.doneT <= 0) { this.calib = null; this.back(); this.toast('Controle calibrado!'); }
      return;
    }
    for (const gp of connectedPads()) {
      const now = rawPressed(gp);
      const before = c.prev.get(gp.id) || new Set();
      c.prev.set(gp.id, now);
      if (c.padId && gp.id !== c.padId) continue;
      for (const i of now) {
        if (before.has(i)) continue; // só conta o aperto novo
        if (!c.padId) c.padId = gp.id;
        const used = Object.keys(c.map).map(Number);
        if (used.includes(i)) { this.flashCalib(); continue; }
        c.map[i] = CALIB_STEPS[c.step].std;
        c.step++;
        if (c.step >= CALIB_STEPS.length) { saveCalibration(c.padId, c.map); c.doneT = 0.9; }
        this.render();
        return;
      }
    }
  }

  flashCalib() {
    const el = this.overlay.querySelector('.calib-box');
    if (el) { el.classList.remove('deny'); void el.offsetWidth; el.classList.add('deny'); }
  }

  calibHTML() {
    const c = this.calib;
    const done = c.step >= CALIB_STEPS.length;
    const st = CALIB_STEPS[Math.min(c.step, CALIB_STEPS.length - 1)];
    const name = c.padId ? c.padId.replace(/\(.*$/, '').trim() || 'controle' : 'qualquer controle';
    return `
      <h2>CALIBRAR</h2>
      <p class="sub">${name}</p>
      <div class="calib-box">
        ${done ? '<b class="calib-ok">PRONTO!</b>' : `
          ${faceDiagram(st.pos)}
          <p class="calib-ask">Aperte o <b>${st.text}</b><small>${st.does}</small></p>
          <div class="calib-steps">${CALIB_STEPS.map((_, i) => `<i class="${i < c.step ? 'on' : i === c.step ? 'cur' : ''}"></i>`).join('')}</div>`}
      </div>
      <div class="menu-list">
        <button type="button" class="menu-btn" data-id="calib-reset">Usar mapa automático</button>
        <button type="button" class="menu-btn" data-id="calib-cancel">Cancelar</button>
      </div>
      <p class="menu-hint">Esc no teclado cancela</p>`;
  }

  // Situação de cada controle conectado (rodapé das configurações).
  padsStatusHTML() {
    const pads = connectedPads();
    if (!pads.length) return 'Nenhum controle conectado';
    const label = { 'padrão': 'reconhecido', perfil: 'perfil automático', calibrado: 'calibrado', desconhecido: 'não reconhecido — calibre' };
    return pads.map(gp => `${gp.id.replace(/\(.*$/, '').trim() || 'Controle'}: <b>${label[padProfile(gp).source]}</b>`).join(' · ');
  }

  // 5.0: mira do jogador n (Direta / Girando), com o padrão do modo de controle
  aimOf(n) { return aimModeOf(n, (((V5.controle || {}).mira) || {}).modo === 'direto' ? 'direto' : 'giro'); }
  // 5.0: troca o tipo de botões de um controle (o J1 também vale para os editores: settings.p1)
  setPadStyleOf(n, style) {
    setPadStyle(n, style);
    if (n === 1) settings.p1 = style;
    this.devicesChanged();
  }
  devicesChanged() {
    saveSettings();
    if (this.actions.devicesChanged) this.actions.devicesChanged();
  }

  // Teste do controle nas configurações: mostra o último botão apertado.
  setLastButton(action) {
    this.lastButton = action;
    const el = this.overlay.querySelector('.pad-test');
    if (el) el.innerHTML = this.padTestHTML();
  }
  padTestHTML() {
    const names = { A: 'ataque (X X especial)', B: 'defesa (B B especial)', C: 'pulo', D: 'carrinho', R: 'RB RB especial de defesa 1', L: 'LB LB especial de ataque 1', L2: 'ajudas visuais', R2: 'formação', start: 'pausa' };
    if (!this.lastButton) return 'Teste: aperte um botão do controle';
    return `Teste: ${this.ico(this.lastButton, 1, 22)} → ${names[this.lastButton] || this.lastButton}`;
  }

  render() {
    const s = this.screen;
    if (s === 'calibrate') {
      this.overlay.className = 'overlay show menu';
      this.overlay.innerHTML = this.calibHTML();
      return;
    }
    const items = this.items();
    this.idx = Math.min(this.idx, items.length - 1);
    const head = (this.extHead && this.extHead(s)) || {
      title: '<h1><span>RIO</span> FUTEVÔLEI</h1><p class="sub">versão 5.0</p>',
      exh: '<h2>MODO EXIBIÇÃO</h2><p class="sub">Uma partida rápida · o resto fica em Mais opções</p>',
      'exh-more': '<h2>MAIS OPÇÕES</h2><p class="sub">Modo Exibição</p>',
      play: '<h2>JOGAR</h2>',
      athletes: '<h2>ATLETAS</h2>',
      story: '<h2>MODO HISTÓRIA</h2><p class="sub">A saga de Giulia para se tornar Rainha da Areia</p>',
      'story-new': '<h2>NOVO JOGO</h2>',
      storyvs: this.storyVs ? this.vsHTML(this.storyVs.info) : '',
      swapbag: `<h2>TROCA DE LADO</h2><p class=\"sub\">Troque os especiais${this.swapBag && this.swapBag.list.length ? ' · a Giulia pode comer ou beber algo da mochila' : ''}${this.swapBag && this.swapBag.status ? ' · ' + this.swapBag.status : ''}</p>`,
      'story-load': '<h2>CONTINUAR</h2><p class="sub">Jogos salvos</p>',
      items: '<h2>CONSUMÍVEIS</h2><p class="sub">O que pode ser usado na pausa técnica de cada troca de lado</p>',
      timeout: '<h2>PAUSA TÉCNICA</h2><p class="sub">Escolha um consumível</p>',
      'timeout-who': `<h2>PARA QUEM?</h2><p class="sub">${this.toItem && CONSUMABLES[this.toItem] ? CONSUMABLES[this.toItem].name : ''}</p>`,
      two: '<h2>DOIS JOGADORES</h2>',
      kids: '<h2>KIDS MODE</h2><p class="sub">O botão escolhe a metade da quadra e fica mais fácil acertar a bola</p>',
      tilt: '<h2>MODO TILT</h2><p class="sub">A bola na hitbox para o tempo: gire a seta e solte o botão para bater</p>',
      setup: `<h2>${this.variant === 'exh' ? 'EXIBIÇÃO · ' : ''}${{ solo: 'JOGAR SOLO', versus: 'UM CONTRA O OUTRO', coop: 'JUNTOS NO MESMO TIME', multi: 'MULTIPLAYER' }[this.setupMode] || 'PARTIDA'}</h2>`,
      visual: '<h2 class="vis-title"><span>VISUAL</span> COLAGEM</h2><p class="sub">Recortes de revista colados na areia: cartaz hippie dos anos 70, capa de CD de rock e humor de quadrinho</p>',
      'visual-ideias': '<h2 class="vis-title"><span>MAIS</span> ATLETAS</h2><p class="sub">Sugestões com a mesma identidade gráfica · personalidade primeiro, o visual vem dela</p>',
      creators: '<h2>CRIAR JOGADOR</h2><p class="sub">Seus jogadores ficam em 6 vagas próprias, embaixo da grade de seleção</p>',
      settings: '<h2>CONFIGURAÇÕES</h2>',
      'set-controls': '<h2>CONTROLES</h2>',
      'set-ctrlmode': '<h2>MODO DE CONTROLE</h2><p class="sub">Cada jogador escolhe o seu</p>',
      'set-aim': '<h2>MIRA DO ATAQUE</h2><p class="sub">Como a seta da mira se move · cada jogador escolhe a sua</p>',
      'set-padstyle': '<h2>TIPO DE CONTROLE</h2><p class="sub">Botões no padrão Xbox ou PlayStation, para cada controle</p>',
      'set-visual': '<h2>VISUAL E CÂMERA</h2>',
      'set-help': '<h2>AJUDAS</h2>',
      controls: '<h2>COMANDOS</h2>',
      tips: '<h2>DICAS</h2>',
      'setup-match': '<h2>A PARTIDA</h2><p class="sub">Pontos, arena e clima</p>',
      'visual-cast': '<h2 class="vis-title"><span>ATLETAS</span> DA COLAGEM</h2>',
      'timeout-pick': this.tw ? `<h2>${this.twCpu ? 'TEMPO TÉCNICO' : 'PAUSA TÉCNICA'}</h2><p class="sub">${this.twCpu ? '1 por dupla na partida' : 'Troca de lado'}${this.match && this.match.mode === 'versus' ? ' · ' + this.match.teamPilots(this.tw.team).map(tag).join('') : ''}</p><p class="sub tw-who"><img src="${pic(this.tw.list[this.tw.i].char.id)}" alt=""> ${this.tw.list[this.tw.i].char.name} escolhe 1 consumível · atleta ${this.tw.i + 1} de ${this.tw.list.length}${this.twOwner() ? ' · só ' + tag(this.twOwner()) + ' escolhe' : ''}</p>` : '',
      pause: '<h2>PAUSA</h2>',
      over: this.overHead || '<h2>FIM DE JOGO</h2>',
    }[s];
    // 5.0: Voltar e Avançar / Pronto! ficam numa barra própria, separados das opções
    const isNav = it => it.nav || it.id === 'back';
    const btn = (it, i) => {
      const focus = i === this.idx ? 'focus' : '';
      const navIco = isNav(it) ? ((it.nav || 'back') === 'back' ? this.ico('B', 1, 18) + ' ' : '') : '';
      const navIcoR = isNav(it) && it.nav === 'next' ? ' ' + this.ico('C', 1, 18) : '';
      return `<button type="button" class="menu-btn ${it.cls || ''} ${focus} ${it.tip ? 'has-tip' : ''} ${isNav(it) ? 'nav-' + (it.nav || 'back') : ''}" data-idx="${i}" ${it.tip ? `title="${it.tip}"` : ''}>${navIco}${it.html}${navIcoR}${it.tip ? `<span class="tip" role="tooltip">${it.tip}</span>` : ''}</button>`;
    };
    const navBack = items.map((it, i) => [it, i]).filter(([it]) => isNav(it) && (it.nav || 'back') === 'back');
    const navNext = items.map((it, i) => [it, i]).filter(([it]) => isNav(it) && it.nav === 'next');
    const navHTML = navBack.length || navNext.length ? `<div class="menu-nav"><span>${navBack.map(([it, i]) => btn(it, i)).join('')}</span><span>${navNext.map(([it, i]) => btn(it, i)).join('')}</span></div>` : '';
    const body = items.map((it, i) => {
      if (isNav(it)) return '';
      const focus = i === this.idx ? 'focus' : '';
      if (it.type === 'choice') {
        return `<div class="menu-row ${focus}" data-idx="${i}">
          <span class="row-label">${it.label}${this.note && this.note.idx === i && performance.now() - this.note.t < 300 ? '<em class="row-note">✔ salvo</em>' : ''}</span>
          <span class="opts">${it.options.length > 4
            ? (() => { const k = it.options.findIndex(o => o.value === it.value), prev = it.options[(k - 1 + it.options.length) % it.options.length], next = it.options[(k + 1) % it.options.length];
                return `<button type="button" class="opt cyc" data-idx="${i}" data-pick="${prev.value}" aria-label="Anterior">◀</button><b class="opt-cur">${(it.options[k] || it.options[0]).html}</b><button type="button" class="opt cyc" data-idx="${i}" data-pick="${next.value}" aria-label="Próximo">▶</button>`; })()
            : it.options.map(o => `<button type="button" class="opt ${o.value === it.value ? 'on' : ''}" data-idx="${i}" data-pick="${o.value}">${o.html}</button>`).join('')}</span>
        </div>`;
      }
      return `<button type="button" class="menu-btn ${it.cls || ''} ${focus} ${it.tip ? 'has-tip' : ''}" data-idx="${i}" ${it.tip ? `title="${it.tip}"` : ''}>${it.html}${it.tip ? `<span class="tip" role="tooltip">${it.tip}</span>` : ''}</button>`;
    }).join('');
    const hasChoice = items.some(it => it.type === 'choice');
    this.overlay.className = `overlay show menu ${s === 'title' ? 'title' : ''}`;
    const grid = ['items', 'timeout-pick', 'visual-cast', 'visual-ideias'].includes(s) || (['visual', 'title', 'camp', 'play', 'athletes', 'set-controls'].includes(s) && innerHeight < 520) ? 'grid2' + (s === 'timeout-pick' ? ' tpick' : '') : (['exh', 'exh-more'].includes(s) && innerHeight < 520) ? 'rows2 compact' : (['set-ctrlmode', 'set-padstyle', 'set-aim'].includes(s) && innerHeight < 520) ? 'rows2' : ((s === 'set-help' && innerHeight < 520) || s === 'camp-more') ? 'rows2' : ''; // 5.0: tela baixa: lado a lado em vez de encolher
    this.overlay.innerHTML = `<div class="menu-fit">
      ${head}
      ${s === 'controls' || s === 'tips' ? this.controlsHTML(s === 'tips') + (s === 'controls' ? `<div class="menu-list">${body}</div>` : '') : `<div class="menu-list ${['settings', 'set-controls', 'set-ctrlmode', 'set-padstyle', 'set-aim', 'set-visual', 'set-help', 'setup-match', 'exh', 'exh-more', 'visual', 'visual-ideias', 'visual-cast', 'items', 'timeout-pick'].includes(s) ? 'wide' : ''} ${grid} ${this.extClass ? this.extClass(s) : ''}">${body}</div>`}
      ${s === 'set-controls' ? `<p class="pad-test">${this.padTestHTML()}</p><p class="pads-status">${this.padsStatusHTML()}</p>` : ''}
      ${navHTML}
      <p class="menu-hint">↑↓ escolhe${hasChoice ? ' · ←→ muda' : ''} · ${navNext.length ? `${this.ico('A', 1, 18)} / Enter seleciona · ${this.ico('C', 1, 18)} ${navNext[0][0].html.replace(/<[^>]+>/g, '')}` : `${this.ico('C', 1, 18)} / Enter confirma`}${this.stack.length > 1 || s === 'pause' ? ` · ${this.ico('B', 1, 18)} / Esc volta` : ''}</p></div>`;
    this.fitOverlay();
  }

  // 5.0 Exibição: pausa técnica na troca de lado — um time humano por vez; no fim, a CPU consome
  techPause(m, teams, cpuTeams = null) {
    this.match = m;
    this.twCpu = cpuTeams; // null = todos os atletas da CPU (Exibição)
    this.twQueue = teams.slice(1);
    this.twResults = [];
    this.tw = this.makeTw(teams[0]);
    this.idx = 0;
    this.open('timeout-pick');
  }
  // 5.0: jogador dono do atleta que está escolhendo na pausa técnica (só ele move o cursor)
  twOwner() {
    const m = this.match, tw = this.tw;
    if (!m || !tw || this.screen !== 'timeout-pick') return null;
    const pl = tw.list[tw.i];
    return (pl && ((m.ownerOf && m.ownerOf(pl)) || m.pilotOf(pl))) || null;
  }
  makeTw(ti) {
    const m = this.match, own = m.teamPlayers(ti).filter(pl => !pl.ai);
    return { team: ti, list: own.length ? own : m.teamPlayers(ti), i: 0, picks: {} };
  }

  // 5.0: ←→ — muda a opção da linha; num botão, vai para o botão ao lado na mesma altura (ex.: Voltar ↔ Avançar)
  side(d) {
    if (!this.stack) return;
    const items = this.items(), it = items[this.idx];
    if (it && it.type === 'choice') { this.change(d); return; }
    const els = [...this.overlay.querySelectorAll('[data-idx].menu-btn, [data-idx].menu-row')];
    const cur = els.find(e => +e.dataset.idx === this.idx);
    if (!cur) return;
    const r = cur.getBoundingClientRect(), cy = r.top + r.height / 2, cx = r.left + r.width / 2;
    let best = null, bd = Infinity;
    for (const e of els) {
      if (e === cur) continue;
      const b = e.getBoundingClientRect(), ey = b.top + b.height / 2, ex = b.left + b.width / 2;
      if (Math.abs(ey - cy) > Math.max(r.height, b.height) * 0.5) continue; // só na mesma altura
      const dx = ex - cx;
      if (Math.sign(dx) !== d) continue;
      if (Math.abs(dx) < bd) { bd = Math.abs(dx); best = e; }
    }
    if (best) { this.idx = +best.dataset.idx; this.render(); }
  }

  // 5.0: nada de rolagem — se a tela não couber na janela, ela encolhe até caber
  fitOverlay() {
    const f = this.overlay && this.overlay.querySelector('.menu-fit');
    if (!f) return;
    f.style.transform = '';
    const availH = this.overlay.clientHeight - 20, availW = this.overlay.clientWidth - 20;
    const k = Math.min(1, availH / Math.max(1, f.scrollHeight), availW / Math.max(1, f.scrollWidth));
    if (k < 1) f.style.transform = `scale(${k.toFixed(3)})`;
  }

  controlsHTML(tipsOnly = false) {
    const ico = (a, size) => this.ico(a, 1, size);
    const row = (label, pad) => `<div><b>${label}</b><i>${pad}</i></div>`;
    return `
    ${tipsOnly ? '<!--' : ''}<div class="controls">
      ${row('Mover', ico('move'))}
      ${row('Ataque (segure)', ico('A'))}
      ${row('Defesa (segure)', ico('B'))}
      ${row('Pulo', ico('C'))}
      ${row('Carrinho', ico('D'))}
      ${settings.ctrlModes[1] === 'novo' ? `${row('Especial de ataque', ico('L'))}
      ${row('Especial de defesa', ico('R'))}
      ${row('Trocar ataque', ico('L2') + '+' + ico('L'))}
      ${row('Trocar defesa', ico('L2') + '+' + ico('R'))}
      ${row('Formação', ico('R2'))}
      ${row('Ajudas visuais', ico('sel'))}` : `${row('Ataque 50%', ico('L') + ico('L'))}
      ${row('Ataque 100%', ico('A') + ico('A'))}
      ${row('Defesa 50%', ico('R') + ico('R'))}
      ${row('Defesa 100%', ico('B') + ico('B'))}
      ${row('Formação', ico('R2'))}
      ${row('Ajudas visuais', ico('L2'))}`}
      ${row('Pausa', ico('start'))}
    </div>${tipsOnly ? '-->' : ''}
    ${tipsOnly ? '' : '<!--'}<ul class="tips">
      <li>Segure ${ico('A', 18)} (ataque) ou ${ico('B', 18)} (defesa): a hitbox em 3 partes aparece. A parte em que a bola entra escolhe o golpe (pé, peito/ombro, cabeça); o tempo para, o direcional aponta e <b>soltar</b> bate.</li>
      <li>Especiais com dois toques rápidos: ${ico('L', 18)}${ico('L', 18)} e ${ico('R', 18)}${ico('R', 18)} gastam 50% da barra; ${ico('A', 18)}${ico('A', 18)} e ${ico('B', 18)}${ico('B', 18)} precisam dela cheia. Segurando o 2º toque você mira; soltando, sai na direção automática.</li>
      <li>${ico('C', 18)} pula (${ico('C', 18)} + ${ico('A', 18)} / ${ico('B', 18)} = golpe no ar). ${ico('D', 18)} dá um <b>carrinho</b>. ${ico('R2', 18)} troca a formação da dupla.</li>
    </ul>${tipsOnly ? '' : '-->'}`;
  }

  // Modo História: especial de ataque e de defesa da Giulia e da Zefa (aprendidos), na tela de versus e na
  // troca de lado. specials = save.specials · players = { giulia, zefa } da partida em andamento (ou null)
  specialRows(specials, players) {
    // 5.0: os 4 especiais de cada uma (LB LB, X X, RB RB, B B) entre os aprendidos daquele tipo e nível
    const name = id => { const d = TILT.data.specialDefs && TILT.data.specialDefs[id]; return id ? (d && d.name) || id : 'nenhum'; };
    const rows = [];
    for (const who of ['giulia', 'zefa']) for (const r of SLOT_KEYS) {
      const list = storyOptions(specials[who], r), eq = storySlots(specials[who]);
      if (!list.length) continue;
      const set = v => { eq[r] = v; const pl = players && players[who]; if (pl && pl.tiltSp) pl.tiltSp[r] = v; };
      rows.push({
        type: 'choice', id: `sp-${who}-${r}`, label: `${who === 'giulia' ? 'Giulia' : 'Zefa'} · ${SP_SLOTS[r].label}<small>${SP_SLOTS[r].pad} · gasta ${SP_SLOTS[r].nivel}% da barra</small>`,
        options: list.map(id => ({ value: id, html: name(id) })), value: eq[r],
        change: step => { const i = list.indexOf(eq[r]); set(list[(i + step + list.length) % list.length]); },
        pick: v => set(v),
      });
    }
    return rows;
  }

  // fome, sede, marcas e efeitos de um atleta (pausa técnica)
  condText(p) {
    const c = p.cond || {}, out = [`fome ${Math.round(c.fome || 0)}`, `sede ${Math.round(c.sede || 0)}`];
    for (const k in FLAG_NAMES) if (c.flags && c.flags[k]) out.push(FLAG_NAMES[k]);
    if (c.sunLoss > 0.05) out.push(`sol −${c.sunLoss.toFixed(1)} Pique`);
    if (c.sunblock) out.push('protetor solar');
    return out.join(' · ');
  }
  useItem(pl) {
    const text = this.match.useTimeout(this.toTeam, pl, this.toItem);
    this.close();
    this.actions.resume();
    if (text !== null) this.toast(`PAUSA TÉCNICA · ${pl.char.name}: ${CONSUMABLES[this.toItem].name} · ${text}`, 3);
  }

  // cabeçalho da tela de versus da história: as duas duplas, o nome da partida e as condições
  vsHTML(info) {
    const team = (ids, side) => `<div class=\"svs-team ${side}\">${ids.map(id => `<figure><img src=\"${pic(id)}\" alt=\"\"><figcaption>${CHARACTERS[id].name}</figcaption></figure>`).join('')}</div>`;
    return `<div class=\"svs\">${team(info.us, 'l')}<div class=\"svs-mid\"><b>VS</b><span>${info.title}</span><small>${info.sub || ''}</small></div>${team(info.them, 'r')}</div>`;
  }

  showOver(m) {
    const w = m.teams[m.winner];
    const pilots = m.teamPilots(w.id);
    const title = m.mode === 'versus' ? `${pilots.map(tag).join(' ')} VENCEU!` : (w.human ? 'VITÓRIA!' : 'DERROTA...');
    const score = m.setHistory && m.setHistory.length > 1 ? `sets ${m.setsWon[0]} × ${m.setsWon[1]} (${m.setHistory.map(s => s.join('-')).join(', ')})` : `${m.teams[0].score} × ${m.teams[1].score}`;
    this.overHead = `<h2>${title}</h2><p class="sub">${m.teams[0].name} ${score} ${m.teams[1].name}</p>`;
    this.open('over');
  }
  hideOverlay() { this.overlay.className = 'overlay'; this.overlay.innerHTML = ''; }
  // f = velocidade do jogo (1 = normal; 0,9 / 0,75 / 0,5 = câmera lenta)
  setSlow(f) { this.slowF = f; this.refreshSlow(); this.q('.slow').classList.toggle('show', f < 1); }
  toast(text, secs = 1.4) {
    this.ticker.innerHTML = text;
    this.ticker.className = 'ticker show';
    this.tickerT = secs;
  }

  pop(text, cls) {
    this.callout.textContent = text;
    this.callout.className = 'callout show ' + (cls || '');
    void this.callout.offsetWidth;
    this.callout.classList.add('anim');
    this.calloutT = 1.4;
  }

  onEvent(e, m) {
    if (m.demo && e.type !== 'special' && e.type !== 'swap') return;
    // Modo Tilt: aviso durante a pausa para mirar
    if (e.type === 'tilt') {
      const n = m.pilotOf(e.player) || 1;
      this.toast(`${(e.special ? 'ESPECIAL · ' : '') + String(e.name || '').toUpperCase()} · o direcional aponta a seta · solte ${this.ico(e.key, n, 16)} para bater`, 3.2);
      return;
    }
    if (e.type === 'tiltEnd') { this.tickerT = 0.01; return; }
    // 5.0 modo Novo: troca de especial (LT + LB / RB) — o anel gira e mostra o novo na outra face
    if (e.type === 'spSwap') { this.spinRing(e, m); return; }
    if (e.type === 'consume' && e.player) {
      for (const b of e.player.buffs || []) if (!b.t0) b.t0 = b.t;
      this.fxChips = this.fxChips || [];
      this.fxChips.push({ pl: e.player, item: e.item, t: 3, t0: 3 });
      return;
    }
    if (e.type === 'buffEnd') return;
    if (e.type === 'point' && e.practice) return;
    if (e.type === 'point') {
      const good = m.mode === 'versus' || m.teams[e.winner].human;
      this.pop(e.reason, good ? 'good' : 'bad');
    } else if (e.type === 'swap') this.pop('TROCA DE LADO!', 'swap');
    else if (e.type === 'special') { this.pop(e.move.name, 'special'); this.callout.style.setProperty('--c', e.player.char.color); }
    else if (e.type === 'callout') {
      // 5.0: nome do golpe (e avisos do lance) no lado do time, embaixo da barra de especial
      const box = e.team === 0 || e.team === 1 ? this.q('.t' + e.team + ' .mvname') : null;
      if (box) {
        box.textContent = e.text;
        box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
        clearTimeout(box._t); box._t = setTimeout(() => box.classList.remove('show'), 1400);
      } else {
        this.ticker.textContent = e.text;
        this.ticker.className = 'ticker show';
        this.tickerT = 1.1;
      }
    } else if (e.type === 'over' && !m.story && !m.camp) this.showOver(m); // história e campeonato: o roteiro continua
  }

  // 5.0 modo Novo: face do anel — botão e nome do especial equipado (k = 'a' ataque / 'd' defesa)
  spFace(p, k, m, id = p.tiltSp && p.tiltSp[k + '1']) {
    const n = (m.ownerOf && m.ownerOf(p)) || 1, d = TILT.data.specialDefs && TILT.data.specialDefs[id];
    return `${this.ico(k === 'a' ? 'L' : 'R', n, 16)}<b>${id ? (d && d.name) || id : 'nenhum'}</b>`;
  }
  spinRing(e, m) {
    const ti = e.player.team, k = m.teamPlayers(ti).indexOf(e.player);
    const pm = this.q('.t' + ti + ' .meters').querySelectorAll('.pm')[k];
    const g = pm && pm.querySelector(`.sprg[data-k="${e.kind}"]`);
    if (!g) return;
    const rot = g.querySelector('.sprot'), f0 = g.querySelector('.spa'), f1 = g.querySelector('.spb');
    clearTimeout(g._spin);
    f0.innerHTML = this.spFace(e.player, e.kind, m, e.from);
    f1.innerHTML = this.spFace(e.player, e.kind, m, e.to);
    rot.classList.remove('spin'); void rot.offsetWidth; rot.classList.add('spin');
    g._spin = setTimeout(() => { g._spin = null; f0.innerHTML = f1.innerHTML; rot.classList.add('still'); rot.classList.remove('spin'); void rot.offsetWidth; rot.classList.remove('still'); }, 560);
  }

  // Caixa de formação de uma dupla humana, no canto do lado dela.
  formationHTML(m, t) {
    const pilots = m.teamPilots(t.id);
    const n = pilots[0];
    const tp = m.teamPlayers(t.id);
    const net = tp[t.netIdx % tp.length];
    const backs = tp.filter(p => p !== net);
    const name = p => `<span style="color:${p.char.color}">${p.char.name}</span>`;
    const who = m.mode === 'solo' ? '' : pilots.map(tag).join('') + ' ';
    let line2;
    // controle fixo: cada atleta com o seu jogador (ou CPU); troca: o atleta controlado agora
    if (t.pilot === 'fixed') line2 = tp.map(p => `${t.fixed[p.idx] ? tag(t.fixed[p.idx]) : `<b class="cpu-tag">CPU ${p.level}</b>`} ${name(p)}`).join(' · ');
    else line2 = `controlando: ${name(m.controlledOf(t.id))}`;
    const sv = m.server;
    if (m.state === 'serve' && sv && sv.team === t.id) {
      const sn = m.pilotOf(sv) || n;
      line2 += m.kids
        ? ` · segure ${['D', 'C', 'A', 'B'].map(k => this.ico(k, sn, 16)).join(' ')} (a metade do campo deles) e solte para sacar`
        : ` · segure ${this.ico('A', sn, 16)} (forte) ou ${this.ico('B', sn, 16)} (viagem) e solte para sacar`;
    }
    if (tp.length === 1) return `${who}<small>${line2}</small>`;
    if (tp.length === 2) { const fl = formations(), fm = fl[(t.formIdx || 0) % fl.length]; return `${who}${this.ico('R2', n)} formação: <b>${fm.nome}</b> · ${name(net)} na frente<br><small>${line2}</small>`; }
    return `${who}${this.ico('R2', n)} formação: ${name(net)} na rede · ${backs.map(name).join(' e ')} no fundo<br><small>${line2}</small>`;
  }

  // Legenda dos golpes: a coluna do toque atual fica em destaque.
  legendHTML(m) {
    const humans = m.teams.filter(t => t.human);
    if (!humans.length || !settings.legend || (m.state !== 'rally' && m.state !== 'serve')) return '';
    // dupla que joga a próxima bola (a do lado onde a bola está), senão a do jogador 1
    const bx = m.ball.pos.x;
    const t = humans.find(h => bx * h.side > 0) || humans[0];
    const n = m.teamPilots(t.id)[0];
    // próximo toque da dupla: depois do saque ou do 3º toque, volta a ser a recepção (1º)
    const touch = m.state === 'serve' ? 0 : (m.lastTeam === t.id && t.touches < 3 ? t.touches + 1 : 1);
    const k = a => a.length === 2 ? `${this.ico('C', n, 15)}+${this.ico(a[1], n, 15)}` : this.ico(a, n, 15);
    const special = m.teamPlayers(t.id).some(p => p.meter >= SPECIAL.max);
    // Kids Mode: os 4 botões e a metade de cada um (no nosso campo no 1º e 2º toques)
    // Modo Tilt: os dois botões (em qualquer toque) e o carrinho
    if (m.tilt && touch) {
      const ic = a => this.ico(a, n, 15);
      const full = m.teamPlayers(t.id).some(p => p.meter >= SPECIAL.max);
      const half = m.teamPlayers(t.id).some(p => p.meter >= SPECIAL.max / 2), novo = settings.ctrlModes[n] === 'novo';
      return `<b>${touch}º toque · segure</b><span>${ic('A')} bola rápida</span><span>${ic('B')} bola precisa</span><span>${ic('C')} pulo</span><span>${ic('D')} carrinho</span>${novo ? (half ? `<span class="lg-sp">${ic('L')} ataque · ${ic('R')} defesa${full ? ' (100%)' : ' (50%)'}</span>` : '') : full ? `<span class="lg-sp">${ic('A')}${ic('A')} ataque · ${ic('B')}${ic('B')} defesa</span>` : ''}`;
    }
    if (m.kids) {
      const where = touch === 1 || touch === 2 ? 'nosso campo' : 'campo deles';
      const ic = a => this.ico(a, n, 15);
      return `<b>${touch ? touch + 'º toque' : 'Saque'} · ${where}</b><span>${ic('D')} cima</span><span>${ic('C')} baixo</span><span>${ic('A')} direita</span><span>${ic('B')} esquerda</span>`;
    }
    // só o toque atual, numa linha discreta
    if (!touch) return `<b>Saque</b><span>${this.ico('A', n, 15)} forte</span><span>${this.ico('B', n, 15)} viagem</span>`;
    return `<b>${touch}º toque</b>${LEGEND[touch].map(([a, name]) => `<span>${k(a)} ${name}</span>`).join('')}${special ? `<span class="lg-sp">${this.ico('C', n, 15)}${this.ico('C', n, 15)} especial</span>` : ''}`;
  }

  update(m, dt) {
    // o placar acompanha o lado da quadra de cada dupla
    this.q('.board').classList.toggle('swapped', m.teams[0].side > 0);
    for (const i of [0, 1]) {
      const t = m.teams[i];
      const pilots = m.mode === 'versus' || m.mode === 'coop' ? m.teamPilots(i).map(tag).join('') : '';
      const nameHTML = `${pilots}${t.name}`;
      const nameEl = this.q('.t' + i + ' .name');
      if (nameEl.innerHTML !== nameHTML) nameEl.innerHTML = nameHTML;
      this.q('.s' + i).textContent = t.score;
      if (i === 0) { const si = this.q('.setinfo'), txt = m.setPoints && m.setPoints.length > 1 ? `SET ${m.setNo + 1} · ${m.setsWon[0]}×${m.setsWon[1]}` : ''; if (si.textContent !== txt) si.textContent = txt; }
      // barra de especial individual de cada atleta
      const box = this.q('.t' + i + ' .meters');
      const tp = m.teamPlayers(i);
      const sig = settings.art + ':' + tp.map(p => p.char.id).join();
      if (box.dataset.sig !== sig) {
        box.dataset.sig = sig;
        // 5.0: o rosto do atleta e a barra em duas partes — a de 50% (mais grossa, marcada ao encher) e a de 100%
        box.innerHTML = tp.map(p => `<div class="pm"><img class="face" src="${faceIcon(p.char.id)}" alt=""><span class="bar2"><span class="seg s50"><i style="background:linear-gradient(90deg, ${p.char.color}, #ffd21a)"></i></span><span class="seg s100"><i style="background:linear-gradient(90deg, #ffd21a, ${p.char.color})"></i></span></span></div>`).join('');
      }
      box.querySelectorAll('.pm').forEach((el, k) => {
        const p = tp[k];
        const half = SPECIAL.max / 2, segs = el.querySelectorAll('.seg i');
        segs[0].style.width = (100 * Math.min(half, p.meter) / half) + '%';
        segs[1].style.width = (100 * Math.max(0, p.meter - half) / half) + '%';
        el.classList.toggle('half', p.meter >= half);
        el.classList.toggle('full', p.meter >= SPECIAL.max);
        // 4.0: fome / sede altas, marcas e efeitos temporários
        const c = p.cond || {}, marks = [];
        if (c.fome >= COND.limit) marks.push('<b title="Fome">🍔</b>');
        if (c.sede >= COND.limit) marks.push('<b title="Sede">💧</b>');
        for (const f in FLAG_NAMES) if (c.flags && c.flags[f]) marks.push(`<b title="${FLAG_NAMES[f]}">✚</b>`);
        if (p.buffs && p.buffs.length) marks.push('<b title="Efeito de consumível">▲</b>');
        const mk = marks.join('');
        let cd = el.querySelector('.cd');
        if (!cd) { cd = document.createElement('span'); cd.className = 'cd'; el.appendChild(cd); }
        if (cd.innerHTML !== '') cd.innerHTML = ''; // 5.0: status agora fica acima do placar
        // 5.0 modo Novo: o especial de ataque (LB) e o de defesa (RB) equipados, num anel que gira ao trocar
        const novo = m.isNovo && m.isNovo(p) && !!m.pilotOf(p); // só o atleta controlado agora (o LB / RB são dele)
        let spr = el.querySelector('.spr');
        if (novo && !spr) {
          spr = document.createElement('span'); spr.className = 'spr';
          spr.innerHTML = ['a', 'd'].map(k => `<span class="sprg" data-k="${k}"><span class="sprot"><span class="spf spa"></span><span class="spf spb"></span></span></span>`).join('');
          el.appendChild(spr);
        }
        if (spr) spr.hidden = !novo;
        if (novo) for (const g of spr.querySelectorAll('.sprg')) {
          if (g._spin) continue;
          const k = g.dataset.k, html = this.spFace(p, k, m);
          const f0 = g.querySelector('.spa');
          if (f0.innerHTML !== html) f0.innerHTML = html;
        }
      });
      const used = m.lastTeam === i && m.state === 'rally' && m.lastToucher && m.lastToucher !== m.server ? t.touches : 0;
      this.q('.t' + i + ' .touches').innerHTML = [1, 2, 3].map(n => `<b class="${n <= used ? 'on' : ''}"></b>`).join('');
    }
    const wx = (m.weather || []).map(k => `<span title="${WEATHER[k].info}">${WEATHER[k].icon} ${WEATHER[k].name}</span>`).join('');
    const wxEl = this.q('.wx');
    if (wxEl.innerHTML !== '') wxEl.innerHTML = '';
    // 5.0: acima do placar — clima e status de cada atleta (fome, sede, lesão…)
    const st = [];
    for (const p of m.players) {
      const c = p.cond || {}, ic = [];
      const names = [];
      if (c.fome >= COND.limit) { ic.push('🍔'); names.push('fome'); }
      if (c.sede >= COND.limit) { ic.push('💧'); names.push('sede'); }
      for (const f in FLAG_NAMES) if (c.flags && c.flags[f]) { ic.push('✚'); names.push(FLAG_NAMES[f].toLowerCase()); }
      if (ic.length) st.push(`<span class="ts-pl" title="${p.char.name}: ${names.join(', ')}"><img src="${faceIcon(p.char.id)}" alt="">${ic.join('')}</span>`);
    }
    const top = wx + st.join('');
    const tsEl = this.q('.topstatus');
    if (tsEl.innerHTML !== top) { tsEl.innerHTML = top; tsEl.classList.toggle('show', !!top); }
    // 5.0: efeitos de consumível nos cantos de cima, do lado de cada time, com timer redondo
    this.fxChips = (this.fxChips || []).filter(c => (c.t -= dt) > 0);
    const swapped = this.q('.board').classList.contains('swapped');
    const ICON = { forca: '💪', agilidade: '⚡', precisao: '🎯', pique: '🔥' };
    for (const ti of [0, 1]) {
      const chips = [];
      for (const p of m.players.filter(p => p.team === ti)) {
        for (const b of p.buffs || []) {
          const k = Math.max(0, Math.min(1, b.t / (b.t0 || b.t || 1)));
          chips.push(`<div class="bf" style="--p:${k.toFixed(3)};--c:${p.char.color}" title="+${b.v} ${b.stat} · ${Math.ceil(b.t)} s"><span class="bf-in"><img src="${faceIcon(p.char.id)}" alt=""><i>${ICON[b.stat] || '▲'}</i></span><b>+${b.v}</b><small>${Math.ceil(b.t)}s</small></div>`);
        }
      }
      for (const c of this.fxChips.filter(c => c.pl.team === ti && !(c.pl.buffs || []).length)) {
        chips.push(`<div class="bf once" style="--p:${(c.t / c.t0).toFixed(3)};--c:${c.pl.char.color}"><span class="bf-in"><img src="${faceIcon(c.pl.char.id)}" alt=""><i>${itemIcon(c.item)}</i></span></div>`);
      }
      const box = this.q('.buffs.b' + ti), html = chips.join('');
      box.classList.toggle('left', (ti === 0) !== swapped);
      box.classList.toggle('right', (ti === 0) === swapped);
      if (box.innerHTML !== html) box.innerHTML = html;
    }
    // caixas de formação: uma por dupla humana, no canto do lado dela
    const html = ['', ''];
    const show = m.state !== 'intro';
    for (const t of m.teams) {
      if (!t.human || !show) continue;
      html[t.side < 0 ? 0 : 1] = this.formationHTML(m, t);
    }
    const key = html.join('|');
    if (key !== this.lastFormation) {
      this.lastFormation = key;
      ['.f0', '.f1'].forEach((sel, k) => {
        const el = this.q(sel);
        el.style.display = html[k] ? '' : 'none';
        el.innerHTML = html[k];
      });
    }
    const lg = this.legendHTML(m);
    if (lg !== this.lastLegend) {
      this.lastLegend = lg;
      const el = this.q('.legend');
      // troca suave: some, atualiza e reaparece
      el.classList.remove('show');
      clearTimeout(this.legendTimer);
      this.legendTimer = setTimeout(() => {
        el.innerHTML = lg;
        if (lg) el.classList.add('show');
      }, 120);
    }
    if (this.calloutT > 0) { this.calloutT -= dt; if (this.calloutT <= 0) this.callout.className = 'callout'; }
    if (this.tickerT > 0) { this.tickerT -= dt; if (this.tickerT <= 0) this.ticker.classList.remove('show'); }
  }
}
