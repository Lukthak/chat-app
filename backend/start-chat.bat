@echo off
title Servidor de Chat
echo Iniciando el servidor...
start powershell -NoExit -Command "cd %cd%; node index.js"
timeout /t 2 > nul
echo Abriendo el navegador...
start http://localhost:3000
pause
