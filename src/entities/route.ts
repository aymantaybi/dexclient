import Decimal from "decimal.js";
import { isSwapAmountIn } from "../helpers";
import { SwapAmount } from "../interfaces";
import { Pair } from "./pair";
import { Token } from "./token";
import { ZERO } from "../constants";

export class Route {
  path: Token[];
  pairs: Pair[];
  amountIn = ZERO;
  amountOut = ZERO;
  constructor({ path, pairs }: { path: Token[]; pairs: Pair[] }) {
    this.path = path;
    this.pairs = pairs;
  }

  amounts(amount: SwapAmount) {
    const amounts = isSwapAmountIn(amount) ? this.getAmountsOut(amount.amountIn) : this.getAmountsIn(amount.amountOut);
    this.amountIn = amounts[0];
    this.amountOut = amounts[amounts.length - 1];
    return amounts;
  }

  getPair(tokens: [Token, Token]) {
    return this.pairs.find((pair) => pair && tokens.every((token) => [pair.token0, pair.token1].includes(token.address)));
  }

  getAmountsOut(amountIn: Decimal) {
    const amounts = [amountIn];
    for (let i = 0; i < this.path.length - 1; i++) {
      const tokenIn = this.path[i];
      const tokenOut = this.path[i + 1];
      const pair = this.getPair([tokenIn, tokenOut]);
      if (!pair) throw Error(`Pair of tokens ${tokenIn.address} & ${tokenOut.address} is missing`);
      amounts[i + 1] = pair.amountOut(tokenIn.address, amounts[i]);
    }
    return amounts;
  }

  getAmountsIn(amountOut: Decimal) {
    const amounts: Decimal[] = new Array(this.path.length);
    amounts[this.path.length - 1] = amountOut;
    for (let i = this.path.length - 1; i > 0; i--) {
      const tokenIn = this.path[i - 1];
      const tokenOut = this.path[i];
      const pair = this.getPair([tokenIn, tokenOut]);
      if (!pair) throw Error(`Pair of tokens ${tokenIn.address} & ${tokenOut.address} is missing`);
      amounts[i - 1] = pair.amountIn(tokenOut.address, amounts[i]);
    }
    return amounts;
  }
}
