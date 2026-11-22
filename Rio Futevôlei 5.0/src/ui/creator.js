// Criador de personagem: nome, pele, cabelo, chapéu, blusa, bermuda, acessórios
// de pulso e de rosto, golpe especial (com descrição) e atributos (24 pontos).
// Prévia animada ao lado, no estilo artístico atual.
import { CHARACTERS, STAT_LABELS } from '../art/characters.js';
import { OPTIONS, SPECIAL_INFO, STAT_TOTAL, newRecipe, getRecipe, saveRecipe, deleteRecipe, buildCharacter, randomName } from '../art/custom.js';
import { MOVES } from '../moves.js';
import { drawAthlete } from '../art/draw.js';
import { poseFor } from '../art/poses.js';
import { dummy } from './portraits.js';
import { fitInto } from './fit.js';
import { padIcon } from './padIcons.js';
import { menuHoldTime } from '../v5.js';
import { styleOf } from '../input.js';
import { settings } from './settings.js';
const CREATOR_STEPS = ['Aparência', 'Roupa e acessórios', 'Jogo'];

const STAT_KEYS = ['forca', 'agilidade', 'precisao', 'pique'];
const PREVIEW_POSES = [
  ['Parado', {}], ['Correndo', { speed: 5 }], ['Chute', { swing: { anim: 'kick', kind: 'hit' } }],
  ['Cabeçada', { swing: { anim: 'header', kind: 'hit' } }], ['Especial', { special: true }],
];

export class CreatorScreen {
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.className = 'creator';
    parent.appendChild(this.el);
    this.active = false;
    this.el.addEventListener('click', e => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const i = +t.dataset.row;
      if (!Number.isNaN(i)) this.idx = i;
      const act = t.dataset.act;
      if (act === 'prev') this.change(-1);
      else if (act === 'next') this.change(1);
      else if (act === 'pick') this.pick(t.dataset.value);
      else if (act === 'row') this.confirm();
      this.render();
    });
    this.el.addEventListener('input', e => {
      if (e.target.name === 'nome') { this.r.name = e.target.value.slice(0, 12); this.msg = ''; }
    });
    this.el.addEventListener('keydown', e => {
      if (e.target.name === 'nome' && (e.key === 'Enter' || e.key === 'Escape')) { e.target.blur(); }
    });
  }

  open({ id, onClose, sfx }) {
    this.r = id ? getRecipe(id) : newRecipe();
    if (!this.r.altura) this.r.altura = '1.85'; // 5.0: altura (muda a hitbox e o desenho)
    this.editing = !!id;
    this.onClose = onClose;
    this.sfx = sfx;
    this.idx = 0;
    this.step = 0; // 5.0: etapa do formulário (aparência → roupa → jogo)
    this.msg = '';
    this.poseI = 0;
    this.poseT = 0;
    this.active = true;
    this.el.classList.add('show');
    this.build();
    this.render();
  }

  close(saved) {
    this.active = false;
    this.el.classList.remove('show');
    this.el.innerHTML = '';
    this.onClose(saved);
  }

  // ---------- linhas do formulário ----------
  // 5.0: em 3 etapas (nada de rolagem): aparência → roupa → jogo; a última é "Pronto!" (salva)
  steps() {
    const per = innerHeight < 520 ? 4 : 99, out = [];
    const all = this.allRows();
    CREATOR_STEPS.forEach((name, b) => {
      // a escolha do especial (com descrição) ganha etapa só dela
      if (per < 99 && b === 2) { const sp = all.filter(r => r.step === b && r.key === 'special'), st = all.filter(r => r.step === b && r.key !== 'special'); out.push({ name: name + ' (1/2)', rows: sp }, { name: name + ' (2/2)', rows: st }); return; }
      const rows = all.filter(r => r.step === b), parts = Math.ceil(rows.length / per), size = Math.ceil(rows.length / Math.max(1, parts)); // divide por igual
      for (let i = 0; i < parts; i++) out.push({ name: parts > 1 ? `${name} (${i + 1}/${parts})` : name, rows: rows.slice(i * size, (i + 1) * size) });
    });
    return out;
  }
  rows() {
    const steps = this.steps(), step = Math.min(this.step || 0, steps.length - 1);
    const last = step === steps.length - 1;
    return [
      ...steps[step].rows,
      ...(last && this.editing ? [{ type: 'action', act: 'delete', label: 'Excluir atleta' }] : []),
      step > 0 ? { type: 'action', act: 'prev', label: 'Voltar', nav: 'back' } : { type: 'action', act: 'cancel', label: 'Cancelar', nav: 'back' },
      last ? { type: 'action', act: 'save', label: 'Pronto!', nav: 'next' } : { type: 'action', act: 'next', label: 'Avançar', nav: 'next' },
    ];
  }
  allRows() {
    const r = this.r;
    const opt = (key, label, list, extra = {}) => ({ type: 'choice', key, label, list, ...extra });
    const color = (key, label) => ({ type: 'color', key, label, list: OPTIONS.color });
    const all = [
      { type: 'name', label: 'Nome', step: 0 },
      opt('skin', 'Pele', OPTIONS.skin, { swatch: true, step: 0 }),
      opt('hairStyle', 'Cabelo', OPTIONS.hairStyle, { step: 0 }),
      opt('hairColor', 'Cor do cabelo', OPTIONS.hairColor, { swatch: true, step: 0 }),
      opt('face', 'Rosto', OPTIONS.face, { step: 0 }),
      opt('headwear', 'Chapéu', OPTIONS.headwear, { step: 1 }),
      opt('topStyle', 'Blusa', OPTIONS.topStyle, { step: 1 }),
      { ...color('topColor', 'Cor da blusa'), step: 1 },
      opt('shortsStyle', 'Bermuda', OPTIONS.shortsStyle, { step: 1 }),
      { ...color('shortsColor', 'Cor da bermuda'), step: 1 },
      opt('wrist', 'Pulso', OPTIONS.wrist, { step: 1 }),
      { ...color('hatColor', 'Cor do chapéu / pulso'), step: 1 },
      // 5.0: altura do atleta, de 1,60 m a 2,05 m
      opt('altura', 'Altura', Array.from({ length: 10 }, (_, i) => { const v = (1.6 + i * 0.05).toFixed(2); return [v, v.replace('.', ',') + ' m']; }), { step: 0 }),
      opt('special', 'Especial', OPTIONS.special.map(id => [id, MOVES[id].name.replace('!', '')]), { step: 2 }),
      ...STAT_KEYS.map(k => ({ type: 'stat', key: k, label: STAT_LABELS[k], step: 2 })),
    ];
    return all;
  }

  spent() { return STAT_KEYS.reduce((a, k) => a + this.r.stats[k], 0); }

  change(step) {
    const row = this.rows()[this.idx];
    if (!row) return;
    const r = this.r;
    if (row.type === 'name') { r.name = randomName(); this.syncName(); }
    else if (row.type === 'choice' || row.type === 'color') {
      const vals = row.list.map(o => o[0]);
      const i = vals.indexOf(r[row.key]);
      r[row.key] = vals[(i + step + vals.length) % vals.length];
    } else if (row.type === 'stat') {
      const v = r.stats[row.key] + step;
      if (v < 1 || v > 10) return this.deny();
      if (step > 0 && this.spent() >= STAT_TOTAL) { this.msg = 'Sem pontos sobrando: tire de outro atributo.'; return this.deny(); }
      r.stats[row.key] = v;
      this.msg = '';
    }
    this.beep();
  }

  pick(value) {
    const row = this.rows()[this.idx];
    if (row && (row.type === 'choice' || row.type === 'color')) { this.r[row.key] = value; this.beep(); }
  }

  confirm() {
    const row = this.rows()[this.idx];
    if (!row) return;
    if (row.type === 'name') { const inp = this.el.querySelector('input[name=nome]'); if (inp) inp.focus(); return; }
    if (row.type !== 'action') return this.change(1);
    if (row.act === 'cancel') return this.close(false);
    if (row.act === 'prev') { this.step = Math.max(0, (this.step || 0) - 1); this.idx = 0; this.msg = ''; return this.render(); }
    if (row.act === 'next') { this.step = Math.min(this.steps().length - 1, (this.step || 0) + 1); this.idx = 0; this.msg = ''; return this.render(); }
    if (row.act === 'delete') { deleteRecipe(this.r.id); return this.close(true); }
    if (row.act === 'save') {
      this.r.name = (this.r.name || '').trim().slice(0, 12);
      if (!this.r.name) { this.msg = 'Dê um nome ao atleta.'; this.step = 0; this.idx = 0; return this.deny(); }
      const left = STAT_TOTAL - this.spent();
      if (left !== 0) { this.msg = `Distribua todos os ${STAT_TOTAL} pontos (faltam ${left}).`; return this.deny(); }
      const id = saveRecipe(this.r);
      if (!id) { this.msg = 'Limite de 6 atletas criados.'; return this.deny(); }
      this.close(true);
    }
  }

  back() {
    const inp = this.el.querySelector('input[name=nome]');
    if (inp && document.activeElement === inp) { inp.blur(); return; }
    if (this.step > 0) { this.step--; this.idx = 0; this.msg = ''; this.render(); return; }
    this.close(false);
  }

  beep() { if (this.sfx) this.sfx.onEvent({ type: 'select', vol: 0.6 }); }
  deny() { if (this.sfx) this.sfx.onEvent({ type: 'deny' }); this.render(); }

  syncName() { const inp = this.el.querySelector('input[name=nome]'); if (inp) inp.value = this.r.name; }

  // ---------- entrada (qualquer controle/teclado) ----------
  update(dt, time, port) {
    if (!this.active) return;
    const typing = document.activeElement && document.activeElement.name === 'nome';
    if (!typing) {
      const n = this.rows().length;
      let changed = false;
      // 5.0 (padrão de controle): direcional só navega · A acessa / muda ▶ · X muda ◀ · Start vai ao
      // Avançar / Pronto! · B vai ao Voltar (Start e B só levam o cursor; quem aperta é o A)
      const k = port.menu();
      if (k.up) { this.idx = (this.idx - 1 + n) % n; changed = true; }
      else if (k.down) { this.idx = (this.idx + 1) % n; changed = true; }
      const rows = this.rows(), cur = rows[this.idx];
      const navTo = kind => { const i = rows.findIndex(r => r.nav === kind); if (i >= 0 && i !== this.idx) { this.idx = i; this.beep(); } };
      if (k.left) { if (cur && cur.nav) { navTo('back'); changed = true; } }
      else if (k.right) { if (cur && cur.nav) { navTo('next'); changed = true; } }
      // segurar Start (2 s, editável): vai direto para o Pronto! (salva com as escolhas atuais)
      this.holdA = k.start ? 0.001 : (k.holdStart && this.holdA > 0 ? this.holdA + dt : 0);
      if (this.holdA >= menuHoldTime()) { this.holdA = -99; this.step = this.steps().length - 1; const rr = this.rows(); this.idx = rr.findIndex(r => r.nav === 'next'); this.confirm(); if (!this.active) return; changed = true; }
      else if (k.a) { this.confirm(); if (!this.active) return; changed = true; }
      else if (k.x) { if (cur && !cur.nav && cur.type !== 'action') { this.change(-1); changed = true; } }
      else if (k.start) { navTo('next'); changed = true; }
      else if (k.b) { navTo('back'); changed = true; }
      if (changed) this.render();
    }
    // prévia animada: troca de pose a cada 1,6 s
    this.poseT += dt;
    if (this.poseT > 1.6) { this.poseT = 0; this.poseI = (this.poseI + 1) % PREVIEW_POSES.length; this.el.querySelector('.cr-pose').textContent = PREVIEW_POSES[this.poseI][0]; }
    this.drawPreview(time);
  }

  drawPreview(time) {
    const ch = buildCharacter(this.r);
    ch.id = ch.id || 'preview';
    const [, extra] = PREVIEW_POSES[this.poseI];
    let o = { ...extra };
    const u = this.poseT / 1.6;
    if (o.swing) o.swing = { ...o.swing, t: 0.5 * ((u * 2) % 1) };
    if (o.special) { const mv = MOVES[ch.special]; o = { state: 'air', swing: { anim: mv.anim, kind: 'special', t: 0.5 * ((u * 1.6) % 1) } }; }
    if (o.speed) o.runPhase = time * 11;
    drawAthlete(this.ctx, ch, poseFor(dummy(o), time), time);
  }

  // ---------- desenho ----------
  build() {
    this.el.innerHTML = `
      <div class="cr-screen">
        <h2 class="cr-title">${this.editing ? 'EDITAR ATLETA' : 'CRIAR ATLETA'}</h2>
        <div class="cr-main">
          <div class="cr-preview">
            <canvas width="320" height="320"></canvas>
            <span class="cr-pose">${PREVIEW_POSES[0][0]}</span>
            <div class="cr-stats"></div>
          </div>
          <div class="cr-form"></div>
        </div>
        <p class="cr-hint">↑↓←→ escolhe · A acessa / muda ▶ · X muda ◀ · Start ou Enter Avançar · B ou Esc Voltar</p>
      </div>`;
    this.ctx = this.el.querySelector('canvas').getContext('2d');
  }

  render() {
    if (!this.active) return;
    const r = this.r;
    const rows = this.rows();
    this.idx = Math.min(this.idx, rows.length - 1);
    const left = STAT_TOTAL - this.spent();
    const html = rows.map((row, i) => {
      if (row.nav) return '';
      const focus = i === this.idx ? 'focus' : '';
      const nav = `<button type="button" class="arrow" data-act="prev" data-row="${i}">◀</button>`;
      const nav2 = `<button type="button" class="arrow" data-act="next" data-row="${i}">▶</button>`;
      if (row.type === 'name') {
        return `<div class="cr-row ${focus}" data-act="row" data-row="${i}"><span class="lbl">${row.label}</span>
          <input name="nome" maxlength="12" value="${(r.name || '').replace(/"/g, '&quot;')}" autocomplete="off" spellcheck="false">
          <button type="button" class="cr-small" data-act="next" data-row="${i}">Sortear</button></div>`;
      }
      if (row.type === 'color' || row.swatch) {
        return `<div class="cr-row ${focus}" data-act="row" data-row="${i}"><span class="lbl">${row.label}</span>
          <span class="swatches">${row.list.map(([v, name]) => `<button type="button" class="sw ${r[row.key] === v ? 'on' : ''}" title="${name}" style="--c:${v}" data-act="pick" data-row="${i}" data-value="${v}"></button>`).join('')}</span></div>`;
      }
      if (row.type === 'choice') {
        const cur = row.list.find(o => o[0] === r[row.key]);
        const desc = row.key === 'special' ? `<small class="cr-desc">${SPECIAL_INFO[r.special]}</small>` : '';
        return `<div class="cr-row ${focus} ${desc ? 'tall' : ''}" data-act="row" data-row="${i}"><span class="lbl">${row.label}</span>
          ${nav}<span class="val">${cur ? cur[1] : ''}</span>${nav2}${desc}</div>`;
      }
      if (row.type === 'stat') {
        const v = r.stats[row.key];
        return `<div class="cr-row stat ${focus}" data-act="row" data-row="${i}"><span class="lbl">${row.label}</span>
          ${nav}<span class="segs">${Array.from({ length: 10 }, (_, j) => `<i class="${j < v ? 'on' : ''}"></i>`).join('')}</span><b>${v}</b>${nav2}</div>`;
      }
      return `<button type="button" class="cr-btn ${row.act} ${focus}" data-act="row" data-row="${i}">${row.label}</button>`;
    }).join('');
    const form = this.el.querySelector('.cr-form');
    const typing = document.activeElement && document.activeElement.name === 'nome';
    if (typing) {
      // não recria o campo enquanto a pessoa digita
      form.querySelectorAll('.cr-row').forEach((el, i) => el.classList.toggle('focus', i === this.idx));
    } else {
      const steps = this.steps(), step = Math.min(this.step || 0, steps.length - 1);
      const ic = a => padIcon(a, styleOf(1, settings.p1 === 'xbox' ? 'xbox' : 'ps'), 18); // 5.0: dispositivo do J1
      const navBtn = (row, i) => `<button type="button" class="cr-btn cr-${row.nav} ${i === this.idx ? 'focus' : ''}" data-act="row" data-row="${i}">${row.nav === 'back' ? ic('B') + ' ' : ''}${row.label}${row.nav === 'next' ? ' ' + (/^(full|kb1|kb2)$/.test(styleOf(1, 'ps')) ? '<kbd class="key-cap">Enter</kbd>' : ic('start')) : ''}</button>`;
      const navs = rows.map((row, i) => [row, i]).filter(([row]) => row.nav);
      form.innerHTML = `<div class="fit-in"><p class="cr-step">Etapa ${step + 1} de ${steps.length} · <b>${steps[step].name}</b></p>${html}
        ${steps[step].rows.some(r => r.type === 'stat') ? `<p class="cr-points ${left ? 'warn' : ''}">Pontos sobrando: <b>${left}</b> de ${STAT_TOTAL}</p>` : ''}${this.msg ? `<p class="cr-msg">${this.msg}</p>` : ''}
        <div class="cr-nav"><span>${navs.filter(([r]) => r.nav === 'back').map(([r, i]) => navBtn(r, i)).join('')}</span><span>${navs.filter(([r]) => r.nav === 'next').map(([r, i]) => navBtn(r, i)).join('')}</span></div></div>`;
      fitInto(form, form.firstElementChild); // 5.0: nada de rolagem
    }
    const ch = buildCharacter(r);
    this.el.querySelector('.cr-stats').innerHTML = `<b class="cr-name" style="color:${ch.color}">${r.name || '?'}</b>
      <small>Especial: ${MOVES[r.special].name.replace('!', '')}</small>`;
  }
}
