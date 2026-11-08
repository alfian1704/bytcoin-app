# Editing guide
- Texts (Indonesian/English) and whitepaper content: `src/lib/i18n.ts`. Allocation numbers: `ALLOCATION` in `src/lib/config.ts`.
- Mining speed / session length / referral % / withdrawal limits+fee: table `app_settings` (keys `mining`, `referral`, `withdrawal`).
- Emission cap: `update public.reward_pool set cap_nano = <nanoBYC> where id = 1;` (not below `issued_nano`).
- Swap: `src/lib/swap.ts` (STON.fi DEX v2). Fees: `TOKEN.buyFeeBps` / `TOKEN.sellFeeBps`. Fee wallet: `NEXT_PUBLIC_FEE_WALLET`.
- Tasks: `/admin`. `telegram_join` + `https://t.me/username` = auto-verified, anything else = manual review.
