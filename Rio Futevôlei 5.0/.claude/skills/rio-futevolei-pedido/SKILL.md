---
name: rio-futevolei-pedido
description: Passo a passo para atender um pedido de mudança no jogo Rio Futevôlei (nova regra, golpe, especial, menu, opção, ajuste de balanceamento ou correção). Use quando o autor pedir para criar, mudar ou consertar algo no jogo ou nos editores.
---

# Atender um pedido no Rio Futevôlei

Siga junto com a skill `rio-futevolei-padrao`.

## 1. Entender
- Releia o pedido inteiro; separe cada item (o autor costuma mandar vários de uma vez).
- Procure no código como funciona **hoje** (`src/data/partida5.js`, `src/match.js`, `src/hud.js`, `src/ui/`…).
- Liste para si: o que muda, o que **não** pode mudar, e se algo existente seria removido ou ficaria inacessível.

## 2. Perguntar (antes de codar)
Pergunte quando houver:
- ambiguidade de regra (ex.: vale para a CPU também? para todos os modos?);
- algo que seria **removido/escondido** (sempre perguntar);
- **conflito** com o comportamento atual;
- necessidade de mexer em algo fora do pedido.
Perguntas curtas, com opções, a recomendada primeiro. Se não houver dúvida real, siga direto.

## 3. Fazer — dados primeiro, depois código, depois editor
1. **Número/regra novo vai para os dados** (`src/data/partida5.js` ou o arquivo de dados certo), com comentário explicando e valor padrão que mantém o jogo como hoje quando possível.
2. **Código lê dos dados** (via `src/v5.js` / `V5`), nunca número fixo escondido.
3. **Editor**: adicionar o campo no editor certo (`docs/editor-*.html`), com rótulo em português, unidade, limites e uma dica curta. Se mudar o formato dos dados, migrar o formato antigo.
4. Opção de jogador → Configurações / "Mais opções", salva em `settings`, com texto curto explicando.
5. Comentários no código começam com `// 5.0:` e dizem o porquê.
6. Mudanças pequenas e localizadas; não reescrever o que funciona.

## 4. Verificar
Use a skill `rio-futevolei-testes`. Nada é dado como pronto sem testar no navegador.

## 5. Fechar
- Resposta curta: o que mudou (por item do pedido), onde editar, e o que ficou em aberto.
- Atualizar a memória/`CLAUDE.md` se uma regra nova do autor surgir.
- Oferecer commit + envio para o GitHub (skill `rio-futevolei-fechar-sessao`).
