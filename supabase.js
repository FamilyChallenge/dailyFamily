function headers() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

async function fetchUsers() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,name&order=name.asc`, {
    headers: headers(),
  });
  return res.json();
}

async function verifyLogin(name, pin) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/users?name=eq.${encodeURIComponent(name)}&pin=eq.${encodeURIComponent(pin)}&select=id,name`,
    { headers: headers() }
  );
  const rows = await res.json();
  return rows[0] || null;
}

async function addUser(name, pin) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify([{ name, pin }]),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText);
  }
  return res.json();
}

async function removeUser(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${id}`, {
    method: "DELETE",
    headers: headers(),
  });
}

async function fetchAllChallenges() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/challenges?select=*&order=challenge_date.desc`,
    { headers: headers() }
  );
  return res.json();
}

async function fetchTodayChallenge(today) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/challenges?challenge_date=eq.${today}&select=*`,
    { headers: headers() }
  );
  const rows = await res.json();
  return rows[0] || null;
}

function pickNextPair(userIds, allChallenges) {
  const pairs = [];
  for (const a of userIds) {
    for (const b of userIds) {
      if (a !== b) pairs.push([a, b]);
    }
  }
  if (pairs.length === 0) return null;

  const counts = new Map(pairs.map((p) => [p.join("|"), 0]));
  for (const c of allChallenges) {
    const key = `${c.de_id}|${c.vers_id}`;
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  }

  const minCount = Math.min(...counts.values());
  const candidates = pairs.filter((p) => counts.get(p.join("|")) === minCount);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

async function fetchCategories() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?id=eq.1&select=categories`, {
    headers: headers(),
  });
  const rows = await res.json();
  return rows[0] && rows[0].categories && rows[0].categories.length > 0
    ? rows[0].categories
    : CATEGORIES;
}

async function updateCategories(categories) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?id=eq.1`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ categories }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}

async function createTodayChallengeIfNeeded(today) {
  const existing = await fetchTodayChallenge(today);
  if (existing) return { created: false, challenge: existing };

  const users = await fetchUsers();
  const userIds = users.map((u) => u.id);
  if (userIds.length < 2) return { created: false, challenge: null };

  const allChallenges = await fetchAllChallenges();
  const pair = pickNextPair(userIds, allChallenges);
  if (!pair) return { created: false, challenge: null };

  const [de_id, vers_id] = pair;
  const categories = await fetchCategories();
  const category = categories[Math.floor(Math.random() * categories.length)];

  const res = await fetch(`${SUPABASE_URL}/rest/v1/challenges`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify([{ challenge_date: today, de_id, vers_id, category }]),
  });
  const rows = await res.json();
  return { created: true, challenge: rows[0] };
}

async function uploadMedia(file, challengeId) {
  const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  const path = `${challengeId}-${Date.now()}-${safeName}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/challenge-media/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return `${SUPABASE_URL}/storage/v1/object/public/challenge-media/${path}`;
}

async function submitResponse(challengeId, content, comment, mediaUrl) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/challenges?id=eq.${challengeId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({
      content,
      media_url: mediaUrl || null,
      comment,
      submitted_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}
