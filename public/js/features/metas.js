import { db } from "../core/firebase-config.js";
import { onAuth, getCurrentUser } from "../core/auth.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  increment,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { personTag } from "../core/util.js";

const listEl = document.getElementById("goalsList");
const form = document.getElementById("goalForm");
const nameInput = document.getElementById("goalName");
const targetInput = document.getElementById("goalTarget");

const goalsRef = collection(db, "metas");
let started = false;

function formatMoney(n) {
  return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function render(goals) {
  listEl.innerHTML = "";
  if (goals.length === 0) {
    listEl.innerHTML = '<p class="empty-hint">Nenhuma meta ainda.</p>';
    return;
  }

  goals.forEach((goal) => {
    const atual = goal.valorAtual || 0;
    const alvo = goal.valorAlvo || 1;
    const pct = Math.min(100, Math.round((atual / alvo) * 100));

    const card = document.createElement("div");
    card.className = "event-card";

    card.appendChild(personTag(goal.criadoPorName, goal.criadoPorUid));

    const title = document.createElement("div");
    title.className = "event-title";
    title.textContent = goal.nome;
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "event-meta";
    meta.textContent = `${formatMoney(atual)} de ${formatMoney(alvo)} (${pct}%)`;
    card.appendChild(meta);

    const barOuter = document.createElement("div");
    barOuter.className = "progress-outer";
    const barInner = document.createElement("div");
    barInner.className = "progress-inner";
    barInner.style.width = `${pct}%`;
    barOuter.appendChild(barInner);
    card.appendChild(barOuter);

    const form2 = document.createElement("form");
    form2.className = "inline-form";
    form2.style.marginTop = "0.6rem";
    const addInput = document.createElement("input");
    addInput.type = "number";
    addInput.min = "0.01";
    addInput.step = "0.01";
    addInput.placeholder = "Adicionar valor (R$)";
    const addBtn = document.createElement("button");
    addBtn.type = "submit";
    addBtn.className = "primary-btn";
    addBtn.textContent = "Guardar";
    form2.appendChild(addInput);
    form2.appendChild(addBtn);
    form2.addEventListener("submit", async (e) => {
      e.preventDefault();
      const valor = parseFloat(addInput.value);
      if (!valor || valor <= 0) return;
      await updateDoc(doc(db, "metas", goal.id), { valorAtual: increment(valor) });
      addInput.value = "";
    });
    card.appendChild(form2);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "status-chip danger";
    delBtn.style.marginTop = "0.5rem";
    delBtn.textContent = "Remover meta";
    delBtn.addEventListener("click", () => {
      card.classList.add("removing");
      setTimeout(() => deleteDoc(doc(db, "metas", goal.id)), 250);
    });
    card.appendChild(delBtn);

    listEl.appendChild(card);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = nameInput.value.trim();
  const valorAlvo = parseFloat(targetInput.value);
  if (!nome || !valorAlvo) return;
  const me = getCurrentUser();
  await addDoc(goalsRef, {
    nome,
    valorAlvo,
    valorAtual: 0,
    criadoPorUid: me.uid,
    criadoPorName: me.name,
    createdAt: Date.now(),
  });
  nameInput.value = "";
  targetInput.value = "";
});

onAuth((user) => {
  if (!user || started) return;
  started = true;
  onSnapshot(goalsRef, (snap) => {
    render(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
});
