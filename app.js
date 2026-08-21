const el = (id) => document.getElementById(id);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

let usersCache = [];
let categoriesCache = [];
let currentUser = null; // { id, name }
let isAdmin = sessionStorage.getItem("is_admin") === "true";

function loadSession() {
  const saved = localStorage.getItem("current_user");
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
    localStorage.setItem("current_user", JSON.stringify(currentUser));
  } else {
    localStorage.removeItem("current_user");
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

async function renderAdminFullHistory() {
  const list = el("admin-history-list");
  list.innerHTML = "";
  const challenges = await fetchAllChallenges();

  if (challenges.length === 0) {
    list.innerHTML = "<p class=\"comment\">Aucun défi pour le moment.</p>";
    return;
  }

  challenges.forEach((c) => {
    const deName = userName(c.de_id);
    const versName = userName(c.vers_id);

    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <strong>${c.challenge_date}</strong>${c.is_bonus ? " 🎉 bonus" : ""} — ${deName} ➜ ${versName} (${c.category})
      ${c.content ? `<p>${c.content}</p>` : c.submitted_at ? "" : `<p class="comment">Pas encore répondu</p>`}
      ${c.comment ? `<p class="comment">${c.comment}</p>` : ""}
    `;
    if (c.media_url) {
      item.appendChild(renderMediaElement(c.media_url));
    }
    list.appendChild(item);
  });
}

async function refreshUsers() {
  usersCache = await fetchUsers();
  await populateLoginSelect();
  if (isAdmin) await renderAdminParticipants();
}

async function renderChallengeCard(challenge, container) {
  const card = document.createElement("div");
  card.className = "challenge-card";

  const deName = userName(challenge.de_id);
  const versName = userName(challenge.vers_id);

  const title = document.createElement("h3");
  title.textContent = challenge.is_bonus
    ? `🎉 Défi bonus — ${deName} doit trouver : ${challenge.category}`
    : `${deName} doit trouver : ${challenge.category}`;
  card.appendChild(title);

  const sub = document.createElement("p");
  sub.textContent = `...qui correspond à ${versName} !`;
  card.appendChild(sub);

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
    card.appendChild(result);
  } else if (currentUser && currentUser.id === challenge.de_id) {
    const form = document.createElement("form");
    form.innerHTML = `
      <p>C'est ton défi${challenge.is_bonus ? " bonus" : ""} aujourd'hui ! 🎯</p>
      <input class="media-input" type="file" accept="image/*,video/*" />
      <textarea class="content-input" placeholder="...ou décris le lieu / colle un lien (optionnel si tu ajoutes une photo)"></textarea>
      <input class="comment-input" type="text" placeholder="Un petit mot (optionnel)" />
      <button type="submit">Envoyer</button>
      <p class="submit-debug error hidden"></p>
    `;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const debug = form.querySelector(".submit-debug");
      debug.classList.add("hidden");
      const content = form.querySelector(".content-input").value.trim();
      const comment = form.querySelector(".comment-input").value.trim();
      const file = form.querySelector(".media-input").files[0];

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
    card.appendChild(form);
  } else {
    const waiting = document.createElement("p");
    waiting.textContent = `En attente de la réponse de ${deName}...`;
    card.appendChild(waiting);
  }

  const commentsSection = document.createElement("div");
  commentsSection.className = "comments-section";
  commentsSection.innerHTML = "<h4>💬 Commentaires</h4>";

  const commentsList = document.createElement("div");
  commentsList.className = "comments-list";
  const comments = await fetchComments(challenge.id);
  if (comments.length === 0) {
    commentsList.innerHTML = '<p class="comment">Aucun commentaire pour l\'instant.</p>';
  } else {
    comments.forEach((c) => {
      const p = document.createElement("p");
      p.className = "comment-item";
      p.innerHTML = `<strong>${userName(c.user_id)} :</strong> ${c.text}`;
      commentsList.appendChild(p);
    });
  }
  commentsSection.appendChild(commentsList);

  if (currentUser) {
    const commentForm = document.createElement("form");
    commentForm.className = "comment-form";
    commentForm.innerHTML = `
      <input type="text" class="new-comment-input" placeholder="Ajouter un commentaire..." />
      <button type="submit">Envoyer</button>
    `;
    commentForm.onsubmit = async (e) => {
      e.preventDefault();
      const input = commentForm.querySelector(".new-comment-input");
      const text = input.value.trim();
      if (!text) return;
      const btn = commentForm.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        await addComment(challenge.id, currentUser.id, text);
        await sendNotification(
          "💬 Nouveau commentaire",
          `${currentUser.name} a commenté le défi de ${deName}.`,
          currentUser.id
        );
        await renderTodayChallenge();
      } catch (err) {
        alert("Erreur lors de l'envoi du commentaire : " + err.message);
        btn.disabled = false;
      }
    };
    commentsSection.appendChild(commentForm);
  }

  card.appendChild(commentsSection);

  container.appendChild(card);
}

async function renderTodayChallenge() {
  const container = el("today-challenge");
  container.innerHTML = "";

  if (usersCache.length < 2) {
    container.innerHTML = "<p>Pas assez de participants pour tirer un défi.</p>";
    return;
  }

  const challenges = await fetchTodayChallenges(todayISO());
  const regular = challenges.find((c) => !c.is_bonus);

  if (!regular) {
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

  for (const challenge of challenges) {
    await renderChallengeCard(challenge, container);
  }
}

async function renderHistory() {
  const list = el("history-list");
  list.innerHTML = "";
  const challenges = await fetchRecentChallenges(7);

  for (const c of challenges) {
    const wrapper = document.createElement("div");
    wrapper.className = "history-item";
    const dateLabel = document.createElement("p");
    dateLabel.className = "history-date";
    dateLabel.textContent = c.challenge_date + (c.is_bonus ? " 🎉 bonus" : "");
    wrapper.appendChild(dateLabel);
    await renderChallengeCard(c, wrapper);
    list.appendChild(wrapper);
  }
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
    await renderAdminFullHistory();
  } else if (attempt !== null) {
    alert("Mot de passe incorrect.");
  }
});

el("add-bonus-challenge-btn").addEventListener("click", async () => {
  const debug = el("bonus-debug");
  debug.classList.add("hidden");
  try {
    const challenge = await createBonusChallenge(todayISO());
    if (!challenge) {
      debug.textContent = "Pas assez de participants pour tirer un défi bonus.";
      debug.classList.remove("hidden");
      return;
    }
    await sendNotification(
      "🎉 Défi bonus disponible !",
      `${userName(challenge.de_id)} a un défi bonus (${challenge.category}) à relever.`
    );
    await renderTodayChallenge();
    await renderAdminFullHistory();
    alert("Défi bonus lancé !");
  } catch (err) {
    debug.textContent = "Erreur : " + err.message;
    debug.classList.remove("hidden");
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
    await renderAdminFullHistory();
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
