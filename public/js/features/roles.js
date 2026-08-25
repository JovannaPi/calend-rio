import { db } from "../core/firebase-config.js";
import { onAuth, getCurrentUser } from "../core/auth.js";
import { listenFotosRole, adicionarFotoRole, removerFotoRole } from "../core/db.js";
import { enviarFoto } from "../core/upload.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const form = document.getElementById("roleForm");
const titleInput = document.getElementById("roleTitle");
const dateInput = document.getElementById("roleDate");
const localInput = document.getElementById("roleLocal");
const mapaInput = document.getElementById("roleMapaUrl");
const fotoInput = document.getElementById("roleFotoUrl");
const notasInput = document.getElementById("roleNotas");

const plannedListEl = document.getElementById("rolesPlannedList");
const rankingListEl = document.getElementById("rolesRankingList");
const overviewRolesEl = document.getElementById("overviewRoles");

const photoViewerModal = document.getElementById("photoViewerModal");
const photoViewerImg = document.getElementById("photoViewerImg");

const rolesRef = collection(db, "roles");
let roles = [];
let started = false;

function starRow(roleId, nota) {
  const row = document.createElement("div");
  row.className = "status-row";
  for (let n = 1; n <= 5; n++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "status-chip" + (nota >= n ? " active" : "");
    btn.textContent = "★".repeat(n);
    btn.addEventListener("click", () =>
      updateDoc(doc(db, "roles", roleId), { nota: n })
    );
    row.appendChild(btn);
  }
  return row;
}

function buildCard(role, { showActions } = { showActions: true }) {
  const card = document.createElement("div");
  card.className = "event-card";

  if (role.fotoUrl) {
    const img = document.createElement("img");
    img.src = role.fotoUrl;
    img.alt = role.titulo;
    img.className = "role-photo";
    card.appendChild(img);
  }

  const title = document.createElement("div");
  title.className = "event-title";
  title.textContent = role.titulo;
  card.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "event-meta";
  const parts = [];
  if (role.data) {
    const d = new Date(role.data + "T00:00:00");
    parts.push(d.toLocaleDateString("pt-BR"));
  }
  if (role.local) parts.push(role.local);
  meta.textContent = parts.join(" · ");
  card.appendChild(meta);

  if (role.mapaUrl) {
    const link = document.createElement("a");
    link.href = role.mapaUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "event-meta";
    link.textContent = "Ver no mapa →";
    card.appendChild(link);
  }

  if (role.notas) {
    const notas = document.createElement("div");
    notas.className = "event-meta";
    notas.textContent = role.notas;
    card.appendChild(notas);
  }

  if (showActions) {
    const row = document.createElement("div");
    row.className = "status-row";
    const doneBtn = document.createElement("button");
    doneBtn.type = "button";
    doneBtn.className = "status-chip active";
    doneBtn.textContent = "Marcar como feito";
    doneBtn.addEventListener("click", () =>
      updateDoc(doc(db, "roles", role.id), { status: "feito" })
    );
    row.appendChild(doneBtn);
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "status-chip danger";
    delBtn.textContent = "Remover";
    delBtn.addEventListener("click", () => {
      card.classList.add("removing");
      setTimeout(() => deleteDoc(doc(db, "roles", role.id)), 250);
    });
    row.appendChild(delBtn);
    card.appendChild(row);
  }

  return card;
}

function buildAlbumCard(role) {
  const card = document.createElement("div");
  card.className = "event-card album-card";

  if (role.fotoUrl) {
    const img = document.createElement("img");
    img.src = role.fotoUrl;
    img.alt = role.titulo;
    img.className = "role-photo";
    card.appendChild(img);
  }

  const title = document.createElement("div");
  title.className = "event-title";
  title.textContent = role.titulo;
  card.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "event-meta";
  const parts = [];
  if (role.data) parts.push(new Date(role.data + "T00:00:00").toLocaleDateString("pt-BR"));
  if (role.local) parts.push(role.local);
  meta.textContent = parts.join(" · ");
  card.appendChild(meta);

  if (role.notas) {
    const notas = document.createElement("p");
    notas.className = "italic album-story";
    notas.textContent = `"${role.notas}"`;
    card.appendChild(notas);
  }

  if (role.mapaUrl) {
    const link = document.createElement("a");
    link.href = role.mapaUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "event-meta";
    link.textContent = "Ver no mapa →";
    card.appendChild(link);
  }

  card.appendChild(starRow(role.id, role.nota || 0));

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "status-chip";
  toggleBtn.style.marginTop = "0.6rem";
  toggleBtn.textContent = "📷 Abrir álbum de fotos";
  card.appendChild(toggleBtn);

  const albumBody = document.createElement("div");
  albumBody.className = "hidden album-body";
  card.appendChild(albumBody);

  let aberto = false;
  let carregado = false;
  toggleBtn.addEventListener("click", () => {
    aberto = !aberto;
    albumBody.classList.toggle("hidden", !aberto);
    toggleBtn.textContent = aberto ? "Fechar álbum" : "📷 Abrir álbum de fotos";
    if (aberto && !carregado) {
      carregado = true;
      montarAlbum(role, albumBody);
    }
  });

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "status-chip danger";
  delBtn.style.marginTop = "0.5rem";
  delBtn.textContent = "Remover";
  delBtn.addEventListener("click", () => {
    card.classList.add("removing");
    setTimeout(() => deleteDoc(doc(db, "roles", role.id)), 250);
  });
  card.appendChild(delBtn);

  return card;
}

function montarAlbum(role, bodyEl) {
  bodyEl.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "photo-grid";
  bodyEl.appendChild(grid);

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "status-chip";
  addBtn.textContent = "+ Adicionar foto";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "hidden";
  bodyEl.appendChild(addBtn);
  bodyEl.appendChild(fileInput);

  addBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    addBtn.textContent = "Enviando...";
    try {
      const url = await enviarFoto(file, { folder: `calend-rio/roles/${role.id}` });
      await adicionarFotoRole(role.id, url);
    } catch (err) {
      alert(err.message || "Falha ao enviar foto.");
    } finally {
      addBtn.textContent = "+ Adicionar foto";
    }
  });

  listenFotosRole(role.id, (urls) => {
    grid.innerHTML = "";
    urls.forEach((url) => {
      const box = document.createElement("div");
      box.className = "photo-box";
      const img = document.createElement("img");
      img.src = url;
      img.addEventListener("click", () => {
        photoViewerImg.src = url;
        photoViewerModal.classList.remove("hidden");
      });
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "photo-remove";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => removerFotoRole(role.id, url));
      box.appendChild(img);
      box.appendChild(removeBtn);
      grid.appendChild(box);
    });
  });
}

function render() {
  const planned = roles.filter((r) => r.status === "planejado");
  const done = roles.filter((r) => r.status === "feito");

  plannedListEl.innerHTML = "";
  if (planned.length === 0) {
    plannedListEl.innerHTML = '<p class="empty-hint">Nenhum rolê planejado ainda.</p>';
  } else {
    planned
      .sort((a, b) => (a.data || "").localeCompare(b.data || ""))
      .forEach((r) => plannedListEl.appendChild(buildCard(r)));
  }

  rankingListEl.innerHTML = "";
  const ranked = [...done].sort((a, b) => (b.nota || 0) - (a.nota || 0));
  if (ranked.length === 0) {
    rankingListEl.innerHTML = '<p class="empty-hint">Marque um rolê como feito e avalie para aparecer aqui.</p>';
  } else {
    ranked.forEach((r) => rankingListEl.appendChild(buildAlbumCard(r)));
  }

  overviewRolesEl.innerHTML = "";
  if (planned.length === 0) {
    overviewRolesEl.innerHTML = '<p class="empty-hint">Nenhum rolê planejado ainda.</p>';
  } else {
    planned.slice(0, 3).forEach((r) => overviewRolesEl.appendChild(buildCard(r, { showActions: false })));
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const titulo = titleInput.value.trim();
  if (!titulo) return;
  const me = getCurrentUser();
  await addDoc(rolesRef, {
    titulo,
    data: dateInput.value,
    local: localInput.value.trim(),
    mapaUrl: mapaInput.value.trim(),
    fotoUrl: fotoInput.value.trim(),
    notas: notasInput.value.trim(),
    status: "planejado",
    criadoPorUid: me.uid,
    criadoPorName: me.name,
    createdAt: Date.now(),
  });
  form.reset();
});

onAuth((user) => {
  if (!user || started) return;
  started = true;
  onSnapshot(rolesRef, (snap) => {
    roles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  });
});
