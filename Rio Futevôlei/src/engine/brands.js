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

// Rodízio: lista de marcas repetidas pelo peso (peso 0 = fora do ar).
export function rotation() {
  const out = [];
  for (const b of brands.list()) for (let i = 0; i < Math.round(b.weight ?? 1); i++) out.push(b);
  return out;
}
