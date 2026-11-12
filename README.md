# BYTCOIN (BYT) — Telegram Mini App

Jetton master (TON mainnet): `EQA6Jr9Lp2oSryYX89zX8heE9rM7_35p69uDD9RrSaEP-1Dx` — max supply 21,000,000 BYT.

## Rules implemented
| Area | Rule |
|---|---|
| Allocation (whitepaper) | Miner/Community 10,500,000 (50%) · Team/Dev 2,100,000 (10%) · Treasury/Buy-back 2,100,000 (10%) · Liquidity 6,300,000 (30%) |
| Wallet | TON Connect + TON Proof (free signature). One wallet = one account. No verification fee |
| Mining | 2.1 BYT/day = 0.0875 BYT/hour. 1-hour session → Claim → Start again (never auto-restarts). Rewards capped by `reward_pool` = 10,500,000 BYT |
| Referral | 2.1 BYT on friend's first claim + 21% of each friend claim (extra, not deducted) |
| Tasks | `telegram_join` auto-verified (bot must be admin of the channel); others admin-reviewed |
| Withdraw | min 21 BYT · verified wallet must hold ≥ 21% of the amount (read on-chain, not deducted) · **10% fee deducted from the amount and kept by treasury** · admin sends the net amount manually |
| Swap (STON.fi) | App fee **1% on buy (TON)**, **2% on sell (BYT)** → `NEXT_PUBLIC_FEE_WALLET`. Disabled until `NEXT_PUBLIC_SWAP_ENABLED=true` |
| Languages | Indonesian + English (auto from Telegram, ID/EN toggle), splash screen, onboarding, `/whitepaper` |

## Setup
1. `npm install` (an `.npmrc` with `legacy-peer-deps=true` is included).
2. Copy `.env.example` → Vercel Environment Variables (or `.env.local`) and fill in. Never commit secrets.
3. Supabase SQL Editor — run **in order**: `0001_initial.sql`, `0002_ton_proof_referral_pool.sql`, `0003_allocation_rate_withdraw_fee.sql`.
4. Deploy on Vercel, set `NEXT_PUBLIC_APP_URL` to the final URL, redeploy.
5. BotFather: Mini App URL = your Vercel URL; menu button. Referral links: `https://t.me/<bot>?startapp=ref_<id>`.
6. Open `/api/health`, then test from Telegram with a small account: connect → start → (1h) claim.
7. Admin: put your Telegram ID in `ADMIN_TELEGRAM_IDS`, open `/admin`.

## Treasury (important)
- The wallet that pays withdrawals must hold the community allocation (10,500,000 BYT). Withdrawal fee (10%) simply stays in it.
- Withdrawals need the user's wallet to already hold BYT (21%). Users can only get BYT from a DEX, so **withdrawals become practically usable after the liquidity pool exists**.

## Launch order for swap
1. Create the BYT/TON pool on STON.fi (you provide liquidity).
2. Test a tiny buy and sell with your own wallet; verify the fee wallet received 1% / 2%.
3. Set `NEXT_PUBLIC_SWAP_ENABLED=true` and redeploy.

The app fee only applies to trades made inside this app; anyone can trade directly on the DEX.

## Change values later (SQL)
```sql
-- mining speed (nanoBYT per hour); 87500000 = 0.0875 BYT/h = 2.1 BYT/day
update public.app_settings set value = jsonb_set(value,'{base_reward_nano_per_hour}','"87500000"') where key='mining';
-- withdrawal fee in basis points (1000 = 10%)
update public.app_settings set value = jsonb_set(value,'{fee_bps}','1000') where key='withdrawal';
```
Buy/sell fee percentages are in `src/lib/config.ts` (`buyFeeBps`, `sellFeeBps`).

## Security
- Keep `TELEGRAM_BOT_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `TON_API_KEY` only in server env. Rotate anything that was ever pasted in a chat.
- The app never holds private keys; payouts are manual from your treasury wallet.
