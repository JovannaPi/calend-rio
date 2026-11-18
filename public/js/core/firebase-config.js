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

// "Forçar" o long polling resolvia um problema antigo de conexão, mas deixa
// TODA conexão mais lenta pra sempre, pra todo mundo — inclusive a primeira
// leitura que trava a tela de carregamento ao abrir o app. Auto-detect
// tenta o jeito rápido primeiro e só cai pro modo lento se precisar mesmo,
// então deve abrir bem mais rápido na maioria das vezes.
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
export const auth = getAuth(app);
