
alter table reports add column if not exists profile_id uuid references profiles(id) on delete set null;

-- A report may only point at a profile the same user owns.
drop policy if exists "Users can insert their own reports" on reports;
create policy "Users can insert their own reports"
  on reports for insert
  with check (
    auth.uid() = user_id
    and (profile_id is null or exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid()))
  );

drop policy if exists "Users can update their own reports" on reports;
create policy "Users can update their own reports"
  on reports for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (profile_id is null or exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid()))
  );

-- Same rule for appointments (a table created in features_schema.sql)
drop policy if exists "Own appointments" on appointments;
create policy "Own appointments" on appointments
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (profile_id is null or exists (select 1 from profiles p where p.id = profile_id and p.user_id = auth.uid()))
  );


create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  table_name text not null,
  action text not null,                -- INSERT | UPDATE | DELETE | VIEW
  row_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_user_time on audit_log (user_id, created_at desc);

alter table audit_log enable row level security;

drop policy if exists "Read own audit log" on audit_log;
create policy "Read own audit log" on audit_log for select using (auth.uid() = user_id);

create or replace function audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    insert into audit_log (user_id, table_name, action, row_id) values (old.user_id, tg_table_name, tg_op, old.id);
  else
    insert into audit_log (user_id, table_name, action, row_id) values (new.user_id, tg_table_name, tg_op, new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists audit_reports on reports;
create trigger audit_reports after insert or update or delete on reports
  for each row execute function audit_row();

drop trigger if exists audit_summary_shares on summary_shares;
create trigger audit_summary_shares after insert or update or delete on summary_shares
  for each row execute function audit_row();


create or replace function validate_share()
returns trigger
language plpgsql
as $$
begin
  if cardinality(new.report_ids) = 0 or cardinality(new.report_ids) > 200 then
    raise exception 'A share must include between 1 and 200 reports';
  end if;
  if new.expires_at > now() + interval '31 days' then
    raise exception 'Share links can last at most 31 days';
  end if;
  if exists (
    select 1 from unnest(new.report_ids) as rid
    where not exists (select 1 from reports r where r.id = rid and r.user_id = new.user_id)
  ) then
    raise exception 'A share can only include your own reports';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_share_trg on summary_shares;
create trigger validate_share_trg
  before insert or update of report_ids, expires_at on summary_shares
  for each row execute function validate_share();


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
  insert into audit_log (user_id, table_name, action, row_id)
    select s.user_id, 'share_view', 'VIEW', s.id
    from summary_shares s
    where s.token = p_token and s.revoked = false and s.expires_at > now();

  return query
    select r.title, r.category, r.provider, r.facility, r.report_date, r.notes
    from summary_shares s
    join reports r on r.id = any(s.report_ids) and r.user_id = s.user_id
    where s.token = p_token
      and s.revoked = false
      and s.expires_at > now();
end;
$$;

grant execute on function get_shared_summary(text) to anon;
