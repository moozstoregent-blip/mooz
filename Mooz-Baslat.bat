@echo off
title Mooz Sunucu
cd /d "%~dp0"
echo.
echo   Mooz baslatiliyor... (bu pencereyi KAPATMA)
echo   Tarayicida ac: http://localhost:3000
echo.
node server.js
echo.
echo   Sunucu durdu. Kapatmak icin bir tusa bas.
pause >nul
