import { P } from '../config.js';

// Ângulos em radianos. Membros: 0 = apontando para baixo, + = para a frente.
// torso/neck: + = inclina para a frente. bodyRot: + = gira para a frente (horário).
const base = () => ({
  rootX: 0, rootY: 0, bodyRot: 0, torso: 0.05, neck: 0,
  legF: { hip: 0.12, knee: 0.18 }, legB: { hip: -0.12, knee: 0.18 },
  armF: { sh: 0.35, el: 0.6 }, armB: { sh: -0.3, el: 0.6 },
  face: 'smile',
});

const clamp01 = v => Math.max(0, Math.min(1, v));
const easeOut = k => 1 - (1 - k) * (1 - k);

function swingPose(p, anim, u) {
  switch (anim) {
    case 'kick':
    case 'poke': {
      const amp = anim === 'poke' ? 0.65 : 1;
      if (u < 0.25) {
        const k = u / 0.25;
        p.legF.hip = -0.5 * k * amp; p.legF.knee = 0.3 + 0.9 * k;
      } else if (u < 0.55) {
        const k = easeOut((u - 0.25) / 0.3);
        p.legF.hip = (-0.5 + 1.9 * k) * amp; p.legF.knee = 1.2 * (1 - k);
        p.face = 'shout';
      } else {
        const k = (u - 0.55) / 0.45;
        p.legF.hip = 1.4 * amp * (1 - k) + 0.3 * k; p.legF.knee = 0.3 * k;
      }
      p.torso = -0.25 * Math.sin(Math.PI * u) * amp;
      p.armF = { sh: 1.3, el: 0.4 }; p.armB = { sh: -1.1, el: 0.4 };
      p.legB = { hip: -0.15, knee: 0.35 };
      p.rootY = 3;
      break;
    }
    case 'chest': {
      const k = Math.sin(Math.PI * u);
      p.torso = -0.55 * k; p.neck = 0.35 * k;
      p.armF = { sh: -0.9, el: 0.6 }; p.armB = { sh: -1.2, el: 0.6 };
      p.legF = { hip: 0.45, knee: 0.7 }; p.legB = { hip: -0.1, knee: 0.6 };
      p.rootY = 7 * k;
      if (u > 0.2 && u < 0.6) p.face = 'shout';
      break;
    }
    case 'shoulder': {
      const k = Math.sin(Math.PI * u);
      p.torso = 0.35 * k; p.bodyRot = -0.2 * k;
      p.armF = { sh: -0.2, el: 0.2 }; p.armB = { sh: -1.3, el: 0.5 };
      p.legF = { hip: 0.35, knee: 0.5 }; p.legB = { hip: -0.3, knee: 0.4 };
      p.rootY = 5 * k;
      if (u > 0.2 && u < 0.6) p.face = 'shout';
      break;
    }
    case 'header': {
      p.neck = u < 0.3 ? -0.5 * (u / 0.3) : -0.5 + 1.1 * clamp01((u - 0.3) / 0.2);
      p.torso = p.neck * 0.45;
      p.armF = { sh: 1.4, el: 0.3 }; p.armB = { sh: -1.4, el: 0.3 };
      p.legF = { hip: 0.6, knee: 1.2 }; p.legB = { hip: 0.1, knee: 1.1 };
      if (u > 0.25) p.face = 'shout';
      break;
    }
    case 'shark': {
      // Shark Attack como no futevôlei real (referência: "Shark ataque: passo a passo",
      // Futevôlei do Rafinha, 2:12–2:15). O joelho já veio armado no ar (preparação);
      // aqui: 1) o corpo tomba para trás e a perna estica para cima;
      //       2) de cabeça para baixo, a sola desce sobre a bola por cima da rede;
      //       3) um braço vai à areia e o atleta entra no rolamento de costas.
      // Ângulos em "mundo" (0 = para baixo, π = para cima, + = para a rede) convertidos para o
      // corpo girado: local = mundo + bodyRot.
      const ext = clamp01(u / 0.3), hit = clamp01((u - 0.3) / 0.25), roll = clamp01((u - 0.55) / 0.45);
      const r = -0.45 - 0.95 * ext - 0.6 * hit - 0.5 * roll;            // corpo deitando e passando da horizontal
      const legWorld = 2.2 + 0.85 * ext - 0.5 * hit - 0.3 * roll;       // frente-cima → vertical → desce na bola
      p.bodyRot = r;
      p.torso = -0.15; p.neck = 0.45;                                    // queixo no peito, olho na bola
      p.legF = { hip: legWorld + r, knee: 0.05 + 0.35 * roll };
      p.legB = { hip: 0.7, knee: 1.4 };                                  // perna de apoio dobrada embaixo
      p.armB = { sh: -0.25 + r, el: 0.1 };                               // braço de trás vai à areia
      p.armF = { sh: 2.3 + r - 0.8 * hit, el: 0.4 };                     // braço da frente equilibra
      p.face = 'shout';
      break;
    }
    case 'bicicleta': {
      const r = clamp01(u / 0.45);
      p.bodyRot = -2.7 * r;
      const swap = u > 0.35;
      p.legF = { hip: swap ? 2.9 : 0.4, knee: swap ? 0.05 : 0.8 };
      p.legB = { hip: swap ? 0.3 : 2.2, knee: swap ? 0.7 : 0.2 };
      p.armF = { sh: 2.0, el: 0.2 }; p.armB = { sh: -2.0, el: 0.2 };
      p.face = 'shout';
      break;
    }
    case 'sarrada': {
      // quadril para a frente, tronco para trás, braços para cima
      const k = Math.sin(Math.PI * clamp01(u / 0.6));
      p.rootX = 12 * k; p.torso = -0.55 * k; p.neck = 0.3 * k;
      p.legF = { hip: 0.5 * k, knee: 0.9 * k }; p.legB = { hip: -0.5 * k, knee: 0.8 * k };
      p.armF = { sh: 2.7 * k, el: 0.3 }; p.armB = { sh: -2.7 * k, el: 0.3 };
      p.face = 'shout';
      break;
    }
    case 'escorpiao': {
      // corpo mergulha para a frente e o calcanhar vem por cima da cabeça
      const r = clamp01(u / 0.4);
      p.bodyRot = 0.95 * r;
      p.legF = { hip: -2.5 * r, knee: 1.1 * r };
      p.legB = { hip: -1.2 * r, knee: 0.9 * r };
      p.armF = { sh: 1.3, el: 0.2 }; p.armB = { sh: 1.0, el: 0.2 };
      p.face = 'shout';
      break;
    }
    case 'meia': {
      const r = clamp01(u / 0.4);
      p.bodyRot = -1.4 * r;
      p.legF = { hip: 0.4 + 2.0 * r, knee: 0.1 };
      p.legB = { hip: -0.2, knee: 0.6 };
      p.armF = { sh: 1.9, el: 0.2 }; p.armB = { sh: -1.9, el: 0.2 };
      p.face = 'shout';
      break;
    }
  }
  return p;
}

// Postura de preparação ("telegrafia"): cada golpe tem uma silhueta própria,
// para que o adversário consiga ler o que vem. k = intensidade 0..1.
function windupPose(p, anim, k, air = false) {
  switch (anim) {
    case 'kick': // chute: perna armada lá atrás, braços abertos
      p.legF = { hip: -0.8 * k, knee: 1.35 * k }; p.legB = { hip: 0.1, knee: 0.45 * k };
      p.torso = -0.22 * k; p.armF = { sh: 1.3 * k, el: 0.4 }; p.armB = { sh: -1.4 * k, el: 0.4 };
      p.rootY = 4 * k;
      break;
    case 'poke': // toque curto: perna levantada de leve, corpo solto
      p.legF = { hip: 0.6 * k, knee: 1.15 * k }; p.legB = { hip: -0.1, knee: 0.35 * k };
      p.torso = 0.12 * k; p.armF = { sh: 0.7 * k, el: 0.9 }; p.armB = { sh: -0.7 * k, el: 0.9 };
      p.rootY = 2 * k;
      break;
    case 'chest': // domínio de peito: peito estufado, braços para trás
      p.torso = -0.48 * k; p.neck = 0.28 * k;
      p.armF = { sh: -1.2 * k, el: 0.3 }; p.armB = { sh: -1.6 * k, el: 0.3 };
      p.legF = { hip: 0.4 * k, knee: 0.75 * k }; p.legB = { hip: -0.15, knee: 0.65 * k };
      p.rootY = 7 * k;
      break;
    case 'shoulder': // ombro: tronco torcido, ombro da frente baixo
      p.torso = 0.32 * k; p.bodyRot = -0.3 * k;
      p.armF = { sh: -0.4 * k, el: 0.2 }; p.armB = { sh: -1.6 * k, el: 0.5 };
      p.legF = { hip: 0.35 * k, knee: 0.55 * k }; p.legB = { hip: -0.3 * k, knee: 0.5 * k };
      p.rootY = 5 * k;
      break;
    case 'header': // cabeçada: cabeça puxada para trás, joelhos flexionados
      p.neck = -0.65 * k; p.torso = -0.2 * k;
      p.armF = { sh: 1.6 * k, el: 0.3 }; p.armB = { sh: -1.6 * k, el: 0.3 };
      p.legF = { hip: 0.5 * k, knee: 1.05 * k }; p.legB = { hip: 0.05, knee: 0.95 * k };
      p.rootY = 8 * k;
      break;
    case 'shark':
      if (!air) {
        // no chão: passada baixa, perna de trás esticada para trás (armação do salto)
        p.legF = { hip: 0.65 * k, knee: 1.15 * k }; p.legB = { hip: -0.95 * k, knee: 0.15 * k };
        p.torso = 0.18 * k;
        p.armF = { sh: 0.9 * k, el: 0.5 }; p.armB = { sh: -0.7 * k, el: 0.5 };
        p.rootY = 12 * k;
      } else {
        // no ar: joelho da perna de ataque armado, corpo começando a tombar, braços para cima
        p.legF = { hip: 1.75 * k, knee: 1.8 * k }; p.legB = { hip: -0.2, knee: 0.9 * k };
        p.torso = -0.3 * k; p.bodyRot = -0.35 * k;
        p.armF = { sh: 2.8 * k, el: 0.3 }; p.armB = { sh: 2.5 * k, el: 0.4 };
      }
      break;
    case 'bicicleta': // bicicleta: corpo tombando para trás, pernas encolhidas
      p.bodyRot = -0.75 * k;
      p.legF = { hip: 1.2 * k, knee: 1.5 * k }; p.legB = { hip: 1.7 * k, knee: 1.2 * k };
      p.armF = { sh: 2.4 * k, el: 0.3 }; p.armB = { sh: -2.4 * k, el: 0.3 };
      break;
    case 'sarrada': // sarrada: quadril recolhido, pronto para empurrar
      p.rootX = -6 * k; p.torso = 0.3 * k;
      p.legF = { hip: 0.4 * k, knee: 0.9 * k }; p.legB = { hip: -0.4 * k, knee: 0.9 * k };
      p.armF = { sh: 1.2 * k, el: 1.0 }; p.armB = { sh: -1.2 * k, el: 1.0 };
      p.rootY = 8 * k;
      break;
    case 'escorpiao': // escorpião: corpo inclinado para a frente, calcanhar já subindo
      p.bodyRot = 0.35 * k;
      p.legF = { hip: -1.0 * k, knee: 1.2 * k }; p.legB = { hip: 0.2, knee: 0.8 * k };
      p.armF = { sh: 1.5 * k, el: 0.3 }; p.armB = { sh: -1.5 * k, el: 0.3 };
      break;
    case 'meia': // meia-bicicleta: corpo de lado, perna armada
      p.bodyRot = -0.45 * k;
      p.legF = { hip: 1.3 * k, knee: 1.25 * k }; p.legB = { hip: -0.2, knee: 0.7 * k };
      p.armF = { sh: 2.0 * k, el: 0.3 }; p.armB = { sh: -2.0 * k, el: 0.3 };
      break;
  }
  p.face = 'focus';
  return p;
}

function runLegs(p, pl) {
  const ph = pl.runPhase;
  p.legF = { hip: 0.8 * Math.sin(ph), knee: 0.2 + 0.9 * Math.max(0, Math.sin(ph + 1.6)) };
  p.legB = { hip: 0.8 * Math.sin(ph + Math.PI), knee: 0.2 + 0.9 * Math.max(0, Math.sin(ph + Math.PI + 1.6)) };
  p.rootY = -3 * Math.abs(Math.cos(ph));
}

export function poseFor(pl, time) {
  const p = base();
  const t = time + pl.idx * 0.7 + pl.team * 1.3;
  const sw = pl.swing;

  if (pl.state === 'down') {
    const back = pl.downKind === 'back';
    p.bodyRot = back ? -1.5 : 1.5;
    p.rootY = 46;
    p.legF = { hip: 0.2, knee: 0.3 }; p.legB = { hip: -0.2, knee: 0.5 };
    p.armF = { sh: back ? 1.4 : 2.6, el: 0.4 }; p.armB = { sh: back ? -1.2 : 2.3, el: 0.4 };
    p.face = 'dizzy';
    return p;
  }
  if (pl.state === 'dive') {
    // Carrinho: corpo deitado para trás, perna da frente esticada rente à areia,
    // perna de trás dobrada, braço de trás apoiando no chão.
    const r = -1.2;
    p.bodyRot = r; p.rootY = 62;
    p.torso = 0; p.neck = 0.55;
    p.legF = { hip: Math.PI / 2 + r + 0.05, knee: 0 };
    p.legB = { hip: 0.35 + r + 1.0, knee: 1.1 };
    p.armB = { sh: -0.35 + r, el: 0.2 };
    p.armF = { sh: 2.3 + r, el: 0.5 };
    p.face = 'shout';
    return p;
  }
  if (sw && sw.anim && sw.kind !== 'dive') {
    swingPose(p, sw.anim, clamp01(sw.t / P.swingTotal));
    if (pl.state === 'air' && (sw.anim === 'kick' || sw.anim === 'poke')) p.legB = { hip: 0.5, knee: 1.3 };
    return p;
  }
  if (pl.telegraph) {
    const k = Math.min(1, 0.35 + (pl.holdT || 0) / 0.25);
    windupPose(p, pl.telegraph, k, pl.state === 'air');
    // correndo até a bola: pernas continuam correndo, o tronco já mostra o golpe
    const legMove = ['kick', 'poke', 'shark', 'meia', 'bicicleta', 'escorpiao', 'sarrada'].includes(pl.telegraph);
    if (pl.state === 'ground' && pl.speed > 1.5 && !legMove) runLegs(p, pl);
    if (k >= 1) p.rootX = Math.sin(t * 40) * 0.6; // tensão
    return p;
  }
  if (pl.state === 'air') {
    p.legF = { hip: 1.0, knee: 1.6 }; p.legB = { hip: 0.4, knee: 1.4 };
    p.armF = { sh: 2.2, el: 0.3 }; p.armB = { sh: -2.2, el: 0.3 };
    p.torso = 0.1;
    p.face = pl.hold ? 'focus' : 'smile';
    return p;
  }
  if (pl.mood === 'happy') {
    p.rootY = -Math.abs(Math.sin(t * 6)) * 14;
    p.armF = { sh: 2.8, el: 0.3 }; p.armB = { sh: -2.8, el: 0.3 };
    p.legF = { hip: 0.3, knee: 0.6 }; p.legB = { hip: -0.3, knee: 0.6 };
    p.face = 'happy';
    return p;
  }
  if (pl.mood === 'sad') {
    p.neck = 0.45; p.torso = 0.15;
    p.armF = { sh: 0.05, el: 0.1 }; p.armB = { sh: -0.05, el: 0.1 };
    p.face = 'sad';
    return p;
  }
  if (pl.speed > 0.6) {
    const ph = pl.runPhase;
    const back = pl.vx * pl.facing < -0.5;
    runLegs(p, pl);
    p.armF = { sh: -0.8 * Math.sin(ph), el: 1.2 }; p.armB = { sh: 0.8 * Math.sin(ph), el: 1.2 };
    p.torso = back ? -0.08 : 0.22;
    return p;
  }
  p.rootY = Math.sin(t * 3) * 1.5;
  p.armF.sh = 0.35 + Math.sin(t * 3) * 0.05;
  p.armB.sh = -0.3 - Math.sin(t * 3) * 0.05;
  return p;
}
