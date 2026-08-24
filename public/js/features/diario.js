import { onAuth, getCurrentUser } from "../core/auth.js";
import {
  listenConfig,
  listenLivros,
  listenCapitulo,
  salvarCapitulo,
  atualizarLivro,
  registrarAtividade,
} from "../core/db.js";
import { capituloLembrado, lembrarCapitulo, confetti, el } from "../core/util.js";

const EMOCOES = ["❤", "😭", "😲", "😡", "🤔", "😂", "😰", "🥰", "😤", "🤯"];

const content = document.getElementById("diarioContent");
let config = {};
let livros = [];
let capNum = 1;
let unsubCap = null;
let started = false;

function livroAtual() {
  const me = getCurrentUser();
  const id = config.livroAtualPorUid?.[me.uid];
  return livros.find((l) => l.id === id) || null;
}

function render() {
  const me = getCurrentUser();
  const livro = livroAtual();
  content.innerHTML = "";

  if (!livro) {
    content.appendChild(el("p", "empty-hint", "Nenhum livro em leitura. Defina o livro atual na Biblioteca."));
    return;
  }
  capNum = capituloLembrado(livro.id, me.uid);
  const maxCap = livro.totalCapitulos || 99;

  const cartaMinha = livro.cartas?.[me.uid];
  if (!cartaMinha?.enviada) {
    content.appendChild(cartaFormulario(livro));
  }

  const nav = el("div", "panel-card chapter-nav-row");
  const prevBtn = el("button", "nav-btn", "‹");
  prevBtn.type = "button";
  const nextBtn = el("button", "nav-btn", "›");
  nextBtn.type = "button";
  const center = el("div", "chapter-nav-center");
  center.appendChild(el("p", "event-title", `Capítulo ${capNum}`));
  center.appendChild(el("p", "empty-hint", livro.titulo));
  prevBtn.addEventListener("click", () => {
    if (capNum > 1) {
      capNum--;
      lembrarCapitulo(livro.id, me.uid, capNum);
      renderCapitulo(livro);
    }
  });
  nextBtn.addEventListener("click", () => {
    if (capNum < maxCap) {
      capNum++;
      lembrarCapitulo(livro.id, me.uid, capNum);
      renderCapitulo(livro);
    }
  });
  nav.appendChild(prevBtn);
  nav.appendChild(center);
  nav.appendChild(nextBtn);
  content.appendChild(nav);

  const capForm = el("div");
  capForm.id = "diarioCapForm";
  content.appendChild(capForm);

  if (cartaMinha?.enviada) {
    content.appendChild(cartaStatus(livro));
  }

  content.appendChild(notasFinais(livro));

  renderCapitulo(livro);
}

function renderCapitulo(livro) {
  const me = getCurrentUser();
  const capForm = document.getElementById("diarioCapForm");
  if (!capForm) return;
  capForm.innerHTML = "";
  if (unsubCap) unsubCap();

  unsubCap = listenCapitulo(livro.id, capNum, (cap) => {
    const minha = cap.entradas?.[me.uid] || {};
    capForm.innerHTML = "";

    const impressaoCard = el("div", "panel-card");
    impressaoCard.appendChild(el("label", null, "Impressão geral"));
    const impressaoInput = document.createElement("textarea");
    impressaoInput.rows = 4;
    impressaoInput.placeholder = "O que você achou deste capítulo?";
    impressaoInput.value = minha.impressao || "";
    impressaoCard.appendChild(impressaoInput);
    capForm.appendChild(impressaoCard);

    const emocoesCard = el("div", "panel-card");
    emocoesCard.appendChild(el("label", null, "Como você se sentiu?"));
    const emocoesRow = el("div", "emoji-row");
    let emocoesSelecionadas = [...(minha.emocoes || [])];
    EMOCOES.forEach((emo) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "emoji-btn" + (emocoesSelecionadas.includes(emo) ? " active" : "");
      btn.textContent = emo;
      btn.addEventListener("click", () => {
        if (emocoesSelecionadas.includes(emo)) {
          emocoesSelecionadas = emocoesSelecionadas.filter((e) => e !== emo);
          btn.classList.remove("active");
        } else {
          emocoesSelecionadas.push(emo);
          btn.classList.add("active");
        }
      });
      emocoesRow.appendChild(btn);
    });
    emocoesCard.appendChild(emocoesRow);
    capForm.appendChild(emocoesCard);

    const fraseCard = el("div", "panel-card");
    fraseCard.appendChild(el("label", null, "Frase favorita"));
    const fraseInput = document.createElement("textarea");
    fraseInput.rows = 2;
    fraseInput.placeholder = "A frase que mais te marcou neste capítulo...";
    fraseInput.value = minha.frase || "";
    fraseCard.appendChild(fraseInput);
    capForm.appendChild(fraseCard);

    const saveBtn = el("button", "primary-btn full-width", "Salvar diário");
    saveBtn.type = "button";
    saveBtn.addEventListener("click", async () => {
      await salvarCapitulo(livro.id, capNum, {
        [`entradas.${me.uid}.impressao`]: impressaoInput.value,
        [`entradas.${me.uid}.emocoes`]: emocoesSelecionadas,
        [`entradas.${me.uid}.frase`]: fraseInput.value,
        [`entradas.${me.uid}.name`]: me.name,
      });
      await registrarAtividade({
        tipo: "diario",
        uid: me.uid,
        name: me.name,
        livroId: livro.id,
        livroTitulo: livro.titulo,
        capitulo: capNum,
      });
      saveBtn.textContent = "✓ Salvo!";
      setTimeout(() => (saveBtn.textContent = "Salvar diário"), 1800);
    });
    capForm.appendChild(saveBtn);
  });
}

function cartaFormulario(livro) {
  const me = getCurrentUser();
  const card = el("div", "panel-card");
  card.appendChild(el("h2", null, "Carta para o futuro"));
  card.appendChild(el("p", "empty-hint", "O que você espera deste livro? Fica selada até vocês duas terminarem."));
  const textarea = document.createElement("textarea");
  textarea.rows = 2;
  textarea.placeholder = "O que você espera deste livro?";
  textarea.value = livro.cartas?.[me.uid]?.texto || "";
  card.appendChild(textarea);
  const btn = el("button", "primary-btn full-width", "Selar carta");
  btn.type = "button";
  btn.addEventListener("click", async () => {
    if (!textarea.value.trim()) return;
    const cartas = { ...(livro.cartas || {}) };
    cartas[me.uid] = { texto: textarea.value.trim(), enviada: true, name: me.name };
    await atualizarLivro(livro.id, { cartas });
    await registrarAtividade({ tipo: "carta", uid: me.uid, name: me.name, livroId: livro.id, livroTitulo: livro.titulo });
  });
  card.appendChild(btn);
  return card;
}

function cartaStatus(livro) {
  const me = getCurrentUser();
  const cartas = livro.cartas || {};
  const outras = Object.entries(cartas).filter(([uid]) => uid !== me.uid);
  const todasEnviadas = Object.values(cartas).filter((c) => c.enviada).length >= 2;
  const card = el("div", "panel-card");

  if (livro.status === "concluido" && todasEnviadas) {
    card.appendChild(el("h2", null, "Cartas escritas antes de começar"));
    Object.values(cartas).forEach((c) => {
      const box = el("div", "reveal-box");
      box.appendChild(el("p", "event-meta", c.name || "Alguém"));
      box.appendChild(el("p", null, `"${c.texto}"`));
      card.appendChild(box);
    });
  } else {
    const outraEnviou = outras.some(([, c]) => c.enviada);
    card.appendChild(
      el(
        "p",
        "empty-hint",
        outraEnviou
          ? "Sua carta está selada. Vai revelar quando o livro for concluído."
          : "Sua carta está selada. Esperando a outra pessoa escrever a dela."
      )
    );
  }
  return card;
}

function notasFinais(livro) {
  const me = getCurrentUser();
  const minhaNota = livro.leituras?.[me.uid]?.nota;
  const card = el("div", "panel-card");

  if (minhaNota != null) {
    card.appendChild(el("p", "empty-hint", `Você já deu sua nota final: ${minhaNota}/10.`));
    return card;
  }

  card.appendChild(el("h2", null, `Terminei de ler ${livro.titulo}`));
  card.appendChild(el("p", "empty-hint", "Dê sua nota final. O livro vai pra fila de troca até a outra pessoa também terminar."));

  const notaLabel = el("p", "event-title", "5/10");
  card.appendChild(notaLabel);
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "10";
  slider.step = "1";
  slider.value = "5";
  slider.style.width = "100%";
  slider.addEventListener("input", () => (notaLabel.textContent = `${slider.value}/10`));
  card.appendChild(slider);

  const btn = el("button", "primary-btn full-width", "Terminei — salvar nota");
  btn.type = "button";
  btn.addEventListener("click", async () => {
    const hoje = new Date().toISOString().split("T")[0];
    const leituras = { ...(livro.leituras || {}) };
    leituras[me.uid] = { ...(leituras[me.uid] || {}), nota: Number(slider.value), dataFim: hoje, name: me.name };
    const outrasNotas = Object.entries(leituras).filter(([uid]) => uid !== me.uid && leituras[uid].nota != null);
    const outraJaLeu = outrasNotas.length > 0;
    await atualizarLivro(livro.id, {
      leituras,
      status: outraJaLeu ? "concluido" : "trocar",
      leitorAtualUid: null,
    });
    await registrarAtividade({ tipo: "nota", uid: me.uid, name: me.name, livroId: livro.id, livroTitulo: livro.titulo });
    if (outraJaLeu) confetti();
  });
  card.appendChild(btn);
  return card;
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
