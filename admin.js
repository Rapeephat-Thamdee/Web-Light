async function loadUsers() {
  const res = await fetch(`${DATABASE_URL}/users.json`, { cache: "no-store" });
  if (!res.ok) throw new Error("network");
  return (await res.json()) || {};
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderUsers(users, session) {
  const list = document.getElementById("userList");
  const select = document.getElementById("userSelect");
  const names = Object.keys(users).sort();

  if (names.length === 0) {
    list.innerHTML = `<p class="dim-text">ยังไม่มีผู้ใช้</p>`;
  } else {
    list.innerHTML = names.map(name => {
      const u = users[name] || {};
      const isAdmin = u.role === "admin";
      const you = name === session.username ? " (คุณ)" : "";
      const delBtn = name === session.username ? "" : `<button class="del-btn" data-user="${esc(name)}" title="ลบผู้ใช้" aria-label="ลบผู้ใช้ ${esc(name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zM6 9h12l-1 11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 9zm4 2v8h2v-8h-2zm4 0v8h2v-8h-2z"/></svg></button>`;
      return `
        <div class="user-row">
          <span class="user-row-name">${esc(name)}${you}</span>
          <span class="user-row-actions">
            <span class="user-row-role ${isAdmin ? "role-admin" : "role-user"}">${isAdmin ? "แอดมิน" : "ผู้ใช้ทั่วไป"}</span>
            ${delBtn}
          </span>
        </div>`;
    }).join("");
  }

  select.innerHTML = names.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join("");
}

async function refresh(session) {
  const users = await loadUsers();
  renderUsers(users, session);
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = requireAuth(true);
  if (!session) return;

  document.getElementById("adminName").textContent = session.username;
  document.getElementById("logoutBtn").addEventListener("click", logout);

  try {
    await refresh(session);
  } catch {
    document.getElementById("userList").innerHTML = `<p class="dim-text">โหลดรายชื่อผู้ใช้ไม่สำเร็จ</p>`;
  }

  document.getElementById("userList").addEventListener("click", async (e) => {
    const btn = e.target.closest(".del-btn");
    if (!btn) return;
    const username = btn.dataset.user;
    if (!confirm(`ลบผู้ใช้ "${username}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    btn.disabled = true;
    try {
      const res = await fetch(`${DATABASE_URL}/users/${encodeURIComponent(username)}.json`, { method: "DELETE" });
      if (!res.ok) throw new Error("bad");
      await refresh(session);
    } catch {
      btn.disabled = false;
      alert("ลบผู้ใช้ไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  });

  document.getElementById("addUserForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("newUsername").value.trim();
    const password = document.getElementById("newPassword").value;
    const role = document.getElementById("newRole").value;
    const msg = document.getElementById("addMsg");

    if (!username || !password) return;
    msg.textContent = "กำลังบันทึก...";
    msg.className = "login-msg";

    try {
      const existing = await fetch(`${DATABASE_URL}/users/${encodeURIComponent(username)}.json`, { cache: "no-store" }).then(r => r.json());
      if (existing) {
        msg.textContent = "มีชื่อผู้ใช้นี้อยู่แล้ว";
        msg.className = "login-msg error";
        return;
      }
      const hash = await sha256Hex(password);
      const res = await fetch(`${DATABASE_URL}/users/${encodeURIComponent(username)}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: hash, role })
      });
      if (!res.ok) throw new Error("bad");
      msg.textContent = "เพิ่มผู้ใช้สำเร็จ";
      msg.className = "login-msg";
      document.getElementById("addUserForm").reset();
      await refresh(session);
    } catch {
      msg.textContent = "เพิ่มผู้ใช้ไม่สำเร็จ ลองใหม่อีกครั้ง";
      msg.className = "login-msg error";
    }
  });

  document.getElementById("changePassForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("userSelect").value;
    const password = document.getElementById("changePassword").value;
    const msg = document.getElementById("changeMsg");

    if (!username || !password) return;
    msg.textContent = "กำลังบันทึก...";
    msg.className = "login-msg";

    try {
      const hash = await sha256Hex(password);
      const res = await fetch(`${DATABASE_URL}/users/${encodeURIComponent(username)}/password.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hash)
      });
      if (!res.ok) throw new Error("bad");
      msg.textContent = `เปลี่ยนรหัสผ่านของ ${username} สำเร็จ`;
      msg.className = "login-msg";
      document.getElementById("changePassForm").reset();
    } catch {
      msg.textContent = "เปลี่ยนรหัสผ่านไม่สำเร็จ ลองใหม่อีกครั้ง";
      msg.className = "login-msg error";
    }
  });
});