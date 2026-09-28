// ---------- Auth helpers: shared by login.html, index.html, admin.html ----------
// Users are stored in the Firebase Realtime Database at /users/{username}:
//   { password: "<sha256 hex>", role: "admin" | "user" }
//
// NOTE: this checks the password from the browser directly against the
// database, so it only really protects against casual use on a private
// network (e.g. a home wifi). If this ever needs real security, put
// Firebase security rules on /users (deny public read/write) and/or move
// to Firebase Authentication instead.

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function getSession() {
  try {
    const raw = sessionStorage.getItem("shk_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSession(session) {
  sessionStorage.setItem("shk_session", JSON.stringify(session));
}

function clearSession() {
  sessionStorage.removeItem("shk_session");
}

// Call at the top of a protected page. Redirects away and returns null
// if there's no session (or, when requireAdmin is true, if the logged
// in user isn't an admin). Otherwise returns the session object.
function requireAuth(requireAdmin) {
  const session = getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  if (requireAdmin && session.role !== "admin") {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

async function attemptLogin(username, password) {
  const res = await fetch(`${DATABASE_URL}/users/${encodeURIComponent(username)}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error("network");
  const user = await res.json();
  if (!user || !user.password) return { ok: false };
  const hash = await sha256Hex(password);
  if (hash !== user.password) return { ok: false };
  const session = { username, role: user.role === "admin" ? "admin" : "user" };
  setSession(session);
  return { ok: true, session };
}

function logout() {
  clearSession();
  window.location.href = "login.html";
}
