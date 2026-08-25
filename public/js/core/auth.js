import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let currentUser = null; // { uid, name, email }
let authResolved = false; // já sabemos se tem login ou não? (evita o "pisca" pra tela de login)
const listeners = [];

export function onAuth(fn) {
  listeners.push(fn);
  // Só chama de cara se a gente já sabe de verdade se tem alguém logado —
  // antes disso, quem escuta fica esperando (tela de carregamento cuida do resto).
  if (authResolved) fn(currentUser);
}

function notify() {
  authResolved = true;
  listeners.forEach((fn) => fn(currentUser));
}

export function getCurrentUser() {
  return currentUser;
}

export async function signUp(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, "users", cred.user.uid), {
    name,
    email,
    createdAt: Date.now(),
  });
  return cred.user;
}

export async function logIn(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logOut() {
  await signOut(auth);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    notify();
    return;
  }

  // Se o Firestore recusar a leitura (regras de segurança não publicadas, por
  // exemplo), não pode travar aqui pra sempre — a pessoa continua logada no
  // Firebase Auth, só sem o perfil (nome/foto) carregado ainda.
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    const profile = snap.exists() ? snap.data() : { name: user.displayName || "Sem nome" };
    currentUser = { uid: user.uid, email: user.email, ...profile };
  } catch (err) {
    console.error("Não consegui carregar o perfil do Firestore:", err);
    currentUser = { uid: user.uid, email: user.email, name: user.displayName || "Sem nome" };
  }
  notify();

  onSnapshot(
    doc(db, "users", user.uid),
    (docSnap) => {
      const data = docSnap.data();
      if (!data) return;
      currentUser = { uid: user.uid, email: user.email, ...data };
      notify();
    },
    (err) => console.error("Não consegui escutar o perfil no Firestore:", err)
  );
});
