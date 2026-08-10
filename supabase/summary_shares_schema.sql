-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- (after reports_schema.sql and storage_policy.sql)

create table summary_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text unique not null,
  report_ids uuid[] not null,
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table summary_shares enable row level security;

-- Only the owner can see, create, or revoke their own shares.
create policy "Users can view their own shares"
  on summary_shares for select
  using (auth.uid() = user_id);

create policy "Users can create their own shares"
  on summary_shares for insert
  with check (auth.uid() = user_id);

create policy "Users can update (revoke) their own shares"
  on summary_shares for update
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- The tricky part: a doctor opening the link has NO account and
-- NO auth token. We can't just add a public "select" policy on
-- summary_shares or reports — that would let anyone with the
-- anon key run `select *` and read every user's data, not just
-- the one they have a token for.
--
-- Instead, this function runs with elevated privileges (bypassing
-- RLS internally) but only ever returns rows matching the exact
-- token passed in, and only if the share hasn't expired or been
-- revoked. This is the standard safe pattern for "share by link"
-- features.
-- ─────────────────────────────────────────────────────────────

create or replace function get_shared_summary(p_token text)
returns table (
  title text,
  category text,
  provider text,
  facility text,
  report_date date,
  notes text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select r.title, r.category, r.provider, r.facility, r.report_date, r.notes
    from summary_shares s
    join reports r on r.id = any(s.report_ids)
    where s.token = p_token
      and s.revoked = false
      and s.expires_at > now();
end;
$$;

-- Let the public (anon) key call this specific function — but note
-- it still can't query summary_shares or reports directly, only
-- through this narrow, token-gated function.
grant execute on function get_shared_summary(text) to anon;
