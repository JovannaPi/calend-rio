import { onAuth, getCurrentUser, atualizarPerfil } from "../core/auth.js";
import {
  listenConfig,
  updateConfig,
  listenLivros,
  listarCapitulosUmaVez,
  listenPremiacao,
  restaurarLivro,
  salvarCapitulo,
  salvarPremiacao,
  listarUsuarios,
  criarEvento,
} from "../core/db.js";
import { enviarFoto } from "../core/upload.js";
import { el } from "../core/util.js";

const content = document.getElementById("configContent");
let config = {};
let livros = [];
let started = false;

function atualizarHeader() {
  const nameEl = document.getElementById("calendarName");
  const subtitleEl = document.getElementById("headerSubtitle");
  if (nameEl) nameEl.textContent = config.nomeclube || "Meu Calendário";
  if (subtitleEl) {
    subtitleEl.textContent = config.citacaoFavorita
      ? `"${config.citacaoFavorita}"`
      : "provas, atividades, leituras e trabalhos, num só lugar";
  }
}

function cardMeuPerfil() {
  const me = getCurrentUser();
  const card = el("div", "panel-card");
  card.appendChild(el("h2", null, "Meu perfil"));

  const fotoPreview = document.createElement("img");
  fotoPreview.className = "profile-preview";
  fotoPreview.src = me.fotoUrl || "";
  fotoPreview.classList.toggle("hidden", !me.fotoUrl);
  card.appendChild(fotoPreview);

  card.appendChild(el("label", null, "Nome"));
  const nomeInput = document.createElement("input");
  nomeInput.type = "text";
  nomeInput.value = me.name || "";
  card.appendChild(nomeInput);

  const uploadBtn = el("button", "status-chip", "Enviar uma foto do dispositivo");
  uploadBtn.type = "button";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "hidden";
  let novaFotoUrl = me.fotoUrl || "";
  uploadBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    uploadBtn.textContent = "Enviando...";
    try {
      novaFotoUrl = await enviarFoto(file, { folder: `calend-rio/perfil/${me.uid}`, publicId: "foto", overwrite: true });
      fotoPreview.src = novaFotoUrl;
      fotoPreview.classList.remove("hidden");
    } catch (err) {
      alert(err.message || "Falha ao enviar foto.");
    } finally {
      uploadBtn.textContent = "Enviar uma foto do dispositivo";
    }
  });
  card.appendChild(uploadBtn);
  card.appendChild(fileInput);

  card.appendChild(el("label", null, "Sua cor (aparece nas etiquetas de quem fez o quê)"));
  const corInput = document.createElement("input");
  corInput.type = "color";
  corInput.value = me.cor || "#e07a5f";
  card.appendChild(corInput);

  const saveBtn = el("button", "primary-btn full-width", "Salvar perfil");
  saveBtn.type = "button";
  saveBtn.addEventListener("click", async () => {
    const nome = nomeInput.value.trim();
    if (!nome) return;
    await atualizarPerfil({ name: nome, fotoUrl: novaFotoUrl, cor: corInput.value });
    saveBtn.textContent = "✓ Salvo!";
    setTimeout(() => (saveBtn.textContent = "Salvar perfil"), 1800);
  });
  card.appendChild(saveBtn);

  return card;
}

function render() {
  atualizarHeader();
  content.innerHTML = "";
  content.appendChild(cardMeuPerfil());

  const card = el("div", "panel-card");
  card.appendChild(el("h2", null, "Personalização"));

  card.appendChild(el("label", null, "Nome do clube"));
  const nomeInput = document.createElement("input");
  nomeInput.type = "text";
  nomeInput.value = config.nomeclube || "";
  nomeInput.placeholder = "Meu Calendário";
  card.appendChild(nomeInput);

  card.appendChild(el("label", null, "Citação favorita (aparece no topo)"));
  const citacaoInput = document.createElement("textarea");
  citacaoInput.rows = 2;
  citacaoInput.value = config.citacaoFavorita || "";
  card.appendChild(citacaoInput);

  card.appendChild(el("label", null, "Foto (URL, aparece no topo)"));
  const fotoInput = document.createElement("input");
  fotoInput.type = "url";
  fotoInput.value = config.fotoUrl || "";
  card.appendChild(fotoInput);

  const uploadBtn = el("button", "status-chip", "Ou enviar uma foto do dispositivo");
  uploadBtn.type = "button";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "hidden";
  uploadBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    uploadBtn.textContent = "Enviando...";
    try {
      fotoInput.value = await enviarFoto(file, { folder: "calend-rio/config", publicId: "foto-topo", overwrite: true });
    } catch (err) {
      alert(err.message || "Falha ao enviar foto.");
    } finally {
      uploadBtn.textContent = "Ou enviar uma foto do dispositivo";
    }
  });
  card.appendChild(uploadBtn);
  card.appendChild(fileInput);

  card.appendChild(el("label", null, `Meta de livros no ano (${new Date().getFullYear()})`));
  const metaInput = document.createElement("input");
  metaInput.type = "number";
  metaInput.min = "0";
  metaInput.value = config.metaAnual || "";
  card.appendChild(metaInput);
  const concluidos = livros.filter((l) => l.status === "concluido").length;
  if (config.metaAnual > 0) {
    card.appendChild(el("p", "empty-hint", `${concluidos} de ${config.metaAnual} lidos até agora.`));
  }

  const saveBtn = el("button", "primary-btn full-width", "Salvar configurações");
  saveBtn.type = "button";
  saveBtn.addEventListener("click", async () => {
    await updateConfig({
      nomeclube: nomeInput.value.trim(),
      citacaoFavorita: citacaoInput.value.trim(),
      fotoUrl: fotoInput.value.trim(),
      metaAnual: Number(metaInput.value) || 0,
    });
    saveBtn.textContent = "✓ Salvo!";
    setTimeout(() => (saveBtn.textContent = "Salvar configurações"), 1800);
  });
  card.appendChild(saveBtn);
  content.appendChild(card);

  const backupCard = el("div", "panel-card");
  backupCard.appendChild(el("h2", null, "Backup"));
  backupCard.appendChild(
    el("p", "empty-hint", "Baixa um arquivo com todos os livros, diários, teorias e premiações.")
  );
  const backupBtn = el("button", "status-chip", "Baixar backup (.json)");
  backupBtn.type = "button";
  backupBtn.addEventListener("click", async () => {
    backupBtn.textContent = "Gerando backup...";
    try {
      const livrosCompletos = await Promise.all(
        livros.map(async (l) => {
          const capitulos = await listarCapitulosUmaVez(l.id);
          const premiacao = await new Promise((resolve) => {
            const unsub = listenPremiacao(l.id, (p) => {
              unsub();
              resolve(p);
            });
          });
          return { ...l, capitulos, premiacao };
        })
      );
      const backup = { exportadoEm: new Date().toISOString(), config, livros: livrosCompletos };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calend-rio-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      backupBtn.textContent = "Baixar backup (.json)";
    }
  });
  backupCard.appendChild(backupBtn);

  const restoreBtn = el("button", "status-chip", "Restaurar backup (.json)");
  restoreBtn.type = "button";
  restoreBtn.style.marginLeft = "0.5rem";
  const restoreFileInput = document.createElement("input");
  restoreFileInput.type = "file";
  restoreFileInput.accept = "application/json,.json";
  restoreFileInput.className = "hidden";
  restoreBtn.addEventListener("click", () => restoreFileInput.click());
  restoreFileInput.addEventListener("change", async () => {
    const file = restoreFileInput.files?.[0];
    restoreFileInput.value = "";
    if (!file) return;
    if (
      !confirm(
        "Isso vai trazer de volta os livros, diários e premiações desse arquivo (sobrescrevendo os que tiverem o mesmo id). Continuar?"
      )
    )
      return;
    restoreBtn.textContent = "Restaurando...";
    try {
      const texto = await file.text();
      const backup = JSON.parse(texto);
      if (backup.config) await updateConfig(backup.config);
      for (const livro of backup.livros || []) {
        const { id, capitulos, premiacao, ...dados } = livro;
        if (!id) continue;
        await restaurarLivro(id, dados);
        for (const cap of capitulos || []) {
          await salvarCapitulo(id, cap.numero, cap);
        }
        if (premiacao && Object.keys(premiacao).length > 0) {
          await salvarPremiacao(id, premiacao);
        }
      }
      alert("Backup restaurado!");
    } catch (err) {
      alert("Não foi possível restaurar esse arquivo. Confira se é um backup válido do Calend.rio.");
    } finally {
      restoreBtn.textContent = "Restaurar backup (.json)";
    }
  });
  backupCard.appendChild(restoreBtn);
  backupCard.appendChild(restoreFileInput);
  content.appendChild(backupCard);

  content.appendChild(cardImportarClubeAntigo());
  content.appendChild(cardImportarDatasAcademicas());
}

// ── Importar datas acadêmicas (provas/trabalhos/entregas) em lote ───────
const DATAS_ACADEMICAS = [
  // PCP II (TK0267)
  { date: "2026-09-03", title: "Prazo p/ escolher tema da apresentação (Sigaa)", type: "trabalho", theme: "PCP II (TK0267)", color: "#e07a5f" },
  { date: "2026-11-17", title: "Apresentação: Teoria das Restrições", type: "trabalho", theme: "PCP II (TK0267)", color: "#e07a5f" },
  { date: "2026-12-08", title: "2ª Chamada (individual, toda matéria)", type: "prova", theme: "PCP II (TK0267)", color: "#e07a5f" },
  { date: "2026-12-15", title: "Avaliação Final (AF)", type: "prova", theme: "PCP II (TK0267)", color: "#e07a5f" },

  // Sistema de Informação Gerencial (TK0231)
  { date: "2026-09-02", title: "Apresentação projeto SIG (MS Access)", type: "trabalho", theme: "Sistema de Informação Gerencial (TK0231)", color: "#4d8cff" },
  { date: "2026-09-09", title: "Apresentação projeto SIG (MS Access) — cont.", type: "trabalho", theme: "Sistema de Informação Gerencial (TK0231)", color: "#4d8cff" },
  { date: "2026-10-14", title: "Apresentação projeto BI (Power BI)", type: "trabalho", theme: "Sistema de Informação Gerencial (TK0231)", color: "#4d8cff" },
  { date: "2026-10-19", title: "Apresentação projeto BI (Power BI) — cont.", type: "trabalho", theme: "Sistema de Informação Gerencial (TK0231)", color: "#4d8cff" },
  { date: "2026-11-18", title: "Apresentação projeto ML (Orange Canvas)", type: "trabalho", theme: "Sistema de Informação Gerencial (TK0231)", color: "#4d8cff" },
  { date: "2026-11-23", title: "Apresentação projeto ML (Orange Canvas) — cont.", type: "trabalho", theme: "Sistema de Informação Gerencial (TK0231)", color: "#4d8cff" },
  { date: "2026-11-30", title: "Entrega do artigo (AP2)", type: "trabalho", theme: "Sistema de Informação Gerencial (TK0231)", color: "#4d8cff" },
  { date: "2026-12-14", title: "Avaliação Final (AF)", type: "prova", theme: "Sistema de Informação Gerencial (TK0231)", color: "#4d8cff" },

  // Pesquisa Operacional II
  { date: "2026-09-21", title: "AP1 — 1ª chamada", type: "prova", theme: "Pesquisa Operacional II", color: "#06b6a4" },
  { date: "2026-09-23", title: "AP1 — 2ª chamada", type: "prova", theme: "Pesquisa Operacional II", color: "#06b6a4" },
  { date: "2026-11-25", title: "Apresentação dos projetos", type: "trabalho", theme: "Pesquisa Operacional II", color: "#06b6a4" },
  { date: "2026-11-30", title: "Apresentação dos projetos", type: "trabalho", theme: "Pesquisa Operacional II", color: "#06b6a4" },
  { date: "2026-12-02", title: "Apresentação dos projetos", type: "trabalho", theme: "Pesquisa Operacional II", color: "#06b6a4" },
  { date: "2026-12-07", title: "Apresentação dos projetos", type: "trabalho", theme: "Pesquisa Operacional II", color: "#06b6a4" },
  { date: "2026-12-09", title: "Apresentação dos projetos", type: "trabalho", theme: "Pesquisa Operacional II", color: "#06b6a4" },
  { date: "2026-12-14", title: "Reserva (reposição/encerramento)", type: "atividade", theme: "Pesquisa Operacional II", color: "#06b6a4" },

  // Métodos e Sistemas de Trabalho (TK0266)
  { date: "2026-09-08", title: "Entrega/apresentação de propostas comerciais e alocação de projetos", type: "trabalho", theme: "Métodos e Sistemas de Trabalho (TK0266)", color: "#a78bfa" },
  { date: "2026-11-19", title: "1ª Avaliação da disciplina", type: "prova", theme: "Métodos e Sistemas de Trabalho (TK0266)", color: "#a78bfa" },
  { date: "2026-11-24", title: "2ª chamada da 1ª Avaliação", type: "prova", theme: "Métodos e Sistemas de Trabalho (TK0266)", color: "#a78bfa" },
  { date: "2026-12-01", title: "2ª Avaliação: apresentação dos projetos (sala de aula)", type: "trabalho", theme: "Métodos e Sistemas de Trabalho (TK0266)", color: "#a78bfa" },
  { date: "2026-12-03", title: "2ª Avaliação: apresentação dos projetos (Hospital Universitário)", type: "trabalho", theme: "Métodos e Sistemas de Trabalho (TK0266)", color: "#a78bfa" },
  { date: "2026-12-08", title: "Rodada de apresentação final dos projetos", type: "trabalho", theme: "Métodos e Sistemas de Trabalho (TK0266)", color: "#a78bfa" },
  { date: "2026-12-15", title: "Avaliação Final (AF)", type: "prova", theme: "Métodos e Sistemas de Trabalho (TK0266)", color: "#a78bfa" },
];

function cardImportarDatasAcademicas() {
  const card = el("div", "panel-card");
  card.appendChild(el("h2", null, "Importar datas acadêmicas"));
  card.appendChild(
    el(
      "p",
      "empty-hint",
      "Provas, trabalhos e entregas do semestre, uma cor por disciplina. Desmarque o que não quiser trazer e clique em importar."
    )
  );

  const lista = el("div", "import-datas-lista");
  const checks = DATAS_ACADEMICAS.map((ev) => {
    const linha = el("label", "import-data-linha");
    linha.style.borderLeftColor = ev.color;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    const d = new Date(ev.date + "T00:00:00");
    const dataFmt = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    linha.appendChild(checkbox);
    linha.appendChild(el("span", null, `${dataFmt} — ${ev.title} (${ev.theme})`));
    lista.appendChild(linha);
    return checkbox;
  });
  card.appendChild(lista);

  const importBtn = el("button", "primary-btn full-width", "Importar selecionadas");
  importBtn.type = "button";
  importBtn.addEventListener("click", async () => {
    const selecionadas = DATAS_ACADEMICAS.filter((_, i) => checks[i].checked);
    if (selecionadas.length === 0) return;
    importBtn.disabled = true;
    importBtn.textContent = "Importando...";
    try {
      for (const ev of selecionadas) {
        await criarEvento({ ...ev, updatedAt: Date.now() });
      }
      importBtn.textContent = `✓ ${selecionadas.length} datas importadas!`;
      checks.forEach((c) => (c.disabled = true));
    } catch (err) {
      console.error("Falha ao importar datas acadêmicas:", err);
      alert("Não consegui importar (" + (err?.code || err?.message || "erro desconhecido") + "). Tente de novo.");
      importBtn.disabled = false;
      importBtn.textContent = "Importar selecionadas";
    }
  });
  card.appendChild(importBtn);

  return card;
}

// ── Importar o backup do Clube do Livro antigo (formato diferente) ──────
function cardImportarClubeAntigo() {
  const card = el("div", "panel-card");
  card.appendChild(el("h2", null, "Importar do Clube do Livro antigo"));
  card.appendChild(
    el(
      "p",
      "empty-hint",
      "Aquele .json que você já tinha exportado do site antigo. O formato é diferente do backup daqui, então é preciso dizer quem é quem antes de importar."
    )
  );

  const jovannaLabel = el("label", null, "Quem é \"jovanna\" nesse arquivo?");
  const jovannaSelect = document.createElement("select");
  const leticiaLabel = el("label", null, "Quem é \"leticia\" nesse arquivo?");
  const leticiaSelect = document.createElement("select");

  card.appendChild(jovannaLabel);
  card.appendChild(jovannaSelect);
  card.appendChild(leticiaLabel);
  card.appendChild(leticiaSelect);

  listarUsuarios().then((usuarios) => {
    [jovannaSelect, leticiaSelect].forEach((select) => {
      select.innerHTML = "";
      usuarios.forEach((u) => {
        const opt = document.createElement("option");
        opt.value = u.uid;
        opt.textContent = u.name || u.email || u.uid;
        select.appendChild(opt);
      });
    });
    if (usuarios[1]) leticiaSelect.value = usuarios[1].uid;
  });

  const importBtn = el("button", "primary-btn full-width", "Importar arquivo antigo");
  importBtn.type = "button";
  const importFileInput = document.createElement("input");
  importFileInput.type = "file";
  importFileInput.accept = "application/json,.json";
  importFileInput.className = "hidden";
  importBtn.addEventListener("click", () => importFileInput.click());

  importFileInput.addEventListener("change", async () => {
    const file = importFileInput.files?.[0];
    importFileInput.value = "";
    if (!file) return;
    const uidJovanna = jovannaSelect.value;
    const uidLeticia = leticiaSelect.value;
    if (!uidJovanna || !uidLeticia) {
      alert("Escolha as duas pessoas antes de importar.");
      return;
    }
    if (
      !confirm(
        "Isso vai trazer os livros, diários e teorias do arquivo antigo pra cá (sobrescrevendo livros com o mesmo id). Continuar?"
      )
    )
      return;

    importBtn.textContent = "Importando...";
    try {
      const texto = await file.text();
      const antigo = JSON.parse(texto);
      const nomeJovanna = jovannaSelect.selectedOptions[0].textContent;
      const nomeLeticia = leticiaSelect.selectedOptions[0].textContent;
      const uidPorRole = { jovanna: uidJovanna, leticia: uidLeticia };
      const nomePorRole = { jovanna: nomeJovanna, leticia: nomeLeticia };

      if (antigo.config) {
        const livroAtualPorUid = { ...(config.livroAtualPorUid || {}) };
        if (antigo.config.livroAtualIdJovanna) livroAtualPorUid[uidJovanna] = antigo.config.livroAtualIdJovanna;
        if (antigo.config.livroAtualIdLeticia) livroAtualPorUid[uidLeticia] = antigo.config.livroAtualIdLeticia;
        await updateConfig({
          nomeclube: antigo.config.nomeclube || config.nomeclube || "",
          citacaoFavorita: antigo.config.citacaoFavorita || config.citacaoFavorita || "",
          fotoUrl: antigo.config.fotoUrl || config.fotoUrl || "",
          metaAnual: antigo.config.metaAnual || config.metaAnual || 0,
          livroAtualPorUid,
        });
      }

      for (const livroAntigo of antigo.livros || []) {
        if (!livroAntigo.id) continue;

        const cartas = {};
        if (livroAntigo.cartaJovanna) {
          cartas[uidJovanna] = {
            texto: livroAntigo.cartaJovanna,
            enviada: !!livroAntigo.cartaJovannaEnviada,
            name: nomeJovanna,
          };
        }
        if (livroAntigo.cartaLeticia) {
          cartas[uidLeticia] = {
            texto: livroAntigo.cartaLeticia,
            enviada: !!livroAntigo.cartaLeticiaEnviada,
            name: nomeLeticia,
          };
        }

        await restaurarLivro(livroAntigo.id, {
          titulo: livroAntigo.titulo || "",
          autor: livroAntigo.autor || "",
          capaUrl: livroAntigo.capaUrl || "",
          sinopse: livroAntigo.sinopse || "",
          genero: livroAntigo.genero || "",
          totalCapitulos: livroAntigo.totalCapitulos || 0,
          motivoEscolha: livroAntigo.motivoEscolha || "",
          status: livroAntigo.status || "planejado",
          sugeridoPorUid: uidPorRole[livroAntigo.sugeridoPor] || "",
          sugeridoPorName: nomePorRole[livroAntigo.sugeridoPor] || "",
          ...(Object.keys(cartas).length > 0 ? { cartas } : {}),
        });

        for (const capAntigo of livroAntigo.capitulos || []) {
          if (!capAntigo.numero) continue;
          const entradas = {};
          for (const role of ["jovanna", "leticia"]) {
            const uid = uidPorRole[role];
            const entrada = {
              teoria: capAntigo[`teoria_${role}`] || "",
              teoriaEnviada: !!capAntigo[`${role}_enviou`],
              impressao: capAntigo[`impressao_${role}`] || "",
              frase: capAntigo[`frase_${role}`] || "",
              emocoes: capAntigo[`emocoes_${role}`] || [],
              name: nomePorRole[role],
            };
            const temConteudo =
              entrada.teoria || entrada.impressao || entrada.frase || entrada.emocoes.length > 0;
            if (temConteudo) entradas[uid] = entrada;
          }
          if (Object.keys(entradas).length > 0) {
            await salvarCapitulo(livroAntigo.id, capAntigo.numero, { entradas });
          }
        }
      }

      alert(
        "Importado! Premiações do site antigo não foram trazidas (o formato delas não veio preenchido no arquivo pra eu confirmar a estrutura) — se tiver alguma, me avisa que eu ajusto."
      );
    } catch (err) {
      console.error("Falha ao importar clube antigo:", err);
      alert("Não consegui importar esse arquivo. Confira se é o .json certo.");
    } finally {
      importBtn.textContent = "Importar arquivo antigo";
    }
  });

  card.appendChild(importBtn);
  card.appendChild(importFileInput);
  return card;
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
