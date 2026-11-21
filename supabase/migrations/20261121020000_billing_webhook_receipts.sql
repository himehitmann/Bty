create table public.billing_event_receipts (
  live_mode boolean not null,
  stripe_event_id text not null check (char_length(stripe_event_id) between 5 and 255),
  processed_at timestamptz not null default statement_timestamp(),
  primary key (live_mode, stripe_event_id)
);

create index billing_event_receipts_processed_idx on public.billing_event_receipts (processed_at);
alter table public.billing_event_receipts enable row level security;
revoke all on public.billing_event_receipts from public, anon, authenticated;
grant select, insert, delete on public.billing_event_receipts to service_role;
grant update (processed_at) on public.billing_event_receipts to service_role;

-- Reserve an ordering number before querying Stripe. A failed query must not
-- change the last applied state or prevent a successful earlier query applying.
create function public.reserve_billing_event(event_id text, customer_id text, request_live boolean)
returns bigint
language sql
set search_path = ''
as $$
  select case when exists (
    select 1 from public.billing_customers where stripe_customer_id = customer_id and live_mode = request_live
  ) and not exists (
    select 1 from public.billing_event_receipts where stripe_event_id = event_id and live_mode = request_live
  ) then nextval('public.billing_reconciliation_version') end;
$$;

create function public.apply_billing_event(
  event_id text, customer_id text, subscription_id text, request_live boolean,
  observed_version bigint, subscription_status text, eligible_price boolean, eligible_period_end timestamptz
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  account_id uuid;
begin
  select user_id into account_id from public.billing_customers
    where stripe_customer_id = customer_id and live_mode = request_live;
  if account_id is null then return; end if;

  -- Claim a delivery and apply its successful observation in one transaction.
  insert into public.billing_event_receipts (live_mode, stripe_event_id)
    values (request_live, event_id) on conflict do nothing;
  if not found then return; end if;

  insert into public.billing_subscriptions (
    stripe_subscription_id, user_id, live_mode, reconciliation_version, status, plus_price, period_end
  ) values (subscription_id, account_id, request_live, observed_version, subscription_status, eligible_price, eligible_period_end)
  on conflict (stripe_subscription_id) do update set
    reconciliation_version = excluded.reconciliation_version,
    status = excluded.status, plus_price = excluded.plus_price, period_end = excluded.period_end
  where billing_subscriptions.user_id = excluded.user_id and billing_subscriptions.live_mode = excluded.live_mode
    and billing_subscriptions.reconciliation_version < excluded.reconciliation_version;

  -- Keep receipts beyond Stripe's 30-day manual resend window with bounded upkeep.
  delete from public.billing_event_receipts where (live_mode, stripe_event_id) in (
    select live_mode, stripe_event_id from public.billing_event_receipts
      where processed_at < statement_timestamp() - interval '35 days'
      order by processed_at limit 50 for update skip locked
  );
end;
$$;

revoke all on function public.reserve_billing_event(text, text, boolean),
  public.apply_billing_event(text, text, text, boolean, bigint, text, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_billing_event(text, text, boolean),
  public.apply_billing_event(text, text, text, boolean, bigint, text, boolean, timestamptz) to service_role;
