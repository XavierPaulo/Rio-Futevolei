// 5.0 Artes: troca das artes desenhadas por código por imagens enviadas no editor de artes
// (docs/editor-artes.html). Os dados ficam em src/data/artes.js; aqui ficam o catálogo (o que dá
// para trocar, com nome, descrição, tamanho e tipo) e o carregamento das imagens.
// Os códigos seguem "grupo/subgrupo/nome" (os mesmos do catálogo em PDF das artes):
//   personagens/atletas/<atleta>          atleta inteiro (imagem parada)
//   personagens/pecas/<atleta|todos>-<peça> peças do corpo (cabeça, tronco, braço, antebraço, mão, coxa, canela, pé)
//   personagens/bola/bola                 a bola
//   cenarios/cts/<bairro>-arena           paisagem de fundo da arena (partida)
//   cenarios/bairros/<bairro>-paisagem    paisagem de fundo da rua (Modo História)
//   cenarios/bairros/fachada-<prédio>     fachada de prédio da rua
//   cenarios/interiores/<lugar>           interior de loja (fundo do menu dela)
//   cenarios/placas/placa-ct | placa-onibus
// Só o estilo Colagem usa as artes dos atletas e da bola; as de cenário valem em todos os estilos.
import ARTES from '../data/artes.js';

export { ARTES };

// peças do corpo: como a imagem é encaixada no esqueleto do atleta
export const PECAS = {
  cabeca: { nome: 'Cabeça', desc: 'Cabeça com cabelo, rosto, chapéu e acessórios. Gira com o pescoço.', tamanho: '256 × 256 px', encaixe: 'centro da imagem = centro da cabeça' },
  tronco: { nome: 'Tronco', desc: 'Tronco com a blusa (regata, camiseta…) e a cintura da bermuda, do quadril ao pescoço.', tamanho: '128 × 256 px', encaixe: 'em pé: topo = pescoço, base = quadril' },
  braco: { nome: 'Braço', desc: 'Braço do ombro ao cotovelo (com a manga e a tatuagem, se tiver).', tamanho: '64 × 160 px', encaixe: 'em pé: topo = ombro, base = cotovelo' },
  antebraco: { nome: 'Antebraço', desc: 'Antebraço do cotovelo ao pulso (com munhequeira, relógio ou pulseiras).', tamanho: '64 × 160 px', encaixe: 'em pé: topo = cotovelo, base = pulso' },
  mao: { nome: 'Mão', desc: 'A mão, na ponta do antebraço.', tamanho: '64 × 64 px', encaixe: 'centro da imagem = centro da mão; dedos para baixo' },
  coxa: { nome: 'Coxa', desc: 'Coxa do quadril ao joelho, com a perna da bermuda ou da sunga.', tamanho: '64 × 192 px', encaixe: 'em pé: topo = quadril, base = joelho' },
  canela: { nome: 'Canela', desc: 'Perna do joelho ao tornozelo.', tamanho: '64 × 192 px', encaixe: 'em pé: topo = joelho, base = tornozelo' },
  pe: { nome: 'Pé', desc: 'Pé descalço (ou o pé de pato), do tornozelo à ponta dos dedos.', tamanho: '96 × 64 px', encaixe: 'deitado: calcanhar à esquerda, ponta dos dedos à direita' },
};
export const PECA_IDS = Object.keys(PECAS);

const PNG = 'PNG com fundo transparente';
// Catálogo de tudo o que dá para trocar. Recebe as listas do jogo (o editor monta):
//   atletas: [[id, nome]] · bairros: [[id, nome, nome do CT]] · predios: [[id, nome]] · interiores: [[id, nome]]
export function catalogoArtes({ atletas = [], bairros = [], predios = [], interiores = [] } = {}) {
  const L = [];
  const add = (codigo, grupo, sub, nome, desc, tamanho, tipo, extra = {}) => L.push({ codigo, grupo, sub, nome, desc, tamanho, tipo, ...extra });
  for (const [id, nome] of [['todos', 'Todos os atletas'], ...atletas]) {
    if (id !== 'todos') add(`personagens/atletas/${id}`, 'personagens', id, `${nome} — atleta inteiro`,
      'O atleta inteiro numa imagem só, colado como recorte. Fica parado (não mexe braços e pernas); as peças abaixo são ignoradas.',
      '256 × 256 px', `${PNG}; pés encostados na base da imagem`, { atleta: id, peca: 'inteiro' });
    for (const p of PECA_IDS) {
      const P = PECAS[p];
      add(`personagens/pecas/${id}-${p}`, 'personagens', id, `${nome} — ${P.nome}`,
        P.desc + (id === 'todos' ? ' Vale para todos os atletas que não tiverem a própria.' : ''),
        P.tamanho, `${PNG}; ${P.encaixe}`, { atleta: id, peca: p });
    }
  }
  add('personagens/bola/bola', 'personagens', 'bola', 'Bola', 'A bola de futevôlei, colada como recorte.', '128 × 128 px', `${PNG}; bola redonda centralizada`, { peca: 'bola' });
  for (const [id, nome, ct] of bairros) {
    add(`cenarios/cts/${id}-arena`, 'cenarios', 'cts', `${ct} (${nome}) — paisagem da arena`,
      'Paisagem do fundo da arena da partida (morros, pedras, prédios), atrás do mar. Substitui os morros desenhados do bairro.',
      '2048 × 512 px', `${PNG}; céu transparente, horizonte na base da imagem`);
    add(`cenarios/bairros/${id}-paisagem`, 'cenarios', 'bairros', `${nome} — paisagem da rua`,
      'Paisagem do fundo da rua do bairro no Modo História, atrás do mar. Substitui os morros e prédios desenhados.',
      '2048 × 512 px', `${PNG}; céu transparente, horizonte na base da imagem`);
  }
  for (const [id, nome] of predios) add(`cenarios/bairros/fachada-${id}`, 'cenarios', 'fachadas', `Fachada — ${nome}`,
    'Frente do prédio na rua do Modo História (parede, janelas, porta e placa). Vale em todos os bairros.', '512 × 384 px', 'PNG ou JPG; a porta no meio da base');
  for (const [id, nome] of interiores) add(`cenarios/interiores/${id}`, 'cenarios', 'interiores', `Interior — ${nome}`,
    'Fundo da tela enquanto o menu do lugar está aberto.', '1280 × 720 px', 'JPG ou PNG, sem transparência');
  add('cenarios/placas/placa-ct', 'cenarios', 'placas', 'Placa do CT', 'A placa redonda "CT" na areia, ao lado da quadrinha.', '128 × 128 px', `${PNG}; placa redonda`);
  add('cenarios/placas/placa-onibus', 'cenarios', 'placas', 'Placa do ponto de ônibus', 'A placa redonda do ponto de ônibus na esquina.', '128 × 128 px', `${PNG}; placa redonda`);
  return L;
}

// ---------- imagens ----------
const ROOT = new URL('../../', import.meta.url); // raiz do jogo (funciona no jogo e nos editores)
const cache = new Map(); // arquivo → { img, ok, waits: [] }
export const arteUrl = arquivo => new URL(arquivo, ROOT).href;

function load(arquivo) {
  let c = cache.get(arquivo);
  if (!c) {
    c = { img: new Image(), ok: false, waits: [] };
    c.img.decoding = 'async';
    c.img.onload = () => { c.ok = true; for (const f of c.waits.splice(0)) f(c.img); };
    c.img.onerror = () => { console.warn('[artes] não carregou', arquivo); c.waits.length = 0; };
    c.img.src = arteUrl(arquivo);
    cache.set(arquivo, c);
  }
  return c;
}

// a troca ligada de um código (ou null)
export function troca(codigo) {
  const t = (ARTES.trocas || {})[codigo];
  return t && t.arquivo && t.ligado !== false ? t : null;
}
// imagem pronta da troca (ou null; começa a carregar e devolve null enquanto não chega)
export function arte(codigo) {
  const t = troca(codigo);
  if (!t) return null;
  const c = load(t.arquivo);
  return c.ok ? c.img : null;
}
// chama cb(img, troca) quando a imagem do código estiver pronta (na hora, se já estiver)
export function quandoArte(codigo, cb) {
  const t = troca(codigo);
  if (!t) return false;
  const c = load(t.arquivo);
  if (c.ok) cb(c.img, t); else c.waits.push(img => cb(img, t));
  return true;
}
// carrega todas as trocas ligadas (no começo do jogo, para não aparecerem com atraso)
export function preloadArtes() { for (const k of Object.keys(ARTES.trocas || {})) if (troca(k)) load(troca(k).arquivo); }
preloadArtes();

// peças de um atleta (só as que já carregaram): { cabeca: { img, t }, ... } ou null
export function pecasDoAtleta(id) {
  let out = null;
  for (const p of PECA_IDS) {
    const cod = troca(`personagens/pecas/${id}-${p}`) ? `personagens/pecas/${id}-${p}` : `personagens/pecas/todos-${p}`;
    const img = arte(cod);
    if (img) (out ||= {})[p] = { img, t: troca(cod) };
  }
  return out;
}
