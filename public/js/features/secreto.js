import { onAuth, getCurrentUser } from "../core/auth.js";
import {
  listenConfig,
  listenLivros,
  listenCapitulo,
  salvarCapitulo,
  registrarAtividade,
  listarComentarios,
  enviarComentario,
} from "../core/db.js";
import { capituloLembrado, lembrarCapitulo, el } from "../core/util.js";

const content = document.getElementById("secretoContent");
let config = {};
let livros = [];
let capNum = 1;
let unsubCap = null;
let started = false;
let livroAtualId = null;

function livroAtual() {
  const me = getCurrentUser();
  const id = config.livroAtualPorUid?.[me.uid];
  return livros.find((l) => l.id === id) || null;
}

function isRevelado(entradas) {
  return Object.values(entradas || {}).filter((e) => e.teoriaEnviada).length >= 2;
}

// Só reconstrói a página quando o livro atual muda de verdade — senão,
// qualquer mudança em livros/config (que são coleções compartilhadas,
// mudam por um monte de motivo alheio) reabre a assinatura do capítulo e
// apaga a teoria que a pessoa está no meio de digitar.
function render() {
  const me = getCurrentUser();
  const livro = livroAtual();

  if (!livro) {
    livroAtualId = null;
    content.innerHTML = "";
    content.appendChild(el("p", "empty-hint", "Nenhum livro em leitura."));
    return;
  }

  if (livro.id === livroAtualId) return;
  livroAtualId = livro.id;

  capNum = capituloLembrado(livro.id, me.uid);
  const maxCap = livro.totalCapitulos || 99;
  content.innerHTML = "";

  const nav = el("div", "panel-card chapter-nav-row");
  const prevBtn = el("button", "nav-btn", "‹");
  prevBtn.type = "button";
  const nextBtn = el("button", "nav-btn", "›");
  nextBtn.type = "button";
  const center = el("div", "chapter-nav-center");
  const capLabel = el("p", "event-title", `Capítulo ${capNum}`);
  center.appendChild(capLabel);
  center.appendChild(el("p", "empty-hint", livro.titulo));
  prevBtn.addEventListener("click", () => {
    if (capNum > 1) {
      capNum--;
      capLabel.textContent = `Capítulo ${capNum}`;
      lembrarCapitulo(livro.id, me.uid, capNum);
      renderCapitulo(livro);
    }
  });
  nextBtn.addEventListener("click", () => {
    if (capNum < maxCap) {
      capNum++;
      capLabel.textContent = `Capítulo ${capNum}`;
      lembrarCapitulo(livro.id, me.uid, capNum);
      renderCapitulo(livro);
    }
  });
  nav.appendChild(prevBtn);
  nav.appendChild(center);
  nav.appendChild(nextBtn);
  content.appendChild(nav);

  const body = el("div");
  body.id = "secretoBody";
  content.appendChild(body);

  renderCapitulo(livro);
}

function renderCapitulo(livro) {
  const me = getCurrentUser();
  const body = document.getElementById("secretoBody");
  if (!body) return;
  if (unsubCap) unsubCap();

  unsubCap = listenCapitulo(livro.id, capNum, (cap) => {
    body.innerHTML = "";
    const entradas = cap.entradas || {};
    const minha = entradas[me.uid] || {};
    const revelado = isRevelado(entradas);

    const statusRow = el("div", "status-row");
    Object.values(entradas).forEach((e) => {
      if (!e.name) return;
      const pill = el("span", "status-chip" + (e.teoriaEnviada ? " active" : ""), e.teoriaEnviada ? `${e.name.split(" ")[0]} ✓` : e.name.split(" ")[0]);
      statusRow.appendChild(pill);
    });
    body.appendChild(statusRow);

    if (revelado) {
      const box = el("div", "reveal-box");
      box.appendChild(el("p", null, "Revelado! Hora de comparar."));
      Object.values(entradas).forEach((e) => {
        if (!e.teoriaEnviada) return;
        const card = el("div", "panel-card");
        card.appendChild(el("p", "event-meta", e.name || "Alguém"));
        if (e.emocoes?.length) card.appendChild(el("p", null, e.emocoes.join(" ")));
        card.appendChild(el("p", null, e.teoria || "(não preenchido)"));
        box.appendChild(card);
      });
      body.appendChild(box);
      renderDiscussao(livro, body);
    } else if (minha.teoriaEnviada) {
      const box = el("div", "reveal-box");
      box.appendChild(el("p", null, "Resposta travada. Aguardando a outra pessoa enviar a dela..."));
      body.appendChild(box);
    } else {
      const card = el("div", "panel-card");
      card.appendChild(el("label", null, "Sua teoria secreta"));
      const textarea = document.createElement("textarea");
      textarea.rows = 5;
      textarea.placeholder = "O que você acha que vai acontecer? Quem é o culpado? Qual a reviravolta?";
      textarea.value = minha.teoria || "";
      card.appendChild(textarea);
      card.appendChild(el("p", "empty-hint", "Sua resposta fica bloqueada até a outra pessoa também enviar a dela."));
      const btn = el("button", "primary-btn full-width", "Travar resposta");
      btn.type = "button";
      btn.addEventListener("click", async () => {
        if (!textarea.value.trim()) return;
        btn.disabled = true;
        try {
          await salvarCapitulo(livro.id, capNum, {
            [`entradas.${me.uid}.teoria`]: textarea.value.trim(),
            [`entradas.${me.uid}.teoriaEnviada`]: true,
            [`entradas.${me.uid}.name`]: me.name,
          });
          await registrarAtividade({
            tipo: "secreto",
            uid: me.uid,
            name: me.name,
            livroId: livro.id,
            livroTitulo: livro.titulo,
            capitulo: capNum,
          });
        } catch (err) {
          console.error("Falha ao travar teoria:", err);
          alert("Não consegui salvar a teoria (" + (err?.code || err?.message || "erro desconhecido") + ").");
          btn.disabled = false;
        }
      });
      card.appendChild(btn);
      body.appendChild(card);
    }
  });
}

async function renderDiscussao(livro, container) {
  const me = getCurrentUser();
  const box = el("div", "panel-card");
  box.appendChild(el("h2", null, "Discussão"));
  const messagesEl = el("div", "chat-messages small");
  box.appendChild(messagesEl);

  const form = document.createElement("form");
  form.className = "chat-form";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Comentar...";
  input.required = true;
  const btn = el("button", "primary-btn", "Enviar");
  btn.type = "submit";
  form.appendChild(input);
  form.appendChild(btn);
  box.appendChild(form);
  container.appendChild(box);

  async function carregar() {
    const comentarios = await listarComentarios(livro.id, capNum);
    messagesEl.innerHTML = "";
    comentarios.forEach((c) => {
      const bubble = el("div", "chat-bubble" + (c.uid === me.uid ? " mine" : ""));
      bubble.appendChild(el("div", "chat-author", c.name || "Alguém"));
      bubble.appendChild(el("div", null, c.text));
      messagesEl.appendChild(bubble);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  await carregar();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    await enviarComentario(livro.id, capNum, { text, uid: me.uid, name: me.name });
    carregar();
  });
}

onAuth((user) => {
  if (!user || started) return;
  started = true;
  listenConfig((c) => {
    config = c;
    render();
  });
  listenLivros((lista) => {
    livros = lista;
    render();
  });
});
