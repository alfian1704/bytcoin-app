-- BYTCOIN 0002: TON Proof wallet binding, 21M supply, emission pool, referral 2.1 BYC + 21%,
-- withdrawal (min 21 BYC, wallet must hold 21%), task claims, admin RPCs.
-- Safe to re-run.

alter table public.profiles add column if not exists wallet_verified_at timestamptz;
create unique index if not exists profiles_wallet_unique on public.profiles(connected_wallet) where connected_wallet is not null;

-- Emission pool: total BYC the app may ever credit internally (mining + referral + tasks).
-- 12,600,000 BYC = 60% of the 21,000,000 supply. Change cap_nano if you want another split.
create table if not exists public.reward_pool (
  id int primary key check (id = 1),
  cap_nano numeric(40,0) not null,
  issued_nano numeric(40,0) not null default 0 check (issued_nano >= 0),
  check (issued_nano <= cap_nano)
);
alter table public.reward_pool enable row level security;
insert into public.reward_pool(id, cap_nano) values (1, 12600000000000000) on conflict (id) do nothing;

insert into public.app_settings(key, value) values
 ('mining',     '{"duration_seconds":3600,"base_reward_nano_per_hour":"1"}'),
 ('withdrawal', '{"minimum_nano":"21000000000","holding_bps":2100}'),
 ('token',      '{"name":"BYTCOIN","symbol":"BYC","decimals":9,"max_supply_nano":"21000000000000000","jetton_master":"EQA6Jr9Lp2oSryYX89zX8heE9rM7_35p69uDD9RrSaEP-1Dx"}'),
 ('referral',   '{"signup_bonus_nano":"2100000000","mining_share_bps":2100}')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ---------- internal: credit with pool cap + idempotency ----------
create or replace function public._credit(p_tid text, p_amount numeric, p_type text, p_ref_type text, p_ref_id text, p_key text)
returns numeric language plpgsql security definer set search_path=public as $$
declare pool public.reward_pool%rowtype; amt numeric;
begin
  if p_amount <= 0 then return 0; end if;
  select * into pool from public.reward_pool where id = 1 for update;
  amt := least(p_amount, pool.cap_nano - pool.issued_nano);
  if amt <= 0 then return 0; end if;
  insert into public.ledger(telegram_id, entry_type, amount_nano, reference_type, reference_id, idempotency_key)
    values (p_tid, p_type, amt, p_ref_type, p_ref_id, p_key) on conflict (idempotency_key) do nothing;
  if not found then return 0; end if;
  update public.reward_pool set issued_nano = issued_nano + amt where id = 1;
  update public.profiles set balance_nano = balance_nano + amt, updated_at = now() where telegram_id = p_tid;
  return amt;
end $$;

-- ---------- profile / referral registration ----------
create or replace function public.ensure_profile(p_tid text, p_username text, p_first text, p_last text, p_referrer text)
returns void language plpgsql security definer set search_path=public as $$
declare created boolean;
begin
  insert into public.profiles(telegram_id, username, first_name, last_name)
    values (p_tid, p_username, coalesce(p_first,''), p_last)
  on conflict (telegram_id) do update
    set username = excluded.username, first_name = excluded.first_name, last_name = excluded.last_name, updated_at = now()
  returning (xmax = 0) into created;
  -- Referral is recorded only for brand-new accounts (existing users cannot be "referred" later).
  if created and p_referrer is not null and p_referrer <> p_tid
     and exists (select 1 from public.profiles where telegram_id = p_referrer) then
    insert into public.referrals(referrer_telegram_id, referred_telegram_id) values (p_referrer, p_tid)
    on conflict (referred_telegram_id) do nothing;
  end if;
end $$;

create or replace function public.get_profile(p_tid text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.profiles%rowtype; s public.mining_sessions%rowtype; ms jsonb; pool public.reward_pool%rowtype;
begin
  select * into p from public.profiles where telegram_id = p_tid;
  if not found then raise exception 'Profile not found'; end if;
  select * into s from public.mining_sessions where telegram_id = p_tid and status = 'active' order by started_at desc limit 1;
  select value into ms from public.app_settings where key = 'mining';
  select * into pool from public.reward_pool where id = 1;
  return jsonb_build_object(
    'telegram_id', p.telegram_id, 'username', p.username, 'first_name', p.first_name,
    'balance_nano', p.balance_nano::text,
    'connected_wallet', p.connected_wallet,
    'wallet_verified', (p.connected_wallet is not null and p.wallet_verified_at is not null),
    'mining_rate_nano', coalesce(ms->>'base_reward_nano_per_hour', '1'),
    'pool_remaining_nano', (pool.cap_nano - pool.issued_nano)::text,
    'referral_count', (select count(*) from public.referrals where referrer_telegram_id = p_tid),
    'referral_earned_nano', coalesce((select sum(amount_nano) from public.ledger where telegram_id = p_tid and entry_type in ('referral_bonus','referral_mining')), 0)::text,
    'session', case when s.id is null then null else jsonb_build_object('id', s.id, 'status', s.status, 'started_at', s.started_at, 'ends_at', s.ends_at) end,
    'withdrawals', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'amount_nano', w.amount_nano::text, 'status', w.status, 'tx_hash', w.tx_hash, 'created_at', w.created_at) order by w.created_at desc)
                              from (select * from public.withdrawals where telegram_id = p_tid order by created_at desc limit 10) w), '[]'::jsonb)
  );
end $$;

-- ---------- wallet binding (after TON Proof is verified server-side) ----------
create or replace function public.bind_wallet(p_tid text, p_wallet text)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if exists (select 1 from public.profiles where connected_wallet = p_wallet and telegram_id <> p_tid) then
    raise exception 'This wallet is already linked to another account';
  end if;
  update public.profiles set connected_wallet = p_wallet, wallet_verified_at = now(), updated_at = now() where telegram_id = p_tid;
  if not found then raise exception 'Profile not found'; end if;
  return jsonb_build_object('wallet', p_wallet);
exception when unique_violation then
  raise exception 'This wallet is already linked to another account';
end $$;

-- ---------- mining ----------
create or replace function public.start_mining_session(p_telegram_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.profiles%rowtype; s public.mining_sessions%rowtype; settings jsonb; rate numeric(40,0); dur int; pool public.reward_pool%rowtype;
begin
  select * into p from public.profiles where telegram_id = p_telegram_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if p.connected_wallet is null or p.wallet_verified_at is null then raise exception 'Connect your TON wallet first'; end if;
  if exists (select 1 from public.mining_sessions where telegram_id = p_telegram_id and status = 'active') then
    raise exception 'An active mining session already exists';
  end if;
  select * into pool from public.reward_pool where id = 1;
  if pool.cap_nano - pool.issued_nano <= 0 then raise exception 'Mining reward pool is exhausted'; end if;
  select value into settings from public.app_settings where key = 'mining';
  rate := coalesce((settings->>'base_reward_nano_per_hour')::numeric, 1);
  dur  := coalesce((settings->>'duration_seconds')::int, 3600);
  insert into public.mining_sessions(telegram_id, ends_at, reward_rate_nano_per_hour)
    values (p_telegram_id, now() + make_interval(secs => dur), rate) returning * into s;
  return jsonb_build_object('id', s.id, 'started_at', s.started_at, 'ends_at', s.ends_at, 'rate_nano_per_hour', s.reward_rate_nano_per_hour::text);
end $$;

create or replace function public.claim_mining_session(p_telegram_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.mining_sessions%rowtype; p public.profiles%rowtype; r public.referrals%rowtype; rs jsonb;
        reward numeric; credited numeric; bonus numeric := 0; share numeric := 0;
begin
  perform 1 from public.reward_pool where id = 1 for update;            -- lock order: pool -> profiles
  select * into p from public.profiles where telegram_id = p_telegram_id for update;
  if not found then raise exception 'Profile not found'; end if;
  select * into s from public.mining_sessions where telegram_id = p_telegram_id and status = 'active' order by started_at desc limit 1 for update;
  if not found then raise exception 'No active mining session'; end if;
  if now() < s.ends_at then raise exception 'Mining session has not finished'; end if;
  reward := floor(s.reward_rate_nano_per_hour * extract(epoch from (s.ends_at - s.started_at)) / 3600);
  credited := public._credit(p_telegram_id, reward, 'mining_reward', 'mining_session', s.id::text, 'mining:' || s.id::text);
  update public.mining_sessions set status = 'claimed', claimed_at = now(), reward_nano = credited where id = s.id;

  select * into r from public.referrals where referred_telegram_id = p_telegram_id for update;
  if found then
    select value into rs from public.app_settings where key = 'referral';
    if not r.activation_bonus_paid then
      bonus := public._credit(r.referrer_telegram_id, coalesce((rs->>'signup_bonus_nano')::numeric, 2100000000), 'referral_bonus', 'referral', r.id::text, 'refbonus:' || r.id::text);
      update public.referrals set activation_bonus_paid = true, status = 'active' where id = r.id;
    end if;
    -- 21% extra for the referrer, on top of (not deducted from) the friend's reward.
    share := public._credit(r.referrer_telegram_id, floor(credited * coalesce((rs->>'mining_share_bps')::numeric, 2100) / 10000), 'referral_mining', 'mining_session', s.id::text, 'refmine:' || s.id::text);
  end if;
  return jsonb_build_object('session_id', s.id, 'reward_nano', credited::text, 'referral_bonus_nano', bonus::text, 'referrer_share_nano', share::text, 'claimed_at', now());
end $$;

-- ---------- withdrawals ----------
drop function if exists public.request_withdrawal(text, numeric, text);
create or replace function public.request_withdrawal(p_telegram_id text, p_amount_nano numeric, p_onchain_balance_nano numeric)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.profiles%rowtype; w public.withdrawals%rowtype; st jsonb; min_n numeric; bps numeric; required numeric;
begin
  select * into p from public.profiles where telegram_id = p_telegram_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if p.connected_wallet is null or p.wallet_verified_at is null then raise exception 'Connect your TON wallet first'; end if;
  select value into st from public.app_settings where key = 'withdrawal';
  min_n := coalesce((st->>'minimum_nano')::numeric, 21000000000);
  bps   := coalesce((st->>'holding_bps')::numeric, 2100);
  if p_amount_nano < min_n then raise exception 'Minimum withdrawal is % nanoBYC', min_n; end if;
  if p.balance_nano < p_amount_nano then raise exception 'Insufficient internal balance'; end if;
  required := ceil(p_amount_nano * bps / 10000);
  if p_onchain_balance_nano < required then
    raise exception 'Your connected wallet must hold at least 21%% of the withdrawal amount in BYC (% nanoBYC required)', required;
  end if;
  update public.profiles set balance_nano = balance_nano - p_amount_nano, updated_at = now() where telegram_id = p_telegram_id;
  insert into public.withdrawals(telegram_id, amount_nano, destination_wallet) values (p_telegram_id, p_amount_nano, p.connected_wallet) returning * into w;
  insert into public.ledger(telegram_id, entry_type, amount_nano, reference_type, reference_id, idempotency_key)
    values (p_telegram_id, 'withdrawal_lock', -p_amount_nano, 'withdrawal', w.id::text, 'wd:' || w.id::text);
  return jsonb_build_object('id', w.id, 'amount_nano', w.amount_nano::text, 'status', w.status, 'destination', w.destination_wallet);
end $$;

create or replace function public.admin_complete_withdrawal(p_admin text, p_id uuid, p_tx text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare w public.withdrawals%rowtype;
begin
  select * into w from public.withdrawals where id = p_id for update;
  if not found then raise exception 'Withdrawal not found'; end if;
  if w.status not in ('pending','approved') then raise exception 'Withdrawal already %', w.status; end if;
  if coalesce(trim(p_tx),'') = '' then raise exception 'Transaction hash is required'; end if;
  update public.withdrawals set status = 'paid', tx_hash = trim(p_tx), updated_at = now() where id = p_id;
  insert into public.audit_logs(actor_telegram_id, action, target_type, target_id, after_data)
    values (p_admin, 'withdrawal_paid', 'withdrawal', p_id::text, jsonb_build_object('tx_hash', trim(p_tx)));
  return jsonb_build_object('id', p_id, 'status', 'paid');
end $$;

create or replace function public.admin_reject_withdrawal(p_admin text, p_id uuid, p_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare w public.withdrawals%rowtype;
begin
  select * into w from public.withdrawals where id = p_id for update;
  if not found then raise exception 'Withdrawal not found'; end if;
  if w.status not in ('pending','approved') then raise exception 'Withdrawal already %', w.status; end if;
  update public.withdrawals set status = 'rejected', admin_note = p_note, updated_at = now() where id = p_id;
  update public.profiles set balance_nano = balance_nano + w.amount_nano, updated_at = now() where telegram_id = w.telegram_id;
  insert into public.ledger(telegram_id, entry_type, amount_nano, reference_type, reference_id, idempotency_key)
    values (w.telegram_id, 'withdrawal_refund', w.amount_nano, 'withdrawal', p_id::text, 'wdr:' || p_id::text) on conflict (idempotency_key) do nothing;
  insert into public.audit_logs(actor_telegram_id, action, target_type, target_id, after_data)
    values (p_admin, 'withdrawal_rejected', 'withdrawal', p_id::text, jsonb_build_object('note', p_note));
  return jsonb_build_object('id', p_id, 'status', 'rejected');
end $$;

-- ---------- tasks ----------
create or replace function public.claim_task(p_telegram_id text, p_task_id uuid, p_verified boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare t public.tasks%rowtype; c public.task_claims%rowtype; credited numeric := 0;
begin
  perform 1 from public.reward_pool where id = 1 for update;
  perform 1 from public.profiles where telegram_id = p_telegram_id for update;
  if not found then raise exception 'Profile not found'; end if;
  select * into t from public.tasks where id = p_task_id and active = true;
  if not found then raise exception 'Task not available'; end if;
  if (t.starts_at is not null and now() < t.starts_at) or (t.ends_at is not null and now() > t.ends_at) then raise exception 'Task is not active right now'; end if;
  if t.max_claims is not null and (select count(*) from public.task_claims where task_id = t.id and status in ('pending','approved','paid')) >= t.max_claims then
    raise exception 'Task reward limit reached';
  end if;
  if exists (select 1 from public.task_claims where task_id = t.id and telegram_id = p_telegram_id) then raise exception 'Task already claimed'; end if;
  if p_verified then
    insert into public.task_claims(task_id, telegram_id, status, reward_nano, verified_by, approved_at) values (t.id, p_telegram_id, 'paid', t.reward_nano, 'auto', now()) returning * into c;
    credited := public._credit(p_telegram_id, t.reward_nano, 'task_reward', 'task_claim', c.id::text, 'task:' || c.id::text);
    return jsonb_build_object('status', 'paid', 'reward_nano', credited::text);
  end if;
  insert into public.task_claims(task_id, telegram_id, status, reward_nano) values (t.id, p_telegram_id, 'pending', t.reward_nano) returning * into c;
  return jsonb_build_object('status', 'pending', 'reward_nano', '0');
end $$;

create or replace function public.admin_review_task_claim(p_admin text, p_claim uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.task_claims%rowtype; credited numeric := 0;
begin
  perform 1 from public.reward_pool where id = 1 for update;
  select * into c from public.task_claims where id = p_claim for update;
  if not found then raise exception 'Claim not found'; end if;
  if c.status <> 'pending' then raise exception 'Claim already %', c.status; end if;
  if p_approve then
    update public.task_claims set status = 'paid', verified_by = p_admin, approved_at = now() where id = p_claim;
    credited := public._credit(c.telegram_id, c.reward_nano, 'task_reward', 'task_claim', c.id::text, 'task:' || c.id::text);
  else
    update public.task_claims set status = 'rejected', verified_by = p_admin where id = p_claim;
  end if;
  insert into public.audit_logs(actor_telegram_id, action, target_type, target_id, after_data)
    values (p_admin, case when p_approve then 'task_claim_approved' else 'task_claim_rejected' end, 'task_claim', p_claim::text, jsonb_build_object('credited', credited::text));
  return jsonb_build_object('id', p_claim, 'credited_nano', credited::text);
end $$;

-- ---------- permissions: service_role only ----------
revoke all on function public._credit(text,numeric,text,text,text,text) from public, anon, authenticated;
revoke all on function public.ensure_profile(text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.get_profile(text) from public, anon, authenticated;
revoke all on function public.bind_wallet(text,text) from public, anon, authenticated;
revoke all on function public.start_mining_session(text) from public, anon, authenticated;
revoke all on function public.claim_mining_session(text) from public, anon, authenticated;
revoke all on function public.request_withdrawal(text,numeric,numeric) from public, anon, authenticated;
revoke all on function public.admin_complete_withdrawal(text,uuid,text) from public, anon, authenticated;
revoke all on function public.admin_reject_withdrawal(text,uuid,text) from public, anon, authenticated;
revoke all on function public.claim_task(text,uuid,boolean) from public, anon, authenticated;
revoke all on function public.admin_review_task_claim(text,uuid,boolean) from public, anon, authenticated;
grant execute on function public.ensure_profile(text,text,text,text,text) to service_role;
grant execute on function public.get_profile(text) to service_role;
grant execute on function public.bind_wallet(text,text) to service_role;
grant execute on function public.start_mining_session(text) to service_role;
grant execute on function public.claim_mining_session(text) to service_role;
grant execute on function public.request_withdrawal(text,numeric,numeric) to service_role;
grant execute on function public.admin_complete_withdrawal(text,uuid,text) to service_role;
grant execute on function public.admin_reject_withdrawal(text,uuid,text) to service_role;
grant execute on function public.claim_task(text,uuid,boolean) to service_role;
grant execute on function public.admin_review_task_claim(text,uuid,boolean) to service_role;
