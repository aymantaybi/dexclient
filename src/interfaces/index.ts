import Decimal from "decimal.js";
import { Token } from "../entities/token";

export interface SwapAmountIn {
  amountIn: Decimal;
}

export interface SwapAmountOut {
  amountOut: Decimal;
}

export type SwapAmount = SwapAmountIn | SwapAmountOut;

export type PairAddress = string;

export type PairTokens = [Token, Token];

export type GetPairArgument = PairAddress | PairTokens;
