import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import ABI from '../ABI/Factory.json';

import BatchRequest from '../utils/BatchRequest';

interface FactoryConstarctor {
    web3: Web3,
    address: string
}

export default class Factory {

    web3: Web3;
    contract: Contract;

    constructor({ web3, address }: FactoryConstarctor) {
        this.web3 = web3;
        this.contract = new this.web3.eth.Contract(ABI as any, address);
    }

    public async getPair(address: string[]) {
        return await this.contract.methods.getPair(address[0], address[1]).call();
    }

    public async allPairs(index: number) {
        return await this.contract.methods.allPairs(index).call();
    }

    public async allPairsLength() {
        return await this.contract.methods.allPairsLength().call();
    }

    public async getAllPairs() {

        var pairsLength = await this.allPairsLength();

        var batch = new BatchRequest(this.web3);

        var methodes = Array.from(Array(Number(pairsLength)).keys()).map(index => this.contract.methods.allPairs(index).call);

        for (var methode of methodes) {
            var request = { methode };
            batch.add(request);
        }

        return await batch.executeAsync();
    }

}

