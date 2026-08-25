import { onAuth } from "./auth.js";
import { listenUsuarios } from "./db.js";

// Lembra em qual capítulo cada pessoa parou, por livro, no localStorage.
export function capituloLembrado(livroId, uid) {
  if (!livroId) return 1;
  const salvo = localStorage.getItem(`cr_capitulo_${livroId}_${uid}`);
  return salvo ? Number(salvo) : 1;
}

export function lembrarCapitulo(livroId, uid, numero) {
  if (!livroId) return;
  localStorage.setItem(`cr_capitulo_${livroId}_${uid}`, String(numero));
}

// Confete simples, sem dependências externas.
export function confetti() {
  const cores = ["#e07a5f", "#81b29a", "#ef476f", "#4d8cff", "#06b6a4", "#f2cc8f"];
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:200;overflow:hidden;";
  document.body.appendChild(container);

  for (let i = 0; i < 80; i++) {
    const piece = document.createElement("div");
    const size = 6 + Math.random() * 6;
    piece.style.cssText = `
      position:absolute;top:-20px;left:${Math.random() * 100}%;
      width:${size}px;height:${size * 0.6}px;
      background:${cores[Math.floor(Math.random() * cores.length)]};
      opacity:${0.7 + Math.random() * 0.3};
      transform:rotate(${Math.random() * 360}deg);
      border-radius:2px;
    `;
    const duration = 1800 + Math.random() * 1200;
    const drift = (Math.random() - 0.5) * 200;
    piece.animate(
      [
        { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${drift}px, 100vh) rotate(720deg)`, opacity: 0 },
      ],
      { duration, easing: "cubic-bezier(0.2, 0.6, 0.4, 1)" }
    );
    container.appendChild(piece);
    setTimeout(() => piece.remove(), duration);
  }
  setTimeout(() => container.remove(), 3200);
}

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Cor estável por pessoa (mesmo uid sempre cai na mesma cor, em qualquer
// tela/sessão) — pra dar pra distinguir "isso é da Jovanna" x "isso é da
// Letícia" em Rolês, Presentes, etc. sem precisar hardcodar nomes.
let coresPorUid = {};
onAuth((user) => {
  if (!user) return;
  listenUsuarios((usuarios) => {
    const novo = {};
    usuarios.forEach((u) => {
      if (u.cor) novo[u.uid] = u.cor;
    });
    coresPorUid = novo;
  });
});

export function corPessoa(uid) {
  if (!uid) return "var(--muted)";
  if (coresPorUid[uid]) return coresPorUid[uid];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  return hash % 2 === 0 ? "var(--accent)" : "var(--accent-2)";
}

// Roleta visual bonitinha (capa/foto + título), compartilhada entre
// Biblioteca e Rolês. Desacelera com o tempo, tipo uma roleta de verdade.
export function girarRoleta({ itens, container, obterTitulo, obterCapa, aoParar, duracaoMs = 2200 }) {
  if (!itens || itens.length === 0) return;
  container.classList.remove("landed");
  container.classList.add("spinning-roulette");
  const inicio = Date.now();
  let sorteado = null;

  function desenharCard(item) {
    container.innerHTML = "";
    const card = document.createElement("div");
    card.className = "roulette-card-preview";
    const capa = obterCapa ? obterCapa(item) : null;
    if (capa) {
      const img = document.createElement("img");
      img.src = capa;
      img.alt = "";
      card.appendChild(img);
    }
    const titulo = document.createElement("p");
    titulo.className = "event-title";
    titulo.textContent = obterTitulo(item);
    card.appendChild(titulo);
    container.appendChild(card);
  }

  function passo() {
    const decorrido = Date.now() - inicio;
    if (decorrido >= duracaoMs) {
      container.classList.remove("spinning-roulette");
      container.classList.add("landed");
      const sairBtn = document.createElement("button");
      sairBtn.type = "button";
      sairBtn.className = "close-btn roulette-close-btn";
      sairBtn.textContent = "×";
      sairBtn.title = "Sair da roleta";
      sairBtn.addEventListener("click", () => {
        container.innerHTML = "";
        container.classList.remove("landed");
      });
      container.appendChild(sairBtn);
      aoParar(sorteado);
      return;
    }
    sorteado = itens[Math.floor(Math.random() * itens.length)];
    desenharCard(sorteado);
    const progresso = decorrido / duracaoMs;
    const atraso = 70 + progresso * progresso * 260;
    setTimeout(passo, atraso);
  }
  passo();
}

export function personTag(nome, uid) {
  const cor = corPessoa(uid);
  const span = document.createElement("span");
  span.className = "person-tag";
  span.style.color = cor;
  span.style.setProperty("--dot-color", cor);
  span.textContent = nome ? nome.split(" ")[0] : "Alguém";
  return span;
}
