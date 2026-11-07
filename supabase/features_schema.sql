-- Run this in Supabase Dashboard → SQL Editor → New query → Run
--
-- Safe to run on the existing shared project AND on a fresh one, and safe to
-- re-run. On a fresh project run family_schema.sql first.
--
-- Adds: appointments, user_settings, vitals, per-dose logging, and a few
-- columns the app already uses or now needs.

-- ── Columns the app uses that weren't in the original schema ─────────────
alter table reports   add column if not exists color  text;   -- folder colour (Timeline "Edit folder")
alter table medicines add column if not exists doctor text;   -- "Prescribed by", groups medicines on the Doctors screen

-- ── Per-dose logging ─────────────────────────────────────────────────────
-- Before: one log row per medicine per day, so ticking the morning dose also
-- ticked the night dose, and reminders for the later dose would never fire.
-- Now: one row per medicine + day + slot. Existing rows become slot = 'all'
-- (the app treats those as "every slot taken" for that day).
alter table today_logs add column if not exists slot text not null default 'all';

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.today_logs'::regclass and contype = 'u'
  loop
    execute format('alter table public.today_logs drop constraint %I', c.conname);
  end loop;
end $$;

alter table today_logs
  add constraint today_logs_unique_dose unique (profile_id, medicine_id, log_date, slot);

-- ── Appointments ─────────────────────────────────────────────────────────
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,   -- null = the account owner
  title text not null,
  doctor text,
  facility text,
  appt_at timestamptz not null,
  remind_before_minutes int not null default 60,
  notes text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table appointments enable row level security;
drop policy if exists "Own appointments" on appointments;
create policy "Own appointments" on appointments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Settings (one row per user) ──────────────────────────────────────────
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  med_reminders boolean not null default true,
  appt_reminders boolean not null default true,
  browser_notifications boolean not null default false,
  slot_times jsonb not null default '{"morning":"08:00","noon":"14:00","night":"21:00"}',
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;
drop policy if exists "Own settings" on user_settings;
create policy "Own settings" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Vitals (grouped by treating doctor on the Doctors screen) ────────────
-- Units are fixed per kind in the app: mmHg, mmol/L, kg, bpm, °F.
-- For blood pressure: value = systolic, value2 = diastolic.
create table if not exists vitals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text,
  kind text not null check (kind in ('blood_pressure','blood_sugar','weight','heart_rate','temperature')),
  value numeric not null,
  value2 numeric,
  recorded_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

alter table vitals enable row level security;
drop policy if exists "Own vitals" on vitals;
create policy "Own vitals" on vitals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
