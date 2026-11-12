/* ===== PlacarTelão — Painel de Controle ===== */

let estado = null;
let salvandoTimer = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ===== Utilidades ===== */

function obterCaminho(obj, caminho) {
  return caminho.split(".").reduce((acc, chave) => (acc == null ? acc : acc[chave]), obj);
}

function definirCaminho(obj, caminho, valor) {
  const partes = caminho.split(".");
  let alvo = obj;
  for (let i = 0; i < partes.length - 1; i++) {
    if (alvo[partes[i]] == null) alvo[partes[i]] = {};
    alvo = alvo[partes[i]];
  }
  alvo[partes[partes.length - 1]] = valor;
}

function toast(msg, erro = false) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.toggle("erro", erro);
  el.hidden = false;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.hidden = true; }, 2600);
}

async function api(caminho, corpo) {
  const res = await fetch(caminho, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo ?? {}),
  });
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(dados.error || "Erro na requisição");
  return dados;
}

/* ===== Carregamento e sincronização ===== */

async function carregarEstado() {
  const res = await fetch("/api/state");
  estado = await res.json();
  preencherFormularios();
  renderizarPrevia();
}

function conectarSSE() {
  const es = new EventSource("/api/stream");
  const statusEl = $("#status-conexao");

  es.onopen = () => {
    statusEl.textContent = "● Conectado";
    statusEl.className = "status ok";
  };

  es.onmessage = (ev) => {
    try {
      const novo = JSON.parse(ev.data);
      if (!estado || novo.updatedAt !== estado.updatedAt) {
        const focoPreservado = document.activeElement;
        const editando = focoPreservado && ["INPUT", "TEXTAREA", "SELECT"].includes(focoPreservado.tagName);
        estado = novo;
        if (!editando) preencherFormularios();
        renderizarPrevia();
      }
    } catch { /* ignora */ }
  };

  es.onerror = () => {
    statusEl.textContent = "● Reconectando…";
    statusEl.className = "status erro";
  };
}

/* ===== Formulários ===== */

function preencherFormularios() {
  $$("[data-campo]").forEach((el) => {
    const valor = obterCaminho(estado, el.dataset.campo);
    if (el.type === "color") el.value = valor || "#000000";
    else el.value = valor ?? "";
  });

  $("#rotulo-casa").textContent = estado.teams.home.name || "Time da Casa";
  $("#rotulo-fora").textContent = estado.teams.away.name || "Time Visitante";
  $("#gols-casa").textContent = estado.score.home;
  $("#gols-fora").textContent = estado.score.away;
  $("#faltas-casa").textContent = estado.score.foulsHome ?? 0;
  $("#faltas-fora").textContent = estado.score.foulsAway ?? 0;
  $("#clock-acrescimos").value = estado.clock.addedMin;

  const selectPeriodo = $("#clock-periodo");
  if (selectPeriodo.options.length === 0) {
    (estado.periodos || []).forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      selectPeriodo.appendChild(opt);
    });
  }
  selectPeriodo.value = estado.clock.period;

  $("#banner-tipo").value = estado.banner.kind;
  alternarCamposBanner();

  $$(".upload-area").forEach((area) => {
    const url = obterCaminho(estado, area.dataset.upload);
    const img = area.querySelector(".upload-preview");
    if (!img) return;
    if (url) { img.src = url; img.style.display = "block"; }
    else { img.removeAttribute("src"); img.style.display = "none"; }
  });

  renderizarPatrocinadores();
  vincularUploads();

  const ehVideo = estado.banner.kind === "video";
  $$('.upload-area[data-upload="banner.mediaUrl"] .upload-preview').forEach((img) => {
    img.style.display = ehVideo ? "none" : img.src ? "block" : "none";
  });
}

function salvarEstado() {
  clearTimeout(salvandoTimer);
  salvandoTimer = setTimeout(async () => {
    try {
      const res = await api("/api/state", estado);
      estado = res.state;
      renderizarPrevia();
    } catch (e) {
      toast(e.message, true);
    }
  }, 350);
}

$$("[data-campo]").forEach((el) => {
  el.addEventListener("change", () => {
    let valor = el.value;
    if (el.type === "number") valor = Number(valor);
    if (el.type === "checkbox") valor = el.checked;
    definirCaminho(estado, el.dataset.campo, valor);
    if (el.dataset.campo === "banner.kind") alternarCamposBanner();
    preencherFormularios();
    salvarEstado();
  });
});

/* ===== Abas ===== */

$$(".menu-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".menu-item").forEach((b) => b.classList.remove("ativo"));
    $$(".aba").forEach((a) => a.classList.remove("ativa"));
    btn.classList.add("ativo");
    $(`.aba[data-aba="${btn.dataset.aba}"]`).classList.add("ativa");
  });
});

/* ===== Placar e cronômetro ===== */

$$(".btn-gol").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      const res = await api("/api/score", {
        team: btn.dataset.time,
        delta: Number(btn.dataset.delta),
        tipo: btn.dataset.tipo || "gol",
      });
      estado = res.state;
      preencherFormularios();
      renderizarPrevia();
    } catch (e) { toast(e.message, true); }
  });
});

$("#btn-iniciar").addEventListener("click", async () => {
  const res = await api("/api/clock", { action: "start" });
  estado = res.state; preencherFormularios(); renderizarPrevia();
});

$("#btn-pausar").addEventListener("click", async () => {
  const res = await api("/api/clock", { action: "pause" });
  estado = res.state; preencherFormularios(); renderizarPrevia();
});

$("#btn-zerar").addEventListener("click", async () => {
  const res = await api("/api/clock", { action: "reset" });
  estado = res.state; preencherFormularios(); renderizarPrevia();
});

$("#btn-set-min").addEventListener("click", async () => {
  const res = await api("/api/clock", { action: "set", seconds: Number($("#clock-minutos").value) * 60 });
  estado = res.state; preencherFormularios(); renderizarPrevia();
});

$("#btn-set-acresc").addEventListener("click", async () => {
  const res = await api("/api/clock", { action: "added", seconds: Number($("#clock-acrescimos").value) });
  estado = res.state; preencherFormularios(); renderizarPrevia();
});

$("#clock-periodo").addEventListener("change", async (ev) => {
  const res = await api("/api/clock", { action: "period", period: ev.target.value });
  estado = res.state; renderizarPrevia();
});

/* ===== Temas prontos ===== */

const TEMAS = {
  "Clássico": { bg: "#04150c", panel: "#0a2416", accent: "#22c55e", text: "#f2fff7", muted: "#7fb89a" },
  "Noite de Jogo": { bg: "#0b0f1a", panel: "#141b2e", accent: "#38bdf8", text: "#f1f5fb", muted: "#8195b3" },
  "Neon": { bg: "#0a0a12", panel: "#161627", accent: "#e879f9", text: "#fdf4ff", muted: "#a78bba" },
  "Amarelo Vivo": { bg: "#111004", panel: "#242208", accent: "#facc15", text: "#fffbe8", muted: "#c2b878" },
  "Vermelho Arena": { bg: "#160404", panel: "#2a0a0a", accent: "#f87171", text: "#fff5f5", muted: "#c99" },
};

const linhaTemas = $("#linha-temas");
Object.entries(TEMAS).forEach(([nome, cores]) => {
  const btn = document.createElement("button");
  btn.className = "tema-botao";
  btn.innerHTML = `
    <span class="amostra" style="background: linear-gradient(135deg, ${cores.bg} 55%, ${cores.accent} 55%)"></span>
    ${nome}
  `;
  btn.addEventListener("click", () => {
    Object.assign(estado.theme, cores);
    preencherFormularios();
    renderizarPrevia();
    salvarEstado();
    toast(`Tema "${nome}" aplicado`);
  });
  linhaTemas.appendChild(btn);
});

/* ===== Uploads ===== */

function vincularUploads() {
  $$(".upload-area").forEach((area) => {
    if (area.dataset.vinculado) return;
    area.dataset.vinculado = "1";
    const campo = area.dataset.upload;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = campo.startsWith("banner") ? "image/*,video/mp4,video/webm" : "image/*";
    input.hidden = true;
    area.appendChild(input);

    area.querySelector(".escolher").addEventListener("click", () => input.click());

    input.addEventListener("change", async () => {
      const arquivo = input.files[0];
      if (!arquivo) return;
      if (arquivo.size > 150 * 1024 * 1024) {
        toast("Arquivo muito grande (máx. 150 MB)", true);
        return;
      }
      toast("Enviando arquivo…");
      const base64 = await new Promise((resolve) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(leitor.result);
        leitor.readAsDataURL(arquivo);
      });
      try {
        const res = await api("/api/upload", { name: arquivo.name, data: base64 });
        definirCaminho(estado, campo, res.url);
        preencherFormularios();
        renderizarPrevia();
        salvarEstado();
        toast("Arquivo enviado com sucesso");
      } catch (e) {
        toast(e.message, true);
      }
    });

    area.querySelector(".remover-logo").addEventListener("click", () => {
      definirCaminho(estado, campo, "");
      preencherFormularios();
      renderizarPrevia();
      salvarEstado();
    });
  });
}

/* ===== Realização e Patrocinadores ===== */

let ultimaChavePatrocinadores = "";

function renderizarPatrocinadores() {
  if (!estado.branding) return;
  const lista = estado.branding.sponsors || [];
  const chave = JSON.stringify(lista);
  const focoNaLista = document.activeElement && $("#lista-patrocinadores").contains(document.activeElement);
  if (chave === ultimaChavePatrocinadores || focoNaLista) return;
  ultimaChavePatrocinadores = chave;

  const cont = $("#lista-patrocinadores");
  cont.innerHTML = "";

  lista.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "patrocinador-item";
    div.innerHTML = `
      <div class="cabecalho-item">
        <span>Patrocinador ${i + 1}</span>
        <button class="btn pequeno perigo excluir-pat">✕ Excluir</button>
      </div>
      <div class="linha-form">
        <label>Nome</label>
        <input type="text" maxlength="60" placeholder="Ex.: Supermercado Central" value="${esc(p.name)}" />
      </div>
      <div class="linha-form">
        <label>Logo</label>
        <div class="upload-area" data-upload="branding.sponsors.${i}.logoUrl">
          <img class="upload-preview" alt="Logo" />
          <div class="upload-acoes">
            <button class="btn pequeno escolher">Escolher imagem</button>
            <button class="btn pequeno perigo remover-logo">Remover</button>
          </div>
        </div>
      </div>
    `;

    div.querySelector("input[type='text']").addEventListener("change", (ev) => {
      estado.branding.sponsors[i].name = ev.target.value;
      renderizarPrevia();
      salvarEstado();
    });

    div.querySelector(".excluir-pat").addEventListener("click", () => {
      estado.branding.sponsors.splice(i, 1);
      ultimaChavePatrocinadores = "";
      preencherFormularios();
      renderizarPrevia();
      salvarEstado();
      toast("Patrocinador removido");
    });

    cont.appendChild(div);
  });
}

$("#btn-add-pat").addEventListener("click", () => {
  if (!estado.branding) estado.branding = { realizador: { name: "", logoUrl: "" }, sponsors: [] };
  if (estado.branding.sponsors.length >= 8) {
    toast("Máximo de 8 patrocinadores", true);
    return;
  }
  estado.branding.sponsors.push({ name: "", logoUrl: "" });
  ultimaChavePatrocinadores = "";
  preencherFormularios();
  renderizarPrevia();
  salvarEstado();
});

/* ===== Banner ===== */

function alternarCamposBanner() {
  const tipo = $("#banner-tipo").value;
  $(".campo-banner-texto").hidden = tipo !== "text";
  $(".campo-banner-media").hidden = tipo === "text";
}

$("#banner-tipo").addEventListener("change", () => {
  definirCaminho(estado, "banner.kind", $("#banner-tipo").value);
  alternarCamposBanner();
  preencherFormularios();
  renderizarPrevia();
  salvarEstado();
});

$("#btn-banner-mostrar").addEventListener("click", async () => {
  try {
    const res = await api("/api/state", estado);
    estado = res.state;
    const b = estado.banner;
    const temConteudo = b.kind === "text" ? (b.text || "").trim() : b.mediaUrl;
    if (!temConteudo) {
      toast("Preencha o texto do aviso ou envie um arquivo antes de exibir", true);
      return;
    }
    await api("/api/banner", { active: true });
    toast("Banner exibido no telão");
  } catch (e) { toast(e.message, true); }
});

$("#btn-banner-ocultar").addEventListener("click", async () => {
  try {
    await api("/api/banner", { active: false });
    toast("Banner ocultado");
  } catch (e) { toast(e.message, true); }
});

function renderizarPreviaBanner() {
  const interno = $("#previa-banner .previa-banner-interno");
  if (!estado) return;
  const t = estado.theme;
  interno.style.setProperty("--previa-bg", t.panel);
  interno.style.setProperty("--previa-texto", t.text);
  interno.style.setProperty("--previa-acento", t.accent);

  const b = estado.banner;
  if (b.kind === "text") {
    interno.innerHTML = `
      <div>
        ${b.title ? `<div class="pb-titulo">${esc(b.title)}</div>` : ""}
        <div class="pb-texto">${esc(b.text)}</div>
      </div>`;
  } else if (b.mediaUrl) {
    interno.innerHTML = `<img src="${esc(b.mediaUrl)}" alt="Prévia" />`;
  } else {
    interno.innerHTML = `<div class="pb-texto" style="color:${esc(t.muted)}">Nenhum arquivo enviado</div>`;
  }

  const status = $("#previa-banner-status");
  status.textContent = b.active
    ? "📣 Banner ativo no telão agora"
    : `Banner pronto para exibição (${b.kind === "text" ? "texto" : b.kind === "image" ? "imagem" : "vídeo"})`;
}

/* ===== Prévia do telão ===== */

function renderizarPrevia() {
  if (!estado) return;
  renderPlacar($("#previa-telao"), estado);
  renderizarPreviaBanner();
}

function ajustarEscalaPrevia() {
  const moldura = $(".previa-moldura");
  const escalaEl = $(".previa-escala");
  if (!moldura || !escalaEl) return;
  const escala = moldura.clientWidth / 1280;
  escalaEl.style.setProperty("--escala", escala);
}

window.addEventListener("resize", ajustarEscalaPrevia);

/* Relógio da prévia */
setInterval(() => {
  if (!estado) return;
  const el = $("#previa-telao [data-clock]");
  if (el) {
    el.textContent = formatarClock(estado.clock);
    el.classList.toggle("pausado", !estado.clock.running);
  }
  $("#clock-display").textContent = formatarClock(estado.clock);
}, 500);

/* ===== Chat IA ===== */

const chatMensagensEl = $("#chat-mensagens");
const historico = [];

function adicionarMensagemChat(papel, texto) {
  const div = document.createElement("div");
  div.className = `msg ${papel}`;
  div.textContent = texto;
  chatMensagensEl.appendChild(div);
  chatMensagensEl.scrollTop = chatMensagensEl.scrollHeight;
  return div;
}

async function enviarChat(texto) {
  adicionarMensagemChat("usuario", texto);
  historico.push({ role: "user", content: texto });

  const digitando = adicionarMensagemChat("ia digitando", "Pensando…");
  $("#chat-enviar").disabled = true;

  try {
    const res = await api("/api/chat", { messages: historico });
    digitando.remove();
    adicionarMensagemChat("ia", res.reply);
    historico.push({ role: "assistant", content: res.reply });
  } catch (e) {
    digitando.remove();
    adicionarMensagemChat("erro", e.message);
  } finally {
    $("#chat-enviar").disabled = false;
    $("#chat-input").focus();
  }
}

$("#chat-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const texto = $("#chat-input").value.trim();
  if (!texto) return;
  $("#chat-input").value = "";
  enviarChat(texto);
});

$$(".sugestao").forEach((btn) => {
  btn.addEventListener("click", () => enviarChat(btn.textContent));
});

/* ===== Inicialização ===== */

carregarEstado()
  .then(() => {
    ajustarEscalaPrevia();
    conectarSSE();
  })
  .catch(() => toast("Não foi possível carregar o estado do servidor", true));
