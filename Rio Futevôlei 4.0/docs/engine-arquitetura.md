# Engine editável do Rio Futevôlei — plano de arquitetura

Objetivo: uma engine em que o jogo inteiro (animações, botões, gráficos, objetos, funções, telas)
possa ser editado de duas formas que conversam entre si:

- **por código**: módulos JavaScript (mods) com uma API estável;
- **por eventos**: folhas de eventos no estilo Construct/GDevelop ("quando X, se Y, faça Z"), montadas
  num editor visual.

As duas formas mexem nas **mesmas coisas**: definições guardadas em registros e eventos emitidos pelo
jogo. Uma folha de eventos é só dados que viram código; um mod pode fazer tudo o que uma folha faz, e mais.

## 1. Princípios

1. **Dados separados da lógica.** Tudo o que o editor pode mexer é uma *definição*: um objeto de
   dados puros (cabe em JSON), com id, guardado num **registro** (`src/engine/registry.js`). O jogo lê
   as definições pelo registro, nunca de constantes soltas no código.
2. **Esquema junto da definição.** Cada registro descreve os campos (`type`, `label`, limites,
   opções). O editor monta os painéis de propriedades a partir do esquema, sem tela escrita à mão
   para cada coisa.
3. **Mudança ao vivo.** Os registros avisam quando algo muda (`onChange`). O jogo reage na hora:
   editar uma câmera, um golpe ou uma pose aparece na partida rodando, sem recarregar a página.
4. **Um só barramento de eventos.** O jogo já emite eventos com nome estável (`match.events`: `hit`,
   `land`, `special`, `grade`, `serve`, `point`, `over`...). Eles são a base das folhas de eventos e
   dos ganchos dos mods. Evento novo → documentado com os campos que carrega.
5. **Simulação determinística.** Passo fixo de 120 Hz e sorteio com semente (a fazer) → replays,
   testes automáticos e "rodar só este lance" dentro do editor.
6. **Camadas que não se misturam.**

```
 editor (página própria: inspetor, linha do tempo, folhas de eventos, visualização ao vivo)
   │ lê/escreve
 conteúdo (src/data/*): câmeras, golpes, atletas, poses, telas, arenas, folhas de eventos   ← JSON
   │ registrado em
 engine (src/engine/*): registros, eventos, ações/condições, rig de câmera, carregador de projeto
   │ usado por
 simulação (match, ball, player, ai)        apresentação (render, art, hud, audio)
```

## 2. Folhas de eventos

Uma folha é uma lista de regras em dados:

```json
{ "when": "hit",
  "if":  [{ "cond": "move.is", "args": { "id": "sharkAttack" } }],
  "do":  [{ "act": "camera.shake", "args": { "amount": 0.35 } },
          { "act": "hud.callout",  "args": { "text": "TUBARÃO!" } }] }
```

- **Gatilhos** (`when`) = os eventos do barramento, mais `tick`, `start`, `button`.
- **Condições** e **ações** são funções registradas com esquema de argumentos
  (`defineCondition('move.is', { args: { id: { type: 'choice', from: 'moves' } } }, fn)`). O editor
  mostra só as que existem, com os campos certos. Os mods podem acrescentar condições e ações novas,
  e elas passam a aparecer no editor visual.
- A folha é **compilada** para funções ao carregar (nada de interpretar a cada quadro), e roda no
  passo fixo para continuar determinística.
- Variáveis (globais, por atleta, por dupla) são definições também, com tipo e valor inicial.

## 3. Por código (mods)

```js
export default function (rf) {
  rf.cameras.patch('fundo', { fov: 44 });
  rf.moves.define('voadora', { /* dados do golpe */ });
  rf.on('hit', e => { if (e.speed > 20) rf.camera.shake(0.3); });
  rf.defineAction('bola.dourada', { args: {} }, () => { /* ... */ });
}
```

Os mods recebem uma API (`rf`) em vez de importar os módulos internos: assim o interior pode mudar
sem quebrar o que já foi feito, e um mod pode ser ligado e desligado.

## 4. O que já existe e como cada parte vai migrar

| Parte | Hoje | Vai virar |
|---|---|---|
| **Câmeras** | ✅ definições em `src/data/cameras.js` + registro + rig (`src/engine/camera.js`) | já é o modelo para as outras |
| Golpes (`moves.js`) | objetos com faixa de altura, botão e uma função `exec` que calcula a trajetória | dados (faixa, botão, profundidade, altura, efeito, queda) + "tipos de trajetória" registrados; `exec` só para casos especiais |
| Atletas (`characters.js`, `custom.js`) | quase dados (atributos, cores, visual, especial) | registro `athletes`; o criador de atleta vira um inspetor do editor |
| Poses (`art/poses.js`) | funções com ângulos calculados no código | **quadros-chave** (ângulo de cada membro × tempo, com curva de suavização), editados numa linha do tempo; a função atual vira o "exportador" inicial |
| Desenho (`art/brush.js`, `pen.js`, `chibi.js`) | código de canvas por estilo | estilos registrados; peças de figurino como definições com camadas e cores |
| Telas e botões (`hud.js`, `ui/*`) | menus montados no código | definições de tela (itens, ações, navegação) + o mesmo construtor de menus de hoje |
| Controles (`input.js`) | ações fixas (A, B, C, D, L, R...) e perfis | tabela de ações editável; os perfis e a calibração continuam |
| Arena (`scene/copacabana.js`) | construída no código | lista de objetos (tipo, posição, escala, cor, "some se tapar a câmera") + construtores registrados |
| Regras (`config.js`, `match.js`) | constantes e fluxo no código | constantes viram definição `rules`; o fluxo vira estados com eventos (fácil de estender por folha) |

## 5. Projeto e arquivos

- Um projeto = uma pasta (ou um .zip) com `project.json` (lista de registros e mods), `data/*.json`,
  `sheets/*.json`, `mods/*.js` e `assets/`.
- O jogo carrega o projeto padrão; o editor salva no navegador e exporta o .zip pronto para o itch.io
  (o mesmo `tools/build-itch.ps1`, que passa a empacotar o projeto).

## 6. Ordem de construção sugerida

1. ✅ Registro de definições e primeira definição migrada (câmeras), com troca ao vivo.
2. Barramento de eventos formal (`on/off/emit`, lista de eventos com campos) por cima de `match.events`.
3. Migrar golpes e atletas para registros (ganho grande: o balanceamento passa a ser editável).
4. Poses em quadros-chave e linha do tempo (a maior refatoração; vem depois porque mexe na arte).
5. Folhas de eventos: condições e ações registradas, compilador, primeiras ações (câmera, HUD, bola, som).
6. Editor (`editor.html`): árvore de registros, inspetor gerado pelo esquema, visualização da partida
   ao vivo, pausar/avançar quadro a quadro, folhas de eventos.
7. API de mods, salvar/carregar projeto, exportar.

## 7. Editor de cenário (mapa 3D)

- A arena vira uma lista de objetos em dados (tipo, posição, rotação, escala, cores, "some se tapar a
  câmera"); cada tipo (coqueiro, guarda-sol, posto, quiosque, morro, barco...) é um construtor registrado.
- Vista 3D livre no editor: orbitar, aproximar e voar pela praia (OrbitControls do Three.js), além de
  vistas prontas (de cima, de frente, de lado) e "ver pela câmera do jogo" (lateral / por trás).
- Selecionar com clique; mover/girar/escalar com alças na tela (TransformControls), grade e encaixe;
  duplicar, apagar, arrastar novos objetos de uma paleta.
- Filtro de desenho (Pincel / Caneta) liga e desliga no editor, para posicionar vendo o 3D "cru".
- A quadra e as áreas de jogo aparecem como guias (linhas, rede, área de saque) e não podem ser
  tapadas sem aviso.

## 8. Marcas e publicidade (área reservada no editor)

- Já no formato de definições: `src/data/brands.js` (dados), `src/engine/brands.js` (registro
  `brands`, com esquema) e `src/art/logos.js` (desenhos dos logos, por id).
- Cada marca: nome, produto, logo, cores (fundo, nome, detalhe) e peso no rodízio (0 = fora do ar).
- Onde aparecem (`src/scene/ads.js`): 16 placas em volta da quadra (rodízio a cada 15 s), faixa
  puxada por avião (uma passagem por minuto, uma marca por vez) e bandeirinha no poste afastado da
  rede (troca a cada 20 s). Os tempos ficam em `ADS`.
- A área de marcas do editor vai: listar as marcas; inserir (nome, produto, cores, logo desenhado
  da biblioteca **ou imagem enviada** — PNG/SVG); editar com pré-visualização da placa, da faixa e
  da bandeira; excluir ou tirar do ar (peso 0); ajustar peso e tempos do rodízio; mostrar quantas
  vezes cada marca apareceu na partida (relatório para o patrocinador).
- Tudo já reage ao vivo: mudar uma marca no registro redesenha placas, faixa e bandeira na hora.

## 9. Câmeras (o primeiro módulo neste formato)

- `src/data/cameras.js` — as câmeras em dados: `lateral` e `fundo` ("por trás"). Campos: âncora
  (`world` fixa, `home` acompanha a dupla 1 e gira 180° na troca de lado), posição, alvo, abertura,
  largura mínima, seguir a bola (`pan`, `back`, `lift`) e a virada dos atletas na tela.
- `src/engine/camera.js` — o registro `cameras` (com esquema) e o `CameraRig`:
  - transição em órbita em volta da quadra (troca de câmera ou de lado), sem atravessar a rede;
  - **controles relativos à tela**: `toWorld()` converte o direcional para a quadra usando a câmera
    de destino, alinhada ao eixo da quadra mais próximo;
  - `screenSide()` diz para que lado da tela o atleta (desenho de perfil) deve virar.
- Para criar uma câmera nova basta acrescentar uma entrada em `src/data/cameras.js` (ou chamar
  `cameras.define(...)`): ela já aparece em Configurações → Ângulo da câmera.
