import { PairFetcher } from "@aymantaybi/dexclient-fetcher";
import Decimal from "decimal.js";
import { Token } from "./token";
import { toChecksumAddress } from "web3-utils";

const precision = 40;

Decimal.set({ precision });

export class Pair {
  fetcher: PairFetcher;
  tokens: [Token, Token];
  address: string;
  symbol: string;
  token0: string;
  token1: string;
  reserve0: string = "0";
  reserve1: string = "0";

  constructor({ fetcher, tokens }: { fetcher: PairFetcher; tokens: [Token, Token] }) {
    this.fetcher = fetcher;
    this.tokens = tokens;
    this.address = fetcher.address;
    this.symbol = fetcher.symbol;
    this.token0 = fetcher.token0;
    this.token1 = fetcher.token1;
  }

  async initialize() {
    const reserves = await this.fetcher.contract.methods.getReserves().call();
    const { reserve0, reserve1 } = reserves;
    [this.reserve0, this.reserve1] = [String(reserve0), String(reserve1)];
    this.fetcher.on("reservesUpdate", (data) => {
      const { reserve0, reserve1 } = data;
      [this.reserve0, this.reserve1] = [String(reserve0), String(reserve1)];
    });
    return this;
  }

  reserves(raw: boolean = false) {
    if (raw) return [this.reserve0, this.reserve1];
    const token0Decimals = Number(this.tokens[0].decimals);
    const token1Decimals = Number(this.tokens[1].decimals);
    const reserve0 = new Decimal(this.reserve0).dividedBy(Decimal.pow(10, token0Decimals));
    const reserve1 = new Decimal(this.reserve1).dividedBy(Decimal.pow(10, token1Decimals));
    return [reserve0, reserve1];
  }

  public amountOut(tokenIn: string, amountIn: Decimal) {
    const tokenInAddress = toChecksumAddress(tokenIn);
    if (![this.token0, this.token1].includes(tokenInAddress))
      throw Error(`tokenIn ${tokenInAddress} is none of the Pair tokens ${[this.token0, this.token1]}`);
    const reserves = this.reserves();
    const reserveIn = (tokenInAddress === this.token0 ? reserves[0] : reserves[1]) as Decimal;
    const reserveOut = (tokenInAddress === this.token0 ? reserves[1] : reserves[0]) as Decimal;
    const amountInWithFee = amountIn.times("997");
    const numerator = amountInWithFee.times(reserveOut);
    const denominator = reserveIn.times("1000").plus(amountInWithFee);
    const amountOut = numerator.dividedBy(denominator);
    const decimalPlaces = Number(tokenInAddress === this.token0 ? this.tokens[1].decimals : this.tokens[0].decimals);
    return amountOut.toDecimalPlaces(decimalPlaces, Decimal.ROUND_DOWN);
  }

  public amountIn(tokenOut: string, amountOut: Decimal) {
    const tokenOutAddress = toChecksumAddress(tokenOut);
    if (![this.token0, this.token1].includes(tokenOutAddress))
      throw Error(`tokenOut ${tokenOutAddress} is none of the Pair tokens ${[this.token0, this.token1]}`);
    const reserves = this.reserves();
    const reserveIn = (tokenOutAddress === this.token0 ? reserves[1] : reserves[0]) as Decimal;
    const reserveOut = (tokenOutAddress === this.token0 ? reserves[0] : reserves[1]) as Decimal;
    const numerator = reserveIn.times(amountOut).times("1000");
    const denominator = reserveOut.minus(amountOut).times("997");
    const amountIn = numerator.dividedBy(denominator);
    const decimalPlaces = Number(tokenOutAddress === this.token0 ? this.tokens[1].decimals : this.tokens[0].decimals);
    return amountIn.toDecimalPlaces(decimalPlaces, Decimal.ROUND_UP);
  }
}
