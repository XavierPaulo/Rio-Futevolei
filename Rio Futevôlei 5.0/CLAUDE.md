# Rio Futevôlei 5.0 — instruções para o Claude

Responda sempre em **português**. Na dúvida, **pergunte** antes de fazer.

## Regras do autor (obrigatórias)
1. **Altere apenas o que for pedido. Nada além.** Se uma mudança pedida exigir mexer em outra coisa, pergunte e peça autorização antes.
2. **Pergunte antes de remover qualquer coisa do jogo** (itens de menu, opções, telas, controles), mesmo que algo novo pareça substituir.
3. Se alguma regra pedida entrar em conflito com como o jogo roda hoje, **avise e não modifique sem confirmação**.
4. "Troca de botão": **não troque os botões** (mapeamento padrão fica como está).
5. "Gravação de verdade": **mantenha em 7.5** (velocidade do carrinho).
6. **Não atualize `docs/comandos.html`** (é o manual da versão 3.0 e fica como está).
7. **Tudo novo precisa ser editável** nos editores locais (`docs/`).
8. Telas: **sem rolagem** em lugar nenhum; texto com **no mínimo 14 px**; em telas pequenas, **dividir** em mais telas/colunas em vez de encolher.
9. As versões anteriores (pastas irmãs 2.0, 3.0, 4.0) ficam **intactas**.
10. Nos testes, **não altere as configurações reais do jogador** (localStorage); se mexer, restaure.

## Como rodar
- Servidor: `powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8769` (ou "Abrir Rio Futevolei 5.0.bat").
- Jogo: http://localhost:8769/ · Hub dos editores: http://localhost:8769/docs/
- O servidor também grava os dados dos editores (`POST /api/dados/<atletas|marcas|itens|clima|partida|visual|teaser>`, `/api/golpes`, `/api/imagem`, `/api/video`).
- Portas das outras versões: 1.x 8765 · 2.0 8766 · 3.0 8767 · 4.0 8768.

## Onde fica cada coisa
- `src/data/partida5.js` — todas as regras da 5.0 (hitbox, especiais, saque, controle, campeonato, atributos…), lido por `src/v5.js`; editor: `docs/editor-partida.html`.
- `src/data/tilt.js` — trajetórias dos golpes/especiais; editor: `docs/editor-golpes.html`.
- `src/data/athletes.js`, `items.js`, `brands.js`, `weather.js`, `colagem.js`, `teaser.js` — editores atletas, itens, marcas, clima, visual, teaser.
- `src/match.js` (partida), `src/hud.js` (menus), `src/ui/` (seleção, configurações, jogadores, campeonato), `src/story/` (modo história), `src/render.js` (desenho), `src/input.js` (controles J1–J4).
- `docs/teste-telas.html` — testa todas as telas em 3 tamanhos (rolagem, fora da tela, texto < 14 px). Rode depois de mudar menus.
- `tools/build-itch.ps1` / "Gerar pacote itch.io.bat" — pacote para o itch.io.

## Dicas de teste
- O painel do navegador fica lento quando escondido: avance o jogo com `__rf.frameStep(1/60)` em vez de esperar quadros.
- Módulos em cache: recarregue com `fetch(arquivo, {cache:'reload'})`.
