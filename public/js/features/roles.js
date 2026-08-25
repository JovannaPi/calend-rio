import { db } from "../core/firebase-config.js";
import { onAuth, getCurrentUser } from "../core/auth.js";
import { listenFotosRole, adicionarFotoRole, removerFotoRole } from "../core/db.js";
import { enviarFoto } from "../core/upload.js";
import { personTag, girarRoleta } from "../core/util.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const form = document.getElementById("roleForm");
const formTitle = document.getElementById("roleFormTitle");
const idInput = document.getElementById("roleId");
const titleInput = document.getElementById("roleTitle");
const dateInput = document.getElementById("roleDate");
const localInput = document.getElementById("roleLocal");
const mapaInput = document.getElementById("roleMapaUrl");
const fotoInput = document.getElementById("roleFotoUrl");
const notasInput = document.getElementById("roleNotas");
const submitBtn = document.getElementById("roleSubmitBtn");
const cancelEditBtn = document.getElementById("roleCancelEditBtn");
const fotoUploadBtn = document.getElementById("roleFotoUploadBtn");
const fotoUploadInput = document.getElementById("roleFotoUploadInput");
const isIdeiaInput = document.getElementById("roleIsIdeia");

const plannedListEl = document.getElementById("rolesPlannedList");
const rankingListEl = document.getElementById("rolesRankingList");
const overviewRolesEl = document.getElementById("overviewRoles");
const ideiasListEl = document.getElementById("rolesIdeiasList");
const rouletteBtn = document.getElementById("roleRouletteBtn");
const rouletteResult = document.getElementById("roleRouletteResult");

const photoViewerModal = document.getElementById("photoViewerModal");
const photoViewerImg = document.getElementById("photoViewerImg");

const formModal = document.getElementById("roleFormModal");
const openFormBtn = document.getElementById("openRoleFormBtn");
const closeFormBtn = document.getElementById("closeRoleForm");

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

  card.appendChild(personTag(role.criadoPorName, role.criadoPorUid));

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
    doneBtn.className = "status-chip active small";
    doneBtn.textContent = "Marcar como feito";
    doneBtn.addEventListener("click", () =>
      updateDoc(doc(db, "roles", role.id), { status: "feito" })
    );
    row.appendChild(doneBtn);
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "status-chip small";
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", () => entrarModoEdicao(role));
    row.appendChild(editBtn);
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "status-chip danger small";
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

function buildIdeiaCard(role) {
  const card = document.createElement("div");
  card.className = "event-card";

  card.appendChild(personTag(role.criadoPorName, role.criadoPorUid));

  const title = document.createElement("div");
  title.className = "event-title";
  title.textContent = role.titulo;
  card.appendChild(title);

  if (role.notas) {
    const notas = document.createElement("div");
    notas.className = "event-meta";
    notas.textContent = role.notas;
    card.appendChild(notas);
  }

  const row = document.createElement("div");
  row.className = "status-row";
  const markBtn = document.createElement("button");
  markBtn.type = "button";
  markBtn.className = "status-chip active small";
  markBtn.textContent = "Marcar data";
  markBtn.addEventListener("click", () => entrarModoEdicao(role));
  row.appendChild(markBtn);
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "status-chip danger small";
  delBtn.textContent = "Remover";
  delBtn.addEventListener("click", () => {
    card.classList.add("removing");
    setTimeout(() => deleteDoc(doc(db, "roles", role.id)), 250);
  });
  row.appendChild(delBtn);
  card.appendChild(row);

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

  card.appendChild(personTag(role.criadoPorName, role.criadoPorUid));

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
  delBtn.className = "status-chip danger small";
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
  const ideias = roles.filter((r) => r.status === "ideia");

  ideiasListEl.innerHTML = "";
  if (ideias.length === 0) {
    ideiasListEl.innerHTML = '<p class="empty-hint">Nenhuma ideia ainda. Adicione uma acima marcando "é só uma ideia".</p>';
  } else {
    ideias.forEach((r) => ideiasListEl.appendChild(buildIdeiaCard(r)));
  }

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

function entrarModoEdicao(role) {
  idInput.value = role.id;
  titleInput.value = role.titulo || "";
  dateInput.value = role.data || "";
  localInput.value = role.local || "";
  mapaInput.value = role.mapaUrl || "";
  fotoInput.value = role.fotoUrl || "";
  notasInput.value = role.notas || "";
  isIdeiaInput.checked = role.status === "ideia";
  formTitle.textContent = "Editar rolê";
  submitBtn.textContent = "Salvar alterações";
  cancelEditBtn.classList.remove("hidden");
  formModal.classList.remove("hidden");
}

function sairModoEdicao() {
  idInput.value = "";
  form.reset();
  formTitle.textContent = "Marcar rolê";
  submitBtn.textContent = "Adicionar";
  cancelEditBtn.classList.add("hidden");
  formModal.classList.add("hidden");
}

cancelEditBtn.addEventListener("click", sairModoEdicao);
openFormBtn.addEventListener("click", () => {
  formTitle.textContent = "Marcar rolê";
  formModal.classList.remove("hidden");
});
closeFormBtn.addEventListener("click", sairModoEdicao);
formModal.addEventListener("click", (e) => {
  if (e.target === formModal) sairModoEdicao();
});

fotoUploadBtn.addEventListener("click", () => fotoUploadInput.click());
fotoUploadInput.addEventListener("change", async () => {
  const file = fotoUploadInput.files?.[0];
  fotoUploadInput.value = "";
  if (!file) return;
  fotoUploadBtn.textContent = "Enviando...";
  try {
    fotoInput.value = await enviarFoto(file, { folder: "calend-rio/roles" });
  } catch (err) {
    alert(err.message || "Falha ao enviar foto.");
  } finally {
    fotoUploadBtn.textContent = "Ou enviar uma foto do dispositivo";
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const titulo = titleInput.value.trim();
  if (!titulo) return;
  const me = getCurrentUser();
  const payload = {
    titulo,
    data: dateInput.value,
    local: localInput.value.trim(),
    mapaUrl: mapaInput.value.trim(),
    fotoUrl: fotoInput.value.trim(),
    notas: notasInput.value.trim(),
  };
  const status = isIdeiaInput.checked ? "ideia" : "planejado";
  if (idInput.value) {
    await updateDoc(doc(db, "roles", idInput.value), { ...payload, status });
  } else {
    await addDoc(rolesRef, {
      ...payload,
      status,
      criadoPorUid: me.uid,
      criadoPorName: me.name,
      createdAt: Date.now(),
    });
  }
  sairModoEdicao();
});

// ── Roleta de ideias ──────────────────────────────────────────────────────
rouletteBtn.addEventListener("click", () => {
  const ideias = roles.filter((r) => r.status === "ideia");
  if (ideias.length === 0) {
    rouletteResult.innerHTML = '<p class="empty-hint">Adicione umas ideias primeiro!</p>';
    return;
  }
  rouletteBtn.disabled = true;
  rouletteBtn.classList.add("spinning");
  girarRoleta({
    itens: ideias,
    container: rouletteResult,
    obterTitulo: (r) => r.titulo,
    obterCapa: (r) => r.fotoUrl,
    aoParar: (sorteado) => {
      rouletteBtn.disabled = false;
      rouletteBtn.classList.remove("spinning");
      const actions = document.createElement("div");
      actions.className = "status-row";
      actions.style.justifyContent = "center";
      const marcarBtn = document.createElement("button");
      marcarBtn.type = "button";
      marcarBtn.className = "status-chip active small";
      marcarBtn.textContent = "Marcar data";
      marcarBtn.addEventListener("click", () => entrarModoEdicao(sorteado));
      actions.appendChild(marcarBtn);
      rouletteResult.appendChild(actions);
    },
  });
});

onAuth((user) => {
  if (!user || started) return;
  started = true;
  onSnapshot(rolesRef, (snap) => {
    roles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
  });
});
