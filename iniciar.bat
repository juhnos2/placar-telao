@echo off
chcp 65001 >nul
title PlacarTelao
cd /d "%~dp0"

echo ==================================================
echo    PlacarTelao - Placar eletronico para telao
echo ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado neste computador.
    echo.
    echo   1. Baixe e instale em: https://nodejs.org/  (versao LTS)
    echo   2. Avance todas as telas do instalador ^(NEXT, NEXT, FINISH^)
    echo   3. Feche e abra este arquivo novamente
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node --version') do set "NODEV=%%v"
echo Node.js detectado: %NODEV%
echo.

if not exist "node_modules" (
    echo [1/3] Instalando dependencias - pode demorar alguns minutos...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERRO] Falha ao instalar as dependencias.
        echo Verifique sua conexao com a internet e rode novamente.
        pause
        exit /b 1
    )
    echo.
) else (
    echo [1/3] Dependencias ja instaladas.
)

if not exist "dist\server.js" (
    echo [2/3] Compilando o projeto...
    call npm run build
    if errorlevel 1 (
        echo.
        echo [ERRO] Falha na compilacao.
        pause
        exit /b 1
    )
    echo.
) else (
    echo [2/3] Projeto ja compilado.
)

echo [3/3] Iniciando o servidor...
echo.
echo   -------------------------------------------------
echo     TELO:    http://localhost:3000/
echo     PAINEL:  http://localhost:3000/admin
echo   -------------------------------------------------
echo.
echo  Deixe esta janela ABERTA enquanto estiver usando o placar.
echo  Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.

start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000/admin"
call npm start

echo.
echo O servidor foi encerrado.
pause
