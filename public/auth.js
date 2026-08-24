import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let currentUser = null; // { uid, name, email }
const listeners = [];

export function onAuth(fn) {
  listeners.push(fn);
  fn(currentUser);
}

function notify() {
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

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    notify();
    return;
  }
  const snap = await getDoc(doc(db, "users", user.uid));
  const profile = snap.exists() ? snap.data() : { name: user.displayName || "Sem nome" };
  currentUser = { uid: user.uid, email: user.email, ...profile };
  notify();

  onSnapshot(doc(db, "users", user.uid), (docSnap) => {
    const data = docSnap.data();
    if (!data) return;
    currentUser = { uid: user.uid, email: user.email, ...data };
    notify();
  });
});
