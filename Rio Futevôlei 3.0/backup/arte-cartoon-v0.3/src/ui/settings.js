// Preferências do jogador, guardadas no navegador (sem garantia: pode vir vazio).
//   p1 / p2 — dispositivo de cada jogador: 'ps' | 'xbox' (controle) ou 'keyboard' (teclado)
//   assists — ajudas visuais (L2): brilho da nota da ação, arco da trajetória e alvo no chão
//   legend  — legenda dos golpes possíveis por toque, na parte de baixo da tela
const KEY = 'rio-futevolei.settings';
export const DEVICES = ['ps', 'xbox', 'keyboard'];
const DEFAULTS = { p1: 'ps', p2: 'ps', assists: true, legend: true };

export const settings = { ...DEFAULTS };

try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  if (DEVICES.includes(saved.pad)) settings.p1 = saved.pad; // formato antigo
  if (DEVICES.includes(saved.p1)) settings.p1 = saved.p1;
  if (DEVICES.includes(saved.p2)) settings.p2 = saved.p2;
  if (typeof saved.assists === 'boolean') settings.assists = saved.assists;
  if (typeof saved.legend === 'boolean') settings.legend = saved.legend;
} catch { /* armazenamento indisponível: fica o padrão */ }

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignora */ }
}
