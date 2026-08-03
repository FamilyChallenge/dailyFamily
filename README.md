# Le défi du jour — PWA familiale

## 1. Créer la base de données (Supabase, gratuit)

1. Va sur https://supabase.com et crée un compte + un nouveau projet (gratuit).
2. Une fois le projet créé, va dans **SQL Editor** → **New query**, colle le contenu de `supabase-schema.sql`, puis clique **Run**.
3. Va dans **Project Settings** → **API**. Note :
   - **Project URL** (ex. `https://xxxxx.supabase.co`)
   - **anon public key** (une longue chaîne de caractères)

## 2. Configurer le projet

Ouvre `config.js` et remplace :
```js
const SUPABASE_URL = "https://TON-PROJET.supabase.co";
const SUPABASE_ANON_KEY = "TA_CLE_ANON_ICI";
```
par tes propres valeurs récupérées à l'étape 1.

## 3. Mettre le code sur GitHub

1. Crée un nouveau dépôt **privé** sur GitHub (ex. `defi-du-jour`).
2. Pousse tous les fichiers de ce dossier dedans (via GitHub Desktop, ou en ligne de commande `git init / git add . / git commit / git push`).
3. Va dans **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, et ajoute :
   - `SUPABASE_URL` → ton Project URL
   - `SUPABASE_ANON_KEY` → ta clé anon

## 4. Activer l'hébergement (GitHub Pages)

1. Dans le dépôt : **Settings** → **Pages**.
2. Source : **Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Après quelques minutes, ton appli sera accessible à une adresse du type `https://ton-pseudo.github.io/defi-du-jour/`.

## 5. Tester

1. Ouvre le lien sur ton téléphone.
2. Ajoute les participants dans la section "Participants".
3. Choisis "Qui es-tu ?", puis clique sur **"🎲 Tirer le défi du jour"** pour tester manuellement.
4. Soumets une réponse en tant que personne assignée, vérifie que ça s'affiche pour tout le monde, et regarde l'historique.

## 6. Installer comme une vraie appli

- **Android (Chrome)** : ouvre le lien → menu ⋮ → "Ajouter à l'écran d'accueil"
- **iPhone (Safari)** : ouvre le lien → bouton Partager → "Sur l'écran d'accueil"

## 7. Automatiser le tirage quotidien

Le fichier `.github/workflows/daily-draw.yml` est déjà configuré pour tourner **tous les jours à 7h UTC** automatiquement, dès que tu as ajouté les secrets à l'étape 3 — rien d'autre à faire.

Tu peux aussi le déclencher manuellement pour tester : onglet **Actions** → "Tirage quotidien du défi" → **Run workflow**.

Pour changer l'heure, modifie la ligne `cron: "0 7 * * *"` dans le fichier (format : minute heure jour mois jour-semaine, en UTC).

## Limites connues (MVP)

- Pas de mot de passe : on se choisit dans une liste. Suffisant pour un usage familial fermé avec un lien privé, mais n'importe qui ayant le lien peut lire/écrire les données.
- Pas d'upload direct de photo : on colle un lien ou une description.
- Un seul groupe géré (pas de multi-familles).

## Idées d'évolution

- Ajouter la devinette (deviner qui est assigné avant la révélation)
- Upload direct de photos (via Supabase Storage, gratuit aussi)
- Notifications quand le défi du jour est prêt
