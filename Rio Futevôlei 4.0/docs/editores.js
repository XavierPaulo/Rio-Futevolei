// Peças comuns dos editores de dados (marcas e itens): gravação pelo serve.ps1, campos e envio de imagem.

export const clone = o => JSON.parse(JSON.stringify(o));
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// id a partir do nome (sem acento, camelCase), sem repetir os que já existem
export function makeId(name, taken) {
  const base = (name || 'novo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, ' ').trim()
    .split(/\s+/).map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join('').slice(0, 30) || 'novo';
  let id = base, n = 2;
  while (taken.includes(id)) id = base + n++;
  return id;
}

// Estado de gravação: compara com o original, liga os botões e grava em /api/dados/<kind>.
// opts: { kind, original (texto JSON), get () => dados atuais, statusEl, saveBtn, undoBtn, onUndo }
export function saver({ kind, original, get, statusEl, saveBtn, undoBtn, onUndo }) {
  let canSave = false;
  const setStatus = (k, text) => { statusEl.className = 'status ' + k; statusEl.lastElementChild.textContent = text; };
  const dirty = () => {
    const d = JSON.stringify(get()) !== original;
    saveBtn.disabled = !d || !canSave; undoBtn.disabled = !d;
    if (d) setStatus('dirty', canSave ? 'alterações não gravadas' : 'sem servidor: abra pelo jogo (serve.ps1)');
    else setStatus(canSave ? 'saved' : 'error', canSave ? 'igual ao jogo' : 'sem servidor: só visualização');
    return d;
  };
  fetch('/api/dados/' + kind).then(r => r.json()).then(j => { canSave = !!j.ok; dirty(); }).catch(() => { canSave = false; dirty(); });
  saveBtn.onclick = async () => {
    setStatus('saving', 'gravando…'); saveBtn.disabled = true;
    try {
      const r = await fetch('/api/dados/' + kind, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: JSON.stringify(get(), null, 2) }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'erro');
      saveBtn.dataset.leaving = '1';
      location.reload(); // relê o arquivo gravado
    } catch (e) { setStatus('error', 'não gravou: ' + e.message); saveBtn.disabled = false; }
  };
  undoBtn.onclick = () => { if (confirm('Desfazer todas as alterações não gravadas?')) onUndo(); };
  window.addEventListener('beforeunload', e => { if (JSON.stringify(get()) !== original && saveBtn.dataset.leaving !== '1') e.preventDefault(); });
  return { dirty, canSave: () => canSave };
}

// envia uma imagem (arquivo escolhido) para assets/<folder>/ e devolve o caminho (a partir da raiz do jogo)
export async function uploadImage(folder, id, file) {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('use PNG, JPG, WEBP ou GIF');
  if (file.size > 3 * 1024 * 1024) throw new Error('imagem maior que 3 MB');
  const dataUrl = await new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = bad; r.readAsDataURL(file); });
  const res = await fetch('/api/imagem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder, id, dataUrl }) });
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'erro');
  return j.path;
}

// ---------- campos ----------
export function row(label, control, full = false) {
  const r = document.createElement('div'); r.className = 'row' + (full ? ' full' : '');
  const l = document.createElement('span'); l.className = 'lbl'; l.textContent = label;
  r.append(l);
  if (Array.isArray(control)) r.append(...control); else r.append(control);
  return r;
}
export function text(value, set, { max = 40, area = false } = {}) {
  const i = document.createElement(area ? 'textarea' : 'input');
  if (!area) i.type = 'text';
  i.value = value ?? ''; i.maxLength = max;
  i.oninput = () => set(i.value);
  return i;
}
export function num(value, set, { min = 0, max = 999, step = 1 } = {}) {
  const i = document.createElement('input');
  i.type = 'number'; i.min = min; i.max = max; i.step = step; i.value = value ?? 0;
  i.oninput = () => { const v = Math.max(min, Math.min(max, +i.value || 0)); set(v); };
  return i;
}
export function select(opts, value, set) {
  const s = document.createElement('select');
  for (const [v, t] of opts) s.add(new Option(t, v, false, v === value));
  s.onchange = () => set(s.value);
  return s;
}
export function check(label, value, set) {
  const l = document.createElement('label'); l.className = 'switch';
  const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!value;
  i.onchange = () => set(i.checked);
  l.append(i, document.createTextNode(label));
  return l;
}
export function color(opts, value, set) {
  const box = document.createElement('div'); box.className = 'color';
  for (const [v, t] of opts) {
    const b = document.createElement('button'); b.type = 'button'; b.title = t; b.style.background = v;
    b.setAttribute('aria-pressed', String(v.toLowerCase() === String(value).toLowerCase()));
    b.onclick = () => set(v);
    box.append(b);
  }
  const pick = document.createElement('input'); pick.type = 'color'; pick.value = value || '#000000'; pick.title = 'Outra cor';
  pick.oninput = () => set(pick.value, true);
  box.append(pick);
  return box;
}
export function button(label, onclick, cls = '') {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = onclick;
  if (cls) b.className = cls;
  return b;
}
// botão de enviar imagem: abre o seletor de arquivo e chama onFile(file)
export function filePick(label, onFile) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/png,image/jpeg,image/webp,image/gif'; i.hidden = true;
  i.onchange = () => { if (i.files[0]) onFile(i.files[0]); i.value = ''; };
  const b = button(label, () => i.click());
  const w = document.createElement('span'); w.append(b, i);
  return w;
}
