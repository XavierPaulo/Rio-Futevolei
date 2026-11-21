import { SPECIAL, POINTS_TO_WIN, TRAINING } from './config.js';
import { settings, saveSettings, DEVICES } from './ui/settings.js';
import { padIcon, devicePreview } from './ui/padIcons.js';
import { portrait, PLAYER_COLORS } from './ui/portraits.js';
import { listCustom, MAX_CUSTOM } from './art/custom.js';
import { connectedPads, padProfile, rawPressed, saveCalibration, clearCalibration } from './input.js';
import { cameras } from './engine/camera.js';

// Passos da calibração: cada um pede um botão pela POSIÇÃO no controle.
const CALIB_STEPS = [
  { std: 0, pos: 'down', text: 'botão de BAIXO', does: 'pulo / especial' },
  { std: 1, pos: 'right', text: 'botão da DIREITA', does: 'toque preciso' },
  { std: 2, pos: 'left', text: 'botão da ESQUERDA', does: 'toque forte' },
  { std: 3, pos: 'up', text: 'botão de CIMA', does: 'carrinho' },
  { std: 4, pos: 'L1', text: 'gatilho L1 / LB', does: 'câmera lenta' },
  { std: 5, pos: 'R1', text: 'gatilho R1 / RB', does: 'formação' },
  { std: 6, pos: 'L2', text: 'gatilho L2 / LT', does: 'ajudas visuais' },
  { std: 9, pos: 'start', text: 'botão START / OPTIONS', does: 'pausa' },
];

// Desenho dos 4 botões de face com o pedido em destaque (vale para qualquer marca).
function faceDiagram(pos) {
  const dot = (cx, cy, on) => `<circle cx="${cx}" cy="${cy}" r="9" fill="${on ? '#ffd21a' : '#1d1a2b'}" stroke="#fff" stroke-opacity="0.6" stroke-width="2"/>`;
  const face = `<svg width="84" height="84" viewBox="0 0 84 84">${dot(42, 14, pos === 'up')}${dot(70, 42, pos === 'right')}${dot(14, 42, pos === 'left')}${dot(42, 70, pos === 'down')}</svg>`;
  const pill = (label, on) => `<span class="pad-pill ${on ? 'hot' : ''}">${label}</span>`;
  if (['up', 'right', 'left', 'down'].includes(pos)) return face;
  return `<div class="calib-pills">${pill('L1', pos === 'L1')}${pill('R1', pos === 'R1')}${pill('L2', pos === 'L2')}${pill('START', pos === 'start')}</div>`;
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
    const team = i => `<div class="team t${i}"><div class="name"></div><div class="meters"></div><div class="touches"></div></div>`;
    this.el.innerHTML = `
      <div class="board">
        ${team(0)}
        <div class="score"><span class="s0">0</span><em>×</em><span class="s1">0</span></div>
        ${team(1)}
      </div>
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
    this.styles = { 1: 'ps', 2: 'ps' }; // estilo de ícones de cada jogador (definido pelo main)
    this.actions = {};                  // select / resume / quit / again / devicesChanged
    this.stack = null;                  // pilha de telas do menu
    this.idx = 0;
    this.lastButton = null;             // teste do controle (configurações)
    this.overlay.addEventListener('click', e => {
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
      const b = e.target.closest('[data-idx]');
      if (b && this.stack && +b.dataset.idx !== this.idx) { this.idx = +b.dataset.idx; this.render(); }
    });
  }

  ico(action, n = 1, size) { return padIcon(action, this.styles[n], size); }
  setStyles(styles) { this.styles = { 1: styles.p1, 2: styles.p2 || styles.p1 }; this.refreshSlow(); this.lastFormation = null; this.lastLegend = null; }
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
    if (this.stack.length > 1) {
      const from = this.stack.pop();
      this.idx = Math.max(0, this.items().findIndex(it => it.target === from));
      this.render();
    } else if (this.screen === 'pause') {
      this.activate('resume');
    }
  }

  move(d) {
    if (!this.stack) return;
    const n = this.items().length;
    this.idx = (this.idx + d + n) % n;
    this.render();
  }

  confirm() {
    const it = this.items()[this.idx];
    if (!it) return;
    if (it.type === 'choice') this.change(1);
    else this.activate(it.id);
  }

  change(step) {
    const it = this.items()[this.idx];
    if (!it || it.type !== 'choice') return;
    it.change(step);
    this.render();
  }

  pick(value) {
    const it = this.items()[this.idx];
    if (it && it.pick) { it.pick(value); this.render(); }
  }

  activate(id) {
    if (id.startsWith('edit:')) { this.close(); this.actions.create(id.slice(5) || null); return; }
    switch (id) {
      case 'creators': this.push('creators'); break;
      // modo escolhido: antes da seleção, a tela de formato (1x1/2x2/3x3) e controle
      case 'solo': case 'versus': case 'coop':
      case 'kids-solo': case 'kids-versus': case 'kids-coop':
        // Kids Mode: os mesmos modos, com □ / ○ escolhendo a metade da quadra (src/kids.js)
        this.kids = id.startsWith('kids-');
        this.setupMode = id.replace('kids-', '');
        if (this.setupMode === 'coop' && settings.teamSize < 2) { settings.teamSize = 2; saveSettings(); }
        this.push('setup');
        break;
      case 'go': this.close(); this.actions.select(this.setupMode, !!this.kids); break;
      case 'two': this.push('two'); break;
      case 'kids': this.push('kids'); break;
      case 'settings': this.push('settings'); break;
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
    if (s === 'title') return [
      { id: 'solo', html: 'Jogar solo' },
      { id: 'two', html: 'Dois jogadores', target: 'two' },
      { id: 'kids', html: 'Kids Mode', target: 'kids' },
      { id: 'creators', html: 'Criar atleta', target: 'creators' },
      { id: 'settings', html: 'Configurações', target: 'settings' },
    ];
    if (s === 'creators') {
      const list = listCustom();
      return [
        ...list.map(r => ({ id: 'edit:' + r.id, html: `<span class="cr-li"><img src="${portrait(r.id)}" alt="">${r.name}</span><small>editar</small>` })),
        ...(list.length < MAX_CUSTOM ? [{ id: 'edit:', html: `+ Novo atleta<small>${MAX_CUSTOM - list.length} vaga(s) livre(s) na grade de seleção</small>` }] : []),
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
      const sizes = mode === 'coop'
        ? [[2, '2 contra 2'], [3, '3 contra 3']]
        : [[1, '1 contra 1'], [2, '2 contra 2'], [3, '3 contra 3']];
      const size = settings.teamSize;
      const ctl = n => pick('control' + n, `${mode === 'versus' ? tag(n) + ' ' : ''}Controle<small>${size === 2 ? 'a dupla inteira (troca de atleta sozinho) ou só o 1º atleta escolhido' : 'o time inteiro (troca de atleta sozinho) ou só o 1º atleta escolhido'}</small>`,
        [['team', size === 2 ? 'A dupla toda' : 'O time todo'], ['own', 'Só o meu atleta']]);
      const title = { solo: 'Jogar solo', versus: 'Um contra o outro', coop: 'Juntos no mesmo time' }[mode];
      return [
        pick('teamSize', `Formato<small>${mode === 'coop' ? `cada jogador controla o seu atleta${size === 3 ? '; o 3º fica com a CPU' : ''}` : title}</small>`, sizes),
        ...(size > 1 && mode !== 'coop' ? [ctl(1)] : []),
        ...(size > 1 && mode === 'versus' ? [ctl(2)] : []),
        { id: 'go', html: 'Escolher atletas' },
        { id: 'back', html: 'Voltar' },
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
    if (s === 'two') return [
      { id: 'versus', html: `Um contra o outro<small>cada jogador no seu time</small>` },
      { id: 'coop', html: `Juntos no mesmo time<small>cada jogador controla um atleta, contra a CPU</small>` },
      { id: 'back', html: 'Voltar' },
    ];
    if (s === 'settings') {
      const device = n => ({
        type: 'choice', id: 'dev' + n,
        label: `${tag(n)} Controle`,
        options: DEVICES.map(d => ({ value: d, html: devicePreview(d) })),
        value: settings['p' + n],
        change: step => { const i = DEVICES.indexOf(settings['p' + n]); settings['p' + n] = DEVICES[(i + step + DEVICES.length) % DEVICES.length]; this.devicesChanged(); },
        pick: v => { settings['p' + n] = v; this.devicesChanged(); },
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
      return [
        device(1), device(2),
        { id: 'calibrate', html: 'Calibrar controle<small>aperte cada botão uma vez — funciona com qualquer marca</small>' },
        choice('art', 'Estilo artístico<small>arte do jogo inteiro</small>', [['pincel', 'Pincel'], ['caneta', 'Papel e caneta'], ['cartoon', 'Cartoon']], styleChanged),
        choice('view', 'Ângulo da câmera<small>lateral (de lado) ou por trás da sua dupla, como no tênis</small>', cameras.list().map(c => [c.id, c.name])),
        choice('camera', 'Movimento da câmera', [['follow', 'Seguindo a bola'], ['fixed', 'Fixa']]),
        toggle('assists', `Ajudas visuais ${this.ico('L2')}<small>nota da ação · arco · alvo no chão</small>`),
        toggle('legend', 'Legenda de golpes<small>golpes possíveis no toque atual</small>'),
        toggle('hitbox', 'Hitbox dos golpes<small>área de contato enquanto o golpe está ativo</small>'),
        { id: 'back', html: 'Voltar' },
      ];
    }
    if (s === 'pause') return [
      { id: 'resume', html: 'Continuar' },
      { id: 'settings', html: 'Configurações', target: 'settings' },
      { id: 'quit', html: 'Sair para o início' },
    ];
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
    const names = { A: 'forte', B: 'preciso', C: 'pulo', D: 'carrinho', R: 'formação', L: 'câmera lenta', L2: 'ajudas visuais', start: 'pausa' };
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
    const head = {
      title: `<h1><span>RIO</span> FUTEVÔLEI</h1><p class="sub">versão 2.0 · Copacabana · jogo até ${POINTS_TO_WIN}</p>`,
      two: '<h2>DOIS JOGADORES</h2>',
      kids: '<h2>KIDS MODE</h2><p class="sub">O botão escolhe a metade da quadra e fica mais fácil acertar a bola</p>',
      setup: `<h2>${this.kids ? 'KIDS · ' : ''}${{ solo: 'JOGAR SOLO', versus: 'UM CONTRA O OUTRO', coop: 'JUNTOS NO MESMO TIME' }[this.setupMode] || 'PARTIDA'}</h2>`,
      creators: '<h2>CRIAR ATLETA</h2><p class="sub">Os atletas criados aparecem na grade de seleção</p>',
      settings: '<h2>CONFIGURAÇÕES</h2>',
      pause: '<h2>PAUSA</h2>',
      over: this.overHead || '<h2>FIM DE JOGO</h2>',
    }[s];
    const body = items.map((it, i) => {
      const focus = i === this.idx ? 'focus' : '';
      if (it.type === 'choice') {
        return `<div class="menu-row ${focus}" data-idx="${i}">
          <span class="row-label">${it.label}</span>
          <span class="opts">${it.options.map(o => `<button type="button" class="opt ${o.value === it.value ? 'on' : ''}" data-idx="${i}" data-pick="${o.value}">${o.html}</button>`).join('')}</span>
        </div>`;
      }
      return `<button type="button" class="menu-btn ${it.cls || ''} ${focus}" data-idx="${i}">${it.html}</button>`;
    }).join('');
    const hasChoice = items.some(it => it.type === 'choice');
    this.overlay.className = `overlay show menu ${s === 'title' ? 'title' : ''}`;
    this.overlay.innerHTML = `
      ${head}
      <div class="menu-list ${s === 'settings' ? 'wide' : ''}">${body}</div>
      ${s === 'settings' ? `<p class="pad-test">${this.padTestHTML()}</p><p class="pads-status">${this.padsStatusHTML()}</p>` : ''}
      <p class="menu-hint">↑↓ escolhe${hasChoice ? ' · ←→ muda' : ''} · ${this.ico('C', 1, 18)} / Enter confirma${this.stack.length > 1 || s === 'pause' ? ` · ${this.ico('B', 1, 18)} / Esc volta` : ''}</p>
      ${s === 'pause' ? this.controlsHTML() : ''}`;
  }

  controlsHTML() {
    const ico = (a, size) => this.ico(a, 1, size);
    const row = (label, pad) => `<div><b>${label}</b><i>${pad}</i></div>`;
    return `
    <div class="controls">
      ${row('Mover', ico('move'))}
      ${row('Forte', ico('A'))}
      ${row('Preciso', ico('B'))}
      ${row('Pulo / especial', ico('C'))}
      ${row('Carrinho', ico('D'))}
      ${row('Formação', ico('R'))}
      ${TRAINING ? row('Câmera lenta (90 · 75 · 50%)', ico('L')) : ''}
      ${row('Ajudas visuais', ico('L2'))}
      ${row('Pausa', ico('start'))}
    </div>
    <ul class="tips">
      <li>Segure ${ico('A', 18)} ou ${ico('B', 18)}, aponte a direção e <b>solte</b> para executar o golpe.</li>
      <li>Use o golpe certo para a bola que chega: o atleta <b>brilha</b> dourado (ótimo), branco (bom), laranja (ruim) ou vermelho (pior).</li>
      <li>${ico('C', 18)} pula. No ar, com a barra cheia, ${ico('C', 18)} de novo solta o <b>especial</b>. ${ico('D', 18)} dá um <b>carrinho</b>.</li>
    </ul>`;
  }

  showOver(m) {
    const w = m.teams[m.winner];
    const pilots = m.teamPilots(w.id);
    const title = m.mode === 'versus' ? `${pilots.map(tag).join(' ')} VENCEU!` : (w.human ? 'VITÓRIA!' : 'DERROTA...');
    this.overHead = `<h2>${title}</h2><p class="sub">${m.teams[0].name} ${m.teams[0].score} × ${m.teams[1].score} ${m.teams[1].name}</p>`;
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
    if (e.type === 'point') {
      const good = m.mode === 'versus' || m.teams[e.winner].human;
      this.pop(e.reason, good ? 'good' : 'bad');
    } else if (e.type === 'swap') this.pop('TROCA DE LADO!', 'swap');
    else if (e.type === 'special') { this.pop(e.move.name, 'special'); this.callout.style.setProperty('--c', e.player.char.color); }
    else if (e.type === 'callout') {
      this.ticker.textContent = e.text;
      this.ticker.className = 'ticker show t' + e.team;
      this.tickerT = 1.1;
    } else if (e.type === 'over') this.showOver(m);
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
    return `${who}${this.ico('R', n)} formação: ${name(net)} na rede · ${backs.map(name).join(' e ')} no fundo<br><small>${line2}</small>`;
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
      // barra de especial individual de cada atleta
      const box = this.q('.t' + i + ' .meters');
      const tp = m.teamPlayers(i);
      const sig = settings.art + ':' + tp.map(p => p.char.id).join();
      if (box.dataset.sig !== sig) {
        box.dataset.sig = sig;
        box.innerHTML = tp.map(p => `<div class="pm"><img src="${portrait(p.char.id)}" alt=""><span class="bar"><i style="background:linear-gradient(90deg, ${p.char.color}, #ffd21a)"></i></span></div>`).join('');
      }
      box.querySelectorAll('.pm').forEach((el, k) => {
        const p = tp[k];
        el.querySelector('i').style.width = (100 * p.meter / SPECIAL.max) + '%';
        el.classList.toggle('full', p.meter >= SPECIAL.max);
      });
      const used = m.lastTeam === i && m.state === 'rally' && m.lastToucher && m.lastToucher !== m.server ? t.touches : 0;
      this.q('.t' + i + ' .touches').innerHTML = [1, 2, 3].map(n => `<b class="${n <= used ? 'on' : ''}"></b>`).join('');
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
