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
  const cores = ["#7c5cff", "#ff6fa5", "#ef476f", "#4d8cff", "#06b6a4", "#a78bfa"];
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
