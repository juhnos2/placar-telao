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

function renderPlacar(root, state) {
  aplicarTema(root, state.theme);
  const { teams, score, clock, competition } = state;
  root.innerHTML = `
    <header class="telao-topo">
      <span class="competicao">${esc(competition.name)}</span>
      <span class="rodada">${esc(competition.round)}</span>
    </header>
    <main class="placar-area">
      <div class="time time-casa">
        <div class="logo">${logoHtml(teams.home)}</div>
        <div class="nome">${esc(teams.home.name)}</div>
      </div>
      <div class="placar-centro">
        <div class="gols">${esc(score.home)}</div>
        <div class="divisor">×</div>
        <div class="gols">${esc(score.away)}</div>
      </div>
      <div class="time time-fora">
        <div class="logo">${logoHtml(teams.away)}</div>
        <div class="nome">${esc(teams.away.name)}</div>
      </div>
    </main>
    <div class="clock-area">
      <span class="periodo">${esc(clock.period)}</span>
      <span class="clock ${clock.running ? "" : "pausado"}" data-clock>${formatarClock(clock)}</span>
      ${clock.addedMin > 0 ? `<span class="acrescimos">+${esc(clock.addedMin)}</span>` : ""}
    </div>
  `;
}

function renderBanner(overlay, state) {
  const banner = state.banner;
  if (!banner.active) {
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
