@echo off
setlocal
cd /d "%~dp0"
echo.
echo Nex Rural - inicializacao local
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale o Node.js LTS e execute este arquivo novamente.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)
echo.
echo Abrindo em http://127.0.0.1:3000
echo Mantenha esta janela aberta enquanto testa o sistema.
echo.
call npm run dev
pause
