import { db } from "../core/firebase-config.js";
import { onAuth, getCurrentUser } from "../core/auth.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const listEl = document.getElementById("desejosList");
const form = document.getElementById("desejoForm");
const tituloInput = document.getElementById("desejoTitulo");
const linkInput = document.getElementById("desejoLink");
const precoInput = document.getElementById("desejoPreco");
const notasInput = document.getElementById("desejoNotas");

const desejosRef = collection(db, "presentes");
let started = false;

function formatMoney(n) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function render(items) {
  listEl.innerHTML = "";
  if (items.length === 0) {
    listEl.innerHTML = '<p class="empty-hint">Nada na lista ainda.</p>';
    return;
  }
  const ordenado = [...items].sort((a, b) => (a.comprado ? 1 : 0) - (b.comprado ? 1 : 0));
  ordenado.forEach((item) => {
    const card = document.createElement("div");
    card.className = "event-card" + (item.comprado ? " wish-done" : "");

    const title = document.createElement("div");
    title.className = "event-title";
    title.textContent = item.titulo;
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "event-meta";
    const partes = [];
    if (item.preco) partes.push(formatMoney(item.preco));
    partes.push(`sugerido por ${item.criadoPorName || "alguém"}`);
    meta.textContent = partes.join(" · ");
    card.appendChild(meta);

    if (item.notas) {
      const notas = document.createElement("div");
      notas.className = "event-meta";
      notas.textContent = item.notas;
      card.appendChild(notas);
    }

    if (item.link) {
      const link = document.createElement("a");
      link.href = item.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "event-meta";
      link.textContent = "Ver link →";
      card.appendChild(link);
    }

    const row = document.createElement("div");
    row.className = "status-row";
    const doneBtn = document.createElement("button");
    doneBtn.type = "button";
    doneBtn.className = "status-chip" + (item.comprado ? " active" : "");
    doneBtn.textContent = item.comprado ? "Já foi dado ✓" : "Marcar como dado";
    doneBtn.addEventListener("click", () =>
      updateDoc(doc(db, "presentes", item.id), { comprado: !item.comprado })
    );
    row.appendChild(doneBtn);
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "status-chip danger";
    delBtn.textContent = "Remover";
    delBtn.addEventListener("click", () => {
      card.classList.add("removing");
      setTimeout(() => deleteDoc(doc(db, "presentes", item.id)), 250);
    });
    row.appendChild(delBtn);
    card.appendChild(row);

    listEl.appendChild(card);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const titulo = tituloInput.value.trim();
  if (!titulo) return;
  const me = getCurrentUser();
  await addDoc(desejosRef, {
    titulo,
    link: linkInput.value.trim(),
    preco: parseFloat(precoInput.value) || 0,
    notas: notasInput.value.trim(),
    comprado: false,
    criadoPorUid: me.uid,
    criadoPorName: me.name,
    createdAt: Date.now(),
  });
  form.reset();
});

onAuth((user) => {
  if (!user || started) return;
  started = true;
  onSnapshot(desejosRef, (snap) => {
    render(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
});
