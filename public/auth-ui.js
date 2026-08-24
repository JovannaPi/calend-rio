import { onAuth, signUp, logIn, logOut, getCurrentUser } from "./auth.js";

const authScreen = document.getElementById("authScreen");
const dashboard = document.getElementById("dashboard");
const userBadge = document.getElementById("userBadge");

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

// Tab navigation
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

onAuth((user) => {
  if (user) {
    authScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");
    userBadge.textContent = user.name || user.email;
  } else {
    dashboard.classList.add("hidden");
    authScreen.classList.remove("hidden");
  }
});

export { getCurrentUser };
