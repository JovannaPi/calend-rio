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
const capaInput = document.getElementById("movieCapaUrl");
const sinopseInput = document.getElementById("movieSinopse");
const anoInput = document.getElementById("movieAno");

const onlineSearch = document.getElementById("movieOnlineSearch");
const onlineSearchBtn = document.getElementById("movieOnlineSearchBtn");
const onlineResults = document.getElementById("movieOnlineResults");

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

    const row0 = document.createElement("div");
    row0.className = "book-card-row";
    if (item.capaUrl) {
      const img = document.createElement("img");
      img.src = item.capaUrl;
      img.alt = item.title;
      img.className = "book-cover-sm";
      row0.appendChild(img);
    }
    const info = document.createElement("div");
    info.className = "book-card-info";
    const title = document.createElement("div");
    title.className = "event-title";
    title.textContent = item.title;
    info.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "event-meta";
    const partes = [item.type === "serie" ? "Série" : "Filme"];
    if (item.ano) partes.push(item.ano);
    partes.push(`adicionado por ${item.addedByName || "alguém"}`);
    meta.textContent = partes.join(" · ");
    info.appendChild(meta);
    if (item.sinopse) {
      const sin = document.createElement("div");
      sin.className = "event-meta";
      sin.textContent = item.sinopse.length > 140 ? item.sinopse.slice(0, 140) + "…" : item.sinopse;
      info.appendChild(sin);
    }
    row0.appendChild(info);
    card.appendChild(row0);

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
    delBtn.addEventListener("click", () => {
      card.classList.add("removing");
      setTimeout(() => deleteDoc(doc(db, "watchlist", item.id)), 250);
    });
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
    capaUrl: capaInput.value,
    sinopse: sinopseInput.value,
    ano: anoInput.value,
    status: "assistir",
    addedByUid: me.uid,
    addedByName: me.name,
    createdAt: Date.now(),
  });
  form.reset();
  capaInput.value = "";
  sinopseInput.value = "";
  anoInput.value = "";
});

// ── Busca online (iTunes Search API — sem chave, filmes e séries) ───────
// country=US pega o catálogo mais completo (é só pra pegar título/capa/sinopse,
// não pra comprar nada). O parâmetro "entity" só é válido pra filme — pra
// série não existe entity=tvShow, então nem mandamos (a API já traz temporadas
// por padrão, e a gente tira as duplicadas do mesmo show).
async function buscarFilmes(busca) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(busca)}&media=movie&entity=movie&country=US&limit=8`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("itunes movie " + res.status);
  const data = await res.json();
  return (data.results || []).map((it) => ({
    titulo: it.trackName || "",
    capaUrl: (it.artworkUrl100 || "").replace("100x100", "300x300"),
    sinopse: it.longDescription || it.shortDescription || "",
    ano: it.releaseDate ? it.releaseDate.slice(0, 4) : "",
    tipo: "filme",
  }));
}

async function buscarSeries(busca) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(busca)}&media=tvShow&country=US&limit=10`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("itunes tv " + res.status);
  const data = await res.json();
  const vistos = new Set();
  const resultados = [];
  for (const it of data.results || []) {
    const nome = it.collectionName || it.trackName || "";
    if (!nome || vistos.has(nome)) continue;
    vistos.add(nome);
    resultados.push({
      titulo: nome,
      capaUrl: (it.artworkUrl100 || "").replace("100x100", "300x300"),
      sinopse: it.longDescription || it.shortDescription || "",
      ano: it.releaseDate ? it.releaseDate.slice(0, 4) : "",
      tipo: "serie",
    });
  }
  return resultados.slice(0, 6);
}

onlineSearchBtn.addEventListener("click", async () => {
  const termo = onlineSearch.value.trim();
  if (!termo) return;
  onlineResults.innerHTML = '<p class="empty-hint">Buscando...</p>';
  let resultados = [];
  let falhouTudo = false;
  try {
    const [filmes, series] = await Promise.allSettled([buscarFilmes(termo), buscarSeries(termo)]);
    if (filmes.status === "fulfilled") resultados.push(...filmes.value);
    else console.error("Busca de filmes falhou:", filmes.reason);
    if (series.status === "fulfilled") resultados.push(...series.value);
    else console.error("Busca de séries falhou:", series.reason);
    falhouTudo = filmes.status === "rejected" && series.status === "rejected";
  } catch (err) {
    console.error("Busca online falhou:", err);
    falhouTudo = true;
  }
  onlineResults.innerHTML = "";
  if (falhouTudo) {
    onlineResults.innerHTML = '<p class="empty-hint">Não consegui buscar agora (sem conexão com a busca online). Preencha manualmente abaixo.</p>';
    return;
  }
  if (resultados.length === 0) {
    onlineResults.innerHTML = '<p class="empty-hint">Nenhum resultado pra esse nome. Preencha manualmente abaixo.</p>';
    return;
  }
  resultados.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "book-search-result";
    if (item.capaUrl) {
      const img = document.createElement("img");
      img.src = item.capaUrl;
      btn.appendChild(img);
    }
    const info = document.createElement("div");
    const t = document.createElement("div");
    t.className = "event-title";
    t.textContent = item.titulo || "Sem título";
    const m = document.createElement("div");
    m.className = "event-meta";
    m.textContent = `${item.tipo === "serie" ? "Série" : "Filme"}${item.ano ? " · " + item.ano : ""}`;
    info.appendChild(t);
    info.appendChild(m);
    btn.appendChild(info);
    btn.addEventListener("click", () => {
      titleInput.value = item.titulo;
      typeSelect.value = item.tipo;
      capaInput.value = item.capaUrl;
      sinopseInput.value = item.sinopse;
      anoInput.value = item.ano;
      onlineResults.innerHTML = "";
      onlineSearch.value = "";
    });
    onlineResults.appendChild(btn);
  });
});

onAuth((user) => {
  if (!user || started) return;
  started = true;
  onSnapshot(moviesRef, (snap) => {
    render(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
});
