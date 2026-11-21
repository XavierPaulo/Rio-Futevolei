@echo off
rem Rio Futevolei 5.0: liga o servidor do jogo e abre os editores no navegador.
rem Deixe esta janela aberta enquanto usa o jogo e os editores. Para desligar, feche a janela.
cd /d "%~dp0"
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8769/docs/"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1" -Port 8769
pause
