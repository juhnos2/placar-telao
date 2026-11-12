/* ===== PlacarTelão — Tela do telão (display fixo) ===== */

const telaoEl = document.getElementById("telao");
const overlayEl = document.getElementById("banner-overlay");
const btnFullscreen = document.getElementById("btn-fullscreen");

let estadoAtual = null;

function renderizar() {
  if (!estadoAtual) return;
  renderPlacar(telaoEl, estadoAtual);
  renderBanner(overlayEl, estadoAtual);
}

function conectar() {
  const es = new EventSource("/api/stream");

  es.onmessage = (ev) => {
    try {
      estadoAtual = JSON.parse(ev.data);
      removerAvisoDesconectado();
      renderizar();
    } catch {
      /* mensagem inválida ignorada */
    }
  };

  es.onerror = () => {
    mostrarAvisoDesconectado();
    es.close();
    setTimeout(conectar, 3000);
  };
}

function mostrarAvisoDesconectado() {
  if (document.querySelector(".desconectado")) return;
  const aviso = document.createElement("div");
  aviso.className = "desconectado";
  aviso.textContent = "Reconectando ao servidor…";
  document.body.appendChild(aviso);
}

function removerAvisoDesconectado() {
  const aviso = document.querySelector(".desconectado");
  if (aviso) aviso.remove();
}

/* Tela cheia + cursor automático */
btnFullscreen.addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
});

let timerCursor = null;
let timerBotao = null;

function mostrarControles() {
  btnFullscreen.classList.add("visivel");
  document.body.classList.remove("cursor-hide");
  clearTimeout(timerCursor);
  clearTimeout(timerBotao);
  timerCursor = setTimeout(() => document.body.classList.add("cursor-hide"), 3000);
  timerBotao = setTimeout(() => btnFullscreen.classList.remove("visivel"), 3000);
}

document.addEventListener("mousemove", mostrarControles);
document.addEventListener("keydown", mostrarControles);
document.addEventListener("click", mostrarControles);

/* Atualiza o relógio a cada 250 ms sem redesenhar tudo */
setInterval(() => {
  if (!estadoAtual) return;
  const el = telaoEl.querySelector("[data-clock]");
  if (el) {
    el.textContent = formatarClock(estadoAtual.clock);
    el.classList.toggle("pausado", !estadoAtual.clock.running);
  }
}, 250);

mostrarControles();
conectar();
