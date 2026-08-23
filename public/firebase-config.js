import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDtwltPWQmwvcAMG9kU5t46a7PId4GgqbE",
  authDomain: "calendario-3b725.firebaseapp.com",
  projectId: "calendario-3b725",
  storageBucket: "calendario-3b725.firebasestorage.app",
  messagingSenderId: "492897906274",
  appId: "1:492897906274:web:ab44cf81ac1098593d2b3b",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
