const el = (id) => document.getElementById(id);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

let usersCache = [];
let currentUser = null; // { id, name }
let isAdmin = sessionStorage.getItem("is_admin") === "true";

function loadSession() {
  const saved = sessionStorage.getItem("current_user");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
    } catch (e) {
      currentUser = null;
    }
  }
}

function saveSession() {
  if (currentUser) {
    sessionStorage.setItem("current_user", JSON.stringify(currentUser));
  } else {
    sessionStorage.removeItem("current_user");
  }
}

function userName(id) {
  const u = usersCache.find((u) => u.id === id);
  return u ? u.name : "?";
}

async function populateLoginSelect() {
  usersCache = await fetchUsers();
  const select = el("login-name-select");
  select.innerHTML = "";
  usersCache.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.name;
    opt.textContent = u.name;
    select.appendChild(opt);
  });
}

function updateAdminUI() {
  el("admin-locked").classList.toggle("hidden", isAdmin);
  el("admin-panel").classList.toggle("hidden", !isAdmin);
}

async function renderAdminParticipants() {
  const list = el("participants-list");
  list.innerHTML = "";
  usersCache.forEach((u) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${u.name}</span>`;
    const btn = document.createElement("button");
    btn.textContent = "❌";
    btn.className = "icon-btn";
    btn.onclick = async () => {
      await removeUser(u.id);
      await refreshUsers();
    };
    li.appendChild(btn);
    list.appendChild(li);
  });
}

async function refreshUsers() {
  usersCache = await fetchUsers();
  await populateLoginSelect();
  if (isAdmin) await renderAdminParticipants();
}

async function renderTodayChallenge() {
  const container = el("today-challenge");
  container.innerHTML = "";

  if (usersCache.length < 2) {
    container.innerHTML = "<p>Pas assez de participants pour tirer un défi.</p>";
    return;
  }

  const challenge = await fetchTodayChallenge(todayISO());

  if (!challenge) {
    container.innerHTML = "<p>Aucun défi tiré aujourd'hui.</p>";
    const btn = document.createElement("button");
    btn.textContent = "🎲 Tirer le défi du jour";
    btn.onclick = async () => {
      await createTodayChallengeIfNeeded(todayISO());
      await renderTodayChallenge();
    };
    container.appendChild(btn);
    return;
  }

  const deName = userName(challenge.de_id);
  const versName = userName(challenge.vers_id);

  const title = document.createElement("h3");
  title.textContent = `${deName} doit trouver : ${challenge.category}`;
  container.appendChild(title);

  const sub = document.createElement("p");
  sub.textContent = `...qui correspond à ${versName} !`;
  container.appendChild(sub);

  if (challenge.content) {
    const result = document.createElement("div");
    result.className = "result-box";
    result.innerHTML = `<strong>Résultat :</strong><p>${challenge.content}</p>`;
    if (challenge.comment) {
      result.innerHTML += `<p class="comment">${challenge.comment}</p>`;
    }
    container.appendChild(result);
  } else if (currentUser && currentUser.id === challenge.de_id) {
    const form = document.createElement("form");
    form.innerHTML = `
      <p>C'est ton défi aujourd'hui ! 🎯</p>
      <textarea id="content-input" placeholder="Colle un lien, décris le lieu, ou une URL de photo..." required></textarea>
      <input id="comment-input" type="text" placeholder="Un petit mot (optionnel)" />
      <button type="submit">Envoyer</button>
    `;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const content = el("content-input").value.trim();
      const comment = el("comment-input").value.trim();
      if (!content) return;
      await submitResponse(challenge.id, content, comment);
      await renderTodayChallenge();
    };
    container.appendChild(form);
  } else {
    const waiting = document.createElement("p");
    waiting.textContent = `En attente de la réponse de ${deName}...`;
    container.appendChild(waiting);
  }
}

async function renderHistory() {
  const list = el("history-list");
  list.innerHTML = "";
  const challenges = await fetchAllChallenges();
  const filter = el("history-filter").value;

  challenges.forEach((c) => {
    const deName = userName(c.de_id);
    const versName = userName(c.vers_id);
    if (filter !== "Tous" && filter !== deName && filter !== versName) return;

    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <strong>${c.challenge_date}</strong> — ${deName} ➜ ${versName} (${c.category})
      ${c.content ? `<p>${c.content}</p>` : `<p class="comment">Pas encore répondu</p>`}
      ${c.comment ? `<p class="comment">${c.comment}</p>` : ""}
    `;
    list.appendChild(item);
  });
}

function renderHistoryFilterOptions() {
  const select = el("history-filter");
  select.innerHTML = '<option value="Tous">Tous</option>';
  usersCache.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.name;
    opt.textContent = u.name;
    select.appendChild(opt);
  });
}

async function showLoggedInView() {
  el("login-section").classList.add("hidden");
  el("app-content").classList.remove("hidden");
  el("current-user-name").textContent = `Connecté(e) en tant que ${currentUser.name}`;

  usersCache = await fetchUsers();
  renderHistoryFilterOptions();
  await renderTodayChallenge();
  await renderHistory();
}

function showLoginView() {
  el("login-section").classList.remove("hidden");
  el("app-content").classList.add("hidden");
}

el("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = el("login-name-select").value;
  const pin = el("login-pin-input").value.trim();
  const user = await verifyLogin(name, pin);
  if (user) {
    currentUser = user;
    saveSession();
    el("login-error").classList.add("hidden");
    el("login-pin-input").value = "";
    await showLoggedInView();
  } else {
    el("login-error").classList.remove("hidden");
  }
});

el("logout-btn").addEventListener("click", () => {
  currentUser = null;
  saveSession();
  showLoginView();
});

el("history-filter").addEventListener("change", renderHistory);

el("unlock-admin-btn").addEventListener("click", async () => {
  const attempt = prompt("Mot de passe admin :");
  if (attempt === ADMIN_PASSWORD) {
    isAdmin = true;
    sessionStorage.setItem("is_admin", "true");
    updateAdminUI();
    await renderAdminParticipants();
  } else if (attempt !== null) {
    alert("Mot de passe incorrect.");
  }
});

el("add-participant-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = el("new-participant-name").value.trim();
  const pin = el("new-participant-pin").value.trim();
  if (!name || !pin) return;
  await addUser(name, pin);
  el("new-participant-name").value = "";
  el("new-participant-pin").value = "";
  await refreshUsers();
});

async function init() {
  loadSession();
  await populateLoginSelect();
  updateAdminUI();
  if (isAdmin) await renderAdminParticipants();

  if (currentUser) {
    await showLoggedInView();
  } else {
    showLoginView();
  }
}

init();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
