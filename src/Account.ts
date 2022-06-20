import Web3 from "web3";

interface AccountConstractor {
    web3: Web3
}

export default class Account {

    web3: Web3;
    address: string;
    nonce: number;
    balance: string;

    constructor({ web3 }: AccountConstractor) {
        this.web3 = web3;
        this.address = "0x0000000000000000000000000000000000000000";
        this.nonce = 0;
        this.balance = "0";
    }

    public async load(privateKey: string) {
        this.web3.eth.accounts.wallet.add(privateKey);
        this.address = this.web3.eth.accounts.wallet[0]?.address;
        [this.nonce, this.balance] = await Promise.all([this.web3.eth.getTransactionCount(this.address, 'pending'), this.getBalance(this.address)]);
        return this;
    }

    public async getBalance(address: string) {
        return await this.web3.eth.getBalance(address);
    }

}