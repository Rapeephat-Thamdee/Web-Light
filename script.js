// DATABASE_URL comes from config.js (loaded before this file).
(function () {
  const session = requireAuth(false);
  if (!session) return; // requireAuth already redirects to login.html

  document.getElementById("userName").textContent = session.username;
  document.getElementById("logoutBtn").addEventListener("click", logout);
  if (session.role === "admin") {
    document.getElementById("adminLink").style.display = "";
  }

  const POLL_INTERVAL_MS = 2000;
  const keys = ["light1", "light2", "light3", "light4"];
  let state = { light1: false, light2: false, light3: false, light4: false };

  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  function render() {
    let onCount = 0;
    keys.forEach(key => {
      const on = !!state[key];
      if (on) onCount++;
      const hotspot = document.querySelector(`.hotspot[data-key="${key}"]`);
      const legendItem = document.querySelector(`.legend-item[data-key="${key}"]`);
      if (hotspot) hotspot.classList.toggle("on", on);
      if (legendItem) {
        legendItem.classList.toggle("on", on);
        legendItem.querySelector(".state").textContent = on ? "เปิด" : "ปิด";
      }
    });
    document.getElementById("onCount").textContent = `${onCount}/4`;
  }

  async function fetchState() {
    try {
      const res = await fetch(`${DATABASE_URL}/lights.json`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      if (data) {
        keys.forEach(key => { state[key] = !!data[key]; });
        render();
      }
      statusDot.className = "dot live";
      statusText.textContent = "เชื่อมต่อแล้ว";
    } catch (err) {
      statusDot.className = "dot err";
      statusText.textContent = "เชื่อมต่อไม่ได้";
    }
  }

  async function toggle(key) {
    const newValue = !state[key];
    state[key] = newValue; // optimistic UI
    render();
    try {
      const res = await fetch(`${DATABASE_URL}/lights/${key}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newValue)
      });
      if (!res.ok) throw new Error("bad response");
      statusDot.className = "dot live";
      statusText.textContent = "เชื่อมต่อแล้ว";
    } catch (err) {
      state[key] = !newValue; // revert on failure
      render();
      statusDot.className = "dot err";
      statusText.textContent = "สั่งงานไม่สำเร็จ";
    }
  }

  async function setAll(value) {
    const previous = { ...state }; // remember state in case we need to revert
    keys.forEach(key => { state[key] = value; }); // optimistic UI
    render();
    try {
      const res = await fetch(`${DATABASE_URL}/lights.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ light1: value, light2: value, light3: value, light4: value })
      });
      if (!res.ok) throw new Error("bad response");
      statusDot.className = "dot live";
      statusText.textContent = "เชื่อมต่อแล้ว";
    } catch (err) {
      state = previous; // revert on failure, same as toggle()
      render();
      statusDot.className = "dot err";
      statusText.textContent = "สั่งงานไม่สำเร็จ";
    }
  }

  document.querySelectorAll(".hotspot").forEach(btn => {
    btn.addEventListener("click", () => toggle(btn.dataset.key));
  });
  document.querySelectorAll(".legend-item").forEach(item => {
    item.addEventListener("click", () => toggle(item.dataset.key));
  });
  document.getElementById("allOnBtn").addEventListener("click", () => setAll(true));
  document.getElementById("allOffBtn").addEventListener("click", () => setAll(false));

  function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const date = now.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" });
    document.getElementById("clockTime").textContent = time;
    document.getElementById("clockDate").textContent = date;
  }
  updateClock();
  setInterval(updateClock, 1000);

  fetchState();
  setInterval(fetchState, POLL_INTERVAL_MS);
})();