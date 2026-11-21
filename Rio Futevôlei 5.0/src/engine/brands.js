import { createRegistry } from './registry.js';
import BRAND_DATA from '../data/brands.js';

// Marcas patrocinadoras: definições no registro. A futura área de marcas da engine insere,
// edita e exclui marcas por aqui (define / patch / remove); as placas, a faixa do avião e a
// bandeirinha da rede se redesenham sozinhas quando uma marca muda (onChange).
export const brands = createRegistry('brand', {
  name: { type: 'text', label: 'Nome' },
  product: { type: 'text', label: 'Produto' },
  logo: { type: 'choice', label: 'Logo', from: 'logos' },
  colors: {
    type: 'group', label: 'Cores', fields: {
      bg: { type: 'color', label: 'Fundo' }, fg: { type: 'color', label: 'Nome' }, accent: { type: 'color', label: 'Detalhe' },
    },
  },
  weight: { type: 'number', label: 'Peso no rodízio', min: 0, max: 5 },
});
brands.load(BRAND_DATA);

// Marcas de cada partida: só BRANDS_PER_MATCH aparecem (placas, bandeirinha e avião),
// sorteadas no começo de cada partida; o peso aumenta a chance de ser sorteada.
export const BRANDS_PER_MATCH = 5;
export function pickLineup(n = BRANDS_PER_MATCH, rnd = Math.random) {
  const pool = brands.list().filter(b => b.enabled !== false && (b.weight ?? 1) > 0);
  const out = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, b) => s + (b.weight ?? 1), 0);
    let r = rnd() * total, i = 0;
    while (i < pool.length - 1 && (r -= pool[i].weight ?? 1) >= 0) i++;
    out.push(pool.splice(i, 1)[0].id);
  }
  return out;
}

// Rodízio: lista de marcas repetidas pelo peso (peso 0 = fora do ar); ids = só estas marcas.
export function rotation(ids = null) {
  const out = [];
  const list = (ids ? ids.map(id => brands.get(id)).filter(Boolean) : brands.list()).filter(b => b.enabled !== false);
  for (const b of list) for (let i = 0; i < Math.round(b.weight ?? 1); i++) out.push(b);
  return out;
}
