import { Fetcher } from "@aymantaybi/dexclient-fetcher";
import Decimal from "decimal.js";
import { PromiEvent, TransactionConfig, TransactionReceipt } from "web3-core";
import ABICoder from "web3-eth-abi";
import { AbiItem } from "web3-utils";
import { swapExactTokensForTokens, swapTokensForExactTokens } from "../constants";
import { formatAmount } from "../helpers";
import { SwapAmount } from "../interfaces";
import { Route } from "./route";

export enum SwapType {
  EXACT_INPUT,
  EXACT_OUTPUT,
}

export class Swap {
  fetcher: Fetcher;
  router: string;
  route: Route;
  type: SwapType;
  transactionConfig: TransactionConfig | undefined;
  transactionHash: string | undefined;
  transactionReceipt: TransactionReceipt | undefined;

  constructor({ fetcher, router, route, type }: { fetcher: Fetcher; router: string; route: Route; type: SwapType }, amount: SwapAmount) {
    this.fetcher = fetcher;
    this.router = router;
    this.route = route;
    this.type = type;
    this.route.amounts(amount);
  }

  private addTransactionEventsListeners(transaction: PromiEvent<TransactionReceipt>) {
    transaction.once("transactionHash", (transactionHash) => {
      this.transactionHash = transactionHash;
    });
    transaction.once("receipt", (transactionReceipt) => {
      this.transactionReceipt = transactionReceipt;
    });
    transaction.once("error", (error: any) => {
      if (error.receipt) {
        this.transactionReceipt = error.receipt as TransactionReceipt;
      }
    });
  }

  execute(transactionConfig: TransactionConfig, slippage = new Decimal(0.005)) {
    const parameters = this.parameters(slippage);
    const from = parameters[3];
    const abiItem = this.type === SwapType.EXACT_INPUT ? swapExactTokensForTokens : swapTokensForExactTokens;
    const encodedFunctionCall = ABICoder.encodeFunctionCall(abiItem as AbiItem, parameters as any);
    const to = this.router;
    const data = encodedFunctionCall;
    this.transactionConfig = { ...this.transactionConfig, ...transactionConfig, from, to, data };
    const transaction = this.fetcher.web3.eth.sendTransaction({ ...this.transactionConfig });
    this.addTransactionEventsListeners(transaction);
    return transaction;
  }

  parameters(slippage: Decimal) {
    const { path, amountIn, amountOut } = this.route;
    const to = this.fetcher.web3.eth.accounts.wallet[0]?.address;
    if (!to) {
      throw Error("Invalid 'to' parameter");
    }
    const deadline = Math.round(Date.now() / 1000) + 3600;
    const parameters: [string, string, string[], string, number] = ["0", "0", path.map((token) => token.address), to, deadline];
    const { decimals: tokenInDecimals } = path[0];
    const { decimals: tokenOutDecimals } = path[path.length - 1];
    if (this.type === SwapType.EXACT_INPUT) {
      const amountOutMin = new Decimal(1)
        .minus(slippage)
        .times(amountOut || 0)
        .floor();
      parameters[0] = formatAmount(amountIn || 0, tokenInDecimals).toString();
      parameters[1] = formatAmount(amountOutMin || 0, tokenOutDecimals).toString();
    } else {
      const amountInMax = new Decimal(1)
        .plus(slippage)
        .times(amountIn || 0)
        .ceil();
      parameters[0] = formatAmount(amountOut || 0, tokenOutDecimals).toString();
      parameters[1] = formatAmount(amountInMax || 0, tokenInDecimals).toString();
    }
    return parameters;
  }
}
