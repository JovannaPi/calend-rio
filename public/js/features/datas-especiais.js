import { onAuth, getCurrentUser } from "../core/auth.js";
import { listenDatasEspeciais, salvarDataEspecial, excluirDataEspecial } from "../core/db.js";
import { el } from "../core/util.js";

const listEl = document.getElementById("datasEspeciaisList");
const form = document.getElementById("dataEspecialForm");
const nomeInput = document.getElementById("dataEspecialNome");
const dataInput = document.getElementById("dataEspecialData");
const anualInput = document.getElementById("dataEspecialAnual");

const headerBadge = document.getElementById("headerSpecialBadge");

let started = false;

function hojeSemHora() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function diffDias(a, b) {
  return Math.round((b - a) / 86400000);
}

function parseData(str) {
  const d = new Date(str + "T00:00:00");
  d.setHours(0, 0, 0, 0);
  return d;
}

function proximaOcorrencia(original, hoje) {
  const prox = new Date(original);
  prox.setFullYear(hoje.getFullYear());
  prox.setHours(0, 0, 0, 0);
  if (prox < hoje) prox.setFullYear(hoje.getFullYear() + 1);
  return prox;
}

function calcularInfo(item) {
  const hoje = hojeSemHora();
  const original = parseData(item.data);

  if (item.anual) {
    const prox = proximaOcorrencia(original, hoje);
    const faltam = diffDias(hoje, prox);
    const diasJuntos = diffDias(original, hoje);
    let anos = hoje.getFullYear() - original.getFullYear();
    const aniversarioEsteAno = new Date(original);
    aniversarioEsteAno.setFullYear(hoje.getFullYear());
    if (hoje < aniversarioEsteAno) anos--;
    return { faltam, diasJuntos, anos, futuro: true };
  }

  const faltam = diffDias(hoje, original);
  return { faltam, futuro: faltam >= 0 };
}

function render(items) {
  const hoje = hojeSemHora();
  listEl.innerHTML = "";
  if (items.length === 0) {
    listEl.innerHTML = '<p class="empty-hint">Nenhuma data especial marcada ainda.</p>';
  } else {
    [...items]
      .sort((a, b) => calcularInfo(a).faltam - calcularInfo(b).faltam)
      .forEach((item) => {
        const info = calcularInfo(item);
        const card = el("div", "event-card special-date-card");
        card.appendChild(el("div", "event-title", item.titulo));

        const meta = el("div", "event-meta");
        const dataFormatada = parseData(item.data).toLocaleDateString("pt-BR");
        if (item.anual) {
          meta.textContent = `${dataFormatada} · todo ano · ${info.anos >= 0 ? `há ${info.anos} ano${info.anos === 1 ? "" : "s"}` : "ainda este ano"} (${info.diasJuntos} dias)`;
        } else {
          meta.textContent = dataFormatada;
        }
        card.appendChild(meta);

        const status = el(
          "div",
          "event-meta",
          info.faltam === 0
            ? "🎉 É hoje!"
            : info.faltam > 0
            ? `Faltam ${info.faltam} dia${info.faltam === 1 ? "" : "s"}`
            : "Já passou"
        );
        card.appendChild(status);

        const delBtn = el("button", "status-chip danger", "Remover");
        delBtn.type = "button";
        delBtn.style.marginTop = "0.5rem";
        delBtn.addEventListener("click", () => {
          card.classList.add("removing");
          setTimeout(() => excluirDataEspecial(item.id), 250);
        });
        card.appendChild(delBtn);

        listEl.appendChild(card);
      });
  }

  atualizarBadge(items, hoje);
}

function atualizarBadge(items, hoje) {
  if (!headerBadge) return;
  const proximas = items
    .map((item) => ({ item, info: calcularInfo(item) }))
    .filter(({ info }) => info.faltam >= 0)
    .sort((a, b) => a.info.faltam - b.info.faltam);

  if (proximas.length === 0) {
    headerBadge.classList.add("hidden");
    return;
  }

  const { item, info } = proximas[0];
  headerBadge.classList.remove("hidden");
  headerBadge.textContent =
    info.faltam === 0 ? `🎉 Hoje: ${item.titulo}` : `💜 ${item.titulo} em ${info.faltam}d`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const titulo = nomeInput.value.trim();
  if (!titulo || !dataInput.value) return;
  const me = getCurrentUser();
  await salvarDataEspecial({
    titulo,
    data: dataInput.value,
    anual: anualInput.checked,
    criadoPorUid: me.uid,
    criadoPorName: me.name,
    createdAt: Date.now(),
  });
  form.reset();
  anualInput.checked = true;
});

onAuth((user) => {
  if (!user || started) return;
  started = true;
  listenDatasEspeciais(render);
});
