import fs from "fs";
import path from "path";
import express from "express";
import { loadState, saveState, PERIODOS, defaultState } from "./state";
import { chatComplete } from "./mistral";
import type { State } from "./types";

function loadEnvFile(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(process.cwd(), "public");
const DATA_DIR = path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const EXTENSOES_PERMITIDAS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".mp4", ".webm", ".ogg",
]);

let state: State = loadState();
const sseClients = new Set<express.Response>();
let bannerTimer: ReturnType<typeof setTimeout> | null = null;

function commit(): void {
  state.updatedAt = Date.now();
  saveState(state);
  broadcast();
  scheduleBannerTimeout();
}

function broadcast(): void {
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function scheduleBannerTimeout(): void {
  if (bannerTimer) {
    clearTimeout(bannerTimer);
    bannerTimer = null;
  }
  if (state.banner.active && state.banner.durationSec > 0) {
    bannerTimer = setTimeout(() => {
      state.banner.active = false;
      commit();
    }, state.banner.durationSec * 1000);
  }
}

function clockElapsedMs(): number {
  const { clock } = state;
  const aoVivo = clock.running && clock.startedAt ? Date.now() - clock.startedAt : 0;
  return clock.elapsedMs + aoVivo;
}

const app = express();
app.use(express.json({ limit: "200mb" }));

app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "1d" }));
app.use(express.static(PUBLIC_DIR, { index: "index.html" }));

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin.html"));
});

app.get("/api/state", (_req, res) => {
  res.json({ ...state, clockMs: clockElapsedMs(), periodos: PERIODOS });
});

app.get("/api/stream", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write(`data: ${JSON.stringify(state)}\n\n`);
  sseClients.add(res);
  req.on("close", () => sseClients.delete(res));
});

app.post("/api/state", (req, res) => {
  const incoming = req.body ?? {};
  const def = defaultState();
  state = {
    competition: { ...def.competition, ...(incoming.competition ?? {}) },
    teams: {
      home: { ...def.teams.home, ...(incoming.teams?.home ?? {}) },
      away: { ...def.teams.away, ...(incoming.teams?.away ?? {}) },
    },
    score: { ...def.score, ...(incoming.score ?? {}) },
    clock: { ...def.clock, ...(incoming.clock ?? {}) },
    banner: { ...def.banner, ...(incoming.banner ?? {}) },
    theme: { ...def.theme, ...(incoming.theme ?? {}) },
    branding: {
      realizador: { ...def.branding.realizador, ...(incoming.branding?.realizador ?? {}) },
      sponsors: Array.isArray(incoming.branding?.sponsors)
        ? incoming.branding.sponsors.map((s: { name?: unknown; logoUrl?: unknown }) => ({
            name: String(s?.name ?? "").slice(0, 60),
            logoUrl: String(s?.logoUrl ?? ""),
          }))
        : [],
      showRealizador: incoming.branding?.showRealizador !== false,
      showSponsors: incoming.branding?.showSponsors !== false,
    },
    display: { ...def.display, ...(incoming.display ?? {}) },
    updatedAt: Date.now(),
  };
  commit();
  res.json({ ok: true, state });
});

app.post("/api/score", (req, res) => {
  const { team, delta, tipo } = req.body ?? {};
  if (team !== "home" && team !== "away") {
    return res.status(400).json({ error: "Time inválido (use 'home' ou 'away')." });
  }
  const lado: "home" | "away" = team;
  const d = Number(delta) >= 0 ? 1 : -1;
  if (tipo === "falta") {
    const chave = lado === "home" ? "foulsHome" : "foulsAway";
    state.score[chave] = Math.max(0, state.score[chave] + d);
  } else {
    state.score[lado] = Math.max(0, state.score[lado] + d);
  }
  commit();
  res.json({ ok: true, state });
});

app.post("/api/clock", (req, res) => {
  const { action, seconds } = req.body ?? {};
  const clock = state.clock;
  switch (action) {
    case "start":
      if (!clock.running) {
        clock.running = true;
        clock.startedAt = Date.now();
      }
      break;
    case "pause":
      if (clock.running) {
        clock.elapsedMs += Date.now() - (clock.startedAt ?? Date.now());
        clock.running = false;
        clock.startedAt = null;
      }
      break;
    case "reset":
      clock.running = false;
      clock.startedAt = null;
      clock.elapsedMs = 0;
      clock.addedMin = 0;
      break;
    case "set":
      if (!clock.running) clock.elapsedMs = Math.max(0, Number(seconds ?? 0)) * 1000;
      break;
    case "added":
      clock.addedMin = Math.min(99, Math.max(0, Number(seconds ?? 0)));
      break;
    case "period":
      if (typeof req.body.period === "string" && PERIODOS.includes(req.body.period)) {
        clock.period = req.body.period;
      }
      break;
    default:
      return res.status(400).json({ error: "Ação de cronômetro inválida." });
  }
  commit();
  res.json({ ok: true, state });
});

app.post("/api/banner", (req, res) => {
  const { active } = req.body ?? {};
  if (active) {
    const b = state.banner;
    const temConteudo =
      b.kind === "text" ? b.text.trim().length > 0 : b.mediaUrl.trim().length > 0;
    if (!temConteudo) {
      return res.status(400).json({
        error: "Preencha o texto do aviso ou envie um arquivo antes de exibir.",
      });
    }
  }
  state.banner.active = Boolean(active);
  commit();
  res.json({ ok: true, state });
});

app.post("/api/upload", (req, res) => {
  const { name, data } = req.body ?? {};
  if (typeof name !== "string" || typeof data !== "string") {
    return res.status(400).json({ error: "Envie 'name' e 'data' (base64)." });
  }
  const ext = path.extname(name).toLowerCase();
  if (!EXTENSOES_PERMITIDAS.has(ext)) {
    return res.status(400).json({ error: `Extensão não permitida: ${ext}` });
  }
  const base64 = data.includes(",") ? data.split(",")[1] : data;
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) {
    return res.status(400).json({ error: "Arquivo vazio ou inválido." });
  }
  if (buffer.length > 150 * 1024 * 1024) {
    return res.status(413).json({ error: "Arquivo muito grande (máx. 150 MB)." });
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const slug = name
    .slice(0, -ext.length)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60) || "arquivo";
  const fileName = `${Date.now()}-${slug}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);
  res.json({ ok: true, url: `/uploads/${fileName}` });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Envie uma lista de mensagens." });
    }
    const reply = await chatComplete(messages, state);
    res.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao chamar a Mistral.";
    res.status(500).json({ error: message });
  }
});

app.use((_req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html"));
});

app.listen(PORT, () => {
  console.log(`✅ PlacarTelão rodando:`);
  console.log(`   Telão:   http://localhost:${PORT}/`);
  console.log(`   Painel:  http://localhost:${PORT}/admin`);
  if (!process.env.MISTRAL_API_KEY) {
    console.log(`   ⚠️  MISTRAL_API_KEY não definida — o Assistente IA ficará indisponível.`);
  }
});
