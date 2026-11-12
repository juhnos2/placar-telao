@echo off
setlocal
chcp 65001 >nul
title PlacarTelao
cd /d "%~dp0"

set "PORTA=3000"
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        if /i "%%a"=="PORT" set "PORTA=%%b"
    )
)
if defined PORTA set "PORTA=%PORTA: =%"

:MENU
cls
echo ==================================================
echo    PlacarTelao - Placar eletronico para telao
echo ==================================================
echo.
echo   Porta configurada: %PORTA%  (arquivo .env)
echo.
echo   [1] Iniciar o PlacarTelao
echo   [2] Reparar: reinstalar dependencias e recompilar
echo   [3] Diagnostico do sistema
echo   [0] Sair
echo.
choice /c 1230 /n /m "  Digite o numero da opcao: "
if errorlevel 4 goto FIM
if errorlevel 3 goto DIAG
if errorlevel 2 goto REPARAR
if errorlevel 1 goto INICIAR

:CHECK_NODE
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo  [ERRO] Node.js NAO foi encontrado neste computador.
    echo.
    echo    1. Acesse: https://nodejs.org/
    echo    2. Baixe a versao "LTS" e instale ^(NEXT, NEXT, FINISH^)
    echo    3. FECHE ESTA JANELA e abra o iniciar.bat novamente
    echo.
    pause
    exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
    echo.
    echo  [ERRO] Node.js foi encontrado, mas o npm nao.
    echo  Reinstale o Node.js em https://nodejs.org/ mantendo a opcao
    echo  "npm package manager" marcada.
    echo.
    pause
    exit /b 1
)
exit /b 0

:INICIAR
call :CHECK_NODE
if errorlevel 1 goto MENU

for /f "delims=" %%v in ('node --version') do echo  Node.js detectado: %%v
echo.

if not exist "node_modules" (
    echo  [1/2] Instalando dependencias - aguarde, pode demorar
    echo        varios minutos no primeiro uso...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  [ERRO] Falha ao instalar as dependencias.
        echo  Verifique sua conexao com a internet e tente a opcao 2.
        echo.
        pause
        goto MENU
    )
    echo.
) else (
    echo  [1/2] Dependencias ja instaladas.
)

if not exist "dist\server.js" (
    echo  [2/2] Compilando o projeto...
    call npm run build
    if errorlevel 1 (
        echo.
        echo  [ERRO] Falha na compilacao.
        echo.
        pause
        goto MENU
    )
    echo.
) else (
    echo  [2/2] Projeto ja compilado.
)

echo.
echo  ==================================================
echo    Servidor iniciando...
echo.
echo      TELO:    http://localhost:%PORTA%/
echo      PAINEL:  http://localhost:%PORTA%/admin
echo  ==================================================
echo    Deixe esta janela ABERTA enquanto usar o placar.
echo    Para encerrar: Ctrl+C e depois S.
echo.
start "" cmd /c "timeout /t 4 >nul & start http://localhost:%PORTA%/admin"
call npm start

echo.
echo  [AVISO] O servidor parou de rodar.
echo  Se apareceu algum erro acima, tire um print e envie para analise.
echo.
pause
goto MENU

:REPARAR
call :CHECK_NODE
if errorlevel 1 goto MENU

echo.
echo  Removendo instalacao anterior...
if exist "node_modules" rmdir /s /q node_modules
if exist "dist" rmdir /s /q dist
echo.
echo  Instalando dependencias - pode demorar varios minutos...
echo.
call npm install
if errorlevel 1 (
    echo.
    echo  [ERRO] Falha no npm install. Verifique sua internet.
    echo.
    pause
    goto MENU
)
echo.
echo  Compilando o projeto...
call npm run build
if errorlevel 1 (
    echo.
    echo  [ERRO] Falha na compilacao.
    echo.
    pause
    goto MENU
)
echo.
echo  ==============================================
echo    Reparo concluido com sucesso!
echo    Use a opcao 1 para iniciar o PlacarTelao.
echo  ==============================================
echo.
pause
goto MENU

:DIAG
echo.
echo  ================= DIAGNOSTICO =================
echo.
call :CHECK_NODE
for /f "delims=" %%v in ('node --version 2^>nul') do echo   Node.js:   %%v
for /f "delims=" %%v in ('npm --version 2^>nul') do echo   npm:       %%v
echo.
echo   Pasta do projeto: %CD%
echo.
if exist "package.json"  (echo   package.json:  OK) else (echo   package.json:  FALTANDO - voce esta na pasta certa do projeto?)
if exist "node_modules"  (echo   node_modules:  OK) else (echo   node_modules:  AUSENTE - use a opcao 2)
if exist "dist\server.js" (echo   compilacao:    OK) else (echo   compilacao:    AUSENTE - use a opcao 2)
if exist ".env"          (echo   .env:          presente) else (echo   .env:          ausente - a IA ficara desativada, o resto funciona)
echo.
echo   Testando a porta %PORTA%:
netstat -ano 2>nul | findstr /c:":%PORTA% " >nul
if errorlevel 1 (echo   porta %PORTA%: livre) else (echo   porta %PORTA%: EM USO por outro programa)
echo.
echo  ================================================
echo.
pause
goto MENU

:FIM
endlocal
exit /b 0
