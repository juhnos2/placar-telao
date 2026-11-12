import { Mistral } from "@mistralai/mistralai";
import type { ChatMessage, State } from "./types";

function getClient(): Mistral | null {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return null;
  return new Mistral({ apiKey });
}

function systemPrompt(state: State): string {
  const { teams, competition, score } = state;
  return [
    "Você é o assistente do PlacarTelão, um placar eletrônico de futebol exibido em um telão no estádio.",
    "Sua função é ajudar o operador do placar a criar avisos, mensagens e comunicados curtos para exibir no telão.",
    "Escreva sempre em português do Brasil, com frases curtas, impactantes e adequadas para leitura à distância.",
    `Contexto atual: competição "${competition.name}" (${competition.round}), ${teams.home.name} ${score.home} x ${score.away} ${teams.away.name}.`,
    "Quando o operador pedir um aviso, devolva o texto pronto para exibição, sem explicações extras, a menos que ele peça sugestões.",
  ].join(" ");
}

export async function chatComplete(
  messages: ChatMessage[],
  state: State
): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new Error(
      "MISTRAL_API_KEY não configurada no servidor. Defina a chave no arquivo .env (veja .env.example) e reinicie."
    );
  }

  const model = process.env.MISTRAL_MODEL || "mistral-small-latest";
  const fullMessages = [
    { role: "system" as const, content: systemPrompt(state) },
    ...messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 8000) })),
  ];

  const res = await client.chat.complete({ model, messages: fullMessages });

  const raw = res.choices?.[0]?.message?.content;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((chunk) =>
        typeof chunk === "string" ? chunk : ((chunk as { text?: string }).text ?? "")
      )
      .join("");
  }
  return "";
}
