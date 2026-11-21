import * as THREE from 'three';
import { BALL_R, P } from './config.js';
import { drawAthlete, drawBallArt, isPen } from './art/draw.js';
import { poseFor } from './art/poses.js';
import { settings } from './ui/settings.js';
import { CameraRig } from './engine/camera.js';

// tamanho do plano do personagem (m) e onde ficam os pés no desenho (px do fundo)
const SPRITE = { cartoon: { size: 2.5, feet: 10 }, caneta: { size: 3.05, feet: 8 }, pincel: { size: 3.05, feet: 8 } };
const CANVAS = 256;
const BALL_VIS = 0.46; // bola desenhada maior que a real, para leitura
export const PLAYER_COLORS = { 1: '#ff4d6d', 2: '#3d8bff' };

function tex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Renderer {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.rig = new CameraRig(camera); // ângulo (lateral / por trás) e movimento da câmera
    this.root = new THREE.Group();
    scene.add(this.root);
    this.shake = 0;
    this.fx = [];
    this.trail = [];
    this.shadowTex = tex(64, 64, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(60,30,20,0.55)'); gr.addColorStop(0.6, 'rgba(60,30,20,0.35)'); gr.addColorStop(1, 'rgba(60,30,20,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    this.burstTex = tex(128, 128, (g, w) => {
      g.translate(w / 2, w / 2);
      g.fillStyle = '#ffffff';
      g.beginPath();
      for (let i = 0; i < 16; i++) {
        const r = i % 2 ? w * 0.18 : w * 0.48;
        const a = (i / 16) * Math.PI * 2;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath(); g.fill();
    });
    this.glowTex = tex(128, 128, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    // marcador sobre a cabeça: triângulo (solo) ou triângulo com o número do jogador
    this.markerTex = {};
    for (const label of ['', '1', '2']) {
      this.markerTex[label] = tex(64, 64, (g) => {
        g.beginPath(); g.moveTo(6, 8); g.lineTo(58, 8); g.lineTo(32, 58); g.closePath();
        g.fillStyle = '#ffffff'; g.fill();
        g.lineWidth = 6; g.strokeStyle = '#221433'; g.stroke();
        if (label) {
          g.fillStyle = '#221433'; g.font = '900 26px Nunito, Arial, sans-serif';
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 32, 25);
        }
      });
    }
  }

  flatDisc(radius, map, color = '#ffffff', opacity = 1) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    this.root.add(m);
    return m;
  }

  ring(inner, outer, color, opacity) {
    const m = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    this.root.add(m);
    return m;
  }

  // (Re)cria os objetos da partida. Chamado também quando muda o estilo artístico.
  bind(match) {
    this.match = match;
    this.root.clear();
    this.fx = [];
    this.style = settings.art;
    const spr = SPRITE[this.style] || SPRITE.cartoon;
    if (this.ballTex) this.ballTex.dispose();
    this.ballTex = tex(128, 128, g => drawBallArt(g));
    const pen = isPen();
    this.views = match.players.map(pl => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = CANVAS;
      const ctx = canvas.getContext('2d');
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      const geo = new THREE.PlaneGeometry(spr.size, spr.size);
      geo.translate(0, spr.size / 2 - spr.size * spr.feet / CANVAS, 0);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: pen ? 0.12 : 0.35, side: THREE.DoubleSide }));
      this.root.add(mesh);
      const brush = this.style === 'pincel';
      const shadow = this.flatDisc(0.6, this.shadowTex, pen ? '#1d3fa0' : brush ? '#3a2a40' : '#ffffff', pen ? 0.55 : brush ? 0.7 : 1);
      const teamRing = this.ring(0.5, 0.6, pl.char.color, 0.0);
      // hitbox: cilindro translúcido na área de contato, só enquanto o golpe está ativo
      const hitbox = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 36, 1, true), new THREE.MeshBasicMaterial({ color: '#39ff88', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
      const hitEdge = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 4, 48), new THREE.MeshBasicMaterial({ color: '#39ff88', transparent: true, opacity: 0.9 }));
      hitEdge.rotation.x = Math.PI / 2;
      hitbox.add(hitEdge);
      const hitTop = hitEdge.clone(); hitTop.position.y = 0.5; hitbox.add(hitTop);
      hitEdge.position.y = -0.5;
      hitbox.renderOrder = 9;
      hitbox.visible = false;
      this.root.add(hitbox);
      return { pl, canvas, ctx, tex: t, mesh, shadow, teamRing, hitbox };
    });
    this.ball = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.ballTex, transparent: true }));
    this.ball.scale.set(BALL_VIS, BALL_VIS, 1);
    this.root.add(this.ball);
    this.ballShadow = this.flatDisc(0.3, this.shadowTex);
    // Destino da bola: desenhado por cima de tudo, meio transparente (aparece através dos atletas).
    this.landRing = this.ring(0.26, 0.38, '#ffffff', 0.6);
    this.landDot = this.flatDisc(0.1, null, '#ffffff', 0.6);
    for (const mk of [this.landRing, this.landDot]) {
      mk.material.depthTest = false;
      mk.renderOrder = 8;
    }
    this.arcs = [];
    // um marcador + anel de alcance por jogador humano (até 2)
    this.pilots = [0, 1].map(() => {
      const ring = this.ring(P.reach - 0.08, P.reach, '#ffffff', 0.35);
      const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.markerTex[''], transparent: true, depthTest: false }));
      marker.scale.set(0.46, 0.46, 1);
      marker.renderOrder = 10;
      this.root.add(marker);
      return { ring, marker };
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.dropLine = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 0.18, gapSize: 0.14, transparent: true, opacity: 0.55 }));
    this.root.add(this.dropLine);
    this.trail = [];
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.shadowTex, color: '#ffffff', transparent: true, depthWrite: false }));
      s.visible = false;
      this.root.add(s);
      this.trail.push(s);
    }
    this.trailHist = [];
  }

  burst(pos, color, size, life = 0.25) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.burstTex, color, transparent: true, depthWrite: false }));
    s.position.set(pos.x, pos.y, pos.z);
    s.material.rotation = Math.random() * Math.PI;
    this.root.add(s);
    this.fx.push({ s, t: 0, life, size });
  }

  // Arco que a bola vai percorrer, mostrado por um instante logo após o chute.
  showArc(color) {
    const path = this.match.ball.path;
    if (!path || path.length < 4) return;
    const pts = [];
    for (let i = 0; i < path.length; i += 2) pts.push(new THREE.Vector3(path[i].x, path[i].y, path[i].z));
    const last = path[path.length - 1];
    pts.push(new THREE.Vector3(last.x, last.y, last.z));
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, Math.min(160, pts.length * 3), 0.035, 6, false);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 7;
    this.root.add(mesh);
    this.arcs.push({ mesh, t: 0, life: 0.9 });
  }

  // Nota da ação: o atleta pisca com a cor da nota (Ótimo dourado, Bom branco, Ruim laranja, Pior vermelho).
  gradeFlash(pl, grade) {
    const look = {
      otimo: { color: '#ffd21a', size: 3.4, blinks: 3, burst: true },
      bom: { color: '#ffffff', size: 2.2, blinks: 1 },
      ruim: { color: '#ff8a1f', size: 2.8, blinks: 2 },
      pior: { color: '#ff2d4d', size: 3.2, blinks: 3 },
    }[grade];
    if (!look) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: look.color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.renderOrder = 6;
    this.root.add(s);
    this.fx.push({ s, t: 0, life: 0.18 * look.blinks + 0.12, size: look.size, follow: pl, blinks: look.blinks });
    if (look.burst) this.burst({ x: pl.x, y: pl.y + 1.3, z: pl.z }, look.color, 2.6, 0.4);
    if (grade === 'pior') this.shake = Math.max(this.shake, 0.12);
  }

  onEvent(e) {
    const b = this.match.ball.pos;
    if (e.type === 'grade') {
      if (settings.assists) this.gradeFlash(e.player, e.grade);
    } else if (e.type === 'hit') {
      if (settings.assists) this.showArc(e.move.special ? e.player.char.color : '#ffffff');
      const power = Math.min(1, (e.speed || 8) / 22);
      this.burst(b, '#ffffff', 0.6 + power * 0.9);
      if (power > 0.7) this.shake = Math.max(this.shake, 0.08);
    } else if (e.type === 'special') {
      this.burst(b, e.player.char.color, 3.2, 0.5);
      this.burst(b, '#ffffff', 1.8, 0.35);
      this.shake = 0.35;
    } else if (e.type === 'land') {
      this.burst({ x: e.x, y: 0.1, z: e.z }, '#f3d9a4', 1.1, 0.35);
    } else if (e.type === 'charge') {
      this.burst(e.player, e.player.char.color, 2.2, 0.3);
    }
  }

  update(dt, time) {
    const m = this.match;
    const cam = this.camera;

    // estilo trocado nas configurações: recria os desenhos
    if (this.style !== settings.art) this.bind(m);

    // câmera: ângulo escolhido (a "por trás" fica atrás da dupla 1 e troca de lado com ela),
    // fixa ou acompanhando a bola de leve, com tremida nos golpes fortes
    this.shake = Math.max(0, this.shake - dt * 1.2);
    const rig = this.rig;
    rig.update(dt, {
      id: settings.view,
      homeSide: m.teams[0].side,
      ball: m.ball.pos,
      follow: settings.camera === 'follow' && m.state !== 'intro',
      shake: this.shake,
    });

    const piloted = m.state !== 'intro' ? m.piloted() : [];
    for (const v of this.views) {
      const pl = v.pl;
      drawAthlete(v.ctx, pl.char, poseFor(pl, time), time);
      // hitbox do golpe (só no tempo ativo de colisão)
      const hb = settings.hitbox ? m.activeHitbox(pl) : null;
      v.hitbox.visible = !!hb;
      if (hb) {
        const h = Math.max(0.1, hb.hi - hb.lo);
        v.hitbox.scale.set(hb.reach, h, hb.reach / 0.8);
        v.hitbox.children.forEach(e => { e.scale.set(1, 1, 1); });
        v.hitbox.position.set(hb.c.x, pl.y + hb.lo + h / 2, hb.c.z);
      }
      v.tex.needsUpdate = true;
      v.mesh.position.set(pl.x, pl.y, pl.z);
      v.mesh.quaternion.copy(cam.quaternion);
      // o desenho é de perfil: vira para o lado da tela onde está a frente do atleta
      // (no carrinho, para onde ele desliza); de frente para a câmera, mantém a última virada
      const dive = pl.state === 'dive';
      const side = rig.screenSide(dive ? pl.vx : pl.facing, dive ? pl.vz : 0);
      v.face = side || v.face || pl.facing;
      v.mesh.scale.x = v.face;
      v.shadow.position.set(pl.x, 0.015, pl.z);
      const sh = Math.max(0.35, 1 - pl.y * 0.35);
      v.shadow.scale.set(sh * (pl.state === 'down' || pl.state === 'dive' ? 1.8 : 1), sh, 1);
      if (pl.state === 'dive' && Math.random() < 0.5) this.burst({ x: pl.x + pl.facing * 0.5, y: 0.15, z: pl.z }, '#f3d9a4', 0.7, 0.3); // areia levantando
      v.teamRing.position.set(pl.x, 0.02, pl.z);
      // parceiro sem controle de uma dupla humana: anel discreto
      const t = m.teams[pl.team];
      v.teamRing.material.opacity = m.state !== 'intro' && t.human && t.pilot === 'switch' && !m.pilotOf(pl) ? 0.55 : 0;
    }

    // jogadores controlados
    this.pilots.forEach((p, i) => {
      const entry = piloted[i];
      p.marker.visible = !!entry;
      p.ring.visible = !!entry && (m.state === 'rally' || m.state === 'serve');
      if (!entry) return;
      const { pl: ctrl, n } = entry;
      const label = m.mode === 'solo' ? '' : String(n);
      if (p.marker.material.map !== this.markerTex[label]) { p.marker.material.map = this.markerTex[label]; p.marker.material.needsUpdate = true; }
      p.marker.position.set(ctrl.x, ctrl.y + 2.75 + Math.sin(time * 6 + i) * 0.08, ctrl.z);
      p.marker.material.color.set(label ? PLAYER_COLORS[n] : ctrl.char.color);
      const rc = ctrl.reachCenter();
      p.ring.position.set(rc.x, 0.025, rc.z);
      const b = m.ball.pos;
      const inReach = m.ball.live && Math.hypot(b.x - rc.x, (b.z - rc.z) * 0.8) < P.reach && b.y - ctrl.y < 3.2;
      const hold = !!ctrl.hold;
      p.ring.material.color.set(inReach ? '#7CFF6B' : hold ? ctrl.char.color : '#ffffff');
      p.ring.material.opacity = inReach ? 0.9 : hold ? 0.8 : 0.35;
      const pulse = hold ? 1 + Math.sin(time * 18) * 0.05 : 1;
      p.ring.scale.set(pulse, pulse, pulse);
    });

    // bola
    const ball = m.ball;
    this.ball.position.set(ball.pos.x, ball.pos.y + BALL_R * 0.6, ball.pos.z);
    this.ball.material.rotation = -ball.rot;
    this.ballShadow.position.set(ball.pos.x, 0.018, ball.pos.z);
    const bs = Math.max(0.4, 1 - ball.pos.y * 0.08);
    this.ballShadow.scale.set(bs, bs, 1);
    this.ballShadow.material.opacity = Math.max(0.3, 1 - ball.pos.y * 0.07);

    const land = ball.live && settings.assists ? ball.landing() : null;
    this.landRing.visible = this.landDot.visible = !!land;
    if (land) {
      // cor da quadra onde vai cair: vermelho/azul = quadra do jogador 1/2, branco = CPU
      const t = m.teams[m.teamBySide(land.x < 0 ? -1 : 1)];
      const pilots = m.teamPilots(t.id);
      const col = !pilots.length ? '#ffffff' : m.mode === 'versus' ? PLAYER_COLORS[pilots[0]] : '#ff4d6d';
      this.landRing.material.color.set(col);
      this.landDot.material.color.set(col);
      this.landRing.position.set(land.x, 0.03, land.z);
      this.landDot.position.set(land.x, 0.03, land.z);
      const s = 1 + Math.sin(time * 10) * 0.12;
      this.landRing.scale.set(s, s, s);
    }
    this.dropLine.visible = ball.live && ball.pos.y > 0.6;
    if (this.dropLine.visible) {
      const pa = this.dropLine.geometry.attributes.position;
      pa.setXYZ(0, ball.pos.x, ball.pos.y, ball.pos.z);
      pa.setXYZ(1, ball.pos.x, 0.02, ball.pos.z);
      pa.needsUpdate = true;
      this.dropLine.computeLineDistances();
    }

    // rastro
    const speed = Math.hypot(ball.vel.x, ball.vel.y, ball.vel.z);
    this.trailHist.unshift({ ...ball.pos });
    if (this.trailHist.length > this.trail.length * 2) this.trailHist.length = this.trail.length * 2;
    const showTrail = ball.live && (speed > 11 || ball.special);
    this.trail.forEach((s, i) => {
      const p = this.trailHist[i * 2 + 1];
      s.visible = showTrail && !!p;
      if (!s.visible) return;
      s.position.set(p.x, p.y, p.z);
      const f = 1 - i / this.trail.length;
      const sz = BALL_VIS * (0.5 + f * 0.9) * (ball.special ? 1.7 : 1);
      s.scale.set(sz, sz, 1);
      s.material.color.set(ball.color || '#ffffff');
      s.material.opacity = f * (ball.special ? 0.9 : 0.5);
    });

    // arcos de trajetória (somem rápido)
    this.arcs = this.arcs.filter(a => {
      a.t += dt;
      const u = a.t / a.life;
      if (u >= 1) { this.root.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); return false; }
      a.mesh.material.opacity = 0.75 * (u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4);
      return true;
    });

    // efeitos
    this.fx = this.fx.filter(f => {
      f.t += dt;
      const u = f.t / f.life;
      if (u >= 1) { this.root.remove(f.s); f.s.material.dispose(); return false; }
      if (f.follow) {
        // brilho que acompanha o atleta e pisca "blinks" vezes
        const p = f.follow;
        f.s.position.set(p.x, p.y + 1.1, p.z + 0.05);
        const ph = (f.t / f.life) * f.blinks;
        const blink = Math.sin((ph % 1) * Math.PI);
        f.s.scale.set(f.size, f.size * 1.15, 1);
        f.s.material.opacity = 0.85 * blink;
        return true;
      }
      const sc = f.size * (0.4 + u * 0.8);
      f.s.scale.set(sc, sc, 1);
      f.s.material.opacity = 1 - u;
      return true;
    });
  }
}
