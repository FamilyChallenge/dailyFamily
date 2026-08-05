// Exécuté par .github/workflows/daily-draw.yml
// Nécessite les variables d'environnement SUPABASE_URL et SUPABASE_ANON_KEY

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const NOTIFY_FUNCTION_URL = process.env.NOTIFY_FUNCTION_URL;
const CATEGORIES = ["Photo", "Musique", "Lieu", "Autre"];

function headers() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("SUPABASE_URL et SUPABASE_ANON_KEY doivent être définis.");
    process.exit(1);
  }

  const today = todayISO();

  const existingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/challenges?challenge_date=eq.${today}&select=id`,
    { headers: headers() }
  );
  const existing = await existingRes.json();
  if (existing.length > 0) {
    console.log("Défi déjà présent pour aujourd'hui, rien à faire.");
    return;
  }

  const usersRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id`, {
    headers: headers(),
  });
  const users = await usersRes.json();
  const userIds = users.map((u) => u.id);

  if (userIds.length < 2) {
    console.log("Moins de 2 participants, rien à faire.");
    return;
  }

  const challengesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/challenges?select=de_id,vers_id`,
    { headers: headers() }
  );
  const allChallenges = await challengesRes.json();

  const pair = pickNextPair(userIds, allChallenges);
  const [de_id, vers_id] = pair;
  const categories = await fetchCategories();
  const category = categories[Math.floor(Math.random() * categories.length)];

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/challenges`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify([{ challenge_date: today, de_id, vers_id, category }]),
  });

  if (!insertRes.ok) {
    console.error("Échec de la création du défi :", await insertRes.text());
    process.exit(1);
  }

  console.log("Défi du jour créé avec succès.");

  if (NOTIFY_FUNCTION_URL) {
    try {
      await fetch(NOTIFY_FUNCTION_URL, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          title: "🎁 Le défi du jour est prêt !",
          body: `Un défi (${category}) attend d'être relevé aujourd'hui.`,
        }),
      });
      console.log("Notification envoyée.");
    } catch (err) {
      console.error("Échec de l'envoi de la notification :", err);
    }
  }
}

main();
