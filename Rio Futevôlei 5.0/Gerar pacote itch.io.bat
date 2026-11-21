@echo off
rem Gera dist\rio-futevolei-5-itch.zip (o jogo para enviar ao itch.io). Rode de novo sempre que mudar o jogo.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\build-itch.ps1"
echo.
echo O pacote esta na pasta dist. Veja dist\COMO PUBLICAR NO ITCH.txt
pause
