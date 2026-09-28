document.addEventListener("DOMContentLoaded", () => {
  // Already logged in? Skip straight to the right page.
  const existing = getSession();
  if (existing) {
    window.location.href = existing.role === "admin" ? "admin.html" : "index.html";
    return;
  }

  const form = document.getElementById("loginForm");
  const msg = document.getElementById("loginMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    msg.textContent = "กำลังเข้าสู่ระบบ...";
    msg.className = "login-msg";

    try {
      const result = await attemptLogin(username, password);
      if (result.ok) {
        window.location.href = result.session.role === "admin" ? "admin.html" : "index.html";
      } else {
        msg.textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
        msg.className = "login-msg error";
      }
    } catch {
      msg.textContent = "เชื่อมต่อฐานข้อมูลไม่ได้ ลองใหม่อีกครั้ง";
      msg.className = "login-msg error";
    }
  });
});
