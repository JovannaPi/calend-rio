import { onAuth, getCurrentUser } from "./auth.js";
import { listenConfig, listenLivros, listenPremiacao, salvarPremiacao } from "./db-livros.js";
import { el } from "./util.js";

const CATEGORIAS = [
  { key: "melhorPersonagem", label: "Melhor personagem", placeholder: "Nome do personagem..." },
  { key: "cenaFavorita", label: "Cena favorita", placeholder: "Descreva a cena..." },
  { key: "teoriaMaisLoucas", label: "Teoria mais maluca", placeholder: "Sua teoria mais absurda..." },
  { key: "maiorSurpresa", label: "Maior surpresa", placeholder: "O que te surpreendeu mais?" },
];

const content = document.getElementById("premiacaoContent");
let config = {};
let livros = [];
let unsubPremiacao = null;
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
    content.appendChild(el("p", "empty-hint", "Nenhum livro em leitura."));
    return;
  }

  if (unsubPremiacao) unsubPremiacao();
  unsubPremiacao = listenPremiacao(livro.id, (premiacao) => {
    content.innerHTML = "";
    const header = el("div", "panel-card");
    header.appendChild(el("div", "event-title", livro.titulo));
    header.appendChild(el("div", "empty-hint", "Premiações do livro"));
    content.appendChild(header);

    const valores = {};
    const form = el("div");

    CATEGORIAS.forEach(({ key, label, placeholder }) => {
      const card = el("div", "panel-card");
      card.appendChild(el("label", null, label));
      const textarea = document.createElement("textarea");
      textarea.rows = 2;
      textarea.placeholder = placeholder;
      textarea.value = premiacao[key]?.[me.uid] || "";
      valores[key] = textarea;
      card.appendChild(textarea);

      const respostaOutra = Object.entries(premiacao[key] || {}).find(([uid]) => uid !== me.uid);
      const euRespondi = !!premiacao[key]?.[me.uid];
      if (respostaOutra && euRespondi) {
        const box = el("div", "reveal-box");
        box.appendChild(el("p", "event-meta", "A outra pessoa escolheu:"));
        box.appendChild(el("p", null, respostaOutra[1]));
        card.appendChild(box);
      } else if (respostaOutra && !euRespondi) {
        card.appendChild(el("p", "empty-hint", "A outra pessoa já respondeu — salve a sua pra ver (evita spoiler)."));
      }
      form.appendChild(card);
    });
    content.appendChild(form);

    const saveBtn = el("button", "primary-btn full-width", "Salvar premiações");
    saveBtn.type = "button";
    saveBtn.addEventListener("click", async () => {
      const data = {};
      CATEGORIAS.forEach(({ key }) => {
        data[key] = { ...(premiacao[key] || {}), [me.uid]: valores[key].value };
      });
      await salvarPremiacao(livro.id, data);
      saveBtn.textContent = "✓ Salvo!";
      setTimeout(() => (saveBtn.textContent = "Salvar premiações"), 1800);
    });
    content.appendChild(saveBtn);
  });
}

onAuth((user) => {
  if (!user || started) return;
  started = true;
  listenConfig((c) => {
    config = c;
    render();
  });
  listenLivros((l) => {
    livros = l;
    render();
  });
});
