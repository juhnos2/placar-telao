# ⚽ PlacarTelão

Placar eletrônico de futebol para exibição em **telão de campo**, com painel de controle
em tempo real e **Assistente IA** (Mistral, via SDK oficial em TypeScript).

O sistema tem duas telas:

| Tela | Endereço | Função |
|------|----------|--------|
| **Telão** (display fixo) | `http://localhost:3000/` | Tela simplificada projetada para ficar aberta em tela cheia no telão do estádio |
| **Painel de Controle** | `http://localhost:3000/admin` | Interface de operação: placar, cronômetro, times, cores, banners e IA |

O telão se atualiza **em tempo real** (Server-Sent Events) — qualquer alteração no painel
aparece no telão na hora, sem recarregar a página.

---

## ✨ Funcionalidades

- **Placar em tempo real** — gols dos dois times com botões de gol e correção (−).
- **Cronômetro** — iniciar, pausar, zerar, ajustar minutos e **acréscimos**.
- **Períodos da partida** — Pré-Jogo, 1º Tempo, Intervalo, 2º Tempo, Prorrogação, Pênaltis e Encerrado.
- **Times personalizáveis** — nome, abreviação, cor e **logo** (upload de PNG, JPG ou SVG).
- **Nome da competição e rodada/fase** exibidos no topo do telão.
- **Aparência personalizável** — 5 temas prontos + cores individuais (fundo, painéis, destaque, texto principal e secundário).
- **Banner de aviso** em **texto**, **imagem estática** ou **vídeo**, com título, duração automática e ocultar manual.
- **Assistente IA (Mistral)** — chat integrado ao painel que cria avisos, mensagens de boas-vindas
  e comunicados para o telão. A `MISTRAL_API_KEY` fica **somente no servidor** — o navegador nunca tem acesso a ela.
- **Tela cheia** no telão com ocultação automática do cursor.

---

## 🚀 Como rodar localmente (Node.js)

Requisitos: [Node.js 20+](https://nodejs.org/) (recomendado 22).

```bash
# 1. Instalar dependências
npm install

# 2. (Opcional) Configurar a chave da Mistral para o Assistente IA
cp .env.example .env
# Edite o arquivo .env e coloque a sua chave:
#   MISTRAL_API_KEY=sua-chave-aqui
# Crie a chave gratuitamente em https://console.mistral.ai/

# 3. Compilar o TypeScript
npm run build

# 4. Executar
npm start
```

Acesse:

- Telão: **http://localhost:3000/**
- Painel: **http://localhost:3000/admin**

> 💡 O app funciona sem a chave da Mistral — apenas o Assistente IA fica indisponível.
> Sem `.env`, o servidor lê as variáveis do ambiente normalmente.

### Modo desenvolvimento (recarga automática)

```bash
npm run dev
```

---

## 🐳 Como rodar com Docker

```bash
# 1. (Opcional) Crie um arquivo .env com a sua chave da Mistral
cp .env.example .env

# 2. Subir o container
docker compose up -d --build
```

Acesse `http://localhost:3000/` (telão) e `http://localhost:3000/admin` (painel).

O estado do placar e os arquivos enviados (logos e banners) ficam no volume `./data`,
persistindo entre reinicializações.

---

## 🐘 Como rodar com XAMPP

Esta aplicação é **Node.js puro** — não precisa de PHP, Apache nem MySQL para funcionar.
Mas, se você já usa o XAMPP, há duas opções:

### Opção A (recomendada): Node ao lado do XAMPP

Simplesmente rode a aplicação com Node (`npm install && npm run build && npm start`).
Ela ocupa a porta **3000** e não conflita com o Apache (porta 80) do XAMPP.

### Opção B: Apache do XAMPP como proxy reverso

Se quiser acessar pelo Apache (porta 80), habilite os módulos `mod_proxy` e `mod_proxy_http`
no painel do XAMPP (botão *Config* → `httpd.conf`) e adicione ao final do `httpd.conf`:

```apache
ProxyPreserveHost On
ProxyPass        / http://localhost:3000/
ProxyPassReverse / http://localhost:3000/
```

Reinicie o Apache no XAMPP e acesse `http://localhost/`.

---

## 🌐 Como instalar em uma VPS online

### 1. Instalar Node.js e o projeto

```bash
# Na VPS (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git

git clone https://github.com/SEU-USUARIO/placar-telao.git
cd placar-telao
npm install
npm run build
cp .env.example .env
nano .env   # coloque a MISTRAL_API_KEY
```

### 2. Manter rodando com PM2

```bash
sudo npm install -g pm2
pm2 start dist/server.js --name placar-telao
pm2 save
pm2 startup   # siga a instrução exibida para iniciar no boot
```

### 3. Nginx como proxy reverso (opcional, com domínio)

```nginx
server {
    listen 80;
    server_name telao.seudominio.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "";
        proxy_buffering off;          # essencial para o tempo real (SSE)
        proxy_read_timeout 3600s;
    }
}
```

Em seguida, ative HTTPS com `certbot --nginx`.

### Alternativa: Docker na VPS

```bash
docker compose up -d --build
```

> ⚠️ Em produção, libere no firewall apenas as portas 80/443 (e proteja o painel
> `/admin` com senha do Nginx ou restrição de IP, se o telão for público).

---

## 🗂️ Estrutura do projeto

```
placar-telao/
├── src/                  # Servidor (TypeScript)
│   ├── server.ts         # API, SSE, uploads e rotas
│   ├── state.ts          # Estado do placar + persistência em JSON
│   ├── mistral.ts        # Integração com a API da Mistral (SDK oficial)
│   └── types.ts          # Tipos compartilhados
├── public/               # Frontend (HTML/CSS/JS puro, sem build)
│   ├── index.html        # Tela do telão
│   ├── admin.html        # Painel de controle
│   ├── css/              # Estilos (telao.css, admin.css)
│   └── js/               # Lógica (telao.js, admin.js, placar-render.js)
├── data/                 # Estado (state.json) e uploads (criado em runtime)
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## 🔌 API (para integrações)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/state` | Estado atual do placar |
| `GET` | `/api/stream` | Stream de atualizações em tempo real (SSE) |
| `POST` | `/api/state` | Atualiza o estado completo |
| `POST` | `/api/score` | `{ "team": "home" \| "away", "delta": 1 \| -1 }` |
| `POST` | `/api/clock` | `{ "action": "start" \| "pause" \| "reset" \| "set" \| "added" \| "period" }` |
| `POST` | `/api/banner` | `{ "active": true \| false }` |
| `POST` | `/api/upload` | `{ "name": "logo.png", "data": "<base64>" }` |
| `POST` | `/api/chat` | `{ "messages": [{ "role": "user", "content": "..." }] }` |

---

## 🛠️ Stack

- **Backend:** Node.js + Express + TypeScript
- **IA:** [`@mistralai/mistralai`](https://github.com/mistralai/client-js) (SDK oficial) · modelo `mistral-small-latest`
- **Frontend:** HTML/CSS/JS puro, sem frameworks — leve e rápido para rodar em qualquer máquina
- **Tempo real:** Server-Sent Events (SSE)
- **Persistência:** arquivo JSON (`data/state.json`) + uploads em `data/uploads/`

## 📄 Licença

MIT
