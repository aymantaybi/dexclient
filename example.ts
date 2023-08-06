import * as dotenv from "dotenv";
dotenv.config();
import Decimal from "decimal.js";
import Web3 from "web3";
import { Client } from "./src";
import { Route } from "./src/entities/route";
import { Token } from "./src/entities/token";

const { WEBSOCKET_PROVIDER_HOST, PRIVATE_KEY } = process.env;

if (!WEBSOCKET_PROVIDER_HOST) throw Error("Missing WEBSOCKET_PROVIDER_HOST from .env file ");
if (!PRIVATE_KEY) throw Error("Missing PRIVATE_KEY from .env file ");

function amountToDecimals(amount: number | Decimal | string, decimals: number) {
  return (Number(amount) * 10 ** decimals).toString();
}

function updateRoutePairsReserves(route: Route, previousAmounts: Decimal[][]) {
  for (const amounts of previousAmounts) {
    for (let i = 1; i < route.path.length; i++) {
      const tokenIn = route.path[i - 1];
      const tokenOut = route.path[i];
      const tokens: [Token, Token] = [tokenIn, tokenOut];
      const tokenInDecimals = Number(tokens[0].decimals);
      const tokenOutDecimals = Number(tokens[1].decimals);
      const pair = route.getPair(tokens);
      if (!pair) {
        console.error(`Pair not found for tokens : ${tokens.map((token) => token.address)}`);
        continue;
      }

      const reserveIn = tokenIn.address == pair.token0 ? pair.reserve0 : pair.reserve1;
      const reserveOut = tokenIn.address == pair.token0 ? pair.reserve1 : pair.reserve0;

      const reserveInUpdated = String(Number(reserveIn) + Number(amountToDecimals(amounts[i - 1], tokenInDecimals)));
      const reserveOutUpdated = String(Number(reserveOut) - Number(amountToDecimals(amounts[i], tokenOutDecimals)));

      pair.reserve0 = tokenIn.address == pair.token0 ? reserveInUpdated : reserveOutUpdated;
      pair.reserve1 = tokenIn.address == pair.token0 ? reserveOutUpdated : reserveInUpdated;
    }
  }
  return route;
}

function getQuantities(total: number, notional: number) {
  const quantities: number[] = [];
  for (let i = 0; i < Math.ceil(total / notional); i++) {
    const quantity = Math.min(notional, total - notional * i);
    quantities.push(quantity);
  }
  return quantities;
}

(async () => {
  const tokensAddresses = {
    AXS: "0x97a9107c1793bc407d6f527b77e7fff4d812bece",
    RON: "0xe514d9deb7966c8be0ca922de8a064264ea6bcd4",
    USDC: "0x0b7007c13325c48911f73a2dad5fa5dcbf808adc",
  };

  const pairsAddresses = {
    AXSRON: "0x32d1dbb6a4275133cc49f1c61653be3998ada4ff",
    USDCRON: "0x4f7687affc10857fccd0938ecda0947de7ad3812",
  };

  const websocketProvider = new Web3.providers.WebsocketProvider(WEBSOCKET_PROVIDER_HOST);

  const router = "0x7d0556d55ca1a92708681e2e231733ebd922597d";

  const client = new Client({ router, websocketProvider });

  await client.initialize();

  const tokens = await Promise.all(Object.values(tokensAddresses).map((tokenAddress) => client.addToken(tokenAddress)));
  const pairs = await Promise.all(Object.values(pairsAddresses).map((pairAddress) => client.addPair(pairAddress)));

  const path = [...tokens].reverse();

  const route = new Route({ path, pairs });

  const max = 500;

  const singleSwapAmounts = route.amounts({ amountOut: new Decimal(max) });

  console.log(singleSwapAmounts[0].dividedBy(max));

  const swapsAmounts: Decimal[][] = [];

  const notional = 100;

  const quantities = getQuantities(max, notional);

  for (const quantity of quantities) {
    const updatedRoute = updateRoutePairsReserves(route, swapsAmounts);
    const swapAmounts = updatedRoute.amounts({ amountOut: new Decimal(quantity) });
    swapsAmounts.push(swapAmounts);
  }

  console.log(swapsAmounts.map((swapAmounts) => swapAmounts[0].dividedBy(swapAmounts[swapAmounts.length - 1])));
})();
