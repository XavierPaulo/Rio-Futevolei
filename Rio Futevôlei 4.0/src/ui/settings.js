// Preferências do jogador, guardadas no navegador (sem garantia: pode vir vazio).
//   p1 / p2  — dispositivo de cada jogador: 'ps' | 'xbox' (controle) ou 'keyboard' (teclado)
//   assists  — ajudas visuais (L2): brilho da nota da ação, arco da trajetória e alvo no chão
//   legend   — legenda dos golpes possíveis no toque atual
//   art      — estilo artístico: 'pincel' (brush pen, padrão) | 'cartoon' (4.0: sem o papel e caneta)
//   view     — ângulo da câmera: id de uma câmera de src/data/cameras.js ('lateral' | 'fundo')
//   camera   — movimento da câmera: 'follow' (acompanha a bola de leve) | 'fixed'
//   hitbox   — mostra a área de contato enquanto o golpe está ativo
const KEY = 'rio-futevolei.settings';
export const DEVICES = ['ps', 'xbox', 'keyboard'];
export const EXH_POINTS = [6, 9, 12, 15, 18, 21];
export const ART_STYLES = ['pincel', 'cartoon'];
const ART_VERSION = 2; // ao criar o estilo Pincel, ele passou a ser o padrão
//   difficulty — nível da CPU (1–12), escolhido na tela de seleção
//   teamSize   — atletas por time: 1 (1 contra 1), 2 (duplas) ou 3 (trincas)
//   control1/2 — o que cada jogador controla: 'team' (o time inteiro, trocando de atleta)
//                ou 'own' (só o seu atleta; os outros do time ficam com a CPU)
const DEFAULTS = { p1: 'ps', p2: 'ps', assists: true, legend: true, art: 'pincel', view: 'lateral', camera: 'follow', hitbox: false, artVersion: ART_VERSION, difficulty: 5,
  teamSize: 2, control1: 'team', control2: 'team',
  // nível de cada atleta da CPU, por vaga (1º, 2º, 3º), lembrado entre partidas:
  //   oppLevels = adversários · mateLevels = parceiros da CPU no time de um jogador
  oppLevels: [5, 5, 5], mateLevels: [8, 8, 8],
  // 4.0 Modo Exibição: pontos da partida, clima (src/condition.js, WEATHER_PRESETS) e consumíveis liberados nas pausas
  exhPoints: 12, exhWeather: 'normal', exhArena: 'copacabana', exhItems: ['mate', 'suco', 'brownie', 'sanduiche', 'protetor', 'anestesico', 'tonico'] };

export const settings = { ...DEFAULTS };

try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  if (DEVICES.includes(saved.pad)) settings.p1 = saved.pad; // formato antigo
  if (DEVICES.includes(saved.p1)) settings.p1 = saved.p1;
  if (DEVICES.includes(saved.p2)) settings.p2 = saved.p2;
  for (const k of ['assists', 'legend', 'hitbox']) if (typeof saved[k] === 'boolean') settings[k] = saved[k];
  // escolha de estilo salva antes do Pincel existir não vale mais: o padrão novo é o Pincel
  if (ART_STYLES.includes(saved.art) && saved.artVersion === ART_VERSION) settings.art = saved.art;
  if (saved.camera === 'follow' || saved.camera === 'fixed') settings.camera = saved.camera;
  if (typeof saved.view === 'string') settings.view = saved.view; // câmera desconhecida: o rig usa a lateral
  if ([1, 2, 3].includes(saved.teamSize)) settings.teamSize = saved.teamSize;
  const lvOk = v => Number.isInteger(v) && v >= 1 && v <= 12;
  // antes da escolha por atleta havia um nível só (difficulty): vira o padrão dos adversários
  if (lvOk(saved.difficulty)) settings.oppLevels = [saved.difficulty, saved.difficulty, saved.difficulty];
  for (const k of ['oppLevels', 'mateLevels']) {
    if (Array.isArray(saved[k]) && saved[k].length === 3 && saved[k].every(lvOk)) settings[k] = [...saved[k]];
  }
  for (const k of ['control1', 'control2']) if (saved[k] === 'team' || saved[k] === 'own') settings[k] = saved[k];
  if (Number.isInteger(saved.difficulty) && saved.difficulty >= 1 && saved.difficulty <= 12) settings.difficulty = saved.difficulty;
  if (EXH_POINTS.includes(saved.exhPoints)) settings.exhPoints = saved.exhPoints;
  if (typeof saved.exhWeather === 'string') settings.exhWeather = saved.exhWeather;
  if (typeof saved.exhArena === 'string') settings.exhArena = saved.exhArena;
  if (Array.isArray(saved.exhItems)) settings.exhItems = saved.exhItems.filter(x => typeof x === 'string');
} catch { /* armazenamento indisponível: fica o padrão */ }

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignora */ }
}
