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

const listEl = document.getElementById("moviesList");
const form = document.getElementById("movieForm");
const titleInput = document.getElementById("movieTitle");
const typeSelect = document.getElementById("movieType");

const STATUS_LABELS = { assistir: "Para assistir", assistindo: "Assistindo", assistido: "Assistido" };
const STATUS_ORDER = ["assistindo", "assistir", "assistido"];

const moviesRef = collection(db, "watchlist");
let started = false;

function render(items) {
  listEl.innerHTML = "";
  if (items.length === 0) {
    listEl.innerHTML = '<p class="empty-hint">Nada adicionado ainda.</p>';
    return;
  }
  const sorted = [...items].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );
  sorted.forEach((item) => {
    const card = document.createElement("div");
    card.className = "event-card";

    const title = document.createElement("div");
    title.className = "event-title";
    title.textContent = item.title;
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "event-meta";
    meta.textContent = `${item.type === "serie" ? "Série" : "Filme"} · adicionado por ${item.addedByName || "alguém"}`;
    card.appendChild(meta);

    const row = document.createElement("div");
    row.className = "status-row";
    STATUS_ORDER.forEach((status) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "status-chip" + (item.status === status ? " active" : "");
      btn.textContent = STATUS_LABELS[status];
      btn.addEventListener("click", () => updateDoc(doc(db, "watchlist", item.id), { status }));
      row.appendChild(btn);
    });
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "status-chip danger";
    delBtn.textContent = "Remover";
    delBtn.addEventListener("click", () => deleteDoc(doc(db, "watchlist", item.id)));
    row.appendChild(delBtn);
    card.appendChild(row);

    listEl.appendChild(card);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;
  const me = getCurrentUser();
  await addDoc(moviesRef, {
    title,
    type: typeSelect.value,
    status: "assistir",
    addedByUid: me.uid,
    addedByName: me.name,
    createdAt: Date.now(),
  });
  titleInput.value = "";
});

onAuth((user) => {
  if (!user || started) return;
  started = true;
  onSnapshot(moviesRef, (snap) => {
    render(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
});
