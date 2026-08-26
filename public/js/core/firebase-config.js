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

// O auto-detect sozinho não resolveu (ainda dava erro 400 na conexão em
// tempo real), então força sempre o modo mais compatível — um pouco mais
// lento pra quem não precisa disso, mas funciona em redes/navegadores mais
// restritivos (bloqueador de anúncios, navegador embutido do
// WhatsApp/Instagram, rede de operadora).
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
export const auth = getAuth(app);
