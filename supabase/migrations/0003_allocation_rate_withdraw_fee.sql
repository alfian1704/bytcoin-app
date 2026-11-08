-- BYTCOIN 0003: allocation (miner/community pool 10.5M = 50%), mining 2.1 BYC/day (0.0875/hour),
-- withdrawal fee 10% retained by treasury. Safe to re-run.

-- Mining speed: 2.1 BYC / 24 h = 0.0875 BYC per hour = 87,500,000 nanoBYC. Sessions stay 1 hour (start -> claim -> start).
update public.app_settings
   set value = '{"duration_seconds":3600,"base_reward_nano_per_hour":"87500000"}'::jsonb, updated_at = now()
 where key = 'mining';

-- Community/miner pool: 10,500,000 BYC (50% of 21,000,000). Never lowered below what is already issued.
update public.reward_pool set cap_nano = 10500000000000000 where id = 1 and issued_nano <= 10500000000000000;

-- Withdrawal: min 21 BYC, wallet must hold 21% of the amount, 10% fee deducted from the withdrawn amount.
update public.app_settings
   set value = '{"minimum_nano":"21000000000","holding_bps":2100,"fee_bps":1000}'::jsonb, updated_at = now()
 where key = 'withdrawal';

insert into public.app_settings(key, value) values
 ('allocation', '{"community_miner_nano":"10500000000000000","team_dev_nano":"2100000000000000","treasury_buyback_nano":"2100000000000000","liquidity_nano":"6300000000000000"}')
on conflict (key) do update set value = excluded.value, updated_at = now();

alter table public.withdrawals add column if not exists fee_nano numeric(40,0) not null default 0;
alter table public.withdrawals add column if not exists net_nano numeric(40,0);

create or replace function public.request_withdrawal(p_telegram_id text, p_amount_nano numeric, p_onchain_balance_nano numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.profiles%rowtype; w public.withdrawals%rowtype; st jsonb; min_n numeric; bps numeric; fee_bps numeric; required numeric; fee numeric; net numeric;
begin
  select * into p from public.profiles where telegram_id = p_telegram_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if p.connected_wallet is null or p.wallet_verified_at is null then raise exception 'Connect your TON wallet first'; end if;
  select value into st from public.app_settings where key = 'withdrawal';
  min_n   := coalesce((st->>'minimum_nano')::numeric, 21000000000);
  bps     := coalesce((st->>'holding_bps')::numeric, 2100);
  fee_bps := coalesce((st->>'fee_bps')::numeric, 1000);
  if p_amount_nano < min_n then raise exception 'Minimum withdrawal is 21 BYC'; end if;
  if p.balance_nano < p_amount_nano then raise exception 'Insufficient internal balance'; end if;
  required := ceil(p_amount_nano * bps / 10000);
  if p_onchain_balance_nano < required then
    raise exception 'Your connected wallet must hold at least 21%% of the withdrawal amount in BYC (% nanoBYC required). Buy BYC in the Swap tab first.', required;
  end if;
  fee := floor(p_amount_nano * fee_bps / 10000);     -- retained by treasury (never sent)
  net := p_amount_nano - fee;                         -- what the admin sends to the user
  update public.profiles set balance_nano = balance_nano - p_amount_nano, updated_at = now() where telegram_id = p_telegram_id;
  insert into public.withdrawals(telegram_id, amount_nano, destination_wallet, fee_nano, net_nano)
    values (p_telegram_id, p_amount_nano, p.connected_wallet, fee, net) returning * into w;
  insert into public.ledger(telegram_id, entry_type, amount_nano, reference_type, reference_id, idempotency_key, metadata)
    values (p_telegram_id, 'withdrawal_lock', -p_amount_nano, 'withdrawal', w.id::text, 'wd:' || w.id::text, jsonb_build_object('fee_nano', fee::text, 'net_nano', net::text));
  return jsonb_build_object('id', w.id, 'amount_nano', w.amount_nano::text, 'fee_nano', fee::text, 'net_nano', net::text, 'status', w.status, 'destination', w.destination_wallet);
end $$;

create or replace function public.get_profile(p_tid text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.profiles%rowtype; s public.mining_sessions%rowtype; ms jsonb; ws jsonb; pool public.reward_pool%rowtype;
begin
  select * into p from public.profiles where telegram_id = p_tid;
  if not found then raise exception 'Profile not found'; end if;
  select * into s from public.mining_sessions where telegram_id = p_tid and status = 'active' order by started_at desc limit 1;
  select value into ms from public.app_settings where key = 'mining';
  select value into ws from public.app_settings where key = 'withdrawal';
  select * into pool from public.reward_pool where id = 1;
  return jsonb_build_object(
    'telegram_id', p.telegram_id, 'username', p.username, 'first_name', p.first_name,
    'balance_nano', p.balance_nano::text,
    'connected_wallet', p.connected_wallet,
    'wallet_verified', (p.connected_wallet is not null and p.wallet_verified_at is not null),
    'mining_rate_nano', coalesce(ms->>'base_reward_nano_per_hour', '87500000'),
    'withdraw_fee_bps', coalesce((ws->>'fee_bps')::int, 1000),
    'pool_remaining_nano', (pool.cap_nano - pool.issued_nano)::text,
    'referral_count', (select count(*) from public.referrals where referrer_telegram_id = p_tid),
    'referral_earned_nano', coalesce((select sum(amount_nano) from public.ledger where telegram_id = p_tid and entry_type in ('referral_bonus','referral_mining')), 0)::text,
    'session', case when s.id is null then null else jsonb_build_object('id', s.id, 'status', s.status, 'started_at', s.started_at, 'ends_at', s.ends_at) end,
    'withdrawals', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'amount_nano', w.amount_nano::text, 'fee_nano', w.fee_nano::text, 'net_nano', coalesce(w.net_nano, w.amount_nano)::text, 'status', w.status, 'tx_hash', w.tx_hash, 'created_at', w.created_at) order by w.created_at desc)
                              from (select * from public.withdrawals where telegram_id = p_tid order by created_at desc limit 10) w), '[]'::jsonb)
  );
end $$;

revoke all on function public.request_withdrawal(text,numeric,numeric) from public, anon, authenticated;
revoke all on function public.get_profile(text) from public, anon, authenticated;
grant execute on function public.request_withdrawal(text,numeric,numeric) to service_role;
grant execute on function public.get_profile(text) to service_role;
