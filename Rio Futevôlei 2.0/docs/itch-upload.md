# Como subir o Rio Futevôlei no itch.io

Baseado em https://itch.io/docs/creators/html5

## 1. Gerar o pacote

Na pasta do projeto, rode:

```
powershell -ExecutionPolicy Bypass -File tools\build-itch.ps1
```

Ele cria `dist\rio-futevolei-itch.zip` (index.html na raiz, só caminhos relativos, sem nada de
servidores externos) e para com uma mensagem de ERRO se achar caminho absoluto, endereço externo ou
nome de arquivo com maiúsculas/minúsculas diferentes. Rode de novo sempre que mudar o jogo.

## 2. Criar a página (primeira vez)

1. Entre em https://itch.io e faça login.
2. No menu da sua conta, clique em **Upload new project** (Enviar novo projeto).
3. Preencha:
   - **Title**: Rio Futevôlei
   - **Kind of project**: **HTML** (é isso que faz o jogo rodar no navegador)
   - **Classification**: Games
   - **Pricing**: No payments ou Donations (jogos HTML no itch só aceitam doação)

## 3. Enviar o ZIP

1. Em **Uploads**, clique em **Upload files** e escolha `dist\rio-futevolei-itch.zip`.
2. Quando o arquivo aparecer na lista, marque **This file will be played in the browser**.

## 4. Opções de exibição (Embed options)

- **Embed**: **Click to launch in fullscreen** (clicar para abrir em tela cheia).
- **Mobile friendly**: deixe **desmarcado** (o jogo ainda não tem controles de toque).
- **Automatically start on page load**: desmarcado (o clique para jogar libera o som).
- **Fullscreen button** e **Enable scrollbars**: não são necessários nesse modo.

## 5. Deixar restrito até testar

- Em **Visibility & access**, escolha **Draft** (só você vê) ou **Restricted** (só quem tem o link
  secreto ou a senha que você definir).
- Clique em **Save**. O itch leva um instante processando o ZIP.

## 6. Testar

1. Clique em **View page**, depois em **Run game** / **Launch game**.
2. Clique uma vez dentro do jogo para ele receber o teclado.
3. Confira: menu, seleção de atletas, uma partida, configurações e um controle (se tiver).
   O controle precisa ser apertado uma vez com a janela do jogo ativa para o navegador reconhecê-lo.
4. Quando estiver tudo certo, volte em **Edit game** → **Visibility & access** → **Public**.

## Atualizar uma versão

Gere o ZIP de novo, em **Edit game** → **Uploads** apague o ZIP antigo, envie o novo, marque
**This file will be played in the browser** e salve.

## Bom saber

- Configurações, controles calibrados e atletas criados ficam salvos no navegador de cada jogador.
  O que foi salvo na versão local (localhost) não aparece no itch, e vice-versa.
- O modo de teste `?demo` (CPU contra CPU) continua no jogo, mas só abre com esse parâmetro no
  endereço; no itch, o jogador nunca cai nele.
