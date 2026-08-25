import { onAuth, getCurrentUser } from "../core/auth.js";
import {
  listenLivros,
  salvarLivro,
  atualizarLivro,
  excluirLivro,
  listenCapitulos,
  updateConfig,
  registrarAtividade,
} from "../core/db.js";

const STATUS_LABELS = {
  planejado: "Planejado",
  lendo: "Lendo",
  trocar: "Prontos pra trocar",
  concluido: "Concluído",
  abandonado: "Abandonado",
};

const searchInput = document.getElementById("bookSearch");
const rouletteBtn = document.getElementById("rouletteBtn");
const rouletteResult = document.getElementById("rouletteResult");
const openBookFormBtn = document.getElementById("openBookFormBtn");

const bookFormModal = document.getElementById("bookFormModal");
const bookFormTitle = document.getElementById("bookFormTitle");
const bookForm = document.getElementById("bookForm");
const closeBookForm = document.getElementById("closeBookForm");
const deleteBookBtn = document.getElementById("deleteBookBtn");

const bookOnlineSearch = document.getElementById("bookOnlineSearch");
const bookOnlineSearchBtn = document.getElementById("bookOnlineSearchBtn");
const bookOnlineResults = document.getElementById("bookOnlineResults");

const bookDetailModal = document.getElementById("bookDetailModal");
const bookDetailBody = document.getElementById("bookDetailBody");
const closeBookDetail = document.getElementById("closeBookDetail");

const cartaModal = document.getElementById("cartaModal");
const cartaLivroTitulo = document.getElementById("cartaLivroTitulo");
const cartaTexto = document.getElementById("cartaTexto");
const pularCartaBtn = document.getElementById("pularCartaBtn");
const selarCartaBtn = document.getElementById("selarCartaBtn");

const toast = document.getElementById("toast");
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 2400);
}

let livros = [];
let started = false;
let livroParaCarta = null;

function jaLeu(livro, uid) {
  return livro.leituras?.[uid]?.nota != null;
}

function nomeCurto(name) {
  return name ? name.split(" ")[0] : "Alguém";
}

function filtrar(lista) {
  const termo = searchInput.value.trim().toLowerCase();
  if (!termo) return lista;
  return lista.filter(
    (l) => l.titulo.toLowerCase().includes(termo) || (l.autor || "").toLowerCase().includes(termo)
  );
}

function bookMiniCard(livro, { actionsHtml } = {}) {
  const card = document.createElement("div");
  card.className = "event-card book-card";

  const row = document.createElement("div");
  row.className = "book-card-row";

  if (livro.capaUrl) {
    const img = document.createElement("img");
    img.src = livro.capaUrl;
    img.alt = livro.titulo;
    img.className = "book-cover-sm";
    row.appendChild(img);
  }

  const info = document.createElement("div");
  info.className = "book-card-info";
  const title = document.createElement("div");
  title.className = "event-title";
  title.textContent = livro.titulo;
  info.appendChild(title);
  const meta = document.createElement("div");
  meta.className = "event-meta";
  meta.textContent = livro.autor || "";
  info.appendChild(meta);
  if (livro.motivoEscolha) {
    const motivo = document.createElement("div");
    motivo.className = "event-meta italic";
    motivo.textContent = `"${livro.motivoEscolha}"`;
    info.appendChild(motivo);
  }
  if (livro.sugeridoPorName) {
    const sug = document.createElement("div");
    sug.className = "event-meta";
    sug.textContent = `sugestão de ${nomeCurto(livro.sugeridoPorName)}`;
    info.appendChild(sug);
  }
  row.appendChild(info);
  card.appendChild(row);

  const actions = document.createElement("div");
  actions.className = "status-row";
  card.appendChild(actions);
  card.dataset.actionsSlot = "true";

  card.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    abrirDetalhe(livro);
  });

  return { card, actions };
}

function addActionBtn(container, label, onClick, danger) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "status-chip" + (danger ? " danger" : " active");
  btn.textContent = label;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  container.appendChild(btn);
  return btn;
}

async function definirComoAtual(livro) {
  const me = getCurrentUser();
  const lendoAgora = livros.find(
    (l) => l.status === "lendo" && l.leitorAtualUid === me.uid && l.id !== livro.id
  );
  if (lendoAgora) {
    const continuar = confirm(
      `Você já está lendo "${lendoAgora.titulo}". Pausar esse livro (volta pra Planejados) e começar este agora?`
    );
    if (!continuar) return;
    await atualizarLivro(lendoAgora.id, { status: "planejado", leitorAtualUid: null });
  }
  const hoje = new Date().toISOString().split("T")[0];
  const leituras = { ...(livro.leituras || {}) };
  leituras[me.uid] = { ...(leituras[me.uid] || {}), dataInicio: hoje, name: me.name };

  await atualizarLivro(livro.id, { status: "lendo", leitorAtualUid: me.uid, leituras });
  await updateConfig({ [`livroAtualPorUid.${me.uid}`]: livro.id });
  await registrarAtividade({ tipo: "troca", uid: me.uid, name: me.name, livroId: livro.id, livroTitulo: livro.titulo });

  const jaEnviei = livro.cartas?.[me.uid]?.enviada;
  if (!jaEnviei) {
    livroParaCarta = livro;
    cartaLivroTitulo.textContent = livro.titulo;
    cartaTexto.value = "";
    cartaModal.classList.remove("hidden");
  }
}

async function desistir(livro) {
  if (!confirm(`Tem certeza que quer desistir de "${livro.titulo}"?`)) return;
  await atualizarLivro(livro.id, { status: "abandonado", leitorAtualUid: null });
  fecharDetalhe();
}

async function recomecar(livro) {
  await atualizarLivro(livro.id, { status: "planejado" });
  fecharDetalhe();
}

function progressoCapitulos(livro, container) {
  if (!livro.totalCapitulos || !livro.leitorAtualUid) return;
  const box = document.createElement("div");
  box.className = "reveal-box";
  box.textContent = "Carregando progresso...";
  container.appendChild(box);

  const unsub = listenCapitulos(livro.id, (capitulos) => {
    const uid = livro.leitorAtualUid;
    const concluidos = capitulos.filter((c) => {
      const e = c.entradas?.[uid];
      return e && (e.teoriaEnviada || e.impressao || e.frase || (e.emocoes && e.emocoes.length));
    }).length;
    const pct = Math.round((concluidos / livro.totalCapitulos) * 100);
    box.innerHTML = "";
    const label = document.createElement("div");
    label.className = "event-meta";
    label.textContent = `Progresso de leitura: ${concluidos} de ${livro.totalCapitulos} capítulos (${pct}%)`;
    box.appendChild(label);
    const outer = document.createElement("div");
    outer.className = "progress-outer";
    const inner = document.createElement("div");
    inner.className = "progress-inner";
    inner.style.width = `${pct}%`;
    outer.appendChild(inner);
    box.appendChild(outer);
  });
  container._unsub = container._unsub || [];
  container._unsub.push(unsub);
}

function renderSection(containerId, lista, buildActions) {
  const container = document.getElementById(containerId);
  if (container._unsub) {
    container._unsub.forEach((u) => u());
    container._unsub = [];
  }
  container.innerHTML = "";
  if (lista.length === 0) {
    container.innerHTML = '<p class="empty-hint">Nada por aqui.</p>';
    return;
  }
  lista.forEach((livro) => {
    const { card, actions } = bookMiniCard(livro);
    buildActions(livro, actions, card);
    container.appendChild(card);
  });
}

function render() {
  const me = getCurrentUser();
  const filtrados = filtrar(livros);

  const lendo = filtrados.filter((l) => l.status === "lendo");
  const trocar = filtrados.filter((l) => l.status === "trocar");
  const planejados = filtrados.filter((l) => l.status === "planejado");
  const concluidos = filtrados.filter((l) => l.status === "concluido");
  const abandonados = filtrados.filter((l) => l.status === "abandonado");

  renderSection("booksLendo", lendo, (livro, actions, card) => {
    if (livro.leitorAtualUid) {
      const tag = document.createElement("span");
      tag.className = "event-type-tag";
      tag.style.background = "#7c5cff";
      tag.textContent = `${nomeCurto(livro.leituras?.[livro.leitorAtualUid]?.name)} está lendo`;
      card.insertBefore(tag, card.firstChild);
    }
    addActionBtn(actions, "Desistir", () => desistir(livro), true);
    progressoCapitulos(livro, card);
  });

  renderSection("booksTrocar", trocar, (livro, actions) => {
    const jaLi = jaLeu(livro, me.uid);
    if (jaLi) {
      const info = document.createElement("p");
      info.className = "empty-hint";
      info.textContent = "Você já leu este — esperando a outra pessoa.";
      actions.appendChild(info);
    } else {
      addActionBtn(actions, "Agora é sua vez de ler", () => definirComoAtual(livro));
    }
  });

  renderSection("booksPlanejados", planejados, (livro, actions) => {
    addActionBtn(actions, "Começar a ler", () => definirComoAtual(livro));
  });

  renderSection("booksConcluidos", concluidos, (livro, actions, card) => {
    const notas = document.createElement("div");
    notas.className = "event-meta";
    notas.textContent = Object.values(livro.leituras || {})
      .filter((l) => l.nota != null)
      .map((l) => `${nomeCurto(l.name)}: ${l.nota}/10`)
      .join(" · ");
    card.appendChild(notas);
  });

  renderSection("booksAbandonados", abandonados, (livro, actions) => {
    addActionBtn(actions, "Recomeçar depois", () => recomecar(livro));
  });
}

function rodarRoleta() {
  const me = getCurrentUser();
  const planejados = livros.filter((l) => l.status === "planejado");
  if (planejados.length === 0) {
    showToast("Adicione livros em Planejados pra poder sortear!");
    return;
  }
  rouletteBtn.disabled = true;
  rouletteBtn.classList.add("spinning");
  rouletteResult.classList.remove("landed");
  let giros = 0;
  let sorteado = null;
  const intervalo = setInterval(() => {
    sorteado = planejados[Math.floor(Math.random() * planejados.length)];
    rouletteResult.innerHTML = "";
    const p = document.createElement("p");
    p.className = "event-title roulette-spinning-title";
    p.textContent = sorteado.titulo;
    rouletteResult.appendChild(p);
    giros++;
    if (giros > 12) {
      clearInterval(intervalo);
      rouletteBtn.disabled = false;
      rouletteBtn.classList.remove("spinning");
      p.classList.remove("roulette-spinning-title");
      rouletteResult.classList.add("landed");
      const actions = document.createElement("div");
      actions.className = "status-row";
      addActionBtn(actions, "Começar a ler este livro", () => definirComoAtual(sorteado));
      addActionBtn(actions, "Ver detalhes", () => abrirDetalhe(sorteado));
      rouletteResult.appendChild(actions);
    }
  }, 100);
}

// ── Modal: adicionar/editar livro ────────────────────────────────────────
function abrirFormLivro(livro) {
  bookFormTitle.textContent = livro ? "Editar livro" : "Novo livro";
  document.getElementById("bookId").value = livro ? livro.id : "";
  document.getElementById("bookTitle").value = livro ? livro.titulo : "";
  document.getElementById("bookAuthor").value = livro ? livro.autor || "" : "";
  document.getElementById("bookCapaUrl").value = livro ? livro.capaUrl || "" : "";
  document.getElementById("bookGenero").value = livro ? livro.genero || "" : "";
  document.getElementById("bookTotalCapitulos").value = livro ? livro.totalCapitulos || "" : "";
  document.getElementById("bookSinopse").value = livro ? livro.sinopse || "" : "";
  document.getElementById("bookMotivo").value = livro ? livro.motivoEscolha || "" : "";
  deleteBookBtn.classList.toggle("hidden", !livro);
  bookOnlineResults.innerHTML = "";
  bookOnlineSearch.value = "";
  bookFormModal.classList.remove("hidden");
}
function fecharFormLivro() {
  bookFormModal.classList.add("hidden");
  bookForm.reset();
}

openBookFormBtn.addEventListener("click", () => abrirFormLivro(null));
closeBookForm.addEventListener("click", fecharFormLivro);
bookFormModal.addEventListener("click", (e) => e.target === bookFormModal && fecharFormLivro());

bookForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const me = getCurrentUser();
  const id = document.getElementById("bookId").value;
  const dados = {
    titulo: document.getElementById("bookTitle").value.trim(),
    autor: document.getElementById("bookAuthor").value.trim(),
    capaUrl: document.getElementById("bookCapaUrl").value.trim(),
    genero: document.getElementById("bookGenero").value.trim(),
    totalCapitulos: Number(document.getElementById("bookTotalCapitulos").value) || null,
    sinopse: document.getElementById("bookSinopse").value.trim(),
    motivoEscolha: document.getElementById("bookMotivo").value.trim(),
  };
  if (!dados.titulo) return;
  try {
    if (id) {
      await atualizarLivro(id, dados);
    } else {
      await salvarLivro({
        ...dados,
        status: "planejado",
        sugeridoPorUid: me.uid,
        sugeridoPorName: me.name,
        createdAt: Date.now(),
      });
    }
    fecharFormLivro();
  } catch {
    showToast("Não foi possível salvar o livro.");
  }
});

deleteBookBtn.addEventListener("click", async () => {
  const id = document.getElementById("bookId").value;
  if (!id || !confirm("Tem certeza que deseja excluir este livro?")) return;
  await excluirLivro(id);
  fecharFormLivro();
});

// ── Busca online (Google Books / Open Library) ───────────────────────────
async function buscarGoogleBooks(busca) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(busca)}&country=BR&maxResults=6`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("google books");
  const data = await res.json();
  return (data.items || []).map((item) => {
    const info = item.volumeInfo || {};
    return {
      id: item.id,
      titulo: info.title || "",
      autor: (info.authors || []).join(", "),
      capaUrl: (info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "").replace("http://", "https://"),
      sinopse: info.description || "",
      genero: (info.categories || [])[0] || "",
    };
  });
}

async function buscarOpenLibrary(busca) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(busca)}&language=por&limit=6`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("open library");
  const data = await res.json();
  return (data.docs || []).map((d) => ({
    id: d.key,
    titulo: d.title || "",
    autor: (d.author_name || []).join(", "),
    capaUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : "",
    sinopse: "",
    genero: (d.subject || [])[0] || "",
  }));
}

bookOnlineSearchBtn.addEventListener("click", async () => {
  const termo = bookOnlineSearch.value.trim();
  if (!termo) return;
  bookOnlineResults.innerHTML = '<p class="empty-hint">Buscando...</p>';
  let resultados = [];
  try {
    resultados = await buscarGoogleBooks(termo);
  } catch {
    try {
      resultados = await buscarOpenLibrary(termo);
    } catch {
      bookOnlineResults.innerHTML = '<p class="empty-hint">Não consegui buscar agora. Preencha manualmente.</p>';
      return;
    }
  }
  bookOnlineResults.innerHTML = "";
  if (resultados.length === 0) {
    bookOnlineResults.innerHTML = '<p class="empty-hint">Nenhum resultado.</p>';
    return;
  }
  resultados.forEach((item) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "book-search-result";
    row.innerHTML = "";
    if (item.capaUrl) {
      const img = document.createElement("img");
      img.src = item.capaUrl;
      row.appendChild(img);
    }
    const info = document.createElement("div");
    const t = document.createElement("div");
    t.className = "event-title";
    t.textContent = item.titulo || "Sem título";
    const a = document.createElement("div");
    a.className = "event-meta";
    a.textContent = item.autor || "Autor desconhecido";
    info.appendChild(t);
    info.appendChild(a);
    row.appendChild(info);
    row.addEventListener("click", () => {
      document.getElementById("bookTitle").value = item.titulo;
      document.getElementById("bookAuthor").value = item.autor;
      document.getElementById("bookCapaUrl").value = item.capaUrl;
      document.getElementById("bookSinopse").value = item.sinopse;
      document.getElementById("bookGenero").value = item.genero;
      bookOnlineResults.innerHTML = "";
      bookOnlineSearch.value = "";
    });
    bookOnlineResults.appendChild(row);
  });
});

// ── Modal: detalhes ──────────────────────────────────────────────────────
function abrirDetalhe(livro) {
  const me = getCurrentUser();
  bookDetailBody.innerHTML = "";

  if (livro.capaUrl) {
    const img = document.createElement("img");
    img.src = livro.capaUrl;
    img.className = "book-cover-lg";
    bookDetailBody.appendChild(img);
  }
  bookDetailBody.appendChild(Object.assign(document.createElement("h2"), { textContent: livro.titulo }));
  if (livro.autor) {
    bookDetailBody.appendChild(Object.assign(document.createElement("p"), { className: "empty-hint", textContent: livro.autor }));
  }
  if (livro.sinopse) {
    const p = document.createElement("p");
    p.className = "event-meta";
    p.textContent = livro.sinopse;
    bookDetailBody.appendChild(p);
  }
  const tags = document.createElement("div");
  tags.className = "status-row";
  if (livro.genero) {
    const t = document.createElement("span");
    t.className = "event-type-tag";
    t.style.background = "#a78bfa";
    t.textContent = livro.genero;
    tags.appendChild(t);
  }
  if (livro.totalCapitulos) {
    const t = document.createElement("span");
    t.className = "event-type-tag";
    t.style.background = "#4d8cff";
    t.textContent = `${livro.totalCapitulos} capítulos`;
    tags.appendChild(t);
  }
  bookDetailBody.appendChild(tags);

  if (livro.motivoEscolha) {
    const p = document.createElement("p");
    p.className = "event-meta italic";
    p.textContent = `"${livro.motivoEscolha}"`;
    bookDetailBody.appendChild(p);
  }
  if (livro.sugeridoPorName) {
    const p = document.createElement("p");
    p.className = "event-meta";
    p.textContent = `Sugerido por ${nomeCurto(livro.sugeridoPorName)}`;
    bookDetailBody.appendChild(p);
  }

  if (livro.status === "concluido" || livro.status === "trocar") {
    const box = document.createElement("div");
    box.className = "reveal-box";
    Object.values(livro.leituras || {}).forEach((l) => {
      if (l.nota == null) return;
      const p = document.createElement("p");
      p.textContent = `${nomeCurto(l.name)}: nota ${l.nota}/10${l.dataInicio ? ` · de ${l.dataInicio}` : ""}${l.dataFim ? ` até ${l.dataFim}` : ""}`;
      box.appendChild(p);
    });
    bookDetailBody.appendChild(box);
  }

  const actions = document.createElement("div");
  actions.className = "form-actions column";
  addActionBtn(actions, "Editar informações", () => {
    fecharDetalhe();
    abrirFormLivro(livro);
  });
  if (livro.status === "lendo" && livro.leitorAtualUid === me.uid) {
    addActionBtn(actions, "Desistir deste livro", () => desistir(livro), true);
  }
  addActionBtn(
    actions,
    "Excluir livro",
    async () => {
      if (confirm("Tem certeza que deseja excluir este livro?")) {
        await excluirLivro(livro.id);
        fecharDetalhe();
      }
    },
    true
  );
  bookDetailBody.appendChild(actions);

  bookDetailModal.classList.remove("hidden");
}
function fecharDetalhe() {
  bookDetailModal.classList.add("hidden");
}
closeBookDetail.addEventListener("click", fecharDetalhe);
bookDetailModal.addEventListener("click", (e) => e.target === bookDetailModal && fecharDetalhe());

// ── Modal: carta pro futuro ───────────────────────────────────────────────
selarCartaBtn.addEventListener("click", async () => {
  if (!livroParaCarta || !cartaTexto.value.trim()) return;
  const me = getCurrentUser();
  const cartas = { ...(livroParaCarta.cartas || {}) };
  cartas[me.uid] = { texto: cartaTexto.value.trim(), enviada: true, name: me.name };
  await atualizarLivro(livroParaCarta.id, { cartas });
  await registrarAtividade({ tipo: "carta", uid: me.uid, name: me.name, livroId: livroParaCarta.id, livroTitulo: livroParaCarta.titulo });
  cartaModal.classList.add("hidden");
  livroParaCarta = null;
});
pularCartaBtn.addEventListener("click", () => {
  cartaModal.classList.add("hidden");
  livroParaCarta = null;
});

searchInput.addEventListener("input", render);
rouletteBtn.addEventListener("click", rodarRoleta);

onAuth((user) => {
  if (!user || started) return;
  started = true;
  listenLivros((lista) => {
    livros = lista;
    render();
  });
});
