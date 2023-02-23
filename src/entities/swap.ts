import { Fetcher } from "@aymantaybi/dexclient-fetcher";
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
  transactionConfig: TransactionConfig | undefined;
  transactionHash: string | undefined;
  transactionReceipt: TransactionReceipt | undefined;

  constructor({ fetcher, router, route }: { fetcher: Fetcher; router: string; route: Route }, amount: SwapAmount) {
    this.fetcher = fetcher;
    this.router = router;
    this.route = route;
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
    const { path, amountIn, amountOut } = this.route;
    const to = this.fetcher.web3.eth.accounts.wallet[0]?.address;
    if (!to) {
      throw Error("Invalid 'to' parameter");
    }
    const deadline = Math.round(Date.now() / 1000) + 600;
    const parameters: [string, string, string[], string, number] = ["0", "0", path.map((token) => token.address), to, deadline];
    const { decimals: tokenInDecimals } = path[0];
    const { decimals: tokenOutDecimals } = path[path.length - 1];
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
}
