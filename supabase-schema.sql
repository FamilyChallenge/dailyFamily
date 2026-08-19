-- À exécuter dans Supabase : SQL Editor -> New query -> coller -> Run

create extension if not exists "pgcrypto";

create table users (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  pin text not null,
  created_at timestamptz default now()
);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null,
  de_id uuid references users(id) on delete cascade,
  vers_id uuid references users(id) on delete cascade,
  category text not null,
  content text,
  media_url text,
  comment text,
  submitted_at timestamptz,
  is_bonus boolean not null default false,
  created_at timestamptz default now()
);

-- Un seul défi "normal" par jour, mais plusieurs défis bonus possibles le même jour
create unique index one_regular_challenge_per_day on challenges (challenge_date) where is_bonus = false;

create table settings (
  id integer primary key default 1,
  categories text[] not null default array['Photo', 'Musique', 'Lieu', 'Autre']
);

insert into settings (id, categories)
values (1, array['Photo', 'Musique', 'Lieu', 'Autre'])
on conflict (id) do nothing;

-- Sécurité : on ouvre l'accès en lecture/écriture via la clé "anon".
-- Suffisant pour un usage familial privé, mais garde bien ton URL Supabase
-- et ta clé "anon" hors d'un dépôt visible par des inconnus.
alter table users enable row level security;
alter table challenges enable row level security;
alter table settings enable row level security;

create policy "allow all on users" on users for all using (true) with check (true);
create policy "allow all on challenges" on challenges for all using (true) with check (true);
create policy "allow all on settings" on settings for all using (true) with check (true);

-- Stockage des photos/vidéos : crée en plus un bucket "challenge-media"
-- depuis Storage -> New bucket (coche "Public bucket"), puis exécute :
create policy "allow anon uploads to challenge-media"
on storage.objects for insert
to anon
with check (bucket_id = 'challenge-media');

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz default now(),
  unique (user_id, subscription)
);

alter table push_subscriptions enable row level security;
create policy "allow all on push_subscriptions" on push_subscriptions for all using (true) with check (true);
