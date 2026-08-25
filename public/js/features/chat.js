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

const messagesEl = document.getElementById("chatMessages");
const form = document.getElementById("chatForm");
const input = document.getElementById("chatInput");

const messagesRef = collection(db, "messages");
let started = false;

function render(messages) {
  const me = getCurrentUser();
  const scrolledToBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 40;
  messagesEl.innerHTML = "";
  messages.forEach((m) => {
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble" + (m.uid === me?.uid ? " mine" : "");
    const author = document.createElement("div");
    author.className = "chat-author";
    author.textContent = m.name || "Alguém";
    const text = document.createElement("div");
    text.textContent = m.text;
    bubble.appendChild(author);
    bubble.appendChild(text);
    if (m.uid === me?.uid) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "mini-delete-btn";
      delBtn.textContent = "×";
      delBtn.title = "Apagar mensagem";
      delBtn.addEventListener("click", () => {
        bubble.classList.add("removing");
        setTimeout(() => deleteDoc(doc(db, "messages", m.id)), 250);
      });
      bubble.appendChild(delBtn);
    }
    messagesEl.appendChild(bubble);
  });
  if (scrolledToBottom) messagesEl.scrollTop = messagesEl.scrollHeight;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  const me = getCurrentUser();
  input.value = "";
  await addDoc(messagesRef, {
    text,
    uid: me.uid,
    name: me.name,
    createdAt: Date.now(),
  });
});

onAuth((user) => {
  if (!user || started) return;
  started = true;
  const q = query(messagesRef, orderBy("createdAt", "asc"));
  onSnapshot(q, (snap) => {
    render(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
});
