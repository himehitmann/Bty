create table public.billing_settings (
  singleton boolean primary key default true check (singleton),
  live_mode boolean not null default false
);
insert into public.billing_settings default values;

create table public.billing_customers (
  user_id uuid not null references auth.users (id) on delete cascade,
  live_mode boolean not null,
  stripe_customer_id text not null unique,
  checkout_nonce uuid,
  checkout_session_id text,
  checkout_lease_until timestamptz,
  primary key (user_id, live_mode)
);

create table public.billing_subscriptions (
  stripe_subscription_id text primary key,
  user_id uuid not null,
  live_mode boolean not null,
  reconciliation_version bigint not null,
  status text not null default 'pending',
  plus_price boolean not null default false,
  period_end timestamptz,
  foreign key (user_id, live_mode) references public.billing_customers (user_id, live_mode) on delete cascade
);

create index billing_subscriptions_user_id_idx on public.billing_subscriptions (user_id);
create sequence public.billing_reconciliation_version;

alter table public.billing_settings enable row level security;
alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;

revoke all on public.billing_settings, public.billing_customers, public.billing_subscriptions from public, anon, authenticated;
grant select on public.billing_settings to service_role;
grant select, insert, update on public.billing_customers, public.billing_subscriptions to service_role;
revoke all on sequence public.billing_reconciliation_version from public, anon, authenticated;
grant usage on sequence public.billing_reconciliation_version to service_role;

create function public.get_billing_entitlement()
returns table (plus boolean, manageable boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.billing_subscriptions
    where user_id = (select auth.uid())
      and live_mode = (select live_mode from public.billing_settings where singleton)
      and plus_price
      and status in ('active', 'trialing')
      and period_end > statement_timestamp()
  ), exists (
    select 1 from public.billing_customers
    where user_id = (select auth.uid())
      and live_mode = (select live_mode from public.billing_settings where singleton)
  );
$$;

create function public.claim_billing_checkout(account_id uuid, claim_id uuid, request_live boolean)
returns table (claimed boolean, session_id text)
language plpgsql
set search_path = ''
as $$
begin
  update public.billing_customers
    set checkout_nonce = claim_id, checkout_session_id = null,
        checkout_lease_until = clock_timestamp() + interval '33 minutes'
    where user_id = account_id and live_mode = request_live
      and (checkout_lease_until is null or checkout_lease_until <= clock_timestamp());
  if found then
    return query select true, null::text;
  else
    return query select false, checkout_session_id from public.billing_customers
      where user_id = account_id and live_mode = request_live;
  end if;
end;
$$;

create function public.begin_billing_reconciliation(customer_id text, subscription_id text, request_live boolean)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  observed_version bigint;
  account_id uuid;
begin
  select user_id into account_id from public.billing_customers
    where stripe_customer_id = customer_id and live_mode = request_live;
  if account_id is null then return null; end if;

  insert into public.billing_subscriptions (stripe_subscription_id, user_id, live_mode, reconciliation_version)
    values (subscription_id, account_id, request_live, nextval('public.billing_reconciliation_version'))
    on conflict (stripe_subscription_id) do update
      set reconciliation_version = nextval('public.billing_reconciliation_version')
      where billing_subscriptions.user_id = excluded.user_id and billing_subscriptions.live_mode = excluded.live_mode
    returning reconciliation_version into observed_version;

  return observed_version;
end;
$$;

revoke all on function public.get_billing_entitlement() from public, anon;
revoke all on function public.claim_billing_checkout(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.begin_billing_reconciliation(text, text, boolean) from public, anon, authenticated;
grant execute on function public.get_billing_entitlement() to authenticated, service_role;
grant execute on function public.claim_billing_checkout(uuid, uuid, boolean),
  public.begin_billing_reconciliation(text, text, boolean) to service_role;
