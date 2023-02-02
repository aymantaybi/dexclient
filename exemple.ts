import Decimal from "decimal.js";
import * as dotenv from "dotenv";
dotenv.config();
import Web3 from "web3";
import { Client } from "./src";
import { SwapType } from "./src/entities/swap";
import { getNextBlockTime } from "./src/helpers";
import { logger } from "./src/helpers/logger";

const { WEBSOCKET_PROVIDER_HOST, PRIVATE_KEY } = process.env;

if (!WEBSOCKET_PROVIDER_HOST) throw Error("Missing WEBSOCKET_PROVIDER_HOST from .env file ");
if (!PRIVATE_KEY) throw Error("Missing PRIVATE_KEY from .env file ");

(async () => {
  const SLPAddress = "0xa8754b9Fa15fc18BB59458815510E40a12cD2014";
  const WETHAddress = "0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5";

  const websocketProvider = new Web3.providers.WebsocketProvider(WEBSOCKET_PROVIDER_HOST);

  const router = "0x7d0556d55ca1a92708681e2e231733ebd922597d";

  const client = new Client({ router, websocketProvider });

  await client.initialize();

  client.fetcher.on("newBlock", (data) => {
    const nextBlockTime = getNextBlockTime(client.blocks);
    const currentTimestamp = Date.now();
    logger.info(`Current block ${data.number}, next block (${nextBlockTime.number}) in ${nextBlockTime.timestamp * 1000 - currentTimestamp} ms`);
  });
  
  const account = await client.addAccount(PRIVATE_KEY);

  account.on("balanceUpdate", (data) => {
    console.log(`Account ${data.account} Balance update: ${data.balance}`);
  });

  account.on("nonceUpdate", (data) => {
    console.log(`Account ${data.account} Nonce update: ${data.nonce}`);
  });

  console.log(`Account Balance: ${account.balance()}`);
  console.log(`Account Nonce: ${account.nonce}`);

  const SLPToken = await client.addToken(SLPAddress);
  const WETHToken = await client.addToken(WETHAddress);

  SLPToken.fetcher.on("balanceUpdate", () => {
    console.log(`SLP Balance: ${SLPToken.balance()}`);
  });

  WETHToken.fetcher.on("balanceUpdate", () => {
    console.log(`WETH Balance: ${WETHToken.balance()}`);
  });

  const SLPWETHAddress = "0x306A28279d04a47468ed83d55088d0DCd1369294";

  const SLPWETHPair = await client.addPair(SLPWETHAddress);

  SLPWETHPair.fetcher.on("reservesUpdate", () => {
    console.log(SLPWETHPair.reserves());
  });

  setTimeout(async () => {
    const { nonce } = client.account;
    const gas = 300000;
    const gasPrice = 20000000000;
    const swap = client.swap({ amountOut: new Decimal(1) }, [WETHToken, SLPToken]);
    const transaction = swap.execute(SwapType.EXACT_INPUT, { nonce, gas, gasPrice });
    console.log("Transaction sent");
    transaction.once("error", (error) => {
      console.log("Original transaction");
      console.log(error.message);
    });

    setTimeout(async () => {
      console.log("Replacement transaction");
      swap.amounts({ amountOut: new Decimal(2) });
      const transaction = swap.execute(SwapType.EXACT_INPUT, {
        nonce,
        gas,
        gasPrice: 40000000000,
      });
      console.log(swap.transactionConfig);
    }, 500);

    console.log(swap.transactionConfig);
  }, 10000); 
})();
