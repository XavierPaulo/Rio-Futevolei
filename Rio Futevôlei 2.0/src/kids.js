// Kids Mode: o botão escolhe a METADE da quadra onde a bola cai (não há mira fina), sempre
// pela tela:  △ (D) = metade de cima · ✕ (C) = metade de baixo
//             □ (A) = metade da direita · ○ (B) = metade da esquerda
// Os 3 toques continuam: 1º e 2º toques caem no nosso campo (passe para o parceiro);
// o 3º toque e o saque vão para o campo do adversário.
// Sem pulo, sem especiais e sem carrinho. O atleta do jogador tem alcance maior (hitbox) e,
// quando a bola entra na hitbox longe dele, desliza suavemente até ela antes de bater.
export const KIDS = {
  reach: 1.5,      // alcance do golpe × 1,5 (frente/trás e lados)
  bandPad: 2,      // folga de altura da hitbox × 2
  spread: 0.6,     // a bola cai dentro de 60% da metade escolhida (longe das linhas)
  near: 0.55,      // bola a mais que isso (m) do ponto de contato do atleta: ele desliza até ela
  glideSpeed: 7,   // velocidade média do deslize (m/s) · duração entre glideMin e glideMax (s)
  glideMin: 0.12, glideMax: 0.3,
};
export const KIDS_KEYS = ['A', 'B', 'C', 'D'];
// direção na tela de cada botão (x = direita, z = para baixo)
const SCREEN = { D: { x: 0, z: -1 }, C: { x: 0, z: 1 }, A: { x: 1, z: 0 }, B: { x: -1, z: 0 } };
// golpe de chão que sai com cada botão (animação e trajetória): □ / △ usam os do botão A, ○ / ✕ os do B
export const kidsMoveKey = key => (key === 'A' || key === 'D' ? 'A' : 'B');

// Metade da quadra (elipse no chão: centro x/z e raios rx = profundidade, rz = lateral).
//   side = lado do time de quem bate (-1 / +1) · toWorld = direção da tela → direção no chão
//   (segue a câmera: na lateral, "direita" é ao longo da quadra; por trás, é para o lado)
export function kidsZone({ side, key, touchNo, serving, toWorld = (x, z) => ({ x, z }) }) {
  const own = !serving && touchNo < 3;
  const sx = own ? side : -side; // lado da quadra de destino
  const s = SCREEN[key] || SCREEN.C;
  const w = toWorld(s.x, s.z);
  if (Math.abs(w.x) > Math.abs(w.z)) {
    // metade mais perto ou mais longe da rede
    return { x: sx * 4.5 + Math.sign(w.x) * 2.25, z: 0, rx: 1.95, rz: 3.9 };
  }
  return { x: sx * 4.6, z: Math.sign(w.z) * 2.25, rx: 3.9, rz: 1.95 };
}

// Ponto de queda sorteado dentro da metade
export function kidsTarget(zone, rnd = Math.random) {
  const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * KIDS.spread;
  return { x: zone.x + Math.cos(a) * r * zone.rx, z: zone.z + Math.sin(a) * r * zone.rz };
}

export const smoothstep = t => t * t * (3 - 2 * t);
