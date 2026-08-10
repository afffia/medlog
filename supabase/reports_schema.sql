-- Run this in Supabase Dashboard → SQL Editor → New query → Run

create table reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null check (category in ('bloodwork', 'imaging', 'prescription', 'visit')),
  provider text,
  facility text,
  report_date date not null,
  notes text,
  file_path text,
  created_at timestamptz not null default now()
);

-- Row Level Security: a user can only ever see or modify their own rows.
-- This is enforced by the database itself, not just app code — even if
-- someone bypassed your frontend, this still holds.
alter table reports enable row level security;

create policy "Users can view their own reports"
  on reports for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reports"
  on reports for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reports"
  on reports for update
  using (auth.uid() = user_id);

create policy "Users can delete their own reports"
  on reports for delete
  using (auth.uid() = user_id);
