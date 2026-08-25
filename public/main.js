// Ponto de entrada único do Calend.rio.
//
// Cada módulo abaixo cuida de uma aba/funcionalidade e se conecta sozinho
// ao Firebase assim que alguém faz login (via onAuth, em js/core/auth.js).
// A ordem aqui não importa para o funcionamento — só reflete a ordem das
// abas na tela, pra ficar fácil de achar cada coisa.

import "./js/core/auth-ui.js";

import "./js/features/calendario.js";
import "./js/features/biblioteca.js";
import "./js/features/filmes.js";
import "./js/features/diario.js";
import "./js/features/secreto.js";
import "./js/features/memorias.js";
import "./js/features/roles.js";
import "./js/features/metas.js";
import "./js/features/estatisticas.js";
import "./js/features/premiacoes.js";
import "./js/features/relatorios.js";
import "./js/features/chat.js";
import "./js/features/notificacoes.js";
import "./js/features/config.js";
import "./js/features/datas-especiais.js";
import "./js/features/sino.js";
import "./js/features/fundo-frases.js";

// =========================================================
// CONTROLE DE NAVEGAÇÃO EM DUAS CAMADAS (PRINCIPAL E SUB-ABAS)
// =========================================================

const mainTabBtns = document.querySelectorAll('.main-tab-btn');
const subTabsContainers = document.querySelectorAll('.sub-tabs-container .sub-tabs');
const subTabBtns = document.querySelectorAll('.sub-tabs .tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// 1. Clique nas Abas Principais (Nível 1 - ex: Mídia e Clube)
mainTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Atualiza botão ativo no Nível 1
    mainTabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const group = btn.getAttribute('data-group'); // ex: 'midia'

    // Esconde todos os containers de sub-abas e mostra apenas o do grupo selecionado
    subTabsContainers.forEach(container => {
      container.classList.add('hidden');
      container.classList.remove('active');
    });

    const targetSubNav = document.getElementById(`sub-${group}`);
    if (targetSubNav) {
      targetSubNav.classList.remove('hidden');
      targetSubNav.classList.add('active');

      // Seleciona automaticamente a primeira sub-aba daquele grupo
      const firstSubBtn = targetSubNav.querySelector('.tab-btn');
      if (firstSubBtn) {
        firstSubBtn.click();
      }
    }
  });
});

// 2. Clique nas Sub-abas (Nível 2 - ex: Clube do Livro, Filmes/Séries)
subTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove o ativo de todas as sub-abas do menu atual
    const parentNav = btn.closest('.sub-tabs');
    if (parentNav) {
      parentNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    }
    btn.classList.add('active');

    const tabName = btn.getAttribute('data-tab'); // ex: 'biblioteca'

    // Esconde todos os painéis de conteúdo e exibe o correspondente
    tabPanels.forEach(panel => {
      panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(`tab-${tabName}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }
  });
});
