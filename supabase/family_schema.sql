-- Run this in Supabase Dashboard → SQL Editor → New query → Run

-- Add IF NOT EXISTS to prevent the error if tables already exist
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  age int,
  blood text,
  photo text, -- small image stored as a data URL
  created_at timestamptz not null default now()
);

create table if not exists conditions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists medicines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  dosage text,
  condition_id uuid references conditions(id) on delete set null,
  times text[] not null default '{}', -- any of: morning, noon, night
  created_at timestamptz not null default now()
);

create table if not exists today_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  medicine_id uuid not null references medicines(id) on delete cascade,
  log_date date not null,
  taken boolean not null default false,
  created_at timestamptz not null default now()
  -- features_schema.sql adds the "slot" column and the final unique constraint
);

alter table profiles enable row level security;
alter table conditions enable row level security;
alter table medicines enable row level security;
alter table today_logs enable row level security;

-- Note: Policies will fail if they already exist. 
-- If they do, you can drop them first or skip this section.
create policy "Own profiles" on profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own conditions" on conditions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own medicines" on medicines for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own dose logs" on today_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
