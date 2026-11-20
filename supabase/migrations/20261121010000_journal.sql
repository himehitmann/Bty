-- Journal data remains accessible to owners after subscription cancellation.

create function public.journal_snapshot_valid(snapshot jsonb)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select case when jsonb_typeof(snapshot) = 'object' then coalesce(
    jsonb_typeof(snapshot -> 'id') = 'string'
    and char_length(snapshot ->> 'id') between 1 and 160
    and jsonb_typeof(snapshot -> 'name') = 'string'
    and char_length(trim(snapshot ->> 'name')) between 1 and 140
    and (snapshot - 'id' - 'name') = '{}'::jsonb,
    false
  ) else false end;
$$;

create function public.journal_products_valid(products jsonb)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select case when jsonb_typeof(products) = 'array' then
    jsonb_array_length(products) <= 12
    and not exists (
      select 1 from jsonb_array_elements(products) as item(snapshot)
      where not public.journal_snapshot_valid(item.snapshot)
    )
    and (
      select count(distinct item.snapshot ->> 'id') = jsonb_array_length(products)
      from jsonb_array_elements(products) as item(snapshot)
    )
  else false end;
$$;

create table public.journal_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null check (entry_date between date '0001-01-01' and date '9999-12-31'),
  comfort text not null check (comfort in ('comfortable', 'mixed', 'uncomfortable')),
  routine jsonb check (routine is null or public.journal_snapshot_valid(routine)),
  products jsonb not null default '[]'::jsonb check (public.journal_products_valid(products)),
  notes text not null default '' check (char_length(notes) <= 500),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (user_id, entry_date)
);

create function public.stamp_journal_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  else
    new.updated_at := clock_timestamp();
  end if;
  return new;
end;
$$;

create trigger stamp_journal_entry
before insert or update on public.journal_entries
for each row execute function public.stamp_journal_entry();

alter table public.journal_entries enable row level security;
revoke all on table public.journal_entries from public, anon, authenticated;
grant select, delete on table public.journal_entries to authenticated;
grant insert (user_id, entry_date, comfort, routine, products, notes),
  update (comfort, routine, products, notes)
  on public.journal_entries to authenticated;

create policy "Owners can read journal entries"
on public.journal_entries for select to authenticated
using (user_id = (select auth.uid()));

create policy "Owners can delete journal entries"
on public.journal_entries for delete to authenticated
using (user_id = (select auth.uid()));

create policy "Plus members can create journal entries"
on public.journal_entries for insert to authenticated
with check (
  user_id = (select auth.uid())
  and entry_date <= ((statement_timestamp() at time zone 'UTC')::date + 1)
  and (select entitlement.plus from public.get_billing_entitlement() entitlement)
);

create policy "Plus members can edit journal entries"
on public.journal_entries for update to authenticated
using (
  user_id = (select auth.uid())
  and (select entitlement.plus from public.get_billing_entitlement() entitlement)
)
with check (
  user_id = (select auth.uid())
  and (select entitlement.plus from public.get_billing_entitlement() entitlement)
);
