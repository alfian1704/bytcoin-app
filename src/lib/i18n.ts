export type Lang = "id" | "en";
type Dict = Record<string, string>;

export const T: Record<Lang, Dict> = {
  id: {
    loading: "Memuat…", openTg: "Buka aplikasi ini dari Telegram untuk masuk.", loadingAcc: "Memuat akun…",
    balance: "Total saldo BYC", balanceSub: "Saldo reward internal. Tarik ke wallet dari tab Wallet.",
    wallet: "Wallet", notConnected: "Belum terhubung", verifying: "Memverifikasi…", rate: "Kecepatan mining", perHour: "/jam",
    mining: "Mining", session: "Sesi", active: "Aktif", ready: "Siap diklaim", idle: "Diam",
    miningNote: "Mining berhenti setelah 1 jam. Klaim, lalu tekan Start Mining lagi.",
    start: "START MINING", claim: "CLAIM REWARD", mining_btn: "MINING…", connectFirst: "Hubungkan wallet TON (tab Wallet) untuk mulai mining.",
    supplyNote: "Suplai maksimum tetap 21.000.000 BYC. Minting sudah dicabut; reward berasal dari pool komunitas yang dibatasi.",
    cycle: "Siklus mining", poolLeft: "Sisa pool", whitepaper: "Baca Whitepaper",
    tasks: "Pusat Task", noTasks: "Belum ada task aktif.", done: "Selesai", review: "Direview", rejected: "Ditolak", joinClaim: "Gabung & Klaim", claimBtn: "Klaim",
    tasksNote: "Task gabung Telegram diverifikasi otomatis. Task lain direview admin sebelum reward dibayar.",
    invite: "Undang teman", inviteText: "Per teman yang bergabung dan melakukan claim mining pertamanya, ditambah 21% dari setiap reward mining mereka. Bonus 21% adalah tambahan — tidak mengurangi reward teman Anda.",
    friends: "Teman", earned: "Diperoleh", setBot: "Isi NEXT_PUBLIC_TELEGRAM_BOT_USERNAME untuk mengaktifkan", copy: "Salin link referral", copied: "Link referral disalin.", share: "BAGIKAN", shareText: "Ayo mining BYC bersamaku di Telegram!",
    tonWallet: "Wallet TON", walletInfo: "Hubungkan dengan TON Connect. Anda hanya menandatangani bukti gratis — tanpa biaya dan tanpa pembayaran.",
    connect: "HUBUNGKAN WALLET TON", manage: "KELOLA WALLET", verified: "✓ terverifikasi", notVerified: "Sesi wallet ini belum terverifikasi. Hubungkan ulang untuk menandatangani bukti.", reconnect: "HUBUNGKAN ULANG & VERIFIKASI",
    master: "Jetton Master BYC",
    withdraw: "Penarikan", minWd: "Minimum 21 BYC",
    wdInfo: "Wallet terverifikasi harus menyimpan minimal 21% dari jumlah penarikan dalam BYC (hanya dicek, tidak dipotong). Biaya penarikan 10% dipotong dari jumlah yang ditarik. Penarikan dikirim tim setelah review.",
    amountPh: "Jumlah dalam BYC", wdBtn: "AJUKAN PENARIKAN", wdPreview: "Anda menerima", wdFee: "Biaya 10%", recentWd: "Penarikan terakhir",
    swap: "Beli / Jual BYC", swapSoon: "Swap dibuka setelah pool likuiditas BYC diluncurkan. Pantau pengumuman resmi.",
    buy: "Beli", sell: "Jual", youPayTon: "Jumlah TON yang dibayar", youSellByc: "Jumlah BYC yang dijual", getQuote: "HITUNG HARGA", confirmSwap: "KONFIRMASI DI WALLET",
    fee: "Biaya aplikasi", swapped: "Di-swap", estReceive: "Estimasi diterima", minReceive: "Minimum diterima", swapNote: "Biaya aplikasi: beli 1%, jual 2%. Belum termasuk gas jaringan TON dan biaya DEX. Siapa pun tetap bisa trading langsung di DEX tanpa biaya aplikasi.",
    swapFail: "Pool tidak tersedia atau gagal menghitung harga.", sent: "Transaksi dikirim ke wallet. Cek status di Tonviewer.",
    nav_home: "Beranda", nav_mining: "Mining", nav_tasks: "Task", nav_referral: "Undang", nav_swap: "Swap", nav_wallet: "Wallet",
    success: "Berhasil.", walletVerified: "Wallet terverifikasi.",
    err_hold: "Wallet Anda harus menyimpan minimal 21% dari jumlah penarikan dalam BYC. Beli BYC di tab Swap terlebih dulu.",
    err_min: "Minimum penarikan adalah 21 BYC.", err_wallet: "Hubungkan dan verifikasi wallet TON terlebih dulu.",
    ob1t: "Selamat datang di BYTCOIN", ob1: "Mining BYC langsung dari Telegram. Hubungkan wallet TON — tanpa biaya verifikasi.",
    ob2t: "Mining tiap jam", ob2: "2,1 BYC per hari lewat sesi 1 jam: Start, tunggu 1 jam, Claim, lalu Start lagi.",
    ob3t: "Tarik ke wallet Anda", ob3: "Minimum 21 BYC, wallet menyimpan 21% dari jumlah tarik, biaya penarikan 10%. Baca whitepaper untuk detail.",
    next: "LANJUT", begin: "MULAI", skip: "Lewati"
  },
  en: {
    loading: "Loading…", openTg: "Open this app from Telegram to sign in.", loadingAcc: "Loading account…",
    balance: "Total BYC balance", balanceSub: "Internal reward balance. Withdraw to your wallet from the Wallet tab.",
    wallet: "Wallet", notConnected: "Not connected", verifying: "Verifying…", rate: "Mining rate", perHour: "/h",
    mining: "Mining", session: "Session", active: "Active", ready: "Ready to claim", idle: "Idle",
    miningNote: "Mining stops after 1 hour. Claim, then press Start Mining again.",
    start: "START MINING", claim: "CLAIM REWARD", mining_btn: "MINING…", connectFirst: "Connect your TON wallet (Wallet tab) to start mining.",
    supplyNote: "Max supply is fixed at 21,000,000 BYC. Minting is revoked; rewards come from a capped community pool.",
    cycle: "Mining cycle", poolLeft: "Pool left", whitepaper: "Read Whitepaper",
    tasks: "Task Center", noTasks: "No active tasks yet.", done: "Done", review: "In review", rejected: "Rejected", joinClaim: "Join & Claim", claimBtn: "Claim",
    tasksNote: "Telegram-join tasks are verified automatically. Other tasks are reviewed by an admin before the reward is paid.",
    invite: "Invite friends", inviteText: "Per friend who joins and completes their first mining claim, plus 21% of every mining reward they claim. The 21% is extra — it is not taken from your friend.",
    friends: "Friends", earned: "Earned", setBot: "Set NEXT_PUBLIC_TELEGRAM_BOT_USERNAME to enable", copy: "Copy referral link", copied: "Referral link copied.", share: "SHARE", shareText: "Mine BYC with me on Telegram!",
    tonWallet: "TON Wallet", walletInfo: "Connect with TON Connect. You only sign a free proof — no fee and no payment.",
    connect: "CONNECT TON WALLET", manage: "MANAGE WALLET", verified: "✓ verified", notVerified: "This wallet session is not verified yet. Reconnect to sign the proof.", reconnect: "RECONNECT & VERIFY",
    master: "BYC Jetton Master",
    withdraw: "Withdraw", minWd: "Minimum 21 BYC",
    wdInfo: "Your verified wallet must hold at least 21% of the amount in BYC (checked only, not deducted). A 10% withdrawal fee is deducted from the amount withdrawn. Withdrawals are sent by the team after review.",
    amountPh: "Amount in BYC", wdBtn: "REQUEST WITHDRAWAL", wdPreview: "You receive", wdFee: "10% fee", recentWd: "Recent withdrawals",
    swap: "Buy / Sell BYC", swapSoon: "Swap opens after the BYC liquidity pool launches. Watch for official announcements.",
    buy: "Buy", sell: "Sell", youPayTon: "TON amount to pay", youSellByc: "BYC amount to sell", getQuote: "GET QUOTE", confirmSwap: "CONFIRM IN WALLET",
    fee: "App fee", swapped: "Swapped", estReceive: "Estimated receive", minReceive: "Minimum receive", swapNote: "App fee: 1% on buy, 2% on sell. TON network gas and DEX fees are extra. Anyone can still trade directly on the DEX without the app fee.",
    swapFail: "Pool not available or the quote failed.", sent: "Transaction sent to your wallet. Check its status on Tonviewer.",
    nav_home: "Home", nav_mining: "Mining", nav_tasks: "Tasks", nav_referral: "Invite", nav_swap: "Swap", nav_wallet: "Wallet",
    success: "Success.", walletVerified: "Wallet verified.",
    err_hold: "Your wallet must hold at least 21% of the withdrawal amount in BYC. Buy BYC in the Swap tab first.",
    err_min: "Minimum withdrawal is 21 BYC.", err_wallet: "Connect and verify your TON wallet first.",
    ob1t: "Welcome to BYTCOIN", ob1: "Mine BYC right from Telegram. Connect your TON wallet — no verification fee.",
    ob2t: "Hourly mining", ob2: "2.1 BYC per day through 1-hour sessions: Start, wait 1 hour, Claim, then Start again.",
    ob3t: "Withdraw to your wallet", ob3: "Minimum 21 BYC, your wallet holds 21% of the amount, 10% withdrawal fee. Read the whitepaper for details.",
    next: "NEXT", begin: "START", skip: "Skip"
  }
};

export function translateError(msg: string, lang: Lang): string {
  const d = T[lang];
  if (/must hold at least 21/i.test(msg)) return d.err_hold;
  if (/Minimum withdrawal/i.test(msg)) return d.err_min;
  if (/Connect (and verify )?your TON wallet/i.test(msg)) return d.err_wallet;
  return msg;
}

// ---------------- Whitepaper (bilingual) ----------------
export const WP: Record<Lang, { title: string; sub: string; sections: { h: string; p?: string[]; ul?: string[] }[]; alloc: { head: string[]; names: Record<string, string> }; disclaimer: string }> = {
  id: {
    title: "Whitepaper BYTCOIN (BYC)", sub: "Versi 1.0 — dokumen ini menjelaskan cara kerja aplikasi dan token. Bukan nasihat keuangan.",
    sections: [
      { h: "1. Ringkasan", p: ["BYTCOIN (BYC) adalah token Jetton di jaringan TON dengan suplai maksimum 21.000.000 BYC dan 9 desimal. Hak minting telah dicabut sehingga suplai tidak dapat bertambah (setiap orang dapat memverifikasinya di Tonviewer pada alamat Jetton Master).", "Mini App Telegram ini memungkinkan pengguna mengumpulkan BYC secara bertahap, mengundang teman, menyelesaikan task, lalu menarik saldo ke wallet TON pribadi."] },
      { h: "2. Tokenomics", p: ["Total suplai 21.000.000 BYC dialokasikan sebagai berikut:"] },
      { h: "3. Mining", ul: ["Kecepatan: 2,1 BYC per hari (0,0875 BYC per jam) melalui sesi 1 jam.", "Alur: Start Mining → tunggu 1 jam → Claim → Start Mining lagi. Mining berhenti setiap jam dan tidak berjalan otomatis.", "Angka 2,1 BYC per hari hanya tercapai jika pengguna claim setiap jam; sesi yang tidak di-claim tidak menambah reward.", "Reward mining berasal dari alokasi Miner/Komunitas sebesar 10.500.000 BYC. Jika pool habis, mining berhenti.", "Untuk mulai mining cukup menghubungkan wallet TON (TON Connect). Tidak ada biaya verifikasi."] },
      { h: "4. Referral", ul: ["Bonus 2,1 BYC untuk pengundang saat teman yang diundang melakukan claim mining pertamanya.", "Tambahan 21% dari setiap reward mining teman, dibayar dari pool komunitas dan tidak mengurangi reward teman.", "Satu wallet hanya dapat dipakai satu akun."] },
      { h: "5. Task", p: ["Admin dapat membuat task dengan reward berbeda. Task bergabung ke channel Telegram diverifikasi otomatis; task lain direview manual."] },
      { h: "6. Wallet dan keamanan", ul: ["Koneksi memakai TON Connect dan TON Proof (tanda tangan gratis) untuk membuktikan Anda memiliki wallet tersebut.", "Aplikasi tidak pernah meminta seed phrase atau kunci privat. Jangan pernah membagikannya."] },
      { h: "7. Penarikan ke wallet", ul: ["Minimum penarikan 21 BYC.", "Wallet terhubung harus menyimpan minimal 21% dari jumlah penarikan dalam BYC (hanya dicek di blockchain, tidak dipotong).", "Biaya penarikan 10% dipotong langsung dari jumlah yang ditarik dan ditahan oleh treasury. Contoh: tarik 100 BYC → fee 10 BYC → diterima 90 BYC.", "Setelah diajukan, saldo dikunci. Tim mengirim BYC dari wallet treasury lalu mencatat hash transaksi. Jika ditolak, saldo penuh dikembalikan.", "Saldo di aplikasi adalah catatan internal sampai berhasil ditarik ke wallet."] },
      { h: "8. Beli / Jual (Swap)", ul: ["Swap tersedia setelah pool likuiditas BYC diluncurkan di DEX.", "Biaya aplikasi: 1% untuk pembelian (dari TON yang dibayar) dan 2% untuk penjualan (dari BYC yang dijual).", "Belum termasuk gas jaringan TON dan biaya DEX. Harga ditentukan pasar dan dapat berubah."] },
      { h: "9. Tahapan", ul: ["Tahap 1: Mini App, mining, referral, task, penarikan.", "Tahap 2: Peluncuran pool likuiditas BYC.", "Tahap 3: Fitur Swap diaktifkan."] },
      { h: "10. Risiko", ul: ["Harga aset kripto sangat fluktuatif dan dapat bernilai nol. Tidak ada jaminan harga, likuiditas, atau keuntungan.", "Risiko teknis: bug, gangguan layanan pihak ketiga (Telegram, TON, DEX, wallet).", "Regulasi kripto dapat berbeda di tiap negara; Anda bertanggung jawab atas kepatuhan Anda."] }
    ],
    alloc: { head: ["Alokasi", "Jumlah (BYC)", "%"], names: { miner: "Bot Miner / Komunitas", team: "Tim / Dev", treasury: "Treasury / Buy-back", liquidity: "Likuiditas" } },
    disclaimer: "Dokumen ini bersifat informasi, bukan tawaran investasi atau nasihat keuangan. Lakukan riset sendiri."
  },
  en: {
    title: "BYTCOIN (BYC) Whitepaper", sub: "Version 1.0 — explains how the app and token work. Not financial advice.",
    sections: [
      { h: "1. Overview", p: ["BYTCOIN (BYC) is a Jetton token on the TON network with a maximum supply of 21,000,000 BYC and 9 decimals. Minting rights have been revoked so supply cannot increase (anyone can verify this on Tonviewer at the Jetton Master address).", "This Telegram Mini App lets users gradually collect BYC, invite friends, complete tasks and withdraw their balance to a personal TON wallet."] },
      { h: "2. Tokenomics", p: ["The 21,000,000 BYC total supply is allocated as follows:"] },
      { h: "3. Mining", ul: ["Speed: 2.1 BYC per day (0.0875 BYC per hour) through 1-hour sessions.", "Flow: Start Mining → wait 1 hour → Claim → Start Mining again. Mining stops every hour and never restarts by itself.", "2.1 BYC per day is reached only if you claim every hour; unclaimed hours earn nothing extra.", "Mining rewards come from the Miner/Community allocation of 10,500,000 BYC. When the pool is exhausted, mining stops.", "To start mining you only connect a TON wallet (TON Connect). There is no verification fee."] },
      { h: "4. Referral", ul: ["2.1 BYC bonus for the inviter when the invited friend completes their first mining claim.", "Plus 21% of each of the friend's mining rewards, paid from the community pool without reducing the friend's reward.", "One wallet can be used by one account only."] },
      { h: "5. Tasks", p: ["Admins can create tasks with different rewards. Joining a Telegram channel is verified automatically; other tasks are reviewed manually."] },
      { h: "6. Wallet and security", ul: ["Connection uses TON Connect and TON Proof (a free signature) to prove you own the wallet.", "The app never asks for your seed phrase or private key. Never share them."] },
      { h: "7. Withdrawal to wallet", ul: ["Minimum withdrawal is 21 BYC.", "The connected wallet must hold at least 21% of the withdrawal amount in BYC (checked on-chain only, not deducted).", "A 10% withdrawal fee is deducted directly from the amount withdrawn and kept by the treasury. Example: withdraw 100 BYC → fee 10 BYC → you receive 90 BYC.", "After you request, the balance is locked. The team sends BYC from the treasury wallet and records the transaction hash. If rejected, the full balance is refunded.", "The in-app balance is an internal record until it is withdrawn to your wallet."] },
      { h: "8. Buy / Sell (Swap)", ul: ["Swap becomes available after the BYC liquidity pool is launched on a DEX.", "App fee: 1% on buys (of the TON paid) and 2% on sells (of the BYC sold).", "TON network gas and DEX fees are extra. Prices are set by the market and can change."] },
      { h: "9. Phases", ul: ["Phase 1: Mini App, mining, referral, tasks, withdrawal.", "Phase 2: BYC liquidity pool launch.", "Phase 3: Swap feature enabled."] },
      { h: "10. Risks", ul: ["Crypto assets are highly volatile and can go to zero. There is no guarantee of price, liquidity or profit.", "Technical risks: bugs and outages of third parties (Telegram, TON, DEX, wallets).", "Crypto regulation differs by country; you are responsible for your own compliance."] }
    ],
    alloc: { head: ["Allocation", "Amount (BYC)", "%"], names: { miner: "Miner Bot / Community", team: "Team / Dev", treasury: "Treasury / Buy-back", liquidity: "Liquidity" } },
    disclaimer: "This document is informational only, not an investment offer or financial advice. Do your own research."
  }
};
