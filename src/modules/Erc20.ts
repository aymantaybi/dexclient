import Web3 from 'web3';
import { AbiItem, } from 'web3-utils';
import { Contract } from 'web3-eth-contract';
import ABI from '../ABI/Erc20.json';

import { WalletBase } from 'web3-core';
import Decimal from 'decimal.js';

import BatchRequest from '../utils/BatchRequest';

interface Erc20Constarctor {
    web3: Web3,
    address: string
}

export default class Erc20 {

    web3: Web3;
    contract: Contract;
    address: string;
    symbol: string;
    balance: string;
    decimals: number;

    constructor({ web3, address }: Erc20Constarctor) {
        this.web3 = web3;
        this.address = address;
        this.contract = new web3.eth.Contract(ABI as any, this.address);
        this.symbol = "";
        this.balance = "0";
        this.decimals = 0;
    }

    async load() {

        const batch = new BatchRequest(this.web3);

        const walletAddress = this.web3.eth.accounts.wallet[0]?.address;

        const methodes = [
            this.contract.methods.symbol().call,
            this.contract.methods.decimals().call
        ]

        walletAddress && methodes.push(this.contract.methods.balanceOf(walletAddress).call);

        for (var methode of methodes) {
            var request = { methode };
            batch.add(request);
        }

        const [symbol, decimals, balance] = await batch.executeAsync() as string[];

        this.symbol = symbol;
        this.decimals = Number(decimals);
        this.balance = balance || this.balance;

        return { address: this.address, symbol, decimals, balance };
    }

    async balanceOf(address: string) {
        return await this.contract.methods.balanceOf(address).call();
    }

}

