import { SwapAmount, SwapAmountIn, SwapAmountOut, PairAddress, PairTokens } from "../interfaces";

export function isSwapAmountIn(amount: SwapAmount): amount is SwapAmountIn {
  return (<SwapAmountIn>amount).amountIn !== undefined;
}

export function isSwapAmountOut(amount: SwapAmount): amount is SwapAmountOut {
  return (<SwapAmountOut>amount).amountOut !== undefined;
}

export function isGetPairArgumentPairAddress(argument: PairAddress | PairTokens): argument is PairAddress {
  return typeof (argument as string) === "string";
}

export function isGetPairArgumentPairTokens(argument: PairAddress | PairTokens): argument is PairTokens {
  return Array.isArray(argument);
}
