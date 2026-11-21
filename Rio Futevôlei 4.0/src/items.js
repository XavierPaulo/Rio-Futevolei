// 4.0: itens das lojas (src/data/items.js, editados em docs/editor-itens.html).
import DATA from './data/items.js';

export const ITEMS = DATA.items;
// itens ativos de uma loja, na ordem do arquivo
export const itemsOf = shop => Object.entries(ITEMS).filter(([, i]) => i.shop === shop && i.enabled !== false).map(([id, i]) => ({ id, ...i }));
// ícone do item em HTML: a imagem enviada ou o emoji
export function itemIcon(id, cls = 'it-ico') {
  const i = ITEMS[id];
  if (!i) return '';
  return i.image ? `<img class="${cls}" src="${i.image}" alt="">` : i.icon ? `<span class="${cls}" aria-hidden="true">${i.icon}</span>` : '';
}
