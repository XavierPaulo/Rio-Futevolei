---
name: rio-futevolei-padrao
description: Regras fixas, padrões de tela e jeito de trabalhar do jogo Rio Futevôlei (Cachorrinho Na Rede Produções). Use SEMPRE que a conversa for sobre o Rio Futevôlei — ideias, regras de jogo, menus, controles, especiais, balanceamento, história, editores ou código — antes de sugerir ou mudar qualquer coisa.
---

# Rio Futevôlei — padrão do projeto

Jogo de futevôlei no navegador (Three.js, sem build), feito pelo estúdio Cachorrinho Na Rede Produções. A versão atual é a **5.0**; as anteriores (1.x, 2.0, 3.0, 4.0) existem em pastas irmãs e **ficam intactas**.

## Como falar com o autor
- Sempre em **português**, direto e curto. Listas e tabelas no lugar de parágrafos longos.
- Ao trazer opções ou sugestões, **numere** (1, 2, 3…), uma linha de "por quê" cada, e diga qual recomenda. O autor costuma responder escolhendo pelos números ("2, 4, 7") e ajustando alguns ("no 3, …").
- Quando algo estiver ambíguo, **pergunte antes** (até 4 perguntas objetivas, com opções). Não adivinhe regra de jogo.
- Ao terminar, resuma o que mudou em poucas linhas e liste as **perguntas que ficaram em aberto**.

## Regras do autor (nunca quebrar)
1. **Altere apenas o que foi pedido. Nada além.** Se a mudança pedida exigir mexer em outra coisa, peça autorização antes.
2. **Pergunte antes de remover, esconder ou tornar inacessível** qualquer coisa que existe (item de menu, opção, tela, controle, atalho) — mesmo que algo novo pareça substituir.
3. Se um pedido **conflitar com como o jogo roda hoje**, avise e espere confirmação.
4. **Não trocar o mapeamento de botões padrão.**
5. Velocidade do carrinho ("gravação de verdade") **fica em 7.5**.
6. **`docs/comandos.html` não é atualizado** (é o manual da 3.0).
7. **Tudo novo precisa ser editável** nos editores locais (`docs/editor-*.html`): números, chances, tempos, nomes, ligado/desligado.
8. Nos testes, **não mudar as configurações reais do jogador**; se mudar, restaurar.

## Padrão de telas e menus
- **Nenhuma rolagem** em tela nenhuma.
- **Texto com no mínimo 14 px.**
- Em telas pequenas (altura < 520 px), **dividir** (mais colunas, mais páginas, mais passos) em vez de encolher.
- Hierarquia enxuta: o essencial na tela, o resto em **"Mais opções"**.
- Barra de navegação separada com **Voltar** e **Avançar / Pronto!**; o último passo diz "Pronto!". Ícones do controle nos botões.
- Botões com nomes no padrão Xbox, convertidos para PlayStation conforme o controle de cada jogador.
- Visual padrão: **Colagem** (recortes de revista, papel, pôr do sol).

## Termos do jogo (use estes nomes)
Exibição, Campeonato, História, Tutorial, Criar Jogador, Atletas da Colagem · J1–J4 (jogadores) · modo de controle **Clássico** / **Novo** · mira **Direta** / **Girando** · saque **forte** (X) / **viagem** (B) · hitbox **inferior / tronco / superior** · especiais **50% / 100%** · **Banana Shot** (curva lateral) · **pausa técnica** e **consumíveis** · **ajudas visuais** · **cara ou coroa** · **Levantada perfeita** · barra de especial.

## Onde as regras moram (5.0)
- `src/data/partida5.js` → editor `docs/editor-partida.html` (hitbox, especiais, saque, controle, campeonato, atributos, história).
- `src/data/tilt.js` → `docs/editor-golpes.html` (trajetórias).
- Atletas, itens, marcas, clima, visual, teaser → seus editores em `docs/`.
Hub dos editores: `http://localhost:8769/docs/`. Jogo: `http://localhost:8769/`.
