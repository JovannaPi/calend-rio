import { db } from "./firebase-config.js";
import {
  doc,
  collection,
  collectionGroup,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ── Usuários cadastrados (pra telas de importação/atribuição) ───────────
export async function listarUsuarios() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export function listenUsuarios(cb) {
  return onSnapshot(collection(db, "users"), (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))));
}

// ── Config (documento único, compartilhado por todo mundo) ──────────────
export const configRef = () => doc(db, "config", "app");

export function listenConfig(cb) {
  return onSnapshot(configRef(), (snap) => cb(snap.exists() ? snap.data() : {}));
}

export async function updateConfig(data) {
  await setDoc(configRef(), data, { merge: true });
}

// ── Atividades (feed pro sino de notificações) ───────────────────────────
export const atividadesCol = () => collection(db, "atividades");

export function listenAtividades(cb) {
  const q = query(atividadesCol(), orderBy("createdAt", "desc"), limit(30));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function registrarAtividade(data) {
  await addDoc(atividadesCol(), { ...data, createdAt: Date.now() });
}

// ── Livros ────────────────────────────────────────────────────────────
export const livrosCol = () => collection(db, "livros");
export const livroRef = (id) => doc(db, "livros", id);

export function listenLivros(cb) {
  return onSnapshot(livrosCol(), (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function salvarLivro(livro) {
  const ref = await addDoc(livrosCol(), livro);
  return ref.id;
}

export async function atualizarLivro(id, data) {
  await updateDoc(livroRef(id), data);
}

export async function excluirLivro(id) {
  await deleteDoc(livroRef(id));
}

// Restaura um livro a partir de um backup, mantendo o mesmo id (pra bater
// com os capítulos/premiações que também estão sendo restaurados).
export async function restaurarLivro(id, data) {
  await setDoc(livroRef(id), data, { merge: true });
}

// ── Capítulos ─────────────────────────────────────────────────────────
export const capituloRef = (livroId, num) => doc(db, "livros", livroId, "capitulos", String(num));
export const capitulosCol = (livroId) => collection(db, "livros", livroId, "capitulos");

// O segundo argumento do callback diz se essa é a confirmação instantânea
// de uma escrita local (hasPendingWrites), antes de bater no servidor —
// útil pra quem escuta não reconstruir a tela nesse instante (ver
// diario.js/secreto.js), só quando o servidor realmente confirma ou quando
// é outra pessoa mudando o documento.
export function listenCapitulo(livroId, num, cb) {
  return onSnapshot(capituloRef(livroId, num), (snap) => {
    cb(snap.exists() ? snap.data() : { numero: num, entradas: {} }, snap.metadata.hasPendingWrites);
  });
}

export function listenCapitulos(livroId, cb) {
  const q = query(capitulosCol(livroId), orderBy("numero", "asc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => d.data())));
}

export async function salvarCapitulo(livroId, num, data) {
  await setDoc(capituloRef(livroId, num), { numero: num, ...data }, { merge: true });
}

export async function listarCapitulosUmaVez(livroId) {
  const q = query(capitulosCol(livroId), orderBy("numero", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

// ── Comentários (discussão por capítulo) ─────────────────────────────────
export const comentariosCol = (livroId, num) =>
  collection(db, "livros", livroId, "capitulos", String(num), "comentarios");

export async function listarComentarios(livroId, num) {
  const q = query(comentariosCol(livroId, num), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function enviarComentario(livroId, num, data) {
  await addDoc(comentariosCol(livroId, num), { ...data, createdAt: Date.now() });
}

// ── Premiações ────────────────────────────────────────────────────────
export const premiacaoRef = (livroId) => doc(db, "premiacoes", livroId);

export function listenPremiacao(livroId, cb) {
  return onSnapshot(premiacaoRef(livroId), (snap) => cb(snap.exists() ? snap.data() : {}));
}

export async function salvarPremiacao(livroId, data) {
  await setDoc(premiacaoRef(livroId), { livroId, ...data }, { merge: true });
}

// ── Frases (mural de memórias) e fotos ───────────────────────────────────
export async function listarTodosCapitulos() {
  const snap = await getDocs(collectionGroup(db, "capitulos"));
  return snap.docs.map((d) => ({ livroId: d.ref.parent.parent?.id, ...d.data() }));
}

export const fotosMemoriaRef = (livroId) => doc(db, "memorias_fotos", livroId);

export function listenFotosMemoria(livroId, cb) {
  return onSnapshot(fotosMemoriaRef(livroId), (snap) => cb(snap.exists() ? snap.data().urls || [] : []));
}

export async function adicionarFotoMemoria(livroId, url) {
  const ref = fotosMemoriaRef(livroId);
  const snap = await getDoc(ref);
  const urls = snap.exists() ? snap.data().urls || [] : [];
  await setDoc(ref, { urls: [...urls, url] }, { merge: true });
}

export async function removerFotoMemoria(livroId, url) {
  const ref = fotosMemoriaRef(livroId);
  const snap = await getDoc(ref);
  const urls = snap.exists() ? snap.data().urls || [] : [];
  await setDoc(ref, { urls: urls.filter((u) => u !== url) }, { merge: true });
}

// ── Álbum de rolês (fotos extras por rolê, além da foto de capa) ────────
export const fotosRoleRef = (roleId) => doc(db, "roles_fotos", roleId);

export function listenFotosRole(roleId, cb) {
  return onSnapshot(fotosRoleRef(roleId), (snap) => cb(snap.exists() ? snap.data().urls || [] : []));
}

export async function adicionarFotoRole(roleId, url) {
  const ref = fotosRoleRef(roleId);
  const snap = await getDoc(ref);
  const urls = snap.exists() ? snap.data().urls || [] : [];
  await setDoc(ref, { urls: [...urls, url] }, { merge: true });
}

export async function removerFotoRole(roleId, url) {
  const ref = fotosRoleRef(roleId);
  const snap = await getDoc(ref);
  const urls = snap.exists() ? snap.data().urls || [] : [];
  await setDoc(ref, { urls: urls.filter((u) => u !== url) }, { merge: true });
}

// ── Eventos do calendário (usado pelo importador de datas em lote) ──────
export const eventosCol = () => collection(db, "events");

export async function criarEvento(data) {
  await addDoc(eventosCol(), data);
}

// ── Datas especiais (aniversário de namoro, etc.) ────────────────────────
export const datasEspeciaisCol = () => collection(db, "datasEspeciais");

export function listenDatasEspeciais(cb) {
  return onSnapshot(datasEspeciaisCol(), (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function salvarDataEspecial(data) {
  await addDoc(datasEspeciaisCol(), data);
}

export async function excluirDataEspecial(id) {
  await deleteDoc(doc(db, "datasEspeciais", id));
}
