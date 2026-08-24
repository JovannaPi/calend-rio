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
import "./js/features/sino.js";
import "./js/features/fundo-frases.js";
