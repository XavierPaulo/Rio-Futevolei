# Rio Futevôlei — resumo do jogo (estado em 21/11/2026)

## Versões
- **1.x** (pasta "Rio Futevôlei") — primeira versão, mira em grade 3×3 do GDD.
- **2.0** — editor de golpes que grava direto no código.
- **3.0** — balanceamento (passes, notas, tempo de toque).
- **4.0** — só a mecânica Tilt; Modo História (Urca + campeonato Rio Futevôlei em 12 bairros), Exibição, Tutorial, Criar Jogador, editores (atletas, marcas, itens, clima).
- **5.0** (atual) — novos controles, hitbox em 3 partes, especiais 50%/100%, visual Colagem, campeonato, multijogador J1–J4.

## Controles (padrão Xbox)
**Modo Clássico:** A pulo · X ataque e B defesa (segurar mira; X rápida/longa, B alta/precisa) · Y carrinho · especiais com dois toques: LB LB ataque 50%, X X ataque 100%, RB RB defesa 50%, B B defesa 100% · LT ajudas visuais · RT formação da dupla · Start pausa.
**Modo Novo:** A pulo · B fraco · X forte · Y carrinho · LB especial de ataque e RB de defesa (o nível sai da barra: 100% → versão 100%, 50–99% → versão 50%) · segurar LT + LB/RB troca o especial (anel girando) · RT formação · Select ajudas visuais.
**Mira do ataque** por jogador: Direta (a seta vai na hora para onde o analógico aponta; sem direção, reto na rede) ou Girando. Padrão: Direta no modo Novo.
**Tipo de botões** Xbox ou PlayStation por controle (tela Jogadores e Configurações).
**Saque:** X forte, B viagem; o analógico desloca o alvo (sem ajuda visual). Cada tipo tem profundidade, lateral, força e chance de Banana Shot.

## Partida
- **Hitbox em 3 partes** (inferior, tronco, superior, proporcional à altura do atleta). A parte e o número do toque definem o nome do golpe. Cada parte tem efeito em altura, precisão, força, distância e chance de Banana Shot (curva lateral).
- **Banana Shot:** com ajudas visuais, aparecem 3 alvos no chão (0,5 a 1 m entre eles); só um é o verdadeiro.
- **Bônus de passe:** cada passe antes do ataque soma +25% de precisão e força.
- **Especiais ativos (8):** ataque — Na Fita, Pingo Envenenado, Shark Supremo, Pingo de Ombro; defesa — Meia-Bicicleta, Sarrada, Bicicleta, Escorpião. Defesa especial no 1º/2º toque vira "Levantada perfeita" para o parceiro.
- **Parado ao aterrissar:** tempo depende da agilidade.
- **Pausa técnica:** a cada troca de lado na Exibição; cada atleta escolhe 1 consumível (só o dono do atleta mexe o cursor).
- **Cara ou coroa** antes da partida (ou sorteio automático).
- A CPU joga com as mesmas regras e a mesma hitbox do jogador.

## Modos
- **Exibição:** 1 a 4 jogadores, pontos, arena, nível da CPU 1–12; "Mais opções" com clima, formato, consumíveis etc.
- **Campeonato:** mata-mata de 8 duplas, partidas de 6, 12 ou 18 pontos, dificuldade Fácil/Médio/Difícil, prêmios.
- **História:** Giulia e Zefa na Urca, depois o campeonato Rio Futevôlei pelos bairros; especiais aprendidos nas vitórias.
- **Tutorial** com o Treinador Moacir · **Criar Jogador** · **Atletas da Colagem**.

## Visual
Estilo padrão **Colagem** (recortes de revista, céu de pôr do sol, atletas com acabamento de foto impressa). 12 atletas no elenco, incluindo Tito Barulho, Dadá Girafa, Mestre Arcano, Rosa Choque, Carneiro Zen e Seu Pé de Pato.

## Editores (tudo editável)
Partida 5.0 (regras), Golpes (trajetórias), Atletas, Itens, Marcas, Clima, Visual, Teaser e Teste de telas — todos em `docs/` da 5.0.

## Extras
Teaser em vídeo (1:30 e 30 s, trilha rock sintetizada) e pacote para publicar no itch.io.

## Perguntas em aberto
- Voltar o botão "Pronto!" na tela de Consumíveis?
- Esconder o arco da trajetória no Banana Shot?
- No modo História com controle Novo, mostrar 2 especiais em vez de 4?
- Força e Banana Shot do saque também para a CPU (hoje sim)?
