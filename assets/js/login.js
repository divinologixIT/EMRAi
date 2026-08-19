(function () {
  "use strict";

  const form = document.getElementById("loginForm");
  const loginId = document.getElementById("loginId");
  const password = document.getElementById("loginPassword");
  const remember = document.getElementById("rememberMe");
  const passwordToggle = document.getElementById("passwordToggle");
  const signInButton = document.getElementById("signInButton");

  function validate() {
    const hasLogin = Boolean(loginId.value.trim());
    const hasPassword = password.value.length >= 6;
    window.CliniFlow.setInputError(loginId, hasLogin ? "" : "Enter your email or phone ID.");
    window.CliniFlow.setInputError(password, hasPassword ? "" : "Password must contain at least 6 characters.");
    return hasLogin && hasPassword;
  }

  window.CliniFlow?.bindPasswordToggle(passwordToggle, password);

  [loginId, password].forEach((input) => input?.addEventListener("input", () => window.CliniFlow.setInputError(input, "")));

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validate()) return;
    if (remember.checked) localStorage.setItem("cliniflow-login-id", loginId.value.trim());
    else localStorage.removeItem("cliniflow-login-id");
    signInButton.disabled = true;
    signInButton.querySelector("span").textContent = "Signing In...";
    window.CliniFlow?.showToast("Welcome back. Opening your dashboard...");
    setTimeout(() => { window.location.href = "index.html"; }, 650);
  });

  const savedLogin = localStorage.getItem("cliniflow-login-id");
  if (savedLogin && loginId) {
    loginId.value = savedLogin;
    remember.checked = true;
  }

  const charts = Array.from(document.querySelectorAll(".login-metric canvas"));
  const drawLoginCharts = () => charts.forEach((canvas) => window.CliniFlow.drawSparkline(canvas));
  if (document.fonts?.ready) document.fonts.ready.then(drawLoginCharts);
  else drawLoginCharts();
  window.addEventListener("resize", drawLoginCharts);
})();
