import { onAuth, getCurrentUser } from "../core/auth.js";
import { listenAtividades } from "../core/db.js";
import { el } from "../core/util.js";

const bellBtn = document.getElementById("bellBtn");
const bellCount = document.getElementById("bellCount");
const bellPanel = document.getElementById("bellPanel");

const LABELS = {
  diario: "escreveu no diário",
  secreto: "enviou uma teoria secreta",
  carta: "selou uma carta para o futuro",
  troca: "começou a ler o livro que você passou",
  nota: "terminou um livro e deu a nota final",
};

let atividades = [];
let started = false;
let aberto = false;

function formatarData(ts) {
  const d = new Date(ts);
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

function render() {
  const me = getCurrentUser();
  if (!me) return;
  const daOutra = atividades.filter((a) => a.uid !== me.uid);
  const ultimaVista = Number(localStorage.getItem(`cr_ultima_vista_${me.uid}`) || 0);
  const naoLidas = daOutra.filter((a) => a.createdAt > ultimaVista).length;

  bellCount.textContent = String(naoLidas);
  bellCount.classList.toggle("hidden", naoLidas === 0);

  bellPanel.innerHTML = "";
  if (daOutra.length === 0) {
    bellPanel.appendChild(el("p", "empty-hint", "Nada por aqui ainda."));
    return;
  }
  daOutra.forEach((a) => {
    const item = el("div", "bell-item");
    const label = LABELS[a.tipo] || "fez uma atividade";
    item.appendChild(
      el(
        "p",
        null,
        `${(a.name || "Alguém").split(" ")[0]} ${label}${a.capitulo ? ` (Cap. ${a.capitulo})` : ""}`
      )
    );
    item.appendChild(el("p", "empty-hint", `${a.livroTitulo || ""} · ${formatarData(a.createdAt)}`));
    bellPanel.appendChild(item);
  });
}

bellBtn.addEventListener("click", () => {
  const me = getCurrentUser();
  aberto = !aberto;
  bellPanel.classList.toggle("hidden", !aberto);
  if (aberto && me) {
    const daOutra = atividades.filter((a) => a.uid !== me.uid);
    if (daOutra.length > 0) {
      localStorage.setItem(`cr_ultima_vista_${me.uid}`, String(daOutra[0].createdAt));
      render();
    }
  }
});

document.addEventListener("click", (e) => {
  if (aberto && !bellPanel.contains(e.target) && e.target !== bellBtn && !bellBtn.contains(e.target)) {
    aberto = false;
    bellPanel.classList.add("hidden");
  }
});

onAuth((user) => {
  if (!user || started) return;
  started = true;
  listenAtividades((a) => {
    atividades = a;
    render();
  });
});
