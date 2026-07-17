@echo off
setlocal
cd /d "%~dp0"
echo.
echo Verificando Nex Rural...
echo.
call npm run doctor
echo.
pause
