import { onAuth, getCurrentUser } from "./auth.js";
import { listarTodosCapitulos } from "./db-livros.js";

const POSICOES = [
  "top:8%; left:6%; transform:rotate(-6deg);",
  "bottom:14%; right:8%; transform:rotate(4deg);",
  "top:32%; right:10%; transform:rotate(8deg);",
  "bottom:30%; left:10%; transform:rotate(-3deg);",
  "top:18%; left:32%; transform:rotate(2deg);",
  "bottom:20%; right:30%; transform:rotate(-5deg);",
];

let started = false;

async function montar() {
  const me = getCurrentUser();
  try {
    const capitulos = await listarTodosCapitulos();
    const frases = [];
    capitulos.forEach((cap) => {
      const minha = cap.entradas?.[me.uid];
      if (minha?.frase) frases.push(minha.frase);
    });
    for (let i = frases.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [frases[i], frases[j]] = [frases[j], frases[i]];
    }
    if (frases.length === 0) return;

    const container = document.createElement("div");
    container.className = "fundo-frases";
    frases.slice(0, 6).forEach((frase, i) => {
      const span = document.createElement("div");
      span.className = "fundo-frase";
      span.style.cssText = POSICOES[i % POSICOES.length];
      span.textContent = `"${frase}"`;
      container.appendChild(span);
    });
    document.body.appendChild(container);
  } catch {
    // decorativo — se falhar, o app segue normal sem o fundo
  }
}

onAuth((user) => {
  if (!user || started) return;
  started = true;
  montar();
});
