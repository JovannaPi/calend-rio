import { onAuth } from "../core/auth.js";
import {
  listenLivros,
  listarTodosCapitulos,
  listenPremiacao,
  listarCapitulosUmaVez,
  listenFotosMemoria,
  adicionarFotoMemoria,
  removerFotoMemoria,
} from "../core/db.js";
import { enviarFoto } from "../core/upload.js";
import { el } from "../core/util.js";

const content = document.getElementById("memoriasContent");
const photoViewerModal = document.getElementById("photoViewerModal");
const photoViewerImg = document.getElementById("photoViewerImg");
let livros = [];
let started = false;

photoViewerModal.addEventListener("click", () => photoViewerModal.classList.add("hidden"));

async function muralFrases(concluidos) {
  const section = el("div");
  if (concluidos.length === 0) return section;

  const idsConcluidos = new Set(concluidos.map((l) => l.id));
  const capitulos = await listarTodosCapitulos();
  const frases = [];
  capitulos.forEach((cap) => {
    if (!idsConcluidos.has(cap.livroId)) return;
    const livro = concluidos.find((l) => l.id === cap.livroId);
    Object.values(cap.entradas || {}).forEach((e) => {
      if (e.frase) frases.push({ texto: e.frase, nome: e.name, livroTitulo: livro?.titulo || "" });
    });
  });
  if (frases.length === 0) return section;

  section.appendChild(el("h2", null, "Mural de frases favoritas"));
  const grid = el("div", "memorias-grid");
  frases.forEach((f) => {
    const card = el("div", "panel-card");
    card.appendChild(el("p", "italic", `"${f.texto}"`));
    card.appendChild(el("p", "event-meta", `${f.nome || "Alguém"} · ${f.livroTitulo}`));
    grid.appendChild(card);
  });
  section.appendChild(grid);
  return section;
}

function capsulaDoTempo(livro) {
  const wrap = el("div", "panel-card capsula-card");
  const header = el("div", "capsula-header");
  if (livro.capaUrl) {
    const img = document.createElement("img");
    img.src = livro.capaUrl;
    img.className = "book-cover-sm";
    header.appendChild(img);
  }
  const info = el("div");
  info.appendChild(el("p", "event-title", livro.titulo));
  info.appendChild(el("p", "empty-hint", livro.autor || ""));
  const notas = Object.values(livro.leituras || {}).filter((l) => l.nota != null);
  if (notas.length) {
    const media = (notas.reduce((s, l) => s + l.nota, 0) / notas.length).toFixed(1);
    info.appendChild(el("p", "event-meta", `Média do casal: ${media}/10`));
  }
  header.appendChild(info);
  wrap.appendChild(header);

  const toggleBtn = el("button", "status-chip", "Abrir cápsula do tempo");
  toggleBtn.type = "button";
  wrap.appendChild(toggleBtn);

  const bodyEl = el("div", "hidden capsula-body");
  wrap.appendChild(bodyEl);

  let aberta = false;
  let carregado = false;
  toggleBtn.addEventListener("click", async () => {
    aberta = !aberta;
    bodyEl.classList.toggle("hidden", !aberta);
    toggleBtn.textContent = aberta ? "Fechar cápsula" : "Abrir cápsula do tempo";
    if (aberta && !carregado) {
      carregado = true;
      await montarCorpoCapsula(livro, bodyEl);
    }
  });

  return wrap;
}

async function montarCorpoCapsula(livro, bodyEl) {
  bodyEl.innerHTML = "";

  // Fotos
  const fotosCard = el("div");
  fotosCard.appendChild(el("h3", null, "Fotos desta leitura"));
  const grid = el("div", "photo-grid");
  fotosCard.appendChild(grid);
  const addBtn = el("button", "status-chip", "+ Adicionar foto");
  addBtn.type = "button";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "hidden";
  fotosCard.appendChild(addBtn);
  fotosCard.appendChild(fileInput);
  addBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    addBtn.textContent = "Enviando...";
    try {
      const url = await enviarFoto(file, { folder: `calend-rio/memorias/${livro.id}` });
      await adicionarFotoMemoria(livro.id, url);
    } catch (err) {
      alert(err.message || "Falha ao enviar foto.");
    } finally {
      addBtn.textContent = "+ Adicionar foto";
    }
  });
  listenFotosMemoria(livro.id, (urls) => {
    grid.innerHTML = "";
    urls.forEach((url) => {
      const box = el("div", "photo-box");
      const img = document.createElement("img");
      img.src = url;
      img.addEventListener("click", () => {
        photoViewerImg.src = url;
        photoViewerModal.classList.remove("hidden");
      });
      const removeBtn = el("button", "photo-remove", "×");
      removeBtn.type = "button";
      removeBtn.addEventListener("click", () => removerFotoMemoria(livro.id, url));
      box.appendChild(img);
      box.appendChild(removeBtn);
      grid.appendChild(box);
    });
  });
  bodyEl.appendChild(fotosCard);

  // Diário da leitura
  const capitulos = await listarCapitulosUmaVez(livro.id);
  const comConteudo = capitulos.filter((c) =>
    Object.values(c.entradas || {}).some((e) => e.impressao || e.frase || e.teoria || e.emocoes?.length)
  );
  if (comConteudo.length > 0) {
    const diarioCard = el("div");
    diarioCard.appendChild(el("h3", null, "Diário da leitura"));
    comConteudo.forEach((cap) => {
      const capBox = el("div", "panel-card");
      capBox.appendChild(el("p", "event-title", `Capítulo ${cap.numero}`));
      Object.values(cap.entradas || {}).forEach((e) => {
        if (!e.impressao && !e.frase && !e.teoria && !e.emocoes?.length) return;
        const p = el("div");
        p.appendChild(el("p", "event-meta", e.name || "Alguém"));
        if (e.emocoes?.length) p.appendChild(el("p", null, e.emocoes.join(" ")));
        if (e.impressao) p.appendChild(el("p", "event-meta", e.impressao));
        if (e.frase) p.appendChild(el("p", "italic", `"${e.frase}"`));
        if (e.teoria) p.appendChild(el("p", "event-meta", `Teoria: ${e.teoria}`));
        capBox.appendChild(p);
      });
      diarioCard.appendChild(capBox);
    });
    bodyEl.appendChild(diarioCard);
  }

  // Premiações
  await new Promise((resolve) => {
    const unsub = listenPremiacao(livro.id, (premiacao) => {
      unsub();
      const categorias = [
        ["melhorPersonagem", "Melhor personagem"],
        ["cenaFavorita", "Cena favorita"],
        ["teoriaMaisLoucas", "Teoria mais maluca"],
        ["maiorSurpresa", "Maior surpresa"],
      ];
      const temAlguma = categorias.some(([key]) => Object.keys(premiacao[key] || {}).length > 0);
      if (temAlguma) {
        const premCard = el("div");
        premCard.appendChild(el("h3", null, "Premiações"));
        categorias.forEach(([key, label]) => {
          const respostas = premiacao[key] || {};
          if (Object.keys(respostas).length === 0) return;
          const box = el("div", "panel-card");
          box.appendChild(el("p", "event-title", label));
          Object.entries(respostas).forEach(([, valor]) => box.appendChild(el("p", "event-meta", valor)));
          premCard.appendChild(box);
        });
        bodyEl.appendChild(premCard);
      }
      resolve();
    });
  });

  // Cartas do futuro
  const cartas = Object.values(livro.cartas || {});
  const cartasCard = el("div");
  if (cartas.filter((c) => c.enviada).length >= 2) {
    cartasCard.appendChild(el("h3", null, "Cartas escritas antes de começar"));
    cartas.forEach((c) => {
      const box = el("div", "reveal-box");
      box.appendChild(el("p", "event-meta", c.name || "Alguém"));
      box.appendChild(el("p", null, `"${c.texto}"`));
      cartasCard.appendChild(box);
    });
  } else {
    cartasCard.appendChild(el("p", "empty-hint", "As cartas do futuro não foram escritas para este livro."));
  }
  bodyEl.appendChild(cartasCard);

  bodyEl.appendChild(el("p", "empty-hint footer-note", "Esta página nunca mais muda. É a memória permanente deste livro."));
}

async function render() {
  content.innerHTML = "";
  const concluidos = livros.filter((l) => l.status === "concluido");

  content.appendChild(await muralFrases(concluidos));

  if (concluidos.length === 0) {
    content.appendChild(el("p", "empty-hint", "Concluam o primeiro livro para criar memórias!"));
    return;
  }

  content.appendChild(el("p", "empty-hint", "Cada livro que vivemos juntas, guardado pra sempre."));
  concluidos.forEach((livro) => content.appendChild(capsulaDoTempo(livro)));
}

onAuth((user) => {
  if (!user || started) return;
  started = true;
  listenLivros((l) => {
    livros = l;
    render();
  });
});
