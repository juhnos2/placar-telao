/* ===== PlacarTelão — Renderizador compartilhado (telão + prévia do painel) ===== */

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function tempoDecorridoMs(clock) {
  const aoVivo = clock.running && clock.startedAt ? Date.now() - clock.startedAt : 0;
  return Math.max(0, (clock.elapsedMs || 0) + aoVivo);
}

function formatarClock(clock) {
  const totalSec = Math.floor(tempoDecorridoMs(clock) / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return mm + ":" + ss;
}

function aplicarTema(root, theme) {
  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--panel", theme.panel);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--text", theme.text);
  root.style.setProperty("--muted", theme.muted);
}

function logoHtml(team) {
  if (team.logoUrl) {
    return '<img src="' + esc(team.logoUrl) + '" alt="' + esc(team.name) + '" />';
  }
  const inicial = (team.name || "?").trim().charAt(0).toUpperCase();
  return '<span class="inicial" style="--time-cor:' + esc(team.color) + '">' + esc(inicial) + '</span>';
}

function timeHtml(team, faltas) {
  return `
    <div class="time">
      <div class="nome">${esc(team.name)}</div>
      <div class="logo">${logoHtml(team)}</div>
      <div class="faltas-time" title="Faltas cometidas">
        <span class="faltas-icone">⚠</span> ${esc(faltas)}
      </div>
    </div>
  `;
}

function brandingHtml(branding) {
  if (!branding) return "";
  const r = branding.realizador || { name: "", logoUrl: "" };
  const sp = (branding.sponsors || []).filter((s) => (s.name || "").trim() || s.logoUrl);
  const temRealizador = (r.name || "").trim() || r.logoUrl;
  if (!temRealizador && sp.length === 0) return "";

  const realizadorHtml = temRealizador
    ? `
      <div class="branding-grupo realizador">
        <span class="branding-rotulo">Realização</span>
        <span class="branding-item">
          ${r.logoUrl ? `<img src="${esc(r.logoUrl)}" alt="${esc(r.name)}" />` : ""}
          ${r.name ? `<span>${esc(r.name)}</span>` : ""}
        </span>
      </div>`
    : "";

  const patrocinadoresHtml = sp.length
    ? `
      <div class="branding-grupo patrocinadores">
        <span class="branding-rotulo">Patrocinadores</span>
        <div class="branding-itens">
          ${sp
            .map(
              (s) => `
            <span class="branding-item">
              ${s.logoUrl ? `<img src="${esc(s.logoUrl)}" alt="${esc(s.name)}" />` : ""}
              ${s.name ? `<span>${esc(s.name)}</span>` : ""}
            </span>`
            )
            .join("")}
        </div>
      </div>`
    : "";

  return `<footer class="branding-barra">${patrocinadoresHtml}${realizadorHtml}</footer>`;
}

function renderPlacar(root, state) {
  aplicarTema(root, state.theme);
  const { teams, score, clock, competition, branding, display } = state;
  const invertido = Boolean(display && display.invertSides);

  const esq = invertido ? teams.away : teams.home;
  const dir = invertido ? teams.home : teams.away;
  const golsEsq = invertido ? score.away : score.home;
  const golsDir = invertido ? score.home : score.away;
  const faltasEsq = invertido ? score.foulsAway : score.foulsHome;
  const faltasDir = invertido ? score.foulsHome : score.foulsAway;

  root.innerHTML = `
    <header class="telao-topo">
      <span class="competicao">${esc(competition.name)}</span>
      <span class="rodada">${esc(competition.round)}</span>
    </header>
    <main class="placar-area">
      ${timeHtml(esq, faltasEsq)}
      ${timeHtml(dir, faltasDir)}
    </main>
    <section class="resultado-area">
      <div class="placar-gols" data-placar>
        <span class="gols" data-gols-esq>${esc(golsEsq)}</span>
        <span class="divisor">–</span>
        <span class="gols" data-gols-dir>${esc(golsDir)}</span>
      </div>
      <div class="faltas-linha">
        <span class="faltas-rotulo">FALTAS</span>
        <div class="faltas-numeros" data-faltas>
          <span data-faltas-esq>${esc(faltasEsq)}</span>
          <span class="divisor">–</span>
          <span data-faltas-dir>${esc(faltasDir)}</span>
        </div>
      </div>
      <div class="clock-area">
        <span class="periodo">${esc(clock.period)}</span>
        <span class="clock ${clock.running ? "" : "pausado"}" data-clock>${formatarClock(clock)}</span>
        ${clock.addedMin > 0 ? `<span class="acrescimos">+${esc(clock.addedMin)}</span>` : ""}
      </div>
    </section>
    ${brandingHtml(branding)}
  `;
}

function renderBanner(overlay, state) {
  const banner = state.banner;
  const temConteudo =
    banner.kind === "text" ? (banner.text || "").trim() : banner.mediaUrl;
  if (!banner.active || !temConteudo) {
    overlay.hidden = true;
    overlay.innerHTML = "";
    return;
  }
  overlay.hidden = false;
  aplicarTema(overlay, state.theme);

  if (banner.kind === "text") {
    overlay.classList.remove("banner-full");
    overlay.innerHTML = `
      <div class="banner-card">
        ${banner.title ? `<div class="banner-titulo">${esc(banner.title)}</div>` : ""}
        <div class="banner-texto">${esc(banner.text)}</div>
      </div>
    `;
  } else if (banner.kind === "image") {
    overlay.classList.add("banner-full");
    overlay.innerHTML = `
      <div class="banner-media">
        <img src="${esc(banner.mediaUrl)}" alt="${esc(banner.title || "Aviso")}" />
        ${banner.title ? `<div class="banner-legenda">${esc(banner.title)}</div>` : ""}
      </div>
    `;
  } else if (banner.kind === "video") {
    overlay.classList.add("banner-full");
    overlay.innerHTML = `
      <div class="banner-media">
        <video src="${esc(banner.mediaUrl)}" autoplay loop muted playsinline></video>
        ${banner.title ? `<div class="banner-legenda">${esc(banner.title)}</div>` : ""}
      </div>
    `;
  }
}
