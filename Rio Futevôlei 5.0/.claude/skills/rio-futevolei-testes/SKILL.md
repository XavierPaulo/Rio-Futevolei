---
name: rio-futevolei-testes
description: Como rodar e testar o Rio Futevôlei 5.0 (servidor local, navegador, teste de telas, partidas simuladas) sem estragar as configurações do jogador. Use depois de qualquer mudança no jogo ou nos editores, ou quando o autor pedir para rodar o jogo/editor.
---

# Testar o Rio Futevôlei 5.0

## Rodar
- Servidor: `powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8769` na pasta da 5.0 (ou o atalho "Abrir Rio Futevolei 5.0.bat"; no Claude Code, launch config `rio-futevolei-5`).
- Jogo `http://localhost:8769/` · editores `http://localhost:8769/docs/`.
- Portas das outras versões: 1.x 8765 · 2.0 8766 · 3.0 8767 · 4.0 8768.

## Checklist depois de uma mudança
1. Recarregar a página e ler o **console** — nenhum erro novo.
2. Testar o caminho pedido de verdade (menu → tela → partida), não só a função.
3. Se mexeu em dados: abrir o **editor**, mudar o valor, salvar e conferir que o jogo usa o valor novo.
4. Se mexeu em menus/telas: rodar **`docs/teste-telas.html`** (todas as telas em 812×375, 1366×768 e 1920×1080; acusa rolagem, coisa fora da tela e texto < 14 px). Se criou tela nova, incluí-la no teste.
5. Conferir que nada existente sumiu.

## Truques
- O painel do navegador fica lento quando escondido: avance a partida com `__rf.frameStep(1/60)` em laço em vez de esperar quadros.
- Módulos em cache: `fetch(arquivo, {cache: 'reload'})` e recarregar.
- `__rf` expõe o jogo para testes (newMatch, match, hud, story…). Para testar especiais da CPU: `rf.newMatch('demo', times)` e ligar `m.tilt = true`.
- Imagem do canvas: enviar `toDataURL` para `/api/imagem` e ler o PNG; apagar depois.

## Cuidados
- **Não alterar as configurações reais** (`localStorage` `rio-futevolei.*`: settings, padStyles, campeonato, saves da história). Se precisar, guardar o valor antes e restaurar no fim.
- No teste-telas, o laço do Criar Jogador **nunca** clica o Pronto! final (salvaria um atleta de verdade).
- Apagar campeonatos/saves de teste criados.
- Reportar com honestidade: o que passou, o que falhou, o que não deu para testar.
