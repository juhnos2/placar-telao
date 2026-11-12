#!/usr/bin/env bash
# PlacarTelao — inicializador para Linux/Mac
set -e
cd "$(dirname "$0")"

echo "=================================================="
echo "   PlacarTelao - Placar eletronico para telao"
echo "=================================================="
echo

if ! command -v node >/dev/null 2>&1; then
    echo "[ERRO] Node.js nao encontrado."
    echo "Instale em: https://nodejs.org/ (versao LTS) e rode novamente."
    exit 1
fi

echo "Node.js detectado: $(node --version)"
echo

if [ ! -d "node_modules" ]; then
    echo "[1/3] Instalando dependencias - pode demorar alguns minutos..."
    npm install
else
    echo "[1/3] Dependencias ja instaladas."
fi

if [ ! -f "dist/server.js" ]; then
    echo "[2/3] Compilando o projeto..."
    npm run build
else
    echo "[2/3] Projeto ja compilado."
fi

echo "[3/3] Iniciando o servidor..."
echo
echo "  -------------------------------------------------"
echo "    TELO:    http://localhost:3000/"
echo "    PAINEL:  http://localhost:3000/admin"
echo "  -------------------------------------------------"
echo
echo " Pressione Ctrl+C para encerrar."
echo

( sleep 3; xdg-open http://localhost:3000/admin 2>/dev/null || open http://localhost:3000/admin 2>/dev/null || true ) &
npm start
