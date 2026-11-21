// 5.0: nada de rolagem em nenhuma tela. fitInto(caixa, conteúdo): se o conteúdo for mais alto (ou largo) que a
// caixa, ele encolhe (scale) até caber, mantendo a largura da caixa preenchida. A caixa fica com overflow: hidden.
export function fitInto(box, inner, pad = 0) {
  if (!box || !inner) return 1;
  inner.style.transform = '';
  inner.style.width = '';
  const cs = getComputedStyle(box);
  const availH = box.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0) - pad;
  const availW = box.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  const h = inner.scrollHeight, w = inner.scrollWidth;
  let k = Math.min(1, availH / Math.max(1, h));
  if (w * k > availW) k = Math.min(k, availW / Math.max(1, w));
  if (k < 1) {
    inner.style.transformOrigin = 'top left';
    inner.style.width = (100 / k) + '%';
    inner.style.transform = `scale(${k.toFixed(3)})`;
  }
  return k;
}
