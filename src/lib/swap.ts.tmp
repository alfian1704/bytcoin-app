// @ts-nocheck
// Client-only swap module (STON.fi DEX v2). Loaded with dynamic import() only when the Swap tab is used,
// so a problem here can never break the rest of the app. UNTESTED until a BYT pool exists — see README.
import { StonApiClient } from "@ston-fi/api";
import { Client, dexFactory } from "@ston-fi/sdk";
import { Address, beginCell, toNano } from "@ton/core";
import { FEE_WALLET, JETTON_MASTER, TOKEN } from "./config";

export type Side = "buy" | "sell";
const api = new StonApiClient();

export function splitFee(side: Side, total: bigint) {
  const bps = BigInt(side === "buy" ? TOKEN.buyFeeBps : TOKEN.sellFeeBps);   // 1% buy (TON) / 2% sell (BYT)
  const fee = (total * bps) / 10000n;
  return { fee, swapAmount: total - fee };
}

export async function quoteSwap(side: Side, total: bigint, slippage = "0.01") {
  const { fee, swapAmount } = splitFee(side, total);
  if (swapAmount <= 0n) throw new Error("Amount too small");
  const sim = await api.simulateSwap({
    offerAddress: side === "buy" ? "ton" : JETTON_MASTER,
    askAddress: side === "buy" ? JETTON_MASTER : "ton",
    offerUnits: swapAmount.toString(),
    slippageTolerance: slippage
  });
  return { side, total, fee, swapAmount, askUnits: BigInt(sim.askUnits), minAskUnits: BigInt(sim.minAskUnits), sim };
}

export async function executeSwap({ quote, userAddress, jettonWallet, tonUI }) {
  const { sim, side, fee } = quote;
  const routerInfo = sim.router;
  const dex = dexFactory(routerInfo);
  const tonClient = new Client({ endpoint: "https://toncenter.com/api/v2/jsonRPC" });
  const router = tonClient.open(dex.Router.create(routerInfo.address));
  const proxyTon = dex.pTON.create(routerInfo.ptonMasterAddress);

  const txParams = side === "buy"
    ? await router.getSwapTonToJettonTxParams({ userWalletAddress: userAddress, proxyTon, offerAmount: sim.offerUnits, askJettonAddress: sim.askAddress, minAskAmount: sim.minAskUnits })
    : await router.getSwapJettonToTonTxParams({ userWalletAddress: userAddress, offerJettonAddress: sim.offerAddress, offerAmount: sim.offerUnits, minAskAmount: sim.minAskUnits, proxyTon });

  const messages = [];
  if (fee > 0n) {
    if (side === "buy") {
      messages.push({ address: FEE_WALLET, amount: fee.toString() });                       // 1% in TON
    } else {
      const body = beginCell().storeUint(0xf8a7ea5, 32).storeUint(BigInt(Date.now()), 64).storeCoins(fee)
        .storeAddress(Address.parse(FEE_WALLET)).storeAddress(Address.parse(userAddress)).storeBit(0).storeCoins(0).storeBit(0).endCell();
      messages.push({ address: jettonWallet, amount: toNano("0.05").toString(), payload: body.toBoc().toString("base64") }); // 2% in BYT
    }
  }
  messages.push({ address: txParams.to.toString(), amount: txParams.value.toString(), payload: txParams.body?.toBoc().toString("base64") });
  return tonUI.sendTransaction({ validUntil: Math.floor(Date.now() / 1000) + 300, messages });
}
