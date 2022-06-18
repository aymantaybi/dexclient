import Web3 from 'web3';
import { AbiItem, } from 'web3-utils';
import { Contract } from 'web3-eth-contract';
import ABI from '../ABI/Pair.json';

import { WalletBase } from 'web3-core';
import Decimal from 'decimal.js';

import BatchRequest from '../utils/BatchRequest';

interface PairConstarctor {
    web3: Web3,
    address: string
}

export default class Pair {

    web3: Web3;
    contract: Contract;
    address: string;
    symbol: string;
    tokens: string[];
    reserves: Decimal[];

    constructor({ web3, address }: PairConstarctor) {
        this.web3 = web3;
        this.address = address;
        this.contract = new web3.eth.Contract(ABI as any, this.address);
        this.symbol = "";
        this.tokens = [];
        this.reserves = [];
    }

    public async load() {

        const batch = new BatchRequest(this.web3);

        const methodes = [
            this.contract.methods.symbol().call,
            this.contract.methods.token0().call,
            this.contract.methods.token1().call,
            this.contract.methods.getReserves().call,
        ]

        for (var methode of methodes) {
            var request = { methode };
            batch.add(request);
        }

        var [
            symbol,
            token0,
            token1,
            reserves
        ] = await batch.executeAsync() as any;

        if (!reserves) {
            return
        }

        var {
            _reserve0,
            _reserve1
        } = reserves

        this.symbol = symbol;
        this.tokens = [token0, token1];
        this.reserves = [_reserve0, _reserve1];

        return {
            symbol: this.symbol,
            tokens: this.tokens,
            reserves: this.reserves,
        }
    }



}

