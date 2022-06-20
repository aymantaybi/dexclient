import Web3 from 'web3';
import Decimal from "decimal.js";
import { AbiItem, } from 'web3-utils';
import { Contract } from 'web3-eth-contract';
import ABI from '../ABI/Router.json';

import { WalletBase } from 'web3-core';

import Erc20 from "./Erc20";
import Pair from "./Pair";

interface RouterConstarctor {
    web3: Web3,
    address: string,
    tokens: { [key: string]: Erc20 },
    pairs: { [key: string]: Pair }
}

export default class Router {

    web3: Web3;
    contract: Contract;
    private tokens: { [key: string]: Erc20 };
    private pairs: { [key: string]: Pair };

    constructor({ web3, address, tokens, pairs }: RouterConstarctor) {
        this.web3 = web3;
        this.contract = new web3.eth.Contract(ABI as any, address);
        this.tokens = tokens;
        this.pairs = pairs;
    }

    public getAmountIn(amountOut: Decimal, reserveIn: Decimal, reserveOut: Decimal) {
        var numerator = reserveIn.times(amountOut).times('1000');
        var denominator = reserveOut.minus(amountOut).times('997');
        var amountIn = numerator.dividedBy(denominator);
        return amountIn;
    };

    public getAmountOut(amountIn: Decimal, reserveIn: Decimal, reserveOut: Decimal) {
        var amountInWithFee = amountIn.times('997');
        var numerator = amountInWithFee.times(reserveOut);
        var denominator = reserveIn.times('1000').plus(amountInWithFee);
        var amountOut = numerator.dividedBy(denominator);
        return amountOut;
    };

    private getReserves(tokenA: string, tokenB: string) {
        var pair = Object.values(this.pairs).find(pair => pair.tokens.includes(tokenA) && pair.tokens.includes(tokenB));
        if (!pair) throw new Error(`No reserves found for tokens : ${[tokenA, tokenB]} `);
        var reserves: Decimal[] = pair.reserves;
        reserves = tokenA == pair.tokens[0] ? [reserves[0], reserves[1]] : [reserves[1], reserves[0]];
        return reserves;
    }

    public getAmountsOut(amountIn: Decimal, path: string[]) {
        path = path.map(address => this.web3.utils.toChecksumAddress(address));
        var amounts = [amountIn.toDecimalPlaces(this.tokens[path[0]].decimals, Decimal.ROUND_DOWN)];
        for (var i = 0; i < path.length - 1; i++) {
            var tokenIn = path[i];
            var tokenOut = path[i + 1];
            var [reserveIn, reserveOut]: Decimal[] = this.getReserves(tokenIn, tokenOut);
            amounts[i + 1] = this.getAmountOut(
                amounts[i],
                reserveIn.dividedBy(10 ** this.tokens[tokenIn].decimals),
                reserveOut.dividedBy(10 ** this.tokens[tokenOut].decimals)
            ).toDecimalPlaces(this.tokens[tokenOut].decimals, Decimal.ROUND_DOWN);
        }
        return [amounts[0], amounts[amounts.length - 1]];
    }

    public getAmountsIn(amountOut: Decimal, path: string[]) {
        path = path.map(address => this.web3.utils.toChecksumAddress(address));
        var amounts = new Array(path.length);
        amounts[path.length - 1] = amountOut.toDecimalPlaces(this.tokens[path[path.length - 1]].decimals, Decimal.ROUND_UP);
        for (var i = path.length - 1; i > 0; i--) {
            var tokenIn = path[i - 1];
            var tokenOut = path[i];
            var [reserveIn, reserveOut]: Decimal[] = this.getReserves(tokenIn, tokenOut);
            amounts[i - 1] = this.getAmountIn(
                amounts[i],
                reserveIn.dividedBy(10 ** this.tokens[tokenIn].decimals),
                reserveOut.dividedBy(10 ** this.tokens[tokenOut].decimals)
            ).toDecimalPlaces(this.tokens[tokenIn].decimals, Decimal.ROUND_UP);
        }
        return [amounts[0], amounts[amounts.length - 1]];
    }

}