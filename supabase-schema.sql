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
  comment text,
  submitted_at timestamptz
);

create unique index one_challenge_per_day on challenges (challenge_date);

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
