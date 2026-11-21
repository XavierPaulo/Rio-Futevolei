// Registro de definições editáveis — a peça básica da futura engine/editor.
//
// Tudo o que o editor vai poder mexer (câmeras, golpes, atletas, poses, telas...) vira
// uma "definição": um objeto de dados puros (serializável em JSON), guardado num registro
// com um id. O jogo só lê as definições pelo registro; assim o editor (por código ou por
// eventos) pode trocar, acrescentar ou ajustar qualquer uma em tempo real, salvar e carregar.
//
// schema: descreve os campos de uma definição ({ campo: { type, label, ... } }) para o
// editor montar o painel de propriedades sozinho. Tipos: 'text' | 'number' | 'vec3' |
// 'choice' (com options) | 'group' (com fields).
export function createRegistry(kind, schema = {}) {
  const items = new Map();
  const listeners = new Set();
  const notify = id => listeners.forEach(fn => fn(id));
  return {
    kind,
    schema,
    define(id, def) {
      items.set(id, { ...structuredClone(def), id });
      notify(id);
      return items.get(id);
    },
    // altera só os campos informados (mescla objetos aninhados)
    patch(id, changes) {
      const cur = items.get(id);
      if (!cur) throw new Error(`${kind} "${id}" não existe`);
      const merge = (a, b) => {
        for (const [k, v] of Object.entries(b)) {
          if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object') merge(a[k], v);
          else a[k] = structuredClone(v);
        }
      };
      merge(cur, changes);
      notify(id);
      return cur;
    },
    remove(id) { if (items.delete(id)) notify(id); },
    get(id) { return items.get(id); },
    has(id) { return items.has(id); },
    ids() { return [...items.keys()]; },
    list() { return [...items.values()]; },
    // avisa quando qualquer definição muda (o jogo reage na hora: "hot reload")
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    toJSON() { return Object.fromEntries([...items].map(([id, d]) => { const { id: _, ...rest } = d; return [id, rest]; })); },
    load(json) { for (const [id, def] of Object.entries(json)) this.define(id, def); },
  };
}
