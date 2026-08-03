const el = (id) => document.getElementById(id);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentUserId() {
  return localStorage.getItem("current_user_id") || "";
}

function setCurrentUserId(id) {
  localStorage.setItem("current_user_id", id);
}

let usersCache = [];
let isAdmin = sessionStorage.getItem("is_admin") === "true";

function updateAdminUI() {
  el("admin-locked").classList.toggle("hidden", isAdmin);
  el("add-participant-form").classList.toggle("hidden", !isAdmin);
}

function userName(id) {
  const u = usersCache.find((u) => u.id === id);
  return u ? u.name : "?";
}

async function renderParticipants() {
  usersCache = await fetchUsers();

  const list = el("participants-list");
  list.innerHTML = "";
  usersCache.forEach((u) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${u.name}</span>`;
    if (isAdmin) {
      const btn = document.createElement("button");
      btn.textContent = "❌";
      btn.className = "icon-btn";
      btn.onclick = async () => {
        await removeUser(u.id);
        await renderAll();
      };
      li.appendChild(btn);
    }
    list.appendChild(li);
  });

  updateAdminUI();

  const select = el("current-user-select");
  select.innerHTML = "";
  usersCache.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.name;
    select.appendChild(opt);
  });
  const current = getCurrentUserId();
  if (usersCache.some((u) => u.id === current)) {
    select.value = current;
  } else if (usersCache.length > 0) {
    setCurrentUserId(usersCache[0].id);
    select.value = usersCache[0].id;
  }
}

async function renderTodayChallenge() {
  const container = el("today-challenge");
  container.innerHTML = "";

  if (usersCache.length < 2) {
    container.innerHTML = "<p>Ajoute au moins 2 participants pour commencer.</p>";
    return;
  }

  const challenge = await fetchTodayChallenge(todayISO());

  if (!challenge) {
    container.innerHTML = "<p>Aucun défi tiré aujourd'hui.</p>";
    const btn = document.createElement("button");
    btn.textContent = "🎲 Tirer le défi du jour";
    btn.onclick = async () => {
      await createTodayChallengeIfNeeded(todayISO());
      await renderAll();
    };
    container.appendChild(btn);
    return;
  }

  const deName = userName(challenge.de_id);
  const versName = userName(challenge.vers_id);
  const currentUser = getCurrentUserId();

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
  } else if (currentUser === challenge.de_id) {
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
      await renderAll();
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
  const current = select.value;
  select.innerHTML = '<option value="Tous">Tous</option>';
  usersCache.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.name;
    opt.textContent = u.name;
    select.appendChild(opt);
  });
  select.value = current || "Tous";
}

async function renderAll() {
  await renderParticipants();
  renderHistoryFilterOptions();
  await renderTodayChallenge();
  await renderHistory();
}

el("add-participant-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = el("new-participant-name");
  const name = input.value.trim();
  if (!name) return;
  await addUser(name);
  input.value = "";
  await renderAll();
});

el("current-user-select").addEventListener("change", async (e) => {
  setCurrentUserId(e.target.value);
  await renderTodayChallenge();
});

el("history-filter").addEventListener("change", renderHistory);

el("unlock-admin-btn").addEventListener("click", () => {
  const attempt = prompt("Mot de passe admin :");
  if (attempt === ADMIN_PASSWORD) {
    isAdmin = true;
    sessionStorage.setItem("is_admin", "true");
    updateAdminUI();
  } else if (attempt !== null) {
    alert("Mot de passe incorrect.");
  }
});

renderAll();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
