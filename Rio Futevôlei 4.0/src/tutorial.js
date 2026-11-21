// 4.0: Tutorial — o Treinador Moacir (CT da Urca) ensina os fundamentos na prática.
// Treino 1 contra 1 sem placar (Match com practice: a CPU sempre saca a bola colocada); cada etapa
// termina quando o jogador faz o fundamento pedido (lido dos eventos da partida).
import { SPECIAL } from './config.js';
import { portrait } from './ui/portraits.js';

// {A} {B} {C} {D} viram os ícones do controle do jogador 1
const STEPS = [
  { id: 'move', text: 'Bem-vinda ao CT da Urca! Primeiro, ande pela areia com o direcional.', done: t => t.moved > 4 },
  { id: 'fast', text: 'Segure {A}: a hitbox verde aparece. Quando a bola entrar nela, o tempo para. Solte {A}: bola rápida e longa.',
    hit: e => e.tilt && e.tilt.key === 'A' && !e.tilt.air && !e.tilt.special },
  { id: 'precise', text: 'Agora segure {B} e solte na pausa: bola alta, curta e precisa — a melhor para passar para a parceira.',
    hit: e => e.tilt && e.tilt.key === 'B' && !e.tilt.air && !e.tilt.special },
  { id: 'aim', text: 'Na pausa, o direcional gira a seta para qualquer lado. Segure {A} ou {B}, gire a seta bem para o lado e solte.',
    hit: e => e.tilt && !e.tilt.air && Math.abs(Math.atan2(Math.sin(e.tilt.angle - e.tilt.base), Math.cos(e.tilt.angle - e.tilt.base))) > 0.6 },
  { id: 'cut', text: '{C} pula. No ar, segure {A}: a cortada sai a 45°, para onde a seta apontar.',
    hit: e => e.tilt && e.tilt.air && e.tilt.key === 'A' && !e.tilt.special },
  { id: 'mate', text: 'No ar, {B} manda a bola direto para a região da parceira, sem pausa. Pule com {C} e segure {B}.',
    hit: e => e.tilt && e.tilt.air && e.tilt.key === 'B' },
  { id: 'dive', text: 'Bola longe? {D} faz o carrinho: você se joga na areia e salva a bola.', hit: e => e.kind === 'dive' },
  { id: 'special', text: 'Sua barra encheu! Dois toques rápidos em {A} (e segure) armam o especial de ataque. {B}{B} é o de defesa.',
    fill: true, special: true },
  { id: 'end', text: 'É isso! Você já sabe os fundamentos do futevôlei. Agora é treinar e jogar!', end: 4 },
];

export class Tutorial {
  // hud: para os ícones e o painel · onEnd: chamado no fim (volta ao menu)
  constructor(match, hud, onEnd) {
    Object.assign(this, { match, hud, onEnd });
    this.i = 0; this.t = 0; this.moved = 0; this.okT = 0;
    this.pl = match.players.find(p => !p.ai);
    this.last = this.pl ? { x: this.pl.x, z: this.pl.z } : null;
    this.el = document.createElement('div');
    this.el.className = 'coach show';
    hud.el.appendChild(this.el);
    this.render();
  }
  get step() { return STEPS[this.i]; }
  render() {
    const ico = k => this.hud.ico(k, 1, 20);
    const txt = this.step.text.replace(/\{([ABCD])\}/g, (_, k) => ico(k));
    this.el.innerHTML = `<img src="${portrait('treinador')}" alt="">
      <div><b>Treinador Moacir</b><p>${txt}</p>
      <span class="coach-steps">${STEPS.map((s, k) => `<i class="${k < this.i ? 'on' : k === this.i ? 'cur' : ''}"></i>`).join('')}</span>
      ${this.okT > 0 ? '<em class="coach-ok">Isso!</em>' : ''}</div>`;
  }
  next() {
    this.i = Math.min(STEPS.length - 1, this.i + 1);
    this.t = 0; this.okT = 1.2;
    this.hud.pop('ISSO!', 'good');
    this.render();
  }
  skip() { if (this.i < STEPS.length - 1) this.next(); }
  onEvent(e) {
    const st = this.step;
    if (!this.pl) return;
    if (e.type === 'hit' && e.player === this.pl && st.hit && st.hit(e)) this.next();
    else if (e.type === 'special' && e.player === this.pl && st.special) this.next();
  }
  update(dt) {
    const st = this.step, pl = this.pl;
    this.t += dt;
    if (this.okT > 0) { this.okT -= dt; if (this.okT <= 0) this.render(); }
    if (pl && this.last) { this.moved += Math.hypot(pl.x - this.last.x, pl.z - this.last.z); this.last = { x: pl.x, z: pl.z }; }
    if (st.done && st.done(this)) this.next();
    // especial: a barra fica cheia até sair o especial
    if (st.fill && pl && pl.meter < SPECIAL.max) pl.meter = SPECIAL.max;
    if (st.end && this.t > st.end) { this.close(); this.onEnd(); }
  }
  close() { this.el.remove(); }
}
