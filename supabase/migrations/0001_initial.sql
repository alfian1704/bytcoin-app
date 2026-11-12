create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  telegram_id text unique not null,
  username text,
  first_name text not null default '',
  last_name text,
  balance_nano numeric(40,0) not null default 0 check (balance_nano >= 0),
  verified boolean not null default false,
  connected_wallet text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mining_sessions (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null references public.profiles(telegram_id),
  status text not null default 'active' check(status in ('active','claimed','expired')),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '1 hour'),
  reward_rate_nano_per_hour numeric(40,0) not null,
  claimed_at timestamptz,
  reward_nano numeric(40,0),
  created_at timestamptz not null default now()
);
create unique index if not exists one_active_mining_per_user
  on public.mining_sessions(telegram_id) where status='active';

create table if not exists public.ledger (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null references public.profiles(telegram_id),
  entry_type text not null,
  amount_nano numeric(40,0) not null,
  reference_type text,
  reference_id text,
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  reward_nano numeric(40,0) not null default 0 check(reward_nano >= 0),
  task_type text not null,
  target_url text,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  max_claims integer,
  per_user_limit integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_claims (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id),
  telegram_id text not null references public.profiles(telegram_id),
  status text not null default 'pending' check(status in ('pending','approved','rejected','paid')),
  reward_nano numeric(40,0) not null,
  verified_by text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
create unique index if not exists task_claim_once
  on public.task_claims(task_id,telegram_id);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_telegram_id text not null references public.profiles(telegram_id),
  referred_telegram_id text unique not null references public.profiles(telegram_id),
  status text not null default 'pending',
  activation_bonus_paid boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null references public.profiles(telegram_id),
  amount_nano numeric(40,0) not null check(amount_nano > 0),
  destination_wallet text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected','paid')),
  tx_hash text unique,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activation_payments (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null references public.profiles(telegram_id),
  sender_wallet text not null,
  tx_hash text unique not null,
  amount_nano numeric(40,0) not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  reviewed_by text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.ad_revenue (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  currency text not null,
  gross_amount numeric(30,10) not null default 0,
  fees numeric(30,10) not null default 0,
  refunds numeric(30,10) not null default 0,
  net_amount numeric(30,10) generated always as (gross_amount-fees-refunds) stored,
  evidence_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  check(period_end > period_start),
  check(gross_amount >= 0 and fees >= 0 and refunds >= 0)
);

create table if not exists public.holder_snapshots (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null references public.profiles(telegram_id),
  wallet_address text not null,
  eligible_nano numeric(40,0) not null default 0,
  snapshot_at timestamptz not null,
  holding_since timestamptz,
  source_tx_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.revenue_distributions (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  holder_pool_bcy_nano numeric(40,0) not null default 0,
  buyback_budget numeric(30,10) not null default 0,
  conversion_price numeric(30,10),
  status text not null default 'draft',
  report_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.burn_events (
  id uuid primary key default gen_random_uuid(),
  distribution_id uuid references public.revenue_distributions(id),
  amount_nano numeric(40,0) not null,
  tx_hash text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_telegram_id text not null,
  action text not null,
  target_type text,
  target_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.mining_sessions enable row level security;
alter table public.ledger enable row level security;
alter table public.tasks enable row level security;
alter table public.task_claims enable row level security;
alter table public.referrals enable row level security;
alter table public.withdrawals enable row level security;
alter table public.activation_payments enable row level security;
alter table public.ad_revenue enable row level security;
alter table public.holder_snapshots enable row level security;
alter table public.revenue_distributions enable row level security;
alter table public.burn_events enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_logs enable row level security;

-- No public table policies are granted. Server routes use the service-role key
-- only after validating Telegram initData. Never expose the service key.

insert into public.app_settings(key,value) values
 ('mining', '{"duration_seconds":3600,"base_reward_nano_per_hour":"1000000000","holding_extra_nano_per_whole_BYT_per_hour":"1","extra_cap_nano_per_hour":"1000000000"}'),
 ('withdrawal', '{"minimum_nano":"2100000000000","holding_bps":1000}'),
 ('token', '{"name":"BYTCOIN","symbol":"BYT","decimals":9,"max_supply_nano":"21000000000000000000"}'),
 ('post_mining', '{"holder_share_bps":5000,"buyback_burn_share_bps":5000,"holding_days":30,"enabled":false}')
on conflict(key) do nothing;

create or replace function public.start_mining_session(p_telegram_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  p public.profiles%rowtype;
  s public.mining_sessions%rowtype;
  base_rate numeric(40,0);
  extra_cap numeric(40,0);
  rate numeric(40,0);
  holding_whole numeric(40,0) := 0;
  settings jsonb;
begin
  select * into p from public.profiles where telegram_id=p_telegram_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if not p.verified then raise exception 'Wallet/account verification required'; end if;
  if exists(select 1 from public.mining_sessions where telegram_id=p_telegram_id and status='active') then
    raise exception 'An active mining session already exists';
  end if;
  select value into settings from public.app_settings where key='mining';
  base_rate := coalesce((settings->>'base_reward_nano_per_hour')::numeric,1000000000);
  extra_cap := coalesce((settings->>'extra_cap_nano_per_hour')::numeric,1000000000);
  -- Fail closed: holding bonus remains zero until a trusted Jetton indexer
  -- and verified holding snapshot are implemented. A connected wallet alone
  -- is never proof of token ownership.
  holding_whole := 0;
  rate := base_rate + least(holding_whole,extra_cap);
  insert into public.mining_sessions(telegram_id,ends_at,reward_rate_nano_per_hour)
  values(p_telegram_id,now()+interval '1 hour',rate) returning * into s;
  return jsonb_build_object('id',s.id,'started_at',s.started_at,'ends_at',s.ends_at,'rate_nano_per_hour',s.reward_rate_nano_per_hour);
end $$;

create or replace function public.claim_mining_session(p_telegram_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  s public.mining_sessions%rowtype;
  p public.profiles%rowtype;
  reward numeric(40,0);
  key text;
begin
  select * into p from public.profiles where telegram_id=p_telegram_id for update;
  if not found then raise exception 'Profile not found'; end if;
  select * into s from public.mining_sessions
   where telegram_id=p_telegram_id and status='active'
   order by started_at desc limit 1 for update;
  if not found then raise exception 'No active mining session'; end if;
  if now() < s.ends_at then raise exception 'Mining session has not finished'; end if;
  reward := floor(s.reward_rate_nano_per_hour * extract(epoch from (s.ends_at-s.started_at))/3600);
  key := 'mining:'||s.id::text;
  update public.mining_sessions set status='claimed',claimed_at=now(),reward_nano=reward where id=s.id;
  update public.profiles set balance_nano=balance_nano+reward,updated_at=now() where telegram_id=p_telegram_id;
  insert into public.ledger(telegram_id,entry_type,amount_nano,reference_type,reference_id,idempotency_key)
   values(p_telegram_id,'mining_reward',reward,'mining_session',s.id::text,key)
   on conflict(idempotency_key) do nothing;
  return jsonb_build_object('session_id',s.id,'reward_nano',reward,'claimed_at',now());
end $$;

create or replace function public.request_withdrawal(
  p_telegram_id text,p_amount_nano numeric,p_wallet_address text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.profiles%rowtype; w public.withdrawals%rowtype; min_n numeric; holding_bps integer;
begin
  select * into p from public.profiles where telegram_id=p_telegram_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if p_amount_nano < 2100000000000 then raise exception 'Minimum withdrawal is 2,100 BYT'; end if;
  if p.balance_nano < p_amount_nano then raise exception 'Insufficient internal balance'; end if;
  select (value->>'minimum_nano')::numeric,(value->>'holding_bps')::integer
    into min_n,holding_bps from public.app_settings where key='withdrawal';
  -- On-chain holding must be checked by the trusted indexer before this RPC is enabled.
  raise exception 'On-chain holding verification adapter is not configured; withdrawal disabled';
end $$;

revoke all on function public.start_mining_session(text) from public, anon, authenticated;
revoke all on function public.claim_mining_session(text) from public, anon, authenticated;
revoke all on function public.request_withdrawal(text,numeric,text) from public, anon, authenticated;
grant execute on function public.start_mining_session(text) to service_role;
grant execute on function public.claim_mining_session(text) to service_role;
grant execute on function public.request_withdrawal(text,numeric,text) to service_role;
