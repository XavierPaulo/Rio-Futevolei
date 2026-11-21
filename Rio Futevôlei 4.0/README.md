# Rio Futevôlei 4.0

> Fork da 3.0 (pasta irmã "Rio Futevôlei 3.0", intacta). Servidor na porta 8768; editor da engine em
> `http://localhost:8768/docs/editor-golpes.html` (aba "Golpes do jogo" = os golpes da 4.0).
> Editor de atletas do Modo História em `http://localhost:8768/docs/editor-atletas.html`: nome, visual,
> atributos, especial de ataque e de defesa de cada atleta e quem joga em cada dupla. Grava
> `src/data/athletes.js` (rota `POST /api/atletas` do `serve.ps1`); recarregue o jogo para ver.
>
> **Hub dos editores:** `http://localhost:8768/docs/` (docs/index.html) leva ao jogo e aos 5 editores.
> - **Marcas** (`docs/editor-marcas.html` → `src/data/brands.js`): nome, descrição, cores do banner, peso,
>   logo desenhado ou imagem enviada (`assets/marcas/`), criar, excluir, ativar/desativar (`enabled`).
> - **Itens** (`docs/editor-itens.html` → `src/data/items.js`): todos os itens das lojas (lanchonete,
>   farmácia, artigos esportivos, moda) e os serviços (spa, academia): emoji ou imagem (`assets/itens/`),
>   nome, descrição, preço, efeito; criar, excluir, ativar/desativar. `src/items.js` (itemsOf, itemIcon)
>   e `condition.js`/`story/data.js` leem dali. Consumível novo entra nas pausas da Exibição quando
>   marcado em "Consumíveis nas pausas".
> - **Clima** (`docs/editor-clima.html` → `src/data/weather.js`): chuva, vento forte e sol forte — nome,
>   ícone, descrição, números do efeito (raio da chuva, graus do vento, Pique/sede do sol, fator da
>   viseira), visual na arena (luz, neblina, tom, gotas) e o sorteio do dia; ativar/desativar (some do
>   sorteio e das opções da Exibição). `condition.js` (WEATHER, WEATHER_FX, rollWeather) e
>   `scene/weather.js` leem dali.
> - Rotas do `serve.ps1`: `POST /api/dados/<atletas|marcas|itens|clima>` { text } e `POST /api/imagem`
>   { folder, id, dataUrl }. Peças comuns: `docs/editores.css` e `docs/editores.js`.
> - Na Lanchonete e na Farmácia, cada compra pergunta: comer/beber/usar agora ou guardar na mochila
>   (o protetor solar só vai para a mochila).

## 4.0 — etapa 1

- Só as mecânicas e os golpes do antigo Modo Tilt (o nome não aparece mais no jogo): □ bola rápida,
  ○ bola precisa, mira em 360° na pausa, ✕ pulo (□ cortada 45°, ○ no parceiro), △ carrinho, □□ / ○○ especiais.
- Menu inicial com dicas (tooltips): Modo História (etapas 2 e 3), Modo Exibição, Tutorial, Criar Jogador e Configurações.
- Modo Exibição: solo ou multiplayer → formato, controle, pontos da partida (6 a 21), condições climáticas
  (chuva, vento forte, sol forte, combinações ou aleatório) e consumíveis liberados nas pausas técnicas
  (2 por time, no menu de pausa). Fome e sede sobem a cada ponto (src/condition.js).
- Tutorial (src/tutorial.js): treino 1 contra 1 com o Treinador Moacir, sem placar, em 8 etapas.
- Criar Jogador: 6 vagas próprias, numa fileira embaixo da grade de seleção (CUSTOM_ROSTER).
- Configurações: sem o estilo papel e caneta.

## 4.0 — etapa 2: Modo História na Urca (src/story/)

- Menu: Novo jogo (1 jogador = Giulia; 2 jogadores = Giulia e Zefa; dificuldade Fácil/Médio/Difícil; 3 vagas) ou Continuar.
- Roteiro: Zefa busca a Giulia → tutorial no CT da Urca → desafio do Rolando Carioca e da Marra Viteia (6 pontos,
  nível 12; Giulia só com especial de ataque, Zefa só com o de defesa) → dia seguinte, bairro livre com relógio
  (12 min reais por dia, das 6h às 22h) → campeonato do CT (3 chaves, prêmio em dinheiro, salvar entre as chaves) →
  o treinador ensina Shark Attack Supremo e Pingo Envenenado e o Rolando chama para o Rio Futevôlei (etapa 3).
- Bairro em vista de lado (street.js): praia com o CT, calçadão, Casa da Giulia, Lanchonete, rua em obras com o ponto
  de ônibus (sem ônibus), Moda, Lotérica e Spa; Pão de Açúcar ao fundo; o céu acompanha a hora.
- Comércio (data.js): lanchonete (mochila), moda (muda o visual da Giulia), lotérica (2 grupos de legumes, 5 números
  sorteados, 10× o bilhete; anuncia o clima de amanhã) e spa (cura Fadiga, Sono e Ansiedade). Preços pela dificuldade.
- Condições: fome e sede sobem com o relógio e nas partidas; dormir passa o dia; às 22h a Giulia volta para casa com Sono.
  O peso delas nos atributos depende da dificuldade (0 / 50% / 100%). A mochila abastece as pausas técnicas.

## 4.0 — etapa 3: Rio Futevôlei

- Fim do campeonato do CT: as obras acabam e o ônibus volta (ponto na esquina; viaja entre os 12 bairros, com passagem e 40 min).
- 12 bairros (data.js, HOODS) com os 4 comércios de cada um, paisagem de fundo (Pão de Açúcar, Pedra do Leme, Dois Irmãos,
  Pedra da Gávea, Pedra do Pontal, prédios da Barra, montanhas, baía) e o CT; Jacarepaguá tem CT privado no lugar da praia.
- Inscrição no CT do Posto 5 (Copacabana) → 10 partidas em ordem (Barra, Leme, Ipanema, Botafogo, Leblon, São Conrado,
  Recreio, Jacarepaguá, Flamengo, Ilha) → final contra Rolando e Marra em Copacabana. Cada vitória ensina um dos 10
  especiais novos (moves.js + data/tilt.js, editáveis na aba Golpes do jogo). No Difícil, epílogo: King Size de Niterói.
- Desafio da dupla de cada CT (1 por dia, prêmio pequeno). Academia (+80 de forma; malhar de novo no dia arrisca uma marca),
  farmácia (protetor, anestésico, tônico), artigos esportivos (viseira, meias de neoprene, tornozeleira).
- Só a Giulia sente fome, sede e forma; a mochila é usada na troca de lado das partidas. Cada comércio mostra o interior
  (interiors.js) atrás do menu e a quantidade de cada item na mochila. Vida praiana passa pela arena (scene/beachLife.js).

## Herdado da 3.0

## Modo Tilt (menu inicial · `src/tilt.js`)

Em qualquer toque, □ (X no Xbox) = bola rápida, longa e menos precisa; ○ (B no Xbox) = bola alta,
curta, precisa e lenta. O golpe muda de nome e animação conforme o toque, mas a bola é a do botão.
Segurando o botão a hitbox aparece (o atleta anda 25% mais devagar). Se a bola entra nela, o tempo
para: a tela escurece 70% (fora atletas, bola, rede e linhas, que brilham) e uma seta (vermelha e
comprida no □, azul e achatada no ○) aponta para a rede, com a área no fim. O direcional (d-pad,
setas/WASD ou analógico: cima, baixo, esquerda, direita e diagonais) vira a seta para aquela direção,
girando até lá (360°). Soltar o botão bate na direção escolhida; depois de 3 s a decisão sai
sozinha. ✕ (A no Xbox) pula; △ carrinho; o saque é o normal.

- **No ar**: □ = cortada saindo a 45° na direção da seta; ○ = vai direto para a região do parceiro
  (área de 2 m de diâmetro), sem pausa.
- **Especiais** (barra cheia, dois toques rápidos, até 0,3 s): □□ = especial de ataque, ○○ = de
  defesa. Armam a hitbox do especial; a bola entrando nela pausa com a seta dourada. Todos os atletas
  podem usar qualquer especial das listas: na seleção, cada jogador escolhe 1 de ataque e 1 de defesa
  para cada atleta (◀ ▶ no cartão). Padrão: ataque = Bicicleta, Shark Supremo, Pingo Envenenado;
  defesa = Sarrada, Escorpião, Meia-bicicleta. A CPU usa o especial do próprio atleta.
- **Editável** (`src/data/tilt.js`, aba "Modo Tilt" do editor): as bolas no chão e no ar (nome,
  distância, área, altura ou ângulo, modelo físico, velocidade), o nome do golpe em cada toque e as
  listas de especiais (adicionar e remover).

## Novidades da 3.0 (balanceamento medido com partidas simuladas)

- **Passes mirados no parceiro**: golpes que ficam no nosso campo vão em direção ao parceiro, até a
  distância do golpe (`gridCenter` em `src/moves.js`), com áreas pequenas (peito Alta, pé Perfeita,
  cabeça Média alta, ombro Alta, na fita Perfeita). Antes quase metade dos pontos era passe perdido.
- **Uma função para cada golpe**: peito seguro, com levantamento alto e lento (bola lenta) e Ótimo a
  partir de 10 m/s; pé preciso, baixo e rápido, só para bola fraca; cabeça rápida; ombro Ótimo só com a
  bola acima de 1,6 m; na fita cai perto da rede e arma o Shark.
- **A nota passa adiante** (`GRADE_FLOW` em `src/grade.js`): a nota de um toque vale para o próximo
  toque do time (o parceiro). Ótimo: 50% mais perto do centro e 30% mais rápido; Ruim: 40% mais longe e
  até 0,35 m de erro; Pior: 80% mais longe e até 0,8 m de erro.
- **Habilidade pelo tempo do aperto** (`TIMING` em `src/grade.js`): para o jogador humano, a bola
  entrar na hitbox logo depois de soltar o botão = no tempo (bola quase no centro, aviso "NO TEMPO!");
  soltar cedo afasta a bola até 1,8× o desvio da Precisão. Não vale no Kids Mode.
- **Ataque sempre passa a rede**: cai pelo menos 0,6 m do outro lado (pingo curto não vira ponto
  contra quem atacou). Chute colocado e cabeçada com mira (antes sem mira, previsíveis) e distâncias
  que cabem na quadra.
- **CPU**: Shark Attack e ataque de segunda só perto da rede, também quando não segue a árvore.
- **Especiais decisivos**: 30% mais rápidos e sempre enganosos (a CPU lê pior).
- Medição (20 partidas, CPU × CPU): nível 5 × 5 = 5 min por partida, 8,5 toques por ponto, 49% dos
  pontos de ataque (antes 13%); nível 8 × 8 ainda longo (≈ 8 min); 12 × 12 a defesa pega quase tudo.

> Novidades da 2.0 (abaixo): golpes definidos em dados
> editáveis (`src/data/moves.js`, editor no artefato "Editor de golpes"), trajetórias com física real
> e destino em linha reta a partir do jogador, com a área medida pela precisão do golpe.

## Novidades da 2.0

- **Golpes em dados** (`src/data/moves.js`): para cada golpe, destino (distância do jogador, precisão,
  formato e medidas da área), trajetória (modelo físico, altura máxima, curva lateral),
  alturas de contato e alcance.
- **Destino em linha reta**: o centro fica a uma distância do jogador, em direção à rede, na mesma
  lateral. A Precisão do golpe é o tamanho da área inteira (malha 3×3) em metros (`aim.w`, `aim.h`):
  diâmetro no círculo, horizontal × vertical na elipse (horizontal = ao longo da quadra; vertical =
  ao longo da rede, como na câmera lateral). Os níveis Perfeita 2,4 m · Alta 3,23 · Média alta 4,06 ·
  Média 4,89 · Média baixa 5,72 · Baixa 6,56 · Espirrada 9 são atalhos no editor. Domínios e
  levantamentos param a 0,45 m da rede (ficam no nosso campo). A Precisão do atleta continua
  afastando a bola do centro da subárea (10 = no centro).
- **Trajetórias com física real** (`src/engine/trajectory.js`): gravidade, arrasto do ar e efeito.
  Nove modelos: parábola balística, parábola com arrasto, topspin, backspin, cravada, balão,
  largadinha, efeito lateral (sidespin) e saque flutuante. O golpe diz a altura máxima (na cravada, a
  velocidade para baixo); o jogo calcula a velocidade de saída, e o tempo no ar sai da física. A Força
  deixa o chute mais rápido e mais reto (pico mais baixo). Se a bola for passar abaixo da fita, o jogo
  sobe o pico o mínimo necessário (menos na cravada, que pode bater na rede).
- **Kids Mode** (menu inicial; solo, um contra o outro ou juntos — `src/kids.js`): o botão escolhe a
  metade da quadra, pela tela: △ cima, ✕ baixo, □ direita, ○ esquerda (no saque também). Os 3 toques
  continuam (1º e 2º no nosso campo, 3º e saque no adversário). Sem pulo, sem especiais (a barra não
  enche) e sem carrinho, nem para a CPU. A mira no chão mostra a metade escolhida; o atleta do
  jogador tem alcance 1,5× e o dobro de folga de altura na hitbox, e quando a bola entra na hitbox
  longe dele, ele desliza até ela (interpolação suave, 0,12–0,3 s) e só então bate.
- **Árvore de decisão da CPU** (`src/data/ai-tree.js`, aba "IA da CPU" do editor): para cada toque, regras
  em ordem ("se distância da rede < 3 m e defesa no fundo → pingo, 100%"); a primeira que bate decide,
  senão vale o golpe padrão. A esperteza do nível é a chance de a CPU seguir a árvore. O pingo agora
  só sai perto da rede (antes saía de longe e caía no próprio campo).
- **Hitbox**: largura para os lados igual em todos os golpes (`src/data/hitbox.js`), editável.
- **Editor**: desfazer / refazer (Ctrl+Z / Ctrl+Y) em golpes, física, hitbox e árvore.
- **Velocidade da bola por golpe** (`traj.pace`): Rápida 130%, Normal ou Lenta 70% — o mesmo
  caminho (altura máxima e destino) percorrido mais depressa ou mais devagar.
- **Sem mira**: o círculo central fica com o dobro da área.
- **Câmera lenta** (treino): cada toque no L1 passa por 90% → 75% → 50% → normal.
- **Nível da CPU**: na tela de níveis, o direcional escolhe a CPU e L1 / R1 diminuem / aumentam.
- **Marcas**: cada partida mostra só 5 marcas, sorteadas no começo dela (o peso aumenta a chance).
- **Mira na quadra**: segurando o botão do golpe, as 9 subáreas aparecem no chão, transparentes, e a
  escolhida pelo direcional fica sólida.
- **Editor de golpes da engine** (`docs/editor-golpes.html`): com o jogo rodando (`serve.ps1`), abra
  `http://localhost:8766/docs/editor-golpes.html`. Ele lê os golpes e a física do próprio código e o
  botão **Aplicar no jogo** (ou Ctrl+S) grava `src/data/moves.js` e `src/data/trajectories.js`
  (`POST /api/golpes` no `serve.ps1`, só aceito da própria página). O jogo aberto no mesmo navegador
  troca os valores na hora, sem recarregar (`src/engine/liveEdit.js`). A cópia publicada no claude.ai
  (artefato) não alcança os arquivos: salva no artefato e mostra o que falta levar para o código
  (`tools/sync-moves.ps1 -From <pasta>`).
- **Física editável** (`src/data/trajectories.js`): a gravidade (todas as bolas) e, por modelo, o
  arrasto do ar, o efeito vertical e a oscilação lateral, editados no editor de golpes (valem para
  todos os golpes que usam o modelo).
- **Mar** com ondas de Gerstner chegando na praia, reflexo do céu suave e espuma irregular; **Pincel**
  com metade da espessura de contorno (atletas e cenário).
- Servidor da 2.0 na porta 8766; ZIP do itch.io em `dist/rio-futevolei-2-itch.zip`.

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

- **Força**: chute mais rápido e mais reto (pico mais baixo para o mesmo destino).
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
