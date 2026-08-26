import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDtwltPWQmwvcAMG9kU5t46a7PId4GgqbE",
  authDomain: "calendario-3b725.firebaseapp.com",
  projectId: "calendario-3b725",
  storageBucket: "calendario-3b725.firebasestorage.app",
  messagingSenderId: "492897906274",
  appId: "1:492897906274:web:ab44cf81ac1098593d2b3b",
};

const app = initializeApp(firebaseConfig);

// Algumas redes/navegadores (bloqueador de anúncios, navegador embutido do
// WhatsApp/Instagram, rede de operadora restritiva) atrapalham a conexão de
// tempo real "normal" do Firestore e geram um monte de erro 400 no canal
// dele. auto-detect faz o Firestore perceber isso sozinho e trocar pra um
// jeito de conexão mais compatível, sem precisar forçar sempre (o que
// deixaria mais lento em redes que não têm esse problema).
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
export const auth = getAuth(app);
