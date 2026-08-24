import { onAuth } from "../core/auth.js";
import { listenLivros, listenConfig, listenAtividades } from "../core/db.js";
import { el } from "../core/util.js";

const content = document.getElementById("statsContent");
let livros = [];
let config = {};
let atividades = [];
let started = false;

function calcularSequencia(uid) {
  const dias = new Set(
    atividades
      .filter((a) => a.uid === uid && (a.tipo === "diario" || a.tipo === "secreto"))
      .map((a) => new Date(a.createdAt).toISOString().split("T")[0])
  );
  if (dias.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  if (!dias.has(cursor.toISOString().split("T")[0])) cursor.setDate(cursor.getDate() - 1);
  while (dias.has(cursor.toISOString().split("T")[0])) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function statCard(label, value) {
  const card = el("div", "panel-card stat-card");
  card.appendChild(el("p", "empty-hint", label));
  card.appendChild(el("p", "stat-value", value));
  return card;
}

function barra(nome, qtd, total) {
  const pct = total ? Math.round((qtd / total) * 100) : 0;
  const wrap = el("div", "stat-bar-row");
  const label = el("div", "stat-bar-label");
  label.appendChild(el("span", null, nome));
  label.appendChild(el("span", "empty-hint", `${qtd} (${pct}%)`));
  wrap.appendChild(label);
  const outer = el("div", "progress-outer");
  const inner = el("div", "progress-inner");
  inner.style.width = `${pct}%`;
  outer.appendChild(inner);
  wrap.appendChild(outer);
  return wrap;
}

function render() {
  content.innerHTML = "";
  const concluidos = livros.filter((l) => l.status === "concluido");

  if (concluidos.length === 0) {
    content.appendChild(el("p", "empty-hint", "Concluam o primeiro livro para ver as estatísticas!"));
  }

  const anoAtual = new Date().getFullYear();
  const concluidosNoAno = concluidos.filter((l) => {
    const fins = Object.values(l.leituras || {}).map((x) => x.dataFim).filter(Boolean).sort();
    const fim = fins[fins.length - 1];
    return fim && new Date(fim).getFullYear() === anoAtual;
  }).length;
  const metaAnual = config.metaAnual || 0;

  if (metaAnual > 0) {
    const card = el("div", "panel-card");
    card.appendChild(el("h2", null, `Meta de ${anoAtual}`));
    card.appendChild(barra(`${concluidosNoAno} de ${metaAnual} livros`, concluidosNoAno, metaAnual));
    content.appendChild(card);
  }

  const halDaFama = concluidos
    .map((l) => {
      const notas = Object.values(l.leituras || {}).map((x) => x.nota).filter((n) => n != null);
      const media = notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null;
      return { livro: l, media };
    })
    .filter((x) => x.media != null)
    .sort((a, b) => b.media - a.media)
    .slice(0, 3);

  if (halDaFama.length > 0) {
    const card = el("div", "panel-card");
    card.appendChild(el("h2", null, "Hall da fama"));
    halDaFama.forEach(({ livro, media }, i) => {
      const row = el("div", "event-card");
      row.appendChild(el("div", "event-title", `${i + 1}º ${livro.titulo}`));
      row.appendChild(el("div", "event-meta", `Média ${media.toFixed(1)}`));
      card.appendChild(row);
    });
    content.appendChild(card);
  }

  const nomes = {};
  livros.forEach((l) => {
    Object.entries(l.leituras || {}).forEach(([uid, dados]) => {
      if (dados.name) nomes[uid] = dados.name;
    });
  });
  const uids = Object.keys(nomes);

  if (uids.length > 0) {
    const card = el("div", "panel-card");
    card.appendChild(el("h2", null, "Sequência de leitura"));
    uids.forEach((uid) => {
      const dias = calcularSequencia(uid);
      card.appendChild(statCard(`Sequência de ${nomes[uid].split(" ")[0]}`, `${dias} dia${dias === 1 ? "" : "s"}`));
    });
    content.appendChild(card);
  }

  const generosMap = {};
  concluidos.forEach((l) => {
    if (l.genero) generosMap[l.genero] = (generosMap[l.genero] || 0) + 1;
  });
  const generoFav = Object.entries(generosMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const card2 = el("div", "panel-card");
  card2.appendChild(el("h2", null, "Do casal"));
  card2.appendChild(statCard("Livros lidos juntas", String(concluidos.length)));
  card2.appendChild(statCard("Gênero favorito", generoFav));
  uids.forEach((uid) => {
    const notasUid = concluidos.map((l) => l.leituras?.[uid]?.nota).filter((n) => n != null);
    const media = notasUid.length ? (notasUid.reduce((s, n) => s + n, 0) / notasUid.length).toFixed(1) : "—";
    card2.appendChild(statCard(`Nota média de ${nomes[uid].split(" ")[0]}`, media));
  });
  content.appendChild(card2);

  if (Object.keys(generosMap).length > 0) {
    const card3 = el("div", "panel-card");
    card3.appendChild(el("h2", null, "Gêneros lidos"));
    Object.entries(generosMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([genero, qtd]) => card3.appendChild(barra(genero, qtd, concluidos.length)));
    content.appendChild(card3);
  }

  const sugestoesMap = {};
  livros.forEach((l) => {
    if (l.sugeridoPorName) sugestoesMap[l.sugeridoPorName] = (sugestoesMap[l.sugeridoPorName] || 0) + 1;
  });
  if (Object.keys(sugestoesMap).length > 0) {
    const card4 = el("div", "panel-card");
    card4.appendChild(el("h2", null, "Sugestões"));
    Object.entries(sugestoesMap).forEach(([nome, qtd]) => card4.appendChild(barra(nome, qtd, livros.length)));
    content.appendChild(card4);
  }

  if (concluidos.length > 0) {
    const card5 = el("div", "panel-card");
    card5.appendChild(el("h2", null, "Notas por livro"));
    concluidos.forEach((l) => {
      const row = el("div", "event-card");
      row.appendChild(el("div", "event-title", l.titulo));
      const notasTxt = Object.values(l.leituras || {})
        .filter((x) => x.nota != null)
        .map((x) => `${x.name?.split(" ")[0]}: ${x.nota}`)
        .join(" · ");
      row.appendChild(el("div", "event-meta", notasTxt));
      card5.appendChild(row);
    });
    content.appendChild(card5);
  }
}

onAuth((user) => {
  if (!user || started) return;
  started = true;
  listenLivros((l) => {
    livros = l;
    render();
  });
  listenConfig((c) => {
    config = c;
    render();
  });
  listenAtividades((a) => {
    atividades = a;
    render();
  });
});
