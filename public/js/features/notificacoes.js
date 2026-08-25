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
  limit,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const listEl = document.getElementById("notificationsList");
const overviewEl = document.getElementById("overviewNotifications");
const form = document.getElementById("notifForm");
const textInput = document.getElementById("notifText");

const notificationsRef = collection(db, "notifications");
let started = false;

function buildCard(n, { withDelete } = { withDelete: true }) {
  const me = getCurrentUser();
  const card = document.createElement("div");
  card.className = "event-card";
  const title = document.createElement("div");
  title.className = "event-title";
  title.textContent = n.text;
  card.appendChild(title);
  const meta = document.createElement("div");
  meta.className = "event-meta";
  const d = new Date(n.createdAt);
  meta.textContent = `${n.authorName || "alguém"} · ${d.toLocaleDateString("pt-BR")}`;
  card.appendChild(meta);
  if (withDelete && n.authorUid === me?.uid) {
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "status-chip danger";
    delBtn.style.marginTop = "0.5rem";
    delBtn.textContent = "Remover aviso";
    delBtn.addEventListener("click", () => {
      card.classList.add("removing");
      setTimeout(() => deleteDoc(doc(db, "notifications", n.id)), 250);
    });
    card.appendChild(delBtn);
  }
  return card;
}

function render(items) {
  listEl.innerHTML = "";
  if (items.length === 0) {
    listEl.innerHTML = '<p class="empty-hint">Nenhum aviso ainda.</p>';
  } else {
    items.forEach((n) => listEl.appendChild(buildCard(n)));
  }

  overviewEl.innerHTML = "";
  if (items.length === 0) {
    overviewEl.innerHTML = '<p class="empty-hint">Nenhum aviso ainda.</p>';
  } else {
    items.slice(0, 3).forEach((n) => overviewEl.appendChild(buildCard(n, { withDelete: false })));
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  if (!text) return;
  const me = getCurrentUser();
  await addDoc(notificationsRef, {
    text,
    authorUid: me.uid,
    authorName: me.name,
    createdAt: Date.now(),
  });
  textInput.value = "";
});

onAuth((user) => {
  if (!user || started) return;
  started = true;
  const q = query(notificationsRef, orderBy("createdAt", "desc"), limit(20));
  onSnapshot(q, (snap) => {
    render(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
});
