// 5.0: tela "Jogadores" — antes do menu inicial (e em Configurações → Controles) detecta o teclado e os
// controles e cada um vira o jogador 1, 2, 3 ou 4. Dispositivo que não entrar não conta no jogo.
//   controle: A entra · ◀ ▶ troca o número · B sai · Menu começa
//   teclado:  Espaço (ou L) entra · Numpad0 (ou /) entra o 2º jogador no teclado (metade direita) ·
//             Esc sai · Enter começa
import { seats, seatedPlayers, connectedPads, padButtons, padKind, KB_JOIN, KB_LEAVE, MAX_PLAYERS, padStyleFor, setPadStyle, styleOf } from '../input.js';
import { padIndex } from '../v5.js';
import { PLAYER_COLORS } from './portraits.js';
import { padIcon } from './padIcons.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const padName = gp => (gp.id || '').replace(/\(.*$/, '').trim() || 'Controle';
const KIND_NAME = { xbox: 'Controle Xbox', ps: 'Controle PlayStation' };

export class JoinScreen {
  constructor(parent, keyboard) {
    this.kb = keyboard;
    this.el = document.createElement('div');
    this.el.className = 'join';
    parent.appendChild(this.el);
    this.active = false;
    this.prevKeys = new Set();
    this.prevPad = new Map(); // gp.index → botões apertados no quadro anterior
    this.el.addEventListener('click', e => {
      const out = e.target.closest('[data-out]');
      if (out) { this.leave(+out.dataset.out); return; }
      const mv = e.target.closest('[data-mv]');
      if (mv) { this.move(+mv.dataset.n, +mv.dataset.mv); return; }
      const ps = e.target.closest('[data-pst]');
      if (ps) { setPadStyle(+ps.dataset.n, ps.dataset.pst); this.beep(true); this.render(); return; }
      if (e.target.closest('[data-kbjoin]')) { this.join({ kind: 'kb', half: this.kbHalfFree() }); return; }
      if (e.target.closest('[data-go]')) this.done();
    });
  }

  // onDone(): os assentos já estão em seats · sfx: sons do menu
  open({ onDone, sfx, from = 'boot' }) {
    Object.assign(this, { onDone, sfx, from });
    this.active = true;
    this.note = '';
    // não conta o botão que abriu a tela
    this.prevKeys = new Set(this.kb.keys);
    this.prevPad = new Map(connectedPads().map(gp => [gp.index, padButtons(gp)]));
    this.el.classList.add('show');
    this.key = '';
    this.render();
  }
  close() { this.active = false; this.el.classList.remove('show'); this.el.innerHTML = ''; }

  beep(ok) { if (this.sfx) this.sfx.onEvent({ type: ok ? 'select' : 'deny', vol: ok ? 1 : 0.6 }); }
  freeSeat() { return [1, 2, 3, 4].find(n => !seats[n]); }
  seatOfPad(index) { return [1, 2, 3, 4].find(n => seats[n] && seats[n].kind === 'pad' && seats[n].index === index); }
  seatOfKb(half) { return [1, 2, 3, 4].find(n => seats[n] && seats[n].kind === 'kb' && (seats[n].half || 1) === half); }
  kbHalfFree() { return this.seatOfKb(1) ? 2 : 1; }

  join(dev) {
    const n = this.freeSeat();
    if (!n) { this.note = `Já tem ${MAX_PLAYERS} jogadores.`; this.beep(false); return; }
    if (dev.kind === 'kb' && this.seatOfKb(dev.half)) { this.beep(false); return; }
    if (dev.kind === 'pad') dev.style = padStyleFor(dev.id); // 5.0: tipo de botões (Y troca)
    seats[n] = dev;
    this.note = `J${n} entrou`;
    this.beep(true);
  }
  leave(n) {
    if (!seats[n]) return;
    seats[n] = null;
    // 2º jogador do teclado sozinho: vira o teclado inteiro (metade 1)
    const k = [1, 2, 3, 4].filter(x => seats[x] && seats[x].kind === 'kb');
    if (k.length === 1) seats[k[0]].half = 1;
    this.note = `J${n} saiu`;
    this.beep(true);
  }
  // troca o número do jogador (◀ ▶): passa para o número vizinho, trocando com quem estiver lá
  move(n, d) {
    const to = n + d;
    if (to < 1 || to > MAX_PLAYERS || !seats[n]) { this.beep(false); return; }
    [seats[n], seats[to]] = [seats[to], seats[n]];
    this.note = `Agora é J${to}`;
    this.beep(true);
  }
  done() {
    if (!seatedPlayers().length) { this.note = 'Pelo menos um jogador precisa entrar.'; this.beep(false); return; }
    // sem buracos: os números ficam em sequência (J1, J2…) na ordem escolhida
    const list = [1, 2, 3, 4].map(n => seats[n]).filter(Boolean);
    [1, 2, 3, 4].forEach((n, i) => { seats[n] = list[i] || null; });
    this.beep(true);
    this.close();
    this.onDone();
  }

  update() {
    if (!this.active) return;
    // teclado
    const keys = this.kb.keys, hit = code => (keys.has(code) || this.kb.tapped.has(code)) && !this.prevKeys.has(code);
    const any = list => list.some(hit);
    if (any(['Enter', 'NumpadEnter']) && this.seatOfKb(1)) { this.prevKeys = new Set(keys); this.done(); return; }
    if (any(KB_JOIN[1]) && !this.seatOfKb(1)) this.join({ kind: 'kb', half: 1 });
    else if (any(KB_JOIN[2]) && !this.seatOfKb(2) && this.seatOfKb(1)) this.join({ kind: 'kb', half: 2 });
    if (any(KB_LEAVE[1]) && this.seatOfKb(1)) this.leave(this.seatOfKb(1));
    if (any(KB_LEAVE[2]) && this.seatOfKb(2)) this.leave(this.seatOfKb(2));
    for (const half of [1, 2]) {
      const n = this.seatOfKb(half);
      if (!n) continue;
      const L = half === 2 || this.seatOfKb(2) ? (half === 1 ? ['KeyA'] : ['ArrowLeft']) : ['KeyA', 'ArrowLeft'];
      const R = half === 2 || this.seatOfKb(2) ? (half === 1 ? ['KeyD'] : ['ArrowRight']) : ['KeyD', 'ArrowRight'];
      if (any(L)) this.move(n, -1); else if (any(R)) this.move(n, 1);
    }
    this.prevKeys = new Set(keys);
    // controles
    for (const gp of connectedPads()) {
      const now = padButtons(gp), before = this.prevPad.get(gp.index) || new Set();
      this.prevPad.set(gp.index, now);
      const ax = gp.axes[0] || 0;
      const stick = ax < -0.6 ? 'l' : ax > 0.6 ? 'r' : '';
      const stickHit = stick && this['stick' + gp.index] !== stick;
      this['stick' + gp.index] = stick;
      const press = i => now.has(i) && !before.has(i);
      const n = this.seatOfPad(gp.index);
      if (!n) {
        if (press(padIndex('C')) || press(padIndex('start'))) this.join({ kind: 'pad', index: gp.index, id: gp.id });
        continue;
      }
      if (press(padIndex('start'))) { this.done(); return; }
      if (press(padIndex('B'))) { this.leave(n); continue; }
      // 5.0: Y troca o tipo de botões do controle (Xbox / PlayStation)
      if (press(padIndex('D'))) { setPadStyle(n, styleOf(n, 'xbox') === 'ps' ? 'xbox' : 'ps'); this.note = `J${n}: botões ${styleOf(n) === 'ps' ? 'PlayStation' : 'Xbox'}`; this.beep(true); }
      if (press(14) || (stickHit && stick === 'l')) this.move(n, -1);
      else if (press(15) || (stickHit && stick === 'r')) this.move(n, 1);
    }
    this.render();
  }

  render() {
    const pads = connectedPads();
    const card = n => {
      const st = seats[n], col = PLAYER_COLORS[n];
      let dev = '<span class="jn-wait">Aperte <b>A</b> no controle<br>ou <b>Espaço</b> no teclado</span>';
      if (st && st.kind === 'kb') dev = `<b class="jn-dev">⌨️ Teclado</b><small>${this.seatOfKb(2) ? (st.half === 2 ? 'metade direita (setas)' : 'metade esquerda (WASD)') : 'inteiro'}</small>`;
      else if (st) {
        const gp = pads.find(g => g.index === st.index);
        const sty = styleOf(n, 'xbox');
        dev = `<b class="jn-dev">🎮 ${esc(KIND_NAME[sty])}</b><small>${gp ? esc(padName(gp)) : 'desconectado'}</small>
          <span class="jn-pst">Botões: <button type="button" class="${sty === 'xbox' ? 'on' : ''}" data-n="${n}" data-pst="xbox">Xbox</button><button type="button" class="${sty === 'ps' ? 'on' : ''}" data-n="${n}" data-pst="ps">PlayStation</button></span>`;
      }
      return `<div class="jn-card ${st ? 'on' : ''}" style="--pc:${col}">
        <div class="jn-top"><span class="ptag" style="--pc:${col}">J${n}</span>${st ? `<button type="button" class="jn-x" data-out="${n}" aria-label="Tirar J${n}">Sair</button>` : ''}</div>
        <div class="jn-body">${dev}</div>
        ${st ? `<div class="jn-mv"><button type="button" data-n="${n}" data-mv="-1" aria-label="Número anterior" ${n === 1 ? 'disabled' : ''}>◀</button><span>número</span><button type="button" data-n="${n}" data-mv="1" aria-label="Próximo número" ${n === MAX_PLAYERS ? 'disabled' : ''}>▶</button></div>` : ''}
      </div>`;
    };
    // dispositivos encontrados que ainda não entraram
    const free = pads.filter(gp => !this.seatOfPad(gp.index)).map(gp => esc(KIND_NAME[padKind(gp.id)] || padName(gp)));
    const kbFree = !this.seatOfKb(1);
    const list = [...(kbFree ? ['Teclado'] : []), ...free];
    const xa = padIcon('C', 'xbox', 18), xb = padIcon('B', 'xbox', 18), xm = padIcon('start', 'xbox', 18);
    const html = `<div class="jn-box">
      <h2>JOGADORES</h2>
      <p class="sub">Cada um entra com o seu controle ou com o teclado. Quem não entrar não joga.</p>
      <div class="jn-cards">${[1, 2, 3, 4].map(card).join('')}</div>
      <p class="jn-free">${list.length ? 'Fora do jogo: ' + list.join(' · ') : 'Todos os dispositivos encontrados já entraram.'}${kbFree ? ' <button type="button" class="jn-kb" data-kbjoin="1">Teclado entra</button>' : ''}</p>
      <p class="jn-help">Controle: ${xa} entra · ◀ ▶ troca o número · ${padIcon('D', 'xbox', 18)} troca os botões (Xbox / PlayStation) · ${xb} sai · ${xm} começa &nbsp;·&nbsp; Teclado: Espaço entra · Numpad0 ou / entra o 2º jogador no teclado · A D troca o número · Esc sai · Enter começa</p>
      <div class="jn-foot"><span class="jn-note">${esc(this.note)}</span><button type="button" class="jn-go menu-btn" data-go="1">${this.from === 'settings' ? 'Pronto' : 'Começar'}</button></div>
    </div>`;
    if (html !== this.key) { this.key = html; this.el.innerHTML = html; }
  }
}
