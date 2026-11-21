# Rio Futevôlei — protótipo 0.1 (versão crua)

Jogo arcade de futevôlei 2x2 em 2.5D para navegador (itch.io), com Steam no horizonte.
Personagens e bola em 2D (arte procedural superdeformed), cenário 3D (Three.js).

## Rodar

Sem Node/Python nesta máquina, então há um servidor estático em PowerShell:

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Abra http://localhost:8765/ (`?demo` = CPU contra CPU, útil para testar regras).
(A porta 5173 está reservada pelo Windows nesta máquina.)

## Dificuldade da CPU

12 níveis, escolhidos na tela de seleção (setas ◀ ▶, clique nos quadradinhos ou L1/R1 — no teclado
T/I). Padrão: nível 5. Faixas: Iniciante (1–3), Amador (4–6), Profissional (7–9), Elite (10–11),
Lenda (12). Os níveis ficam em pontos de uma progressão entre a CPU mais fraca e a mais forte
(`src/difficulty.js`: reação, velocidade, leitura da bola, erros, pontaria, alcance, decisões
táticas, uso do especial), calibrados por simulação para que a % de pontos que a CPU ganha suba em
degraus iguais (~7,5% por nível contra um jogador que acerta 85% das bolas). Para recalibrar depois
de mexer nos extremos (`K0`/`K1`), no console do jogo local:
`(await import('./tools/balance.js')).calibrate().then(r => console.log(r.curve, r.levelK))`
e cole o `levelK` em `LEVEL_K`. Para conferir: `.verify()`.

## Publicar no itch.io

`powershell -ExecutionPolicy Bypass -File tools\build-itch.ps1` gera `dist\rio-futevolei-itch.zip`.
O passo a passo do upload está em [docs/itch-upload.md](docs/itch-upload.md). O jogo não depende de
nenhum servidor externo: Three.js (`vendor/three`) e as fontes (`vendor/fonts`) estão no projeto.

## Estilo artístico

Configurações → **Estilo artístico**:
- **Pincel** (padrão): render manual com brush pen. Mesmas proporções do estilo caneta, um pouco
  mais cartunizado (cabeça maior, formas arredondadas), cores chapadas em 2 tons e contorno de pincel
  preto, mais grosso do lado da sombra (`src/art/brush.js`); o cenário passa por um filtro de cores
  simplificadas com contornos limpos, sem papel (`brushFrag` em `src/scene/penPost.js`). Menus com
  letreiro de pincel.
- **Papel e caneta** (padrão): o jogo inteiro parece desenhado com caneta Bic azul, vermelha, verde e
  preta sobre papel, com borda de folha rasgada. O cenário 3D passa por um shader (`src/scene/penPost.js`)
  que faz contornos e hachuras escolhendo a caneta pela cor; os atletas são desenhados à mão
  (`src/art/pen.js`), mais altos e 75% realistas, com traço que "ferve" como animação feita à mão.
  Menus e placar viram folha de caderno.
- **Cartoon**: a arte superdeformed anterior. Uma cópia completa dessa versão também está em
  `backup/arte-cartoon-v0.3/`.

Outras opções: **Ângulo da câmera** lateral (padrão, de lado como na TV) ou **por trás** da sua dupla,
como nos jogos de tênis — a câmera gira em volta da quadra quando as duplas trocam de lado e o
direcional é sempre relativo à tela (cima = para o fundo da tela); **Movimento da câmera** seguindo a
bola (padrão; de leve, sem perder a quadra) ou fixa; **Hitbox dos golpes** (mostra a área de contato só
durante a janela ativa do golpe). As câmeras são dados editáveis em `src/data/cameras.js`.

## Marcas patrocinadoras

Nove marcas fictícias aparecem na arena (`src/data/brands.js`, logos em `src/art/logos.js`):
SunBurn (filtro solar), AraBom (comida árabe), Calango Lindo (óculos de sol), Chimamate (mate),
Angra (água), Su Caza (bolas), Cambitos (pré-treino), VáPralá (curso de inglês) e Coentro Verde
(comida natural). Elas aparecem em 16 placas em volta da quadra (rodízio a cada 15 s), na faixa
de um avião que cruza o céu a cada minuto e na bandeirinha do poste mais afastado da rede (troca a
cada 20 s); tempos em `ADS` (`src/scene/ads.js`). Numa partida, cada marca aparece cerca de 20
vezes nas placas. A publicidade é desenhada fora do filtro de pincel/caneta, para ficar legível.

## Criar atleta

Tela inicial → **Criar atleta** (até 6 atletas, que ocupam as vagas livres da grade de seleção e ficam
salvos no navegador). Opções (`src/art/custom.js`):
- Nome (digitado ou sorteado), pele (5 tons);
- Cabelo: rabo de cavalo, black power, moicano, cacheado curto, liso comprido, raspado (+ 6 cores);
- Chapéu: sem chapéu, pescador, boné, viseira;
- Blusa: regata, camiseta, cropped, listrada (+ 8 cores);
- Bermuda: lisa, faixa lateral, estampada, sunga (+ 8 cores);
- Pulso: nada, munhequeira, relógio, pulseiras;
- Rosto: nada, óculos escuros, óculos de estrela, bigode, brinco;
- Especial: qualquer um dos 6, com descrição;
- Atributos: Força, Agilidade, Precisão e Pique, de 1 a 10, somando exatamente 24.
Prévia animada no estilo artístico atual; os atletas funcionam nos dois estilos.

## Tela de início e modos

- **Jogar solo** — você contra a CPU.
- **Dois jogadores**
  - *Um contra o outro* — cada jogador no seu time.
  - *Juntos no mesmo time* — cada jogador controla um atleta fixo do mesmo time, contra a CPU
    (no 3 contra 3, o 3º atleta do time fica com a CPU).
- Antes da seleção, a tela de **formato**:
  - **1 contra 1, 2 contra 2 ou 3 contra 3**, sempre na mesma quadra (18 × 9 m). No 1 contra 1 o
    atleta pode tocar até 3 vezes seguidas (domina, levanta para si e ataca); nos outros, o mesmo
    atleta não toca duas vezes seguidas. Na trinca, o passe vai para quem ainda não tocou, e o R
    passa a vez da rede para o próximo (um na rede, dois no fundo).
  - **Controle** (solo e um contra o outro, de cada jogador): *o time todo* (um atleta por vez,
    troca automática para quem vai receber) ou *só o meu atleta* (o 1º escolhido; os outros do
    time são da CPU).
- **Nível de cada CPU**: todo atleta da CPU, adversário ou parceiro do seu time, tem o seu próprio
  nível (1 Turista … 12 Lenda), no cartão dele na seleção. Depois de escolher os atletas, o J1
  ajusta: ↑↓ escolhe a CPU, ←→ muda o nível, ✕/A confirma (ou clique nas setas e em "Começar a
  partida"). Os níveis de cada vaga ficam salvos para a próxima partida (padrão: adversários 5,
  parceiros 8).
- **Configurações** — tipo de controle de cada jogador (PlayStation, Xbox ou teclado, só ícones).
- **Seleção de atletas** (estilo Mortal Kombat 2 / Tekken Tag) — grade com 12 vagas + a dupla de chefes
  (ainda bloqueadas), a dupla de cada lado em cartas com os atributos em destaque, cada jogador com o
  seu cursor ao mesmo tempo; a CPU escolhe a dupla dela. Depois, tela de VS (~1,7 s).

## Atributos (1–10, todos somam 24)

| Atleta | Força | Agilidade | Precisão | Pique | Especial |
|---|---|---|---|---|---|
| Giulia | 7 | 6 | 5 | 6 | Bicicleta |
| Zefa | 5 | 8 | 6 | 5 | Meia-bicicleta |
| Tubarão | 9 | 4 | 5 | 6 | Shark Attack Supremo |
| Pipoca | 4 | 6 | 9 | 5 | Pingo Envenenado |
| Dráuzio | 6 | 4 | 7 | 7 | Sarrada (defesa com a cintura, hitbox enorme) |
| Varella | 5 | 8 | 5 | 6 | Escorpião (pula para a frente, calcanhar por cima da cabeça) |

- **Força**: velocidade com que a bola cumpre a trajetória (mesmo arco, mais rápido).
- **Agilidade**: velocidade em quadra e recuperação depois de cada ação.
- **Precisão**: o quanto a bola vai para onde se mirou.
- **Pique**: velocidade da barra de especial (agora individual) e o peso da nota de cada ação.

**Nota da ação** (em relação à bola recebida, ver `src/grade.js`): Pior = cai; Ruim = empurrado
para trás; Bom = neutro; Ótimo = próximo toque com Força e Precisão potencializadas. O atleta pisca
com a cor da nota (dourado, branco, laranja, vermelho). Vale para a CPU também.

**L2 / LT** (teclado: G) liga/desliga as ajudas visuais: brilho da nota, arco da trajetória e alvo
no chão. A **legenda de golpes** por toque fica embaixo e pode ser desligada nas Configurações.

Controles: todos seguem o layout de posição do Xbox (baixo = pulo, esquerda = forte, direita =
preciso, cima = carrinho), qualquer que seja a marca. A ordem é garantida assim (`src/input.js`):
1. mapa calibrado pelo jogador (**Configurações → Calibrar controle**: aperte cada botão pedido uma vez;
   fica salvo por controle no navegador);
2. perfis automáticos: PlayStation original fora do padrão e chips genéricos "USB Gamepad"
   (ex.: Knup, vendor 0810 / 0079);
3. controles que o navegador já reconhece como padrão (Xbox, PS recentes) ficam como estão.
Um controle desconhecido gera um aviso sugerindo calibrar. As Configurações mostram a situação de
cada controle conectado e um teste do último botão apertado.

Teclado dividido (dois jogadores no teclado): J1 = WASD + J K L U I; J2 = setas + `,` `.` `/` `;` `'`
(ou teclado numérico 1 2 0 5 3). Com controles, o J1 usa o 1º controle conectado e o J2 o seguinte.

## Controles

| Ação | Teclado | Controle |
|---|---|---|
| Mover | WASD / setas | analógico / d-pad |
| A (forte) | J ou Z | X / □ |
| B (preciso) | K ou X | B / ○ |
| C (pulo · especial) | L, C ou Espaço | A / ✕ |
| Carrinho | U ou B | Y / △ |
| R (formação) | I ou V | RB |
| L (câmera lenta 50%, só treino) | T | LB |
| Pausa | Esc / P | Start |

**Troca de lado:** como na regra oficial, a cada 6 pontos disputados (somando as duas duplas) as
duplas trocam de lado; o placar acompanha o lado de cada dupla (`SIDE_SWAP_EVERY` em `src/config.js`).

**Pausa:** Continuar e Configurações. Em Configurações escolhe-se o padrão de ícones do controle
(PlayStation ou Xbox, só com os símbolos); a escolha fica salva no navegador.

**Leitura da bola:** o destino da bola aparece por cima dos atletas (semitransparente) e, a cada
chute, o arco da trajetória aparece no céu por um instante.

**Parceiro:** ataque forte (acima de 11 m/s) que entra na hitbox do parceiro sem controle é dominado
por ele sozinho em 80% das vezes (`P.autoDomSpeed` / `P.autoDomChance`).

A câmera lenta é ferramenta de treino: desligue `TRAINING` em `src/config.js` na versão arcade.

**Leitura de jogo:** antes de cada golpe o atleta assume uma postura própria (perna armada atrás = chute,
perna levantada de leve = pingo/pé, peito estufado = domínio de peito, joelho alto = shark, corpo
tombando = bicicleta...). Vale para o jogador (enquanto segura A/B) e para a CPU (quando chega na bola).

**CPU:** erra como gente: reage com atraso variável, lê mal o ponto de queda e corrige tarde (às vezes
não chega), e às vezes pega mal na bola (sai longa, pela lateral ou na rede). O jogador tem hitbox maior
que a CPU (`P.reach` / `P.bandPad` vs `P.cpuReach`).

Segure A/B, escolha a direção e solte: o golpe sai ao soltar. C pula; C no ar com a barra cheia solta
o especial. △ dá um carrinho (pés na frente) na direção do direcional, ou em direção à bola se estiver
parado. O controle passa sozinho para quem vai tocar na bola; o parceiro sem controle volta à posição
da formação (R troca quem fica na rede e quem cobre o fundo). Quem vai dominar ou levantar vira de
frente para a bola antes do toque (ex.: o jogador da rede se vira para o passe que vem do fundo).

## Golpes e função tática

| Toque | Golpe | Botão | Função |
|---|---|---|---|
| 1º | Domínio de peito | A chão | Amortece bola forte (erro cresce pouco com a velocidade) |
| 1º | Domínio de pé | B chão | Passe mais preciso com bola lenta; sofre com bola forte |
| 1º | Cabeça | A ar | Domínio de bola alta |
| 1º | Shark (bloqueio) | B ar | Devolve ataque colado na rede; longe da rede vira toque ruim |
| 2º | Passe de ombro | A chão | Levantamento alto, dá tempo ao atacante |
| 2º | Na fita | B chão | Levantamento colado na rede, arma o Shark Attack |
| 2º | Ataque de segunda | A ar | Surpresa: a defesa reage mais tarde |
| 3º | Chute colocado | A chão | Colocação segura no fundo, de qualquer lugar |
| 3º | Pingo | B chão | Bola curta após a rede; pune defesa recuada |
| 3º | Cabeçada | A ar | Fundo da quadra; diagonais vão para as quinas |
| 3º | Shark Attack | B ar | Ataque mais forte, só funciona perto da rede (de longe vai na rede) |
| — | Carrinho | △ | Busca com os pés a bola longe; jogador fica no chão |

Especiais (C + C no ar, barra cheia): **Bicicleta** (Giulia, ponto do fundo, cai depois),
**Meia-bicicleta** (Zefa, diagonal cruzada com efeito), **Shark Attack Supremo** (Tubarão, funciona até
do meio da quadra), **Pingo Envenenado** (Pipoca, parece ataque de fundo e morre na rede).

## Estrutura

```
src/config.js        constantes (quadra, física, jogador, CPU)
src/match.js         regras, fluxo (saque/rali/ponto), troca de controle
src/moves.js         golpes, trajetórias e função de cada um
src/ball.js          física da bola, rede, previsão de trajetória
src/player.js        movimento, pulo, carrinho, estados
src/ai.js            formação, CPU (plano, reação, erro), mira
src/art/             personagens procedurais, poses, bola
src/scene/           arena 3D de Copacabana
src/render.js        sprites, sombras, marcadores, efeitos
src/hud.js           placar, barras, textos, telas
src/audio.js         efeitos sonoros sintetizados (placeholder)
src/engine/          base da engine editável: registro de definições, câmera
src/data/            definições em dados puros (câmeras; depois golpes, atletas, poses...)
```

Plano da engine editável (por código e por eventos): `docs/engine-arquitetura.md`.
