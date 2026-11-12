export interface Team {
  name: string;
  short: string;
  logoUrl: string;
  color: string;
}

export interface Clock {
  running: boolean;
  startedAt: number | null;
  elapsedMs: number;
  addedMin: number;
  period: string;
}

export interface Banner {
  active: boolean;
  kind: "text" | "image" | "video";
  title: string;
  text: string;
  mediaUrl: string;
  durationSec: number;
}

export interface Theme {
  bg: string;
  panel: string;
  accent: string;
  text: string;
  muted: string;
}

export interface State {
  competition: { name: string; round: string };
  teams: { home: Team; away: Team };
  score: { home: number; away: number };
  clock: Clock;
  banner: Banner;
  theme: Theme;
  updatedAt: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
