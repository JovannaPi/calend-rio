import { db } from "./firebase-config.js";
import { onAuth, getCurrentUser } from "./auth.js";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const STATUS_LABELS = { planejado: "Planejado", lendo: "Lendo", concluido: "Concluído" };
const STATUS_ORDER = ["lendo", "planejado", "concluido"];

const listView = document.getElementById("bibliotecaListView");
const detailView = document.getElementById("bookDetailView");
const booksListEl = document.getElementById("booksList");
const bookForm = document.getElementById("bookForm");
const bookTitleInput = document.getElementById("bookTitle");
const bookAuthorInput = document.getElementById("bookAuthor");

const overviewReading = document.getElementById("overviewReading");
const backBtn = document.getElementById("backToBooks");
const detailTitle = document.getElementById("bookDetailTitle");
const detailAuthor = document.getElementById("bookDetailAuthor");
const statusRow = document.getElementById("bookStatusRow");
const chapterForm = document.getElementById("chapterForm");
const chapterNumberInput = document.getElementById("chapterNumber");
const chaptersListEl = document.getElementById("chaptersList");

const booksRef = collection(db, "livros");
let books = [];
let currentBook = null;
let unsubChapters = null;
let started = false;

function bookCard(book) {
  const card = document.createElement("div");
  card.className = "event-card";

  const title = document.createElement("div");
  title.className = "event-title";
  title.textContent = book.titulo;
  card.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "event-meta";
  meta.textContent = [book.autor, `sugerido por ${book.sugeridoPorName || "alguém"}`]
    .filter(Boolean)
    .join(" · ");
  card.appendChild(meta);

  const tag = document.createElement("span");
  tag.className = "event-type-tag";
  tag.style.background = "#7c5cff";
  tag.textContent = STATUS_LABELS[book.status] || book.status;
  card.appendChild(tag);

  card.addEventListener("click", () => openBook(book));
  return card;
}

function renderBooksList() {
  booksListEl.innerHTML = "";
  if (books.length === 0) {
    booksListEl.innerHTML = '<p class="empty-hint">Nenhum livro ainda.</p>';
  } else {
    [...books]
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
      .forEach((b) => booksListEl.appendChild(bookCard(b)));
  }

  const lendo = books.filter((b) => b.status === "lendo");
  overviewReading.innerHTML = "";
  if (lendo.length === 0) {
    overviewReading.innerHTML = '<p class="empty-hint">Ninguém está lendo nada agora.</p>';
  } else {
    lendo.forEach((b) => overviewReading.appendChild(bookCard(b)));
  }
}

bookForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const titulo = bookTitleInput.value.trim();
  if (!titulo) return;
  const me = getCurrentUser();
  await addDoc(booksRef, {
    titulo,
    autor: bookAuthorInput.value.trim(),
    status: "planejado",
    sugeridoPorUid: me.uid,
    sugeridoPorName: me.name,
    createdAt: Date.now(),
  });
  bookTitleInput.value = "";
  bookAuthorInput.value = "";
});

function openBook(book) {
  currentBook = book;
  listView.classList.add("hidden");
  detailView.classList.remove("hidden");
  detailTitle.textContent = book.titulo;
  detailAuthor.textContent = book.autor || "";

  statusRow.innerHTML = "";
  STATUS_ORDER.forEach((status) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "status-chip" + (book.status === status ? " active" : "");
    btn.textContent = STATUS_LABELS[status];
    btn.addEventListener("click", () => updateDoc(doc(db, "livros", book.id), { status }));
    statusRow.appendChild(btn);
  });
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "status-chip danger";
  delBtn.textContent = "Remover livro";
  delBtn.addEventListener("click", async () => {
    await deleteDoc(doc(db, "livros", book.id));
    backToList();
  });
  statusRow.appendChild(delBtn);

  if (unsubChapters) unsubChapters();
  const chaptersRef = collection(db, "livros", book.id, "capitulos");
  const q = query(chaptersRef, orderBy("numero", "asc"));
  unsubChapters = onSnapshot(q, (snap) => {
    renderChapters(snap.docs.map((d) => d.data()));
  });
}

function backToList() {
  currentBook = null;
  if (unsubChapters) unsubChapters();
  unsubChapters = null;
  detailView.classList.add("hidden");
  listView.classList.remove("hidden");
}
backBtn.addEventListener("click", backToList);

chapterForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const numero = parseInt(chapterNumberInput.value, 10);
  if (!numero || !currentBook) return;
  const ref = doc(db, "livros", currentBook.id, "capitulos", String(numero));
  await setDoc(ref, { numero, entradas: {} }, { merge: true });
  chapterNumberInput.value = "";
});

function isRevealed(entradas) {
  const uids = Object.keys(entradas || {});
  return uids.filter((uid) => entradas[uid]?.teoriaEnviada).length >= 2;
}

function renderChapters(chapters) {
  const me = getCurrentUser();
  chaptersListEl.innerHTML = "";

  chapters.forEach((cap) => {
    const entradas = cap.entradas || {};
    const minha = entradas[me.uid] || {};
    const revelado = isRevealed(entradas);

    const card = document.createElement("div");
    card.className = "panel-card chapter-card";

    const h3 = document.createElement("h3");
    h3.textContent = `Capítulo ${cap.numero}`;
    card.appendChild(h3);

    const impressaoLabel = document.createElement("label");
    impressaoLabel.textContent = "Minha impressão (só você vê)";
    const impressaoInput = document.createElement("textarea");
    impressaoInput.rows = 2;
    impressaoInput.value = minha.impressao || "";
    impressaoLabel.appendChild(impressaoInput);
    card.appendChild(impressaoLabel);

    const teoriaLabel = document.createElement("label");
    teoriaLabel.textContent = "Minha teoria / segredo (revelado quando os dois enviarem)";
    const teoriaInput = document.createElement("textarea");
    teoriaInput.rows = 2;
    teoriaInput.value = minha.teoria || "";
    teoriaInput.disabled = !!minha.teoriaEnviada;
    teoriaLabel.appendChild(teoriaInput);
    card.appendChild(teoriaLabel);

    const actions = document.createElement("div");
    actions.className = "form-actions";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "primary-btn";
    saveBtn.textContent = "Salvar impressão";
    saveBtn.addEventListener("click", async () => {
      const ref = doc(db, "livros", currentBook.id, "capitulos", String(cap.numero));
      await updateDoc(ref, { [`entradas.${me.uid}.impressao`]: impressaoInput.value, [`entradas.${me.uid}.name`]: me.name });
    });
    actions.appendChild(saveBtn);

    if (!minha.teoriaEnviada) {
      const sendBtn = document.createElement("button");
      sendBtn.type = "button";
      sendBtn.className = "danger-btn";
      sendBtn.textContent = "Enviar teoria (trava)";
      sendBtn.addEventListener("click", async () => {
        const ref = doc(db, "livros", currentBook.id, "capitulos", String(cap.numero));
        await updateDoc(ref, {
          [`entradas.${me.uid}.teoria`]: teoriaInput.value,
          [`entradas.${me.uid}.teoriaEnviada`]: true,
          [`entradas.${me.uid}.name`]: me.name,
        });
      });
      actions.appendChild(sendBtn);
    }
    card.appendChild(actions);

    const revealBox = document.createElement("div");
    revealBox.className = "reveal-box";
    if (revelado) {
      revealBox.innerHTML = "<strong>🔓 Teorias reveladas:</strong>";
      Object.entries(entradas).forEach(([uid, dados]) => {
        if (!dados.teoriaEnviada) return;
        const p = document.createElement("p");
        p.textContent = `${dados.name || "Alguém"}: ${dados.teoria}`;
        revealBox.appendChild(p);
      });
    } else {
      revealBox.textContent = "🔒 Aguardando a outra pessoa enviar a teoria...";
    }
    card.appendChild(revealBox);

    if (revelado) {
      const discussao = document.createElement("div");
      discussao.className = "chapter-discussion";
      const discTitle = document.createElement("h4");
      discTitle.textContent = "Discussão";
      discussao.appendChild(discTitle);
      const commentsEl = document.createElement("div");
      commentsEl.className = "chat-messages small";
      discussao.appendChild(commentsEl);

      const commentForm = document.createElement("form");
      commentForm.className = "chat-form";
      const commentInput = document.createElement("input");
      commentInput.type = "text";
      commentInput.placeholder = "Comentar...";
      commentInput.required = true;
      const commentBtn = document.createElement("button");
      commentBtn.type = "submit";
      commentBtn.className = "primary-btn";
      commentBtn.textContent = "Enviar";
      commentForm.appendChild(commentInput);
      commentForm.appendChild(commentBtn);
      discussao.appendChild(commentForm);
      card.appendChild(discussao);

      const commentsRef = collection(
        db,
        "livros",
        currentBook.id,
        "capitulos",
        String(cap.numero),
        "comentarios"
      );

      async function loadComments() {
        const q = query(commentsRef, orderBy("createdAt", "asc"));
        const snap = await getDocs(q);
        commentsEl.innerHTML = "";
        snap.docs.forEach((d) => {
          const c = d.data();
          const bubble = document.createElement("div");
          bubble.className = "chat-bubble" + (c.uid === me.uid ? " mine" : "");
          bubble.innerHTML = `<div class="chat-author">${c.name || "Alguém"}</div>`;
          const text = document.createElement("div");
          text.textContent = c.text;
          bubble.appendChild(text);
          commentsEl.appendChild(bubble);
        });
        commentsEl.scrollTop = commentsEl.scrollHeight;
      }
      loadComments();

      commentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = commentInput.value.trim();
        if (!text) return;
        commentInput.value = "";
        await addDoc(commentsRef, { text, uid: me.uid, name: me.name, createdAt: Date.now() });
        loadComments();
      });
    }

    chaptersListEl.appendChild(card);
  });
}

onAuth((user) => {
  if (!user || started) return;
  started = true;
  onSnapshot(booksRef, (snap) => {
    books = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderBooksList();
  });
});
