import { db } from "../core/firebase-config.js";
import { onAuth, getCurrentUser } from "../core/auth.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const listEl = document.getElementById("reportsList");
const form = document.getElementById("reportForm");
const titleInput = document.getElementById("reportTitle");
const contentInput = document.getElementById("reportContent");

const reportsRef = collection(db, "reports");
let started = false;

function render(items) {
  const me = getCurrentUser();
  listEl.innerHTML = "";
  if (items.length === 0) {
    listEl.innerHTML = '<p class="empty-hint">Nenhum relatório ainda.</p>';
    return;
  }
  items.forEach((r) => {
    const card = document.createElement("div");
    card.className = "event-card";

    const title = document.createElement("div");
    title.className = "event-title";
    title.textContent = r.title;
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "event-meta";
    const d = new Date(r.createdAt);
    meta.textContent = `${r.authorName || "alguém"} · ${d.toLocaleDateString("pt-BR")}`;
    card.appendChild(meta);

    const content = document.createElement("div");
    content.className = "event-meta";
    content.textContent = r.content;
    card.appendChild(content);

    if (r.authorUid === me?.uid) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "status-chip danger";
      delBtn.style.marginTop = "0.5rem";
      delBtn.textContent = "Remover relatório";
      delBtn.addEventListener("click", () => {
        card.classList.add("removing");
        setTimeout(() => deleteDoc(doc(db, "reports", r.id)), 250);
      });
      card.appendChild(delBtn);
    }

    listEl.appendChild(card);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  if (!title || !content) return;
  const me = getCurrentUser();
  await addDoc(reportsRef, {
    title,
    content,
    authorUid: me.uid,
    authorName: me.name,
    createdAt: Date.now(),
  });
  titleInput.value = "";
  contentInput.value = "";
});

onAuth((user) => {
  if (!user || started) return;
  started = true;
  const q = query(reportsRef, orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    render(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
});
