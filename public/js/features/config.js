import { onAuth } from "../core/auth.js";
import {
  listenConfig,
  updateConfig,
  listenLivros,
  listarCapitulosUmaVez,
  listenPremiacao,
  restaurarLivro,
  salvarCapitulo,
  salvarPremiacao,
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

function render() {
  atualizarHeader();
  content.innerHTML = "";

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
