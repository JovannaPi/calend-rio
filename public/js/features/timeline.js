import { db } from "../core/firebase-config.js";
import { onAuth } from "../core/auth.js";
import { listenLivros, listenDatasEspeciais } from "../core/db.js";
import { personTag, el } from "../core/util.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const listEl = document.getElementById("timelineList");
const rolesRef = collection(db, "roles");

let roles = [];
let livros = [];
let datas = [];
let started = false;

function dataConclusaoLivro(livro) {
  const datasFim = Object.values(livro.leituras || {})
    .map((l) => l.dataFim)
    .filter(Boolean)
    .sort();
  return datasFim[datasFim.length - 1] || null;
}

function montarEntradas() {
  const entradas = [];

  roles
    .filter((r) => r.status === "feito" && r.data)
    .forEach((r) => {
      entradas.push({
        tipo: "role",
        data: r.data,
        titulo: r.titulo,
        subtitulo: r.local || "",
        foto: r.fotoUrl,
        criadoPorName: r.criadoPorName,
        criadoPorUid: r.criadoPorUid,
      });
    });

  livros
    .filter((l) => l.status === "concluido")
    .forEach((l) => {
      const data = dataConclusaoLivro(l);
      if (!data) return;
      entradas.push({
        tipo: "livro",
        data,
        titulo: l.titulo,
        subtitulo: l.autor || "",
        foto: l.capaUrl,
      });
    });

  datas.forEach((d) => {
    entradas.push({
      tipo: "data",
      data: d.data,
      titulo: d.titulo,
      subtitulo: d.anual ? "data especial · todo ano" : "data especial",
      criadoPorName: d.criadoPorName,
      criadoPorUid: d.criadoPorUid,
    });
  });

  return entradas.sort((a, b) => b.data.localeCompare(a.data));
}

const TIPO_LABEL = { role: "Rolê", livro: "Livro", data: "Data especial" };

function render() {
  const entradas = montarEntradas();
  listEl.innerHTML = "";
  if (entradas.length === 0) {
    listEl.innerHTML =
      '<p class="empty-hint">Ainda não tem nada aqui — conclua um livro, marque um rolê como feito ou adicione uma data especial que ela aparece aqui.</p>';
    return;
  }

  const linha = el("div", "timeline-linha");
  listEl.appendChild(linha);

  entradas.forEach((entrada) => {
    const item = el("div", "timeline-item timeline-" + entrada.tipo);
    const ponto = el("div", "timeline-ponto");
    item.appendChild(ponto);

    const card = el("div", "panel-card timeline-card");
    const d = new Date(entrada.data + "T00:00:00");
    const dataLabel = el("div", "event-meta", d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }));
    card.appendChild(dataLabel);

    if (entrada.foto) {
      const img = document.createElement("img");
      img.src = entrada.foto;
      img.className = "timeline-foto";
      card.appendChild(img);
    }

    const tagRow = el("div", "status-row");
    tagRow.appendChild(el("span", "event-type-tag timeline-tipo-" + entrada.tipo, TIPO_LABEL[entrada.tipo]));
    if (entrada.criadoPorName) tagRow.appendChild(personTag(entrada.criadoPorName, entrada.criadoPorUid));
    card.appendChild(tagRow);

    card.appendChild(el("div", "event-title", entrada.titulo));
    if (entrada.subtitulo) card.appendChild(el("div", "event-meta", entrada.subtitulo));

    item.appendChild(card);
    linha.appendChild(item);
  });
}

onAuth((user) => {
  if (!user || started) return;
  started = true;
  onSnapshot(rolesRef, (snap) => {
    roles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  });
  listenLivros((l) => {
    livros = l;
    render();
  });
  listenDatasEspeciais((d) => {
    datas = d;
    render();
  });
});
