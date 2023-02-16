import * as dotenv from "dotenv";
dotenv.config();
import Decimal from "decimal.js";
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

  client.fetcher.subscription?.on("data", (data) => {
    const nextBlockTime = getNextBlockTime(client.blocksHeaders);
    const currentTimestamp = Date.now();
    logger.info(`New block ${data.number}, next block (${nextBlockTime.number}) in ${nextBlockTime.timestamp * 1000 - currentTimestamp} ms`);
  });

  const account = await client.addAccount(PRIVATE_KEY);

  account.on("balanceUpdate", (data) => {
    logger.info(`Account ${data.account} Balance update: ${data.balance}`);
  });

  account.on("nonceUpdate", (data) => {
    logger.info(`Account ${data.account} Nonce update: ${data.nonce}`);
  });

  logger.info(`Account Balance: ${account.balance()}`);
  logger.info(`Account Nonce: ${account.nonce}`);

  const SLPToken = await client.addToken(SLPAddress);
  const WETHToken = await client.addToken(WETHAddress);

  SLPToken.fetcher.on("balanceUpdate", () => {
    logger.info(`SLP Balance: ${SLPToken.balance()}`);
  });

  WETHToken.fetcher.on("balanceUpdate", () => {
    logger.info(`WETH Balance: ${WETHToken.balance()}`);
  });

  const SLPWETHAddress = "0x306A28279d04a47468ed83d55088d0DCd1369294";

  const SLPWETHPair = await client.addPair(SLPWETHAddress);

  SLPWETHPair.fetcher.on("reservesUpdate", () => {
    logger.info(SLPWETHPair.reserves());
  });

  setTimeout(async () => {
    const { nonce } = client.account;
    const gas = 300000;
    const gasPrice = 20000000000;
    const swap = client.swap([WETHToken, SLPToken], { amountOut: new Decimal(1) });
    const { number, timestamp } = getNextBlockTime(client.blocksHeaders);
    const currentTimestamp = Date.now();
    logger.info(`Current block ${client.blocksHeaders[0].number}, next block (${number}) in ${timestamp * 1000 - currentTimestamp} ms`);
    const transaction = swap.execute(SwapType.EXACT_INPUT, { nonce, gas, gasPrice });
  }, 10000);
})();
