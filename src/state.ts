import fs from "fs";
import path from "path";
import type { State } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

export const PERIODOS = [
  "Pré-Jogo",
  "1º Tempo",
  "Intervalo",
  "2º Tempo",
  "Prorrogação",
  "Pênaltis",
  "Encerrado",
];

export function defaultState(): State {
  return {
    competition: { name: "Nome da Competição", round: "1ª Rodada", logoUrl: "", showLogo: true },
    teams: {
      home: { name: "Time da Casa", short: "CASA", logoUrl: "", color: "#22c55e" },
      away: { name: "Time Visitante", short: "VIS", logoUrl: "", color: "#38bdf8" },
    },
    score: { home: 0, away: 0, foulsHome: 0, foulsAway: 0 },
    clock: {
      running: false,
      startedAt: null,
      elapsedMs: 0,
      addedMin: 0,
      period: "Pré-Jogo",
    },
    banner: {
      active: false,
      kind: "text",
      title: "",
      text: "Bem-vindos ao estádio!",
      mediaUrl: "",
      durationSec: 0,
    },
    theme: {
      bg: "#04150c",
      panel: "#0a2416",
      accent: "#22c55e",
      text: "#f2fff7",
      muted: "#7fb89a",
    },
    branding: {
      realizador: { name: "", logoUrl: "" },
      sponsors: [],
      showRealizador: true,
      showSponsors: true,
    },
    display: { invertSides: false },
    updatedAt: Date.now(),
  };
}

function mergeSection<T>(base: T, saved: unknown): T {
  if (saved === null || saved === undefined) return base;
  if (typeof base !== "object" || Array.isArray(base)) return saved as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
    if (out[k] !== undefined) out[k] = v;
  }
  return out as T;
}

export function loadState(): State {
  const def = defaultState();
  try {
    if (!fs.existsSync(STATE_FILE)) return def;
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    const state: State = {
      competition: mergeSection(def.competition, saved.competition),
      teams: {
        home: mergeSection(def.teams.home, saved.teams?.home),
        away: mergeSection(def.teams.away, saved.teams?.away),
      },
      score: mergeSection(def.score, saved.score),
      clock: mergeSection(def.clock, saved.clock),
      banner: { ...mergeSection(def.banner, saved.banner), active: false },
      theme: mergeSection(def.theme, saved.theme),
      branding: mergeSection(def.branding, saved.branding),
      display: mergeSection(def.display, saved.display),
      updatedAt: Date.now(),
    };
    if (!Array.isArray(state.branding.sponsors)) state.branding.sponsors = [];
    return state;
  } catch {
    return def;
  }
}

export function saveState(state: State): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}
