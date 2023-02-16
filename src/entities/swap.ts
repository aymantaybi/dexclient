import { Fetcher } from "@aymantaybi/dexclient-fetcher";
import Decimal from "decimal.js";
import { PromiEvent, TransactionConfig, TransactionReceipt } from "web3-core";
import ABICoder from "web3-eth-abi";
import { AbiItem } from "web3-utils";
import { swapExactTokensForTokens, swapTokensForExactTokens } from "../constants";
import { formatAmount, isSwapAmountIn } from "../helpers";
import { SwapAmount } from "../interfaces";
import { Pair } from "./pair";
import { Token } from "./token";

export enum SwapType {
  EXACT_INPUT,
  EXACT_OUTPUT,
}

export class Swap {
  fetcher: Fetcher;
  router: string;
  path: Token[];
  pairs: (Pair | undefined)[];
  amountIn: Decimal | undefined;
  amountOut: Decimal | undefined;
  transactionConfig: TransactionConfig | undefined;
  transactionHash: string | undefined;
  transactionReceipt: TransactionReceipt | undefined;

  constructor({ fetcher, router, path, pairs }: { fetcher: Fetcher; router: string; path: Token[]; pairs: (Pair | undefined)[] }) {
    this.fetcher = fetcher;
    this.router = router;
    this.path = path;
    this.pairs = pairs;
  }

  private addTransactionEventsListeners(transaction: PromiEvent<TransactionReceipt>) {
    transaction.once("transactionHash", (transactionHash) => {
      this.transactionHash = transactionHash;
    });
    transaction.once("receipt", (transactionReceipt) => {
      this.transactionReceipt = transactionReceipt;
    });
    transaction.once("error", (error: any) => {
      if ("receipt" in error) {
        this.transactionReceipt = error.receipt as TransactionReceipt;
      }
    });
  }

  execute(type: SwapType, transactionConfig: TransactionConfig) {
    const parameters = this.parameters(type);
    const from = parameters[3];
    const abiItem = type === SwapType.EXACT_INPUT ? swapExactTokensForTokens : swapTokensForExactTokens;
    const encodedFunctionCall = ABICoder.encodeFunctionCall(abiItem as AbiItem, parameters as any);
    const to = this.router;
    const data = encodedFunctionCall;
    this.transactionConfig = { ...transactionConfig, from, to, data };
    const transaction = this.fetcher.web3.eth.sendTransaction({ ...this.transactionConfig });
    this.addTransactionEventsListeners(transaction);
    return transaction;
  }

  parameters(type: SwapType) {
    const path = this.path;
    const to = this.fetcher.web3.eth.accounts.wallet[0]?.address;
    if (!to) {
      throw Error("Invalid 'to' parameter");
    }
    const deadline = Math.round(Date.now() / 1000) + 600;
    const parameters: [string, string, string[], string, number] = ["0", "0", path.map((token) => token.address), to, deadline];
    const { amountIn, amountOut } = this;
    const { decimals: tokenInDecimals } = this.path[0];
    const { decimals: tokenOutDecimals } = this.path[this.path.length - 1];
    if (type === SwapType.EXACT_INPUT) {
      const amountOutMin = amountOut;
      parameters[0] = formatAmount(amountIn || 0, tokenInDecimals).toString();
      parameters[1] = formatAmount(amountOutMin || 0, tokenOutDecimals).toString();
    } else {
      const amountInMax = amountIn;
      parameters[0] = formatAmount(amountOut || 0, tokenOutDecimals).toString();
      parameters[1] = formatAmount(amountInMax || 0, tokenInDecimals).toString();
    }
    return parameters;
  }

  amounts(amount: SwapAmount) {
    if (isSwapAmountIn(amount)) {
      const { amountIn } = amount;
      [this.amountIn, this.amountOut] = this.getAmountsOut(amountIn);
    } else {
      const { amountOut } = amount;
      [this.amountIn, this.amountOut] = this.getAmountsIn(amountOut);
    }
    return [this.amountIn, this.amountOut];
  }

  private getAmountsOut(amountIn: Decimal) {
    const amounts = [amountIn];
    for (let i = 0; i < this.path.length - 1; i++) {
      const tokenIn = this.path[i];
      const tokenOut = this.path[i + 1];
      const pair = this.pairs[i];
      if (!pair) throw Error(`Pair of tokens ${tokenIn.address},${tokenOut.address} is missing`);
      amounts[i + 1] = pair.amountOut(tokenIn.address, amounts[i]);
    }
    const amountOut = amounts[amounts.length - 1];
    return [amountIn, amountOut];
  }

  private getAmountsIn(amountOut: Decimal) {
    const amounts = new Array(this.path.length);
    amounts[this.path.length - 1] = amountOut;
    for (let i = this.path.length - 1; i > 0; i--) {
      const tokenIn = this.path[i - 1];
      const tokenOut = this.path[i];
      const pair = this.pairs[i - 1];
      if (!pair) throw Error(`Pair of tokens ${tokenIn.address},${tokenOut.address} is missing`);
      amounts[i - 1] = pair.amountIn(tokenOut.address, amounts[i]);
    }
    const amountIn = amounts[0];
    return [amountIn, amountOut];
  }
}
