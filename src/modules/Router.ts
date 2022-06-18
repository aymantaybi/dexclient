import Web3 from 'web3';
import { AbiItem, } from 'web3-utils';
import { Contract } from 'web3-eth-contract';
import ABI from '../ABI/Router.json';

import { WalletBase } from 'web3-core';

interface RouterConstarctor {
    web3: Web3,
    address: string
}

export default class Router {

    contract: Contract;

    constructor({ web3, address }: RouterConstarctor) {
        this.contract = new web3.eth.Contract(ABI as any, address);
    }

}

