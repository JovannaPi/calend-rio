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
    if (role.status === "planejado") {
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
      delBtn.addEventListener("click", () => deleteDoc(doc(db, "roles", role.id)));
      row.appendChild(delBtn);
      card.appendChild(row);
    } else {
      card.appendChild(starRow(role.id, role.nota || 0));
    }
  }

  return card;
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
    ranked.forEach((r) => rankingListEl.appendChild(buildCard(r)));
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
