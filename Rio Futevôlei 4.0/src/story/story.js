// 4.0 Modo História.
// Urca (etapa 2): intro (Zefa busca a Giulia) → tutorial no CT → desafio do Rolando e da Marra (6 pontos,
//   nível 12) → dia seguinte, bairro livre com relógio → campeonato do CT da Urca (3 chaves) → o treinador
//   ensina 2 especiais; as obras acabam e o ônibus volta.
// Rio Futevôlei (etapa 3): inscrição no CT do Posto 5 (Copacabana) → 10 partidas, uma por bairro, na ordem
//   (cada vitória ensina um especial de ataque) → final em Copacabana contra o Rolando e a Marra →
//   no Difícil, o epílogo: duelo contra o King Size de Niterói no CT da Urca.
// Entre as partidas: ônibus entre os 12 bairros, comércio, desafios nos CTs (1 por dia em cada) e salvar.
// O main entrega: startMatch(cfg, onEnd), startTutorial(onEnd), quit(), ico(k), aspect().
import { CHARACTERS } from '../art/characters.js';
import { portrait } from '../ui/portraits.js';
import { itemsOf, itemIcon, ITEMS } from '../items.js';
import { CONSUMABLES, COND, FLAG_NAMES, WEATHER, WEATHER_ON, freshCondition, rollWeather } from '../condition.js';
import { TILT } from '../tilt.js';
import { buildStreet, Actor, BOUNDS } from './street.js';
import { writeSave } from './save.js';
import { interior } from './interiors.js';
import {
  DIFFICULTY, levelAt, CLOCK, DRAIN, TIME_COST, CT, HOODS, HOOD_ORDER, BUS, CT_DUOS, athleteSpecials, gearHas, CHALLENGE, ROUTE, RIO, GYM, GEAR,
  FOOD_PRICES, SPA, FASHION, FASHION_KINDS, VEGGIES, LOTTERY, groupOf, drawLottery, SCRIPT, SHOP_NAMES,
} from './data.js';

const WALK_SPEED = 4.6;
const NEAR = 1.6; // distância para interagir com uma porta
const fmtTime = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
const money = v => `R$ ${v}`;
const spName = id => { const d = TILT.data.specialDefs && TILT.data.specialDefs[id]; return id ? (d && d.name) || id : 'nenhum'; };

// jogos salvos antes da etapa 3 ganham os campos novos
function upgrade(s) {
  s.busOpen = s.busOpen ?? s.ct.urca.done;
  s.gear = s.gear || [];
  s.rio = s.rio || { next: 0 };
  s.challenged = s.challenged || {};
  s.train = s.train || { day: 0, count: 0 };
  s.cond.zefa = { ...freshCondition(), immune: true }; // a Zefa não sente fome, sede nem forma
  return s;
}

export class StoryMode {
  constructor(parent, deps) {
    this.deps = deps;
    this.el = document.createElement('div');
    this.el.className = 'story';
    parent.appendChild(this.el);
    this.el.innerHTML = `
      <div class="st-night"></div>
      <div class="st-bg"></div>
      <div class="st-bar"></div>
      <div class="st-goal"></div>
      <div class="st-prompt"></div>
      <div class="st-dialog"></div>
      <div class="st-panel"></div>
      <div class="st-fade"></div>`;
    const q = s => this.el.querySelector(s);
    Object.assign(this, { night: q('.st-night'), bg: q('.st-bg'), bar: q('.st-bar'), goal: q('.st-goal'), prompt: q('.st-prompt'), dlg: q('.st-dialog'), panelEl: q('.st-panel'), fade: q('.st-fade') });
    this.active = false;
    this.state = 'idle'; // walk | dialog | panel | fade | away (partida / tutorial)
    this.streets = {};
    this.street = null;
    this.extras = [];
    this.el.addEventListener('click', e => {
      const it = e.target.closest('[data-i]');
      if (it && this.state === 'panel') { this.pi = +it.dataset.i; this.choose(); return; }
      if (this.state === 'dialog') this.advance();
    });
  }

  // ================= início / fim =================
  start(save) {
    this.s = upgrade(save);
    this.active = true;
    this.el.classList.add('show');
    this.applyLook();
    this.goHood(this.s.hood, this.s.x);
    this.barHTML = null;
    this.renderBar();
    this.resume();
  }
  stop() {
    this.active = false;
    this.el.classList.remove('show');
    this.clearExtras();
    this.setBg(null);
    this.state = 'idle';
  }
  // troca de bairro: monta (uma vez) a rua dele e põe a Giulia no x pedido
  goHood(id, x) {
    if (this.street && this.me) this.street.removeActor(this.me);
    this.clearExtras();
    if (!this.streets[id]) this.streets[id] = buildStreet({ id, ...HOODS[id] });
    this.street = this.streets[id];
    if (this.deps.aspect) this.street.setAspect(this.deps.aspect());
    this.street.setRoadWorks(id === 'urca' && !this.s.busOpen);
    this.s.hood = id;
    if (!this.me) this.me = new Actor(this.giuliaChar(), x);
    this.street.addActor(this.me);
    this.me.x = x; this.s.x = x;
    this.cam(x);
  }
  // retoma o roteiro do ponto salvo
  resume() {
    const st = this.s.step;
    if (st === 'intro') return this.runIntro();
    if (st === 'tutorial') return this.runTutorial();
    if (st === 'king') return this.runKing();
    if (st === 'day2') return this.runDay2();
    this.walk();
  }

  // ================= personagens =================
  // a Giulia da história usa as roupas da Moda (personagem próprio, para não mudar a Giulia da Exibição)
  giuliaChar() { return CHARACTERS.giulia_s || CHARACTERS.giulia; }
  applyLook() {
    const base = CHARACTERS.giulia, look = {};
    for (const k of ['blusa', 'short', 'cabeca']) {
      const item = FASHION.find(f => f.id === this.s.wear[k]);
      if (item) Object.assign(look, item.look);
    }
    const prev = CHARACTERS.giulia_s;
    CHARACTERS.giulia_s = { ...base, ...look, id: 'giulia_s', npc: true, version: ((prev && prev.version) || 0) + 1 };
    if (this.me) this.me.setChar(CHARACTERS.giulia_s);
  }
  addExtra(id, x, facing = -1) {
    const a = new Actor(CHARACTERS[id], x);
    a.facing = facing;
    this.street.addActor(a);
    this.extras.push(a);
    return a;
  }
  clearExtras() { if (this.street) for (const a of this.extras) this.street.removeActor(a); this.extras = []; }

  // ================= roteiro: Urca =================
  runIntro() {
    if (this.s.hood !== 'urca') this.goHood('urca', 4.75);
    this.clearExtras();
    const home = this.door('casa').x;
    this.me.x = home - 0.6; this.me.facing = 1;
    this.addExtra('zefa', home + 1.6, -1);
    this.cam(home);
    this.say(SCRIPT.intro, () => this.fadeTo('Mais tarde, no CT da Urca...', () => {
      this.s.step = 'tutorial';
      this.runTutorial();
    }));
  }
  // cena no CT do bairro: Giulia, Zefa e quem mais estiver (ids à esquerda, de frente para elas)
  ctScene(others = ['treinador']) {
    this.clearExtras();
    const x = this.street.spots.ct - 4;
    this.me.x = x; this.me.facing = -1;
    this.addExtra('zefa', x + 1.4, -1);
    others.forEach((id, i) => this.addExtra(id, x - 3 - i * 1.6 - (i >= 1 ? 2.2 : 0), 1));
    this.cam(x - 2);
  }
  runTutorial() {
    this.ctScene();
    this.say(SCRIPT.ctArrive, () => {
      this.away();
      this.deps.startTutorial(() => {
        this.back();
        this.s.step = 'king';
        this.runKing();
      });
    });
  }
  runKing() {
    this.ctScene(['treinador', 'rolando', 'marra']);
    this.say(SCRIPT.talent, () => {
      this.playMatch({ opp: ['rolando', 'marra'], level: 12, points: 6, title: 'DESAFIO DO REI DA AREIA' }, won => {
        this.ctScene(['treinador', 'rolando', 'marra']);
        this.say(won ? SCRIPT.wonVsKing : SCRIPT.lostToKing, () => this.fadeTo('Fim do dia 1', () => {
          this.sleep(false);
          this.s.step = 'day2';
          this.runDay2();
        }));
      });
    });
  }
  runDay2() {
    this.clearExtras();
    const home = this.door('casa').x;
    this.me.x = home; this.me.facing = 1;
    this.addExtra('zefa', home + 1.5, -1);
    this.cam(home);
    this.say(SCRIPT.day2, () => {
      this.clearExtras();
      this.s.step = 'champ';
      this.save(true);
      this.walk();
    });
  }
  playRound() {
    const c = this.s.ct.urca, r = CT.urca.rounds[c.round];
    const lv = levelAt(this.s.difficulty, r.f);
    this.playMatch({ opp: r.team, level: lv, points: 12, title: `CT DA URCA · ${r.name.toUpperCase()}` }, won => {
      this.ctScene();
      if (!won) { this.say(SCRIPT.roundLost, () => this.walk()); return; }
      this.s.money += r.prize;
      c.round++;
      if (c.round >= CT.urca.rounds.length) { c.done = true; this.ctWon(); return; }
      this.say([...SCRIPT.roundWon, [null, `Prêmio da ${r.name}: ${money(r.prize)}.`]], () => this.askSave());
    });
  }
  ctWon() {
    this.ctScene(['treinador', 'rolando', 'marra']);
    this.say(SCRIPT.ctWon, () => {
      this.learn('giulia', 'attack', ['sharkSupremo', 'pingoPipoca']);
      this.s.step = 'free';
      this.s.busOpen = true;
      this.street.setRoadWorks(false);
      this.clearExtras();
      this.say(SCRIPT.busOpen, () => { this.save(true); this.walk(); });
    });
  }

  // ================= roteiro: Rio Futevôlei =================
  register() {
    this.ctScene(['tiao']);
    this.say(SCRIPT.register, () => {
      this.s.step = 'rio';
      this.s.rio = { next: 0 };
      this.save(true);
      this.clearExtras();
      this.walk();
    });
  }
  playRio() {
    const i = this.s.rio.next, r = ROUTE[i], h = HOODS[r.hood];
    const lv = levelAt(this.s.difficulty, RIO.f(i));
    this.playMatch({ opp: CT_DUOS[r.hood], level: lv, points: RIO.points, title: `RIO FUTEVÔLEI · PARTIDA ${i + 1} DE 10 · ${h.name.toUpperCase()}` }, won => {
      this.ctScene(CT_DUOS[r.hood]);
      if (!won) { this.say(SCRIPT.rioLost, () => { this.clearExtras(); this.walk(); }); return; }
      const prize = RIO.prize(i);
      this.s.money += prize;
      this.s.rio.next++;
      this.learn('giulia', 'attack', [r.special]);
      const done = this.s.rio.next >= ROUTE.length;
      if (done) this.s.step = 'final';
      this.say([
        [CT_DUOS[r.hood][0], 'Vocês jogam muito. Mereceram.'],
        [null, `Vitória ${i + 1} de 10! Prêmio: ${money(prize)}.`],
        [null, `Giulia aprendeu um especial novo: ${spName(r.special)}! (Pausa → Especiais)`],
        ...(done ? SCRIPT.finalReady : [['zefa', `Próxima parada: ${HOODS[ROUTE[i + 1].hood].name}!`]]),
      ], () => { this.clearExtras(); this.askSave(); });
    });
  }
  playFinal() {
    this.ctScene(['rolando', 'marra']);
    this.say(SCRIPT.finalPre, () => {
      const lv = DIFFICULTY[this.s.difficulty].levels[1];
      this.playMatch({ opp: ['rolando', 'marra'], level: lv, points: RIO.finalPoints, title: 'GRANDE FINAL DO RIO FUTEVÔLEI' }, won => {
        this.ctScene(['rolando', 'marra', 'treinador']);
        if (!won) { this.say(SCRIPT.finalLost, () => { this.clearExtras(); this.walk(); }); return; }
        this.s.money += RIO.finalPrize;
        this.s.queen = true;
        this.say([...SCRIPT.finalWon, [null, `Prêmio da final: ${money(RIO.finalPrize)}.`]], () => {
          if (this.s.difficulty === 'dificil') {
            this.say(SCRIPT.credits.slice(0, 1), () => this.fadeTo('Na manhã seguinte...', () => {
              this.goHood('urca', 4.75);
              this.sleep(false);
              this.s.step = 'kingsize';
              this.runEpilogue();
            }));
          } else {
            this.s.step = 'end';
            this.save(true);
            this.say([...SCRIPT.credits, ...SCRIPT.hardHint], () => { this.clearExtras(); this.walk(); });
          }
        });
      });
    });
  }
  runEpilogue() {
    this.clearExtras();
    const home = this.door('casa').x;
    this.me.x = home; this.me.facing = 1;
    this.addExtra('zefa', home + 1.5, -1);
    this.addExtra('treinador', home + 3, -1);
    this.cam(home);
    this.say(SCRIPT.epilogue, () => { this.clearExtras(); this.save(true); this.walk(); });
  }
  playKingSize() {
    this.ctScene(['kingSize', 'icarai']);
    this.say(SCRIPT.kingSizePre, () => {
      this.playMatch({ opp: ['kingSize', 'icarai'], level: 12, points: RIO.finalPoints, title: 'DUELO: KING SIZE DE NITERÓI' }, won => {
        this.ctScene(['kingSize', 'icarai', 'treinador']);
        if (!won) { this.say(SCRIPT.kingSizeLost, () => { this.clearExtras(); this.walk(); }); return; }
        this.s.step = 'end';
        this.s.kingSize = true;
        this.save(true);
        this.say(SCRIPT.kingSizeWon, () => { this.clearExtras(); this.walk(); });
      });
    });
  }
  // desafio do CT: a dupla do bairro, 1 vez por dia, prêmio pequeno
  playChallenge() {
    const h = this.s.hood, duo = CT_DUOS[h];
    this.s.challenged[h] = this.s.day;
    const lv = levelAt(this.s.difficulty, CHALLENGE.f + (this.s.rio.next || 0) * 0.04);
    this.playMatch({ opp: duo, level: lv, points: CHALLENGE.points, title: `DESAFIO · ${HOODS[h].ct.toUpperCase()}` }, won => {
      this.ctScene(duo);
      const prize = this.price(CHALLENGE.prize);
      if (won) this.s.money += prize;
      this.say([[duo[0], won ? `Boa partida! Toma aqui: ${money(prize)}. Volta amanhã para a revanche.` : 'Hoje foi nosso! Volta amanhã.']], () => { this.clearExtras(); this.walk(); });
    });
  }
  learn(who, row, ids) {
    const l = this.s.specials[who];
    for (const id of ids) if (!l[row].includes(id)) l[row].push(id);
    if (!l.eq[row]) l.eq[row] = l[row][0];
  }
  askSave() {
    this.panel({ title: 'Salvar o jogo?', bg: 'ct', items: [{ label: 'Salvar agora', act: () => { this.save(); this.walk(); } }, { label: 'Agora não', act: () => this.walk() }] });
  }
  objective() {
    const s = this.s, st = s.step, c = s.ct.urca;
    if (st === 'champ' && !c.done) return `Campeonato do CT da Urca · ${CT.urca.rounds[c.round].name}: vá ao CT, na praia (à esquerda)`;
    if (st === 'free') return 'Pegue o ônibus (ponto na esquina) até Copacabana e se inscreva no Rio Futevôlei no CT do Posto 5';
    if (st === 'rio') { const r = ROUTE[s.rio.next]; return `Rio Futevôlei · partida ${s.rio.next + 1} de 10: ${HOODS[r.hood].ct} (${HOODS[r.hood].name})`; }
    if (st === 'final') return 'GRANDE FINAL: volte a Copacabana, CT do Posto 5';
    if (st === 'kingsize') return 'Duelo contra o King Size de Niterói: CT da Urca';
    if (st === 'end') return s.kingSize ? 'Rainha da Areia dos dois lados da baía! Desafie os CTs quando quiser' : 'Rainha da Areia! Desafie os CTs quando quiser';
    return '';
  }

  // ================= partida =================
  // cfg: { opp: [ids], level, points, title }
  playMatch(cfg, onEnd) {
    const s = this.s, diff = DIFFICULTY[s.difficulty], sp = s.specials;
    const g = { ...s.cond.giulia, visor: gearHas(s.gear, 'sol').length > 0 };
    this.away();
    const wx = s.weather.some(WEATHER_ON) ? s.weather.filter(WEATHER_ON).map(k => WEATHER[k].icon + ' ' + WEATHER[k].name).join(' e ') : '☀ tempo bom';
    const info = { us: ['giulia_s', 'zefa'], them: cfg.opp, title: cfg.title, sub: `${HOODS[s.hood].ct} · ${cfg.points} pontos · CPU nível ${cfg.level} · ${wx}` };
    this.deps.versus(info, sp, () => this.deps.startMatch({
      mode: s.players === 2 ? 'coop' : 'solo',
      teams: [['giulia_s', 'zefa'], cfg.opp],
      levels: { 0: [8, levelAt(s.difficulty, 0.65)], 1: [cfg.level, cfg.level] },
      opts: {
        control: { 1: 'own', 2: 'own' },
        pointsToWin: cfg.points, weather: s.weather.filter(WEATHER_ON), drain: true, condScale: diff.cond,
        timeouts: 0, consumables: [], // na história a mochila é usada na troca de lado (só a Giulia)
        conds: { 0: [g, { immune: true }] },
        gearBuffs: { 0: [gearHas(s.gear, 'stat').map(e => ({ stat: e.effect.stat, v: e.effect.v || 1 })), []] },
        tiltSpecials: { 0: [{ ...sp.giulia.eq }, { ...sp.zefa.eq }], 1: cfg.opp.map(athleteSpecials) }, // CPU: os especiais do editor de atletas
        arena: s.hood, // a paisagem do bairro do CT
      },
      title: cfg.title,
    }, (won, match) => {
      // condições da Giulia depois da partida (fome e sede subiram; o sol passa)
      const pl = match.teamPlayers(0)[0];
      s.cond.giulia = { ...freshCondition(pl.cond), sunLoss: 0, sunblock: false, visor: false };
      this.advance_(TIME_COST.match);
      this.back();
      onEnd(won);
    }));
  }
  // troca de lado: o que a Giulia pode comer ou beber da mochila
  bagList() { return Object.keys(this.s.bag).filter(k => this.s.bag[k] > 0 && CONSUMABLES[k]).map(k => ({ id: k, name: CONSUMABLES[k].name, count: this.s.bag[k], info: CONSUMABLES[k].info })); }
  useBag(k) { this.s.bag[k] = Math.max(0, (this.s.bag[k] || 0) - 1); if (!this.s.bag[k]) delete this.s.bag[k]; }
  onMatchEvent() { /* (pausas técnicas da Exibição não usam a mochila) */ }

  // ================= tempo e condições (só a Giulia sente) =================
  advance_(min) {
    const s = this.s, c = s.cond.giulia;
    s.time += min;
    c.fome = Math.min(100, c.fome + DRAIN.fomePerHour * min / 60);
    c.sede = Math.min(100, c.sede + DRAIN.sedePerHour * min / 60);
  }
  sleep(forced) {
    const s = this.s, c = s.cond.giulia;
    s.day++;
    s.time = CLOCK.start;
    s.weather = s.weatherNext;
    s.weatherNext = rollWeather();
    c.fome = Math.min(100, c.fome + DRAIN.nightFome);
    c.sede = Math.min(100, c.sede + DRAIN.nightSede);
    c.forma = Math.max(0, (c.forma ?? 100) - DRAIN.formaPerDay);
    c.flags = { ...c.flags, sono: !!forced };
    if (s.hood !== 'urca') this.goHood('urca', 4.75);
    const home = this.door('casa');
    if (home) { s.x = home.x; this.me.x = home.x; }
  }

  // ================= salvar =================
  save(silent = false) {
    this.s.x = this.me ? this.me.x : this.s.x;
    const ok = writeSave(this.s);
    if (!silent) this.flash(ok ? 'Jogo salvo!' : 'Não foi possível salvar neste navegador');
  }
  flash(text) {
    this.prompt.textContent = text;
    this.prompt.classList.add('show', 'flash');
    this.flashT = 1.6;
  }

  // ================= estados =================
  away() { this.state = 'away'; this.setBg(null); this.el.classList.remove('show'); }
  back() { this.el.classList.add('show'); }
  walk() {
    this.state = 'walk';
    this.dlg.classList.remove('show');
    this.panelEl.classList.remove('show');
    this.setBg(null);
    this.renderBar();
  }
  cam(x) { this.street.frame(x, 0, true); }
  door(id) { return this.street.doors.find(d => d.id === id); }
  // fundo com o interior do lugar (só enquanto o menu dele está aberto)
  setBg(kind) {
    const url = kind && interior(kind);
    this.bg.style.backgroundImage = url ? `url(${url})` : '';
    this.bg.classList.toggle('show', !!url);
  }

  // falas: [[quem, texto], ...]
  say(lines, then) {
    this.state = 'dialog';
    this.lines = lines; this.li = 0; this.after = then;
    this.panelEl.classList.remove('show');
    this.prompt.classList.remove('show');
    this.setBg(null);
    this.renderBar();
    this.renderDialog();
  }
  renderDialog() {
    const [who, text] = this.lines[this.li];
    const ch = who && CHARACTERS[who === 'giulia' ? 'giulia_s' : who];
    this.dlg.className = 'st-dialog show' + (ch ? '' : ' narr');
    this.dlg.innerHTML = `${ch ? `<img src="${portrait(ch.id)}" alt="">` : ''}<div><b>${ch ? ch.name : ''}</b><p>${text}</p><small>${this.deps.ico('C')} / Enter continua</small></div>`;
  }
  advance() {
    this.li++;
    if (this.li < this.lines.length) { this.renderDialog(); return; }
    this.dlg.classList.remove('show');
    const f = this.after; this.after = null;
    if (f) f();
  }
  fadeTo(text, then) {
    this.state = 'fade';
    this.fade.innerHTML = `<p>${text}</p>`;
    this.fade.classList.add('show');
    this.fadeT = 0; this.fadeThen = then;
  }

  // painel de menu: { title, sub, items: [{ label, small, qty, disabled, act }], grid, onBack, bg }
  panel(p) {
    this.state = 'panel';
    this.p = p; this.pi = Math.max(0, p.items.findIndex(it => !it.disabled));
    this.prompt.classList.remove('show');
    if (p.bg !== undefined) this.setBg(p.bg); // painéis sem bg (submenus) mantêm o fundo atual
    this.renderPanel();
  }
  renderPanel() {
    const p = this.p;
    this.panelEl.className = 'st-panel show' + (p.grid ? ' grid' : '');
    this.panelEl.innerHTML = `<h3>${p.title}</h3>${p.sub ? `<p class="sub">${p.sub}</p>` : ''}
      <div class="st-items">${p.items.map((it, i) => `<button type="button" class="st-item ${i === this.pi ? 'focus' : ''} ${it.disabled ? 'off' : ''} ${it.on ? 'on' : ''}" data-i="${i}">${it.qty !== undefined ? `<em class="qty ${it.qty ? '' : 'zero'}">na mochila ×${it.qty}</em>` : ''}${it.label}${it.small ? `<small>${it.small}</small>` : ''}</button>`).join('')}</div>
      <p class="st-hint">↑↓${p.grid ? '←→' : ''} escolhe · ${this.deps.ico('C')} / Enter confirma · ${this.deps.ico('B')} / Esc volta</p>`;
    const f = this.panelEl.querySelector('.st-item.focus');
    if (f) f.scrollIntoView({ block: 'nearest' });
  }
  choose() {
    const it = this.p.items[this.pi];
    if (!it || it.disabled) return;
    it.act();
  }
  closePanel() {
    const p = this.p;
    if (p && p.onBack) p.onBack(); else this.walk();
  }

  // ================= menus do bairro =================
  interact(d) {
    if (d.id === 'bus') return this.busMenu();
    if (d.id === 'casa') return this.homeMenu();
    if (d.id === 'ct') return this.ctMenu();
    if (d.id === 'lanchonete' || d.id === 'farmacia') return this.foodShop(d.id);
    if (d.id === 'moda') return this.fashionShop();
    if (d.id === 'loterica') return this.lottery();
    if (d.id === 'spa') return this.spa();
    if (d.id === 'academia') return this.gym();
    if (d.id === 'esportes') return this.sportsShop();
  }
  price(base) { return Math.max(1, Math.round(base * DIFFICULTY[this.s.difficulty].price)); }

  busMenu() {
    const s = this.s;
    if (!s.busOpen) { this.say([[null, BUS.closed]], () => this.walk()); return; }
    const pr = this.price(BUS.price);
    this.panel({
      title: 'Ponto de ônibus', sub: `Você tem ${money(s.money)} · passagem ${money(pr)} · ${BUS.time} min de viagem`, bg: null,
      items: [
        ...HOOD_ORDER.filter(h => h !== s.hood).map(h => {
          const tag = s.step === 'rio' && ROUTE[s.rio.next].hood === h ? ' · próxima partida do Rio Futevôlei'
            : (s.step === 'final' || s.step === 'free') && h === 'copacabana' ? ' · CT do Posto 5'
              : s.step === 'kingsize' && h === 'urca' ? ' · duelo no CT da Urca' : '';
          return { label: HOODS[h].name, small: `${HOODS[h].ct} · ${HOODS[h].shops.map(k => SHOP_NAMES[k]).join(', ')}${tag}`, on: !!tag, disabled: s.money < pr,
            act: () => this.fadeTo(HOODS[h].name, () => { s.money -= pr; this.advance_(BUS.time); this.goHood(h, this.street.spots.bus); this.walk(); }) };
        }),
        { label: 'Sair', act: () => this.walk() },
      ],
    });
  }
  homeMenu() {
    this.panel({
      title: 'Casa da Giulia', sub: `${fmtTime(this.s.time)} · dormir encerra o dia (o clima de amanhã a lotérica já sabe)`, bg: 'casa',
      items: [
        { label: 'Dormir até amanhã', small: 'novo dia às 6h · cura o Sono', act: () => this.fadeTo(`Dia ${this.s.day + 1}`, () => { this.sleep(false); this.save(true); this.walk(); }) },
        { label: 'Salvar o jogo', act: () => { this.save(); this.walk(); } },
        { label: 'Sair', act: () => this.walk() },
      ],
    });
  }
  ctMenu() {
    const s = this.s, h = s.hood, hd = HOODS[h], items = [];
    const vs = ids => ids.map(id => CHARACTERS[id].name).join(' & ');
    if (h === 'urca' && s.step === 'champ' && !s.ct.urca.done) {
      const r = CT.urca.rounds[s.ct.urca.round];
      items.push({ label: `Jogar a ${r.name}`, small: `contra ${vs(r.team)} · nível ${levelAt(s.difficulty, r.f)} · prêmio ${money(r.prize)} · 12 pontos`, on: true, act: () => this.playRound() });
    }
    if (h === 'copacabana' && s.step === 'free') items.push({ label: 'Inscrever-se no Rio Futevôlei', small: '10 partidas, uma em cada bairro, e a final aqui', on: true, act: () => this.register() });
    if (s.step === 'rio' && ROUTE[s.rio.next].hood === h) {
      const i = s.rio.next;
      items.push({ label: `Rio Futevôlei · partida ${i + 1} de 10`, small: `contra ${vs(CT_DUOS[h])} · nível ${levelAt(s.difficulty, RIO.f(i))} · prêmio ${money(RIO.prize(i))} · ensina ${spName(ROUTE[i].special)}`, on: true, act: () => this.playRio() });
    }
    if (h === 'copacabana' && s.step === 'final') items.push({ label: 'GRANDE FINAL', small: `contra Rolando Carioca & Marra Viteia · ${RIO.finalPoints} pontos · nível ${DIFFICULTY[s.difficulty].levels[1]}`, on: true, act: () => this.playFinal() });
    if (h === 'urca' && s.step === 'kingsize') items.push({ label: 'Duelo contra o King Size de Niterói', small: `King Size & Rainha Icaraí · ${RIO.finalPoints} pontos · nível 12`, on: true, act: () => this.playKingSize() });
    // desafio da dupla do CT (depois do campeonato da Urca)
    if (s.busOpen && CT_DUOS[h]) {
      const today = s.challenged[h] === s.day;
      items.push({ label: 'Desafiar a dupla do CT', small: today ? 'já jogaram hoje — volte amanhã' : `contra ${vs(CT_DUOS[h])} · ${CHALLENGE.points} pontos · prêmio ${money(this.price(CHALLENGE.prize))}`, disabled: today, act: () => this.playChallenge() });
    }
    if (s.step === 'rio' && ROUTE[s.rio.next].hood !== h) items.push({ label: 'Rio Futevôlei', small: `a próxima partida é em ${HOODS[ROUTE[s.rio.next].hood].name}`, disabled: true, act: () => {} });
    items.push({ label: 'Salvar o jogo', act: () => { this.save(); this.walk(); } });
    items.push({ label: 'Sair', act: () => this.walk() });
    this.panel({ title: hd.ct, sub: hd.name, bg: 'ct', items });
  }
  // fora da partida, a Giulia come, bebe ou usa um consumível: cura fome, sede ou marca (o bônus de
  // atributo só vale dentro da partida)
  eatNow(k) {
    const c = CONSUMABLES[k], cond = this.s.cond.giulia;
    if (c.sede) cond.sede = Math.max(0, cond.sede - c.sede);
    if (c.fome) cond.fome = Math.max(0, cond.fome - c.fome);
    if (c.cure) cond.flags[c.cure] = false;
    this.advance_(TIME_COST.eat);
    this.flash(`Giulia: ${c.name}`);
  }
  // lanchonete e farmácia: comprar e comer/usar na hora, ou guardar na mochila
  foodShop(shop) {
    const s = this.s;
    const usable = c => !!(c.sede || c.fome || c.cure); // o protetor solar só serve na partida
    const verb = c => (shop !== 'lanchonete' ? 'Usar agora' : c.sede && !c.fome ? 'Beber agora' : 'Comer agora');
    const buy = (k, pr) => {
      const c = CONSUMABLES[k];
      const pay = () => { s.money -= pr; this.advance_(TIME_COST.buy); };
      this.panel({
        title: `${itemIcon(k)}${c.name} · ${money(pr)}`, sub: c.info,
        items: [
          ...(usable(c) ? [{ label: verb(c), small: 'a Giulia consome na hora (o bônus de atributo só vale na partida)', act: () => { pay(); this.eatNow(k); build(); } }] : []),
          { label: 'Guardar na mochila', small: 'para usar depois: Pausa → Mochila, ou na troca de lado das partidas', act: () => { pay(); s.bag[k] = (s.bag[k] || 0) + 1; this.flash(`${c.name} na mochila`); build(); } },
          { label: 'Voltar', act: () => build() },
        ],
        onBack: () => build(),
      });
    };
    const build = () => this.panel({
      title: SHOP_NAMES[shop], sub: `Você tem ${money(s.money)} · ${this.condLine()}`, bg: shop,
      items: [
        ...itemsOf(shop).map(({ id: k }) => {
          const pr = this.price(FOOD_PRICES[k]);
          return { label: `${itemIcon(k)}${CONSUMABLES[k].name} · ${money(pr)}`, small: CONSUMABLES[k].info, qty: s.bag[k] || 0, disabled: s.money < pr, act: () => buy(k, pr) };
        }),
        { label: 'Sair', act: () => this.walk() },
      ],
    });
    build();
  }
  fashionShop() {
    const s = this.s;
    const build = () => this.panel({
      title: 'Moda', sub: `Você tem ${money(s.money)} · o que a Giulia veste aparece nas partidas`, bg: 'moda',
      items: [
        ...FASHION.filter(f => f.enabled || s.owned.includes(f.id)).map(f => {
          const owned = s.owned.includes(f.id), worn = s.wear[f.kind] === f.id, pr = this.price(f.price);
          return {
            label: `${itemIcon(f.id)}${f.name}${owned ? '' : ' · ' + money(pr)}`, small: `${ITEMS[f.id].desc || FASHION_KINDS[f.kind]} · ${worn ? 'vestindo' : owned ? 'é sua: vestir' : 'comprar e vestir'}`,
            on: worn, disabled: !owned && s.money < pr,
            act: () => {
              if (!owned) { s.money -= pr; s.owned.push(f.id); this.advance_(TIME_COST.buy); }
              s.wear[f.kind] = f.id;
              this.applyLook();
              build();
            },
          };
        }),
        { label: 'Sair', act: () => this.walk() },
      ],
    });
    build();
  }
  sportsShop() {
    const s = this.s;
    const build = () => this.panel({
      title: 'Artigos Esportivos', sub: `Você tem ${money(s.money)} · equipamento comprado vale para sempre`, bg: 'esportes',
      items: [
        ...GEAR.filter(g => g.enabled || s.gear.includes(g.id)).map(g => {
          const owned = s.gear.includes(g.id), pr = this.price(g.price);
          return { label: `${itemIcon(g.id)}${g.name}${owned ? ' · é sua' : ' · ' + money(pr)}`, small: g.info, on: owned, disabled: owned || s.money < pr,
            act: () => { s.money -= pr; s.gear.push(g.id); this.advance_(TIME_COST.buy); this.flash(`${g.name} comprada!`); build(); } };
        }),
        { label: 'Sair', act: () => this.walk() },
      ],
    });
    build();
  }
  // academia: +80 de forma; malhar de novo no mesmo dia arrisca uma marca
  gym() {
    const s = this.s, c = s.cond.giulia, pr = this.price(GYM.price);
    const again = s.train.day === s.day && s.train.count > 0;
    this.panel({
      title: 'Academia', sub: `Você tem ${money(s.money)} · forma física ${Math.round(c.forma ?? 100)}/100`, bg: 'academia',
      items: [
        { label: `${itemIcon('academia')}${ITEMS.academia.name} · ${money(pr)}`, small: `${ITEMS.academia.desc}${again ? ' · já malhou hoje: risco de Lesionado, Fadiga, Sono ou Ansiedade!' : ''}`, disabled: s.money < pr,
          act: () => {
            s.money -= pr;
            c.forma = Math.min(100, (c.forma ?? 100) + GYM.forma);
            this.advance_(GYM.time);
            s.train = { day: s.day, count: s.train.day === s.day ? s.train.count + 1 : 1 };
            let note = 'Treino feito!';
            if (again && Math.random() < GYM.risk) {
              const opts = Object.keys(FLAG_NAMES).filter(f => !(f === 'lesionado' && gearHas(s.gear, 'semLesao').length));
              const f = opts[Math.floor(Math.random() * opts.length)];
              c.flags[f] = true;
              note = `Malhou demais: ${FLAG_NAMES[f]}!`;
            }
            this.flash(note);
            this.walk();
          } },
        { label: 'Sair', act: () => this.walk() },
      ],
    });
  }
  spa() {
    const s = this.s, pr = this.price(SPA.price), c = s.cond.giulia;
    const has = SPA.cures.some(f => c.flags && c.flags[f]);
    this.panel({
      title: 'Spa', sub: `Você tem ${money(s.money)}`, bg: 'spa',
      items: [
        { label: `${itemIcon('spa')}${SPA.name} · ${money(pr)}`, small: `${SPA.info}${has ? '' : ' · a Giulia não precisa agora'}`, disabled: s.money < pr,
          act: () => {
            s.money -= pr;
            for (const f of SPA.cures) c.flags[f] = false;
            this.advance_(TIME_COST.spa);
            this.flash('Renovada!');
            this.walk();
          } },
        { label: 'Sair', act: () => this.walk() },
      ],
    });
  }
  // loteria: 2 grupos (de 25), bilhete de 2, 10 ou 20; 5 números sorteados; os dois grupos saindo = 10×
  lottery() {
    const s = this.s;
    const wx = s.weatherNext.some(WEATHER_ON) ? s.weatherNext.filter(WEATHER_ON).map(k => WEATHER[k].icon + ' ' + WEATHER[k].name).join(' e ') : '☀ dia ensolarado normal';
    const pickGroup = (title, skip, then) => this.panel({
      title, sub: 'Cada legume/verdura é um grupo de 4 números (de 1 a 100)', grid: true,
      items: VEGGIES.map((v, g) => ({ label: v, small: `${g * 4 + 1}–${g * 4 + 4}`, disabled: g === skip, act: () => then(g) })),
      onBack: () => this.lottery(),
    });
    this.panel({
      title: 'Lotérica', sub: `Você tem ${money(s.money)} · previsão para amanhã: ${wx}`, bg: 'loterica',
      items: [
        { label: 'Fazer uma aposta', small: `escolha 2 grupos; saem ${LOTTERY.draws} números; se sair um número de cada grupo, ganha ${LOTTERY.payout}× o bilhete`,
          act: () => pickGroup('1º grupo', -1, a => pickGroup('2º grupo', a, b => this.panel({
            title: `${VEGGIES[a]} + ${VEGGIES[b]}`, sub: 'Valor do bilhete',
            items: [...LOTTERY.tickets.map(t => ({ label: money(t), small: `prêmio ${money(t * LOTTERY.payout)}`, disabled: s.money < t, act: () => this.bet(a, b, t) })),
              { label: 'Desistir', act: () => this.lottery() }],
            onBack: () => this.lottery(),
          }))) },
        { label: 'Sair', act: () => this.walk() },
      ],
    });
  }
  bet(a, b, t) {
    const s = this.s;
    s.money -= t;
    this.advance_(TIME_COST.lottery);
    const nums = drawLottery();
    const groups = nums.map(groupOf);
    const won = groups.includes(a) && groups.includes(b);
    if (won) s.money += t * LOTTERY.payout;
    s.lottery = [{ day: s.day, a, b, t, nums, won }, ...(s.lottery || [])].slice(0, 5);
    this.panel({
      title: won ? `GANHOU ${money(t * LOTTERY.payout)}!` : 'Não foi dessa vez',
      sub: `Sorteados: ${nums.map(n => `${n} (${VEGGIES[groupOf(n)]})`).join(' · ')}`,
      items: [{ label: 'Apostar de novo', act: () => this.lottery() }, { label: 'Sair', act: () => this.walk() }],
    });
  }

  // ================= pausa (Start no bairro) =================
  pauseMenu() {
    this.panel({
      title: 'Pausa', sub: `${HOODS[this.s.hood].name} · Dia ${this.s.day} · ${fmtTime(this.s.time)} · ${money(this.s.money)} · ${DIFFICULTY[this.s.difficulty].name}`, bg: null,
      items: [
        { label: 'Continuar', act: () => this.walk() },
        { label: 'Mochila', small: this.bagText(), act: () => this.bagMenu() },
        { label: 'Especiais', small: 'escolha o especial de ataque (□□) e o de defesa (○○)', act: () => this.specialsMenu() },
        { label: 'Condições da Giulia', small: this.condLine(), act: () => this.condMenu() },
        { label: 'Salvar o jogo', act: () => { this.save(); this.walk(); } },
        { label: 'Sair para o início', small: 'o que não foi salvo se perde', act: () => { this.stop(); this.deps.quit(); } },
      ],
    });
  }
  bagText() {
    const ks = Object.keys(this.s.bag).filter(k => this.s.bag[k] > 0 && CONSUMABLES[k]);
    const gear = this.s.gear.map(g => GEAR.find(x => x.id === g)).filter(Boolean).map(g => g.name);
    return (ks.length ? ks.map(k => `${CONSUMABLES[k].name} ×${this.s.bag[k]}`).join(' · ') : 'vazia') + (gear.length ? ` · equipamento: ${gear.join(', ')}` : '');
  }
  bagMenu() {
    const s = this.s, ks = Object.keys(s.bag).filter(k => s.bag[k] > 0 && CONSUMABLES[k]);
    const use = k => { this.useBag(k); this.eatNow(k); this.bagMenu(); };
    this.panel({
      title: 'Mochila', sub: 'Só a Giulia come e bebe. Fora da partida o consumível cura fome, sede ou marca; o bônus de atributo vale na troca de lado das partidas.',
      items: [
        ...ks.map(k => ({ label: `${itemIcon(k)}${CONSUMABLES[k].name}`, qty: s.bag[k], small: CONSUMABLES[k].info, act: () => use(k) })),
        { label: 'Voltar', act: () => this.pauseMenu() },
      ],
      onBack: () => this.pauseMenu(),
    });
  }
  specialsMenu() {
    const sp = this.s.specials;
    const cycle = (who, row) => {
      const list = [...sp[who][row]];
      if (!list.length) return;
      const i = list.indexOf(sp[who].eq[row]);
      sp[who].eq[row] = list[(i + 1) % list.length];
      this.specialsMenu();
    };
    const row = (who, r) => ({
      label: `${who === 'giulia' ? 'Giulia' : 'Zefa'} · ${r === 'attack' ? 'ataque □□' : 'defesa ○○'}: ${spName(sp[who].eq[r])}`,
      small: sp[who][r].length > 1 ? `confirme para trocar · ${sp[who][r].length} aprendidos` : sp[who][r].length ? 'só esse aprendido' : 'ainda não aprendeu nenhum',
      disabled: sp[who][r].length < 2, act: () => cycle(who, r),
    });
    this.panel({
      title: 'Especiais', sub: 'Especiais novos se aprendem vencendo campeonatos e as partidas do Rio Futevôlei',
      items: [row('giulia', 'attack'), row('giulia', 'defense'), row('zefa', 'attack'), row('zefa', 'defense'), { label: 'Voltar', act: () => this.pauseMenu() }],
      onBack: () => this.pauseMenu(),
    });
  }
  condLine() {
    const c = this.s.cond.giulia;
    const out = [`fome ${Math.round(c.fome)}`, `sede ${Math.round(c.sede)}`, `forma ${Math.round(c.forma ?? 100)}`];
    for (const f in FLAG_NAMES) if (c.flags && c.flags[f]) out.push(FLAG_NAMES[f]);
    return out.join(' · ');
  }
  condMenu() {
    const d = DIFFICULTY[this.s.difficulty];
    this.panel({
      title: 'Condições da Giulia', sub: `A partir de ${COND.limit}, fome tira Força e Agilidade e sede tira Pique e Precisão; forma abaixo de ${COND.outOfShape} tira 1 de tudo. No ${d.name}: ${d.cond ? `peso ${d.cond * 100}%` : 'não pesam'}. A Zefa não sente fome, sede nem cansaço.`,
      items: [{ label: 'Giulia', small: this.condLine(), act: () => {} }, { label: 'Voltar', act: () => this.pauseMenu() }],
      onBack: () => this.pauseMenu(),
    });
  }

  // ================= barra de cima =================
  renderBar() {
    const s = this.s;
    const meter = (v, cls) => `<span class="st-m ${cls} ${v >= COND.limit ? 'hot' : ''}"><i style="width:${Math.min(100, v)}%"></i></span>`;
    const c = s.cond.giulia;
    const flags = Object.keys(FLAG_NAMES).filter(f => c.flags && c.flags[f]).map(f => `<em>${FLAG_NAMES[f]}</em>`).join('');
    const wx = s.weather.some(WEATHER_ON) ? s.weather.filter(WEATHER_ON).map(k => WEATHER[k].icon).join('') : '☀';
    const html = `<b>${HOODS[s.hood].name}</b><b>Dia ${s.day}</b><b class="st-clock">${fmtTime(s.time)}</b><span>${wx}</span><b class="st-money">${money(s.money)}</b>
      <span class="st-c">🍔 ${meter(c.fome, 'f')}</span><span class="st-c">💧 ${meter(c.sede, 's')}</span><span class="st-c">💪 ${meter(c.forma ?? 100, 'p')}</span>${flags}`;
    if (this.barHTML !== html) { this.barHTML = html; this.bar.innerHTML = html; }
    const g = this.objective();
    if (this.goalText !== g) { this.goalText = g; this.goal.textContent = g; this.goal.classList.toggle('show', !!g); }
    // anoitecer
    const t = s.time, dark = t < 7 * 60 ? 0.15 : t > 18 * 60 ? Math.min(0.55, (t - 18 * 60) / 240 * 0.55) : 0;
    this.night.style.opacity = dark.toFixed(3);
  }

  // ================= quadro a quadro =================
  update(dt, time, menu, pad) {
    if (!this.active) return;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.prompt.classList.remove('flash', 'show'); }
    if (this.state === 'away') return;
    const ok = menu.pressed('ok') || menu.pressed('C');
    const backKey = menu.pressed('B') || menu.pressed('start');
    if (this.state === 'dialog') { if (ok) this.advance(); }
    else if (this.state === 'fade') {
      this.fadeT += dt;
      // no meio da tela escura o roteiro segue; a tela clareia logo depois
      if (this.fadeT > 1.6 && this.fadeThen) { const f = this.fadeThen; this.fadeThen = null; setTimeout(() => this.fade.classList.remove('show'), 300); f(); }
    } else if (this.state === 'panel') {
      const n = this.p.items.length, cols = this.p.grid ? 5 : 1;
      const mv = d => { let i = this.pi; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!this.p.items[i].disabled) break; } this.pi = i; this.renderPanel(); };
      if (menu.pressed('up')) mv(-cols); else if (menu.pressed('down')) mv(cols);
      else if (cols > 1 && menu.pressed('left')) mv(-1); else if (cols > 1 && menu.pressed('right')) mv(1);
      if (ok) this.choose();
      else if (backKey) this.closePanel();
    } else if (this.state === 'walk') this.updateWalk(dt, menu, pad, ok);
    // cena
    if (this.state === 'walk') this.street.frame(this.me.x, dt);
    this.street.setHour(this.s.time);
    this.street.update(dt, time);
  }
  updateWalk(dt, menu, pad, ok) {
    const s = this.s, me = this.me;
    if (menu.pressed('start')) { me.speed = 0; this.pauseMenu(); return; }
    // relógio: 12 min reais por dia
    const before = s.time;
    this.advance_(dt * CLOCK.gameMinPerSec);
    if (s.time >= CLOCK.end && before < CLOCK.end) {
      me.speed = 0;
      this.say(SCRIPT.forcedHome, () => this.fadeTo(`Dia ${s.day + 1}`, () => { this.sleep(true); this.save(true); this.walk(); }));
      return;
    }
    const x = pad ? pad.x : 0;
    // no bairro a câmera é de lado: direita = +x
    const dir = Math.abs(x) > 0.3 ? Math.sign(x) : 0;
    me.speed = dir ? WALK_SPEED : 0;
    if (dir) { me.facing = dir; me.x = Math.max(BOUNDS[0], Math.min(BOUNDS[1], me.x + dir * WALK_SPEED * dt)); }
    s.x = me.x;
    // porta mais perto
    const d = this.street.doors.reduce((a, b) => (Math.abs(b.x - me.x) < Math.abs(a.x - me.x) ? b : a));
    const near = Math.abs(d.x - me.x) < NEAR ? d : null;
    if (!this.flashT || this.flashT <= 0) {
      const txt = near ? `${this.deps.ico('C')} ${near.id === 'bus' ? 'pegar o ônibus' : near.id === 'casa' ? 'entrar em casa' : 'entrar: ' + near.name}` : '';
      if (this.promptHTML !== txt) { this.promptHTML = txt; this.prompt.innerHTML = txt; this.prompt.classList.toggle('show', !!txt); }
    }
    if (near && (ok || (pad && pad.pressed && pad.pressed('up')))) { me.speed = 0; this.promptHTML = null; this.interact(near); return; }
    this.renderBar();
  }
}
