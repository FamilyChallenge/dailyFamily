const el = (id) => document.getElementById(id);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

let usersCache = [];
let categoriesCache = [];
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

const VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "avi", "mkv"];

function renderMediaElement(url) {
  const ext = url.split(".").pop().toLowerCase().split("?")[0];
  if (VIDEO_EXTENSIONS.includes(ext)) {
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.className = "media-preview";
    return video;
  }
  const img = document.createElement("img");
  img.src = url;
  img.className = "media-preview";
  img.alt = "Photo du défi";
  return img;
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
  usersCache = await fetchUsers();
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
      await renderAdminParticipants();
      await populateLoginSelect();
    };
    li.appendChild(btn);
    list.appendChild(li);
  });
}

async function renderAdminCategories() {
  categoriesCache = await fetchCategories();
  const list = el("categories-list");
  list.innerHTML = "";
  categoriesCache.forEach((cat) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${cat}</span>`;
    const btn = document.createElement("button");
    btn.textContent = "❌";
    btn.className = "icon-btn";
    btn.onclick = async () => {
      const debug = el("categories-debug");
      debug.classList.add("hidden");
      if (categoriesCache.length <= 1) {
        debug.textContent = "Il doit rester au moins une catégorie.";
        debug.classList.remove("hidden");
        return;
      }
      const updated = categoriesCache.filter((c) => c !== cat);
      try {
        await updateCategories(updated);
        await renderAdminCategories();
      } catch (err) {
        debug.textContent = "Erreur : " + err.message;
        debug.classList.remove("hidden");
      }
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
      const result = await createTodayChallengeIfNeeded(todayISO());
      if (result.created) {
        await sendNotification(
          "🎁 Le défi du jour est prêt !",
          `${userName(result.challenge.de_id)} a un défi à relever aujourd'hui.`
        );
      }
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

  if (challenge.submitted_at) {
    const result = document.createElement("div");
    result.className = "result-box";
    result.innerHTML = `<strong>Résultat :</strong>`;
    if (challenge.media_url) {
      result.appendChild(renderMediaElement(challenge.media_url));
    }
    if (challenge.content) {
      result.innerHTML += `<p>${challenge.content}</p>`;
    }
    if (challenge.comment) {
      result.innerHTML += `<p class="comment">${challenge.comment}</p>`;
    }
    container.appendChild(result);
  } else if (currentUser && currentUser.id === challenge.de_id) {
    const form = document.createElement("form");
    form.innerHTML = `
      <p>C'est ton défi aujourd'hui ! 🎯</p>
      <input id="media-input" type="file" accept="image/*,video/*" capture="environment" />
      <textarea id="content-input" placeholder="...ou décris le lieu / colle un lien (optionnel si tu ajoutes une photo)"></textarea>
      <input id="comment-input" type="text" placeholder="Un petit mot (optionnel)" />
      <button type="submit">Envoyer</button>
      <p id="submit-debug" class="error hidden"></p>
    `;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const debug = el("submit-debug");
      debug.classList.add("hidden");
      const content = el("content-input").value.trim();
      const comment = el("comment-input").value.trim();
      const file = el("media-input").files[0];

      if (!content && !file) {
        debug.textContent = "Ajoute une photo/vidéo ou un texte avant d'envoyer.";
        debug.classList.remove("hidden");
        return;
      }

      const submitBtn = form.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      submitBtn.textContent = "Envoi en cours...";

      try {
        let mediaUrl = null;
        if (file) {
          mediaUrl = await uploadMedia(file, challenge.id);
        }
        await submitResponse(challenge.id, content, comment, mediaUrl);
        await sendNotification(
          "✅ Défi relevé !",
          `${userName(challenge.de_id)} a trouvé son ${challenge.category.toLowerCase()} pour ${userName(challenge.vers_id)}.`,
          currentUser.id
        );
        await renderTodayChallenge();
      } catch (err) {
        debug.textContent = "Erreur lors de l'envoi : " + err.message;
        debug.classList.remove("hidden");
        submitBtn.disabled = false;
        submitBtn.textContent = "Envoyer";
      }
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
  const challenges = await fetchRecentChallenges(7);

  challenges.forEach((c) => {
    const deName = userName(c.de_id);
    const versName = userName(c.vers_id);

    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <strong>${c.challenge_date}</strong> — ${deName} ➜ ${versName} (${c.category})
      ${c.content ? `<p>${c.content}</p>` : c.submitted_at ? "" : `<p class="comment">Pas encore répondu</p>`}
      ${c.comment ? `<p class="comment">${c.comment}</p>` : ""}
    `;
    if (c.media_url) {
      item.appendChild(renderMediaElement(c.media_url));
    }
    list.appendChild(item);
  });
}

async function showLoggedInView() {
  el("login-section").classList.add("hidden");
  el("app-content").classList.remove("hidden");
  el("current-user-name").textContent = `Connecté(e) en tant que ${currentUser.name}`;

  usersCache = await fetchUsers();
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

el("enable-notif-btn").addEventListener("click", async () => {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    alert("Les notifications ne sont pas prises en charge sur cet appareil/navigateur.");
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    alert("Notifications refusées. Tu peux les réactiver dans les réglages de ton navigateur.");
    return;
  }
  try {
    await subscribeToPush(currentUser.id);
    alert("Notifications activées !");
  } catch (err) {
    alert("Erreur lors de l'activation : " + err.message);
  }
});


el("unlock-admin-btn").addEventListener("click", async () => {
  const attempt = prompt("Mot de passe admin :");
  if (attempt === ADMIN_PASSWORD) {
    isAdmin = true;
    sessionStorage.setItem("is_admin", "true");
    updateAdminUI();
    await renderAdminParticipants();
    await renderAdminCategories();
  } else if (attempt !== null) {
    alert("Mot de passe incorrect.");
  }
});

el("add-participant-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const debug = el("admin-debug");
  debug.classList.add("hidden");
  debug.textContent = "";

  const name = el("new-participant-name").value.trim();
  const pin = el("new-participant-pin").value.trim();

  if (!name || !pin) {
    debug.textContent = "Merci de remplir le nom ET le code PIN avant d'ajouter.";
    debug.classList.remove("hidden");
    return;
  }

  if (!SUPABASE_URL || SUPABASE_URL.includes("TON-PROJET")) {
    debug.textContent = "config.js n'a pas été rempli avec ta vraie URL Supabase.";
    debug.classList.remove("hidden");
    return;
  }

  try {
    await addUser(name, pin);
    el("new-participant-name").value = "";
    el("new-participant-pin").value = "";
    await refreshUsers();
  } catch (err) {
    debug.textContent = "Erreur lors de l'ajout : " + err.message;
    debug.classList.remove("hidden");
  }
});

el("add-category-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const debug = el("categories-debug");
  debug.classList.add("hidden");
  const input = el("new-category-name");
  const name = input.value.trim();
  if (!name) return;
  if (categoriesCache.includes(name)) {
    debug.textContent = "Cette catégorie existe déjà.";
    debug.classList.remove("hidden");
    return;
  }
  try {
    await updateCategories([...categoriesCache, name]);
    input.value = "";
    await renderAdminCategories();
  } catch (err) {
    debug.textContent = "Erreur : " + err.message;
    debug.classList.remove("hidden");
  }
});

async function init() {
  loadSession();
  await populateLoginSelect();
  updateAdminUI();
  if (isAdmin) {
    await renderAdminParticipants();
    await renderAdminCategories();
  }

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
