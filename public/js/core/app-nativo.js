// Comportamento específico de quando o Calend.rio roda como app (Android),
// empacotado com o Capacitor. No navegador normal, window.Capacitor não
// existe, então tudo aqui simplesmente não faz nada — o mesmo código serve
// pros dois casos sem precisar de duas versões do site.
import { onAuth } from "./auth.js";
import { BiometricAuth } from "../vendor/biometric-auth.bundle.js";

const Capacitor = window.Capacitor;
const nativo = !!Capacitor?.isNativePlatform?.();

if (nativo) {
  const { App, SplashScreen, LocalNotifications } = Capacitor.Plugins;

  // Trava por digital/rosto ao entrar em Diário ou Secreto — são as abas
  // pessoais, que cada uma escreve sem a outra ver antes da hora. Se o
  // aparelho não tem biometria configurada, entra direto sem travar (nunca
  // bloqueia quem não tem como desbloquear).
  const ABAS_PRIVADAS = ["diario", "secreto"];
  const desbloqueadasNestaSessao = new Set();
  let biometriaDisponivel = false;

  BiometricAuth.checkBiometry()
    .then((r) => (biometriaDisponivel = r.isAvailable))
    .catch(() => (biometriaDisponivel = false));

  document.addEventListener(
    "click",
    async (e) => {
      const btn = e.target.closest('.sub-tabs .tab-btn');
      if (!btn) return;
      const tab = btn.getAttribute("data-tab");
      if (!ABAS_PRIVADAS.includes(tab)) return;
      if (!biometriaDisponivel || desbloqueadasNestaSessao.has(tab)) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      try {
        await BiometricAuth.authenticate({
          reason: tab === "diario" ? "Confirme sua digital pra abrir o Diário" : "Confirme sua digital pra abrir o Secreto",
          cancelTitle: "Cancelar",
          allowDeviceCredentials: true,
        });
        desbloqueadasNestaSessao.add(tab);
        btn.click();
      } catch {
        // Cancelou ou falhou a autenticação — fica onde estava, sem entrar.
      }
    },
    true
  );

  // Esconde a splash assim que a primeira tela estiver pronta (em vez de
  // ficar um tempo fixo, que ou é curto demais numa conexão ruim, ou
  // desperdiça tempo numa conexão boa).
  window.addEventListener("load", () => {
    setTimeout(() => SplashScreen?.hide().catch(() => {}), 300);
  });

  // Botão físico/gesto de voltar do Android: sai de um modal aberto, depois
  // volta pra aba inicial, e só fecha o app se já estiver nela — em vez do
  // padrão (fechar o app de primeira, ou navegar a página, que não faz
  // sentido aqui já que é tudo uma página só).
  App?.addListener("backButton", () => {
    const modalAberto = document.querySelector(".modal:not(.hidden)");
    if (modalAberto) {
      modalAberto.classList.add("hidden");
      return;
    }
    const agendaBtn = document.querySelector('.main-tab-btn[data-group="agenda"]');
    const calendarioBtn = document.querySelector('.sub-tabs .tab-btn[data-tab="calendario"]');
    const jaNaInicial = agendaBtn?.classList.contains("active") && calendarioBtn?.classList.contains("active");
    if (jaNaInicial) {
      App.exitApp();
    } else {
      agendaBtn?.click();
      calendarioBtn?.click();
    }
  });

  // Notificações locais de prova/atividade/trabalho perto da data. Não é
  // push de verdade (isso exigiria um servidor do Firebase no plano pago) —
  // é checado toda vez que o app é aberto ou volta pro primeiro plano, e
  // avisa sobre o que está pra acontecer nas próximas 24h.
  const JA_AVISADOS_KEY = "cr_eventos_avisados";
  function jaAvisados() {
    try {
      return new Set(JSON.parse(localStorage.getItem(JA_AVISADOS_KEY) || "[]"));
    } catch {
      return new Set();
    }
  }
  function marcarAvisado(id) {
    const atuais = jaAvisados();
    atuais.add(id);
    try {
      localStorage.setItem(JA_AVISADOS_KEY, JSON.stringify([...atuais]));
    } catch {
      // sem persistência disponível, sem problema — só vai avisar de novo
    }
  }

  async function avisarEventosProximos() {
    if (!LocalNotifications) return;
    const permissao = await LocalNotifications.checkPermissions();
    if (permissao.display !== "granted") {
      const pedido = await LocalNotifications.requestPermissions();
      if (pedido.display !== "granted") return;
    }

    const { collection, getDocs } = await import(
      "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"
    );
    const { db } = await import("./firebase-config.js");
    const snap = await getDocs(collection(db, "events"));
    const eventos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const hojeStr = hoje.toISOString().split("T")[0];
    const amanhaStr = amanha.toISOString().split("T")[0];

    const avisados = jaAvisados();
    const proximos = eventos.filter(
      (e) => (e.date === hojeStr || e.date === amanhaStr) && !avisados.has(e.id)
    );
    if (proximos.length === 0) return;

    await LocalNotifications.schedule({
      notifications: proximos.map((e, i) => ({
        id: Date.now() % 1000000 + i,
        title: e.date === hojeStr ? "É hoje!" : "É amanhã",
        body: e.time ? `${e.title} às ${e.time}` : e.title,
        schedule: { at: new Date(Date.now() + 1000) },
      })),
    });
    proximos.forEach((e) => marcarAvisado(e.id));
  }

  onAuth((user) => {
    if (!user) return;
    avisarEventosProximos();
  });
  App?.addListener("resume", () => avisarEventosProximos());
}
