import { onAuth, signUp, logIn, logOut, resetPassword } from "./auth.js";

const loadingScreen = document.getElementById("loadingScreen");
const authScreen = document.getElementById("authScreen");
const dashboard = document.getElementById("dashboard");
const userBadge = document.getElementById("userBadge");
const userAvatar = document.getElementById("userAvatar");

const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginError = document.getElementById("loginError");
const signupError = document.getElementById("signupError");

tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabSignup.classList.remove("active");
  loginForm.classList.remove("hidden");
  signupForm.classList.add("hidden");
});
tabSignup.addEventListener("click", () => {
  tabSignup.classList.add("active");
  tabLogin.classList.remove("active");
  signupForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  try {
    await logIn(email, password);
  } catch (err) {
    loginError.textContent = "E-mail ou senha incorretos.";
    loginError.classList.remove("hidden");
  }
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  signupError.classList.add("hidden");
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  try {
    await signUp(name, email, password);
  } catch (err) {
    signupError.textContent =
      err.code === "auth/email-already-in-use"
        ? "Esse e-mail já tem uma conta."
        : "Não foi possível criar a conta.";
    signupError.classList.remove("hidden");
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => logOut());

const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const loginResetMsg = document.getElementById("loginResetMsg");
forgotPasswordBtn.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  loginResetMsg.classList.remove("hidden");
  if (!email) {
    loginResetMsg.textContent = "Digite seu e-mail no campo acima primeiro.";
    return;
  }
  try {
    await resetPassword(email);
    loginResetMsg.textContent = "Enviamos um link pra redefinir sua senha nesse e-mail.";
  } catch {
    loginResetMsg.textContent = "Não consegui enviar. Confira se o e-mail está certo.";
  }
});

onAuth((user) => {
  loadingScreen.classList.add("hidden");
  if (user) {
    authScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");
    const nome = user.name || user.email;
    userBadge.textContent = `Olá, ${nome.split(" ")[0]}`;
    userAvatar.textContent = nome.trim().charAt(0).toUpperCase();
  } else {
    dashboard.classList.add("hidden");
    authScreen.classList.remove("hidden");
  }
});
