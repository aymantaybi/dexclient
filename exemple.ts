import * as dotenv from "dotenv";
dotenv.config();
import Web3 from "web3";
import { Client } from "./src";

const { WEBSOCKET_PROVIDER_HOST, PRIVATE_KEY } = process.env;

if (!WEBSOCKET_PROVIDER_HOST) throw Error("Missing WEBSOCKET_PROVIDER_HOST from .env file ");
if (!PRIVATE_KEY) throw Error("Missing PRIVATE_KEY from .env file ");

(async () => {
  const SLPAddress = "0xa8754b9Fa15fc18BB59458815510E40a12cD2014";
  const WETHAddress = "0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5";

  const websocketProvider = new Web3.providers.WebsocketProvider(WEBSOCKET_PROVIDER_HOST);

  const client = new Client({ websocketProvider });

  await client.initialize();

  client.fetcher.on("newBlock", (data) => {
    console.log(data.number);
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
})();
