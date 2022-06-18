import Web3 from "web3";
import Decimal from "decimal.js";
import Options from "./options";

import Router from "./modules/Router";
import Factory from "./modules/Factory";
import Erc20 from "./modules/Erc20";
import Pair from "./modules/Pair";

import Subscriber from "./utils/Subscriber";
import Logger from "./utils/Logger";

interface DexClientConstructor {
    websocketProvider: string,
    routerAddress: string,
    factoryAddress: string
}

export default class DexClient {

    web3: Web3;
    router: Router;
    factory: Factory;
    tokens: { [key: string]: Erc20 };
    pairs: { [key: string]: Pair };
    subscriber: Subscriber;
    logger: Logger;
    nonce: number;
    balance: string;

    constructor({ websocketProvider, routerAddress, factoryAddress }: DexClientConstructor) {

        this.web3 = new Web3(new Web3.providers.WebsocketProvider(websocketProvider, Options.provider));
        this.router = new Router({ web3: this.web3, address: routerAddress });
        this.factory = new Factory({ web3: this.web3, address: factoryAddress });
        this.subscriber = new Subscriber(this.web3);
        this.logger = new Logger();

        this.tokens = {};
        this.pairs = {};
        this.nonce = 0;
        this.balance = "0";

        this.subscriber.listen({ type: "logs", functionName: "Transfer(address,address,uint256)" }, async (log) => {
            var walletAddress = this.web3.eth.accounts.wallet[0]?.address;
            if (!walletAddress || !log.topics.includes(this.web3.utils.padLeft(walletAddress.toLowerCase(), log.topics[0].length - 2))) return;
            var tokenAddress = this.web3.utils.toChecksumAddress(log.address);
            if (!this.tokens[tokenAddress]) return;
            this.tokens[tokenAddress].balance = await this.tokens[tokenAddress].balanceOf(walletAddress);
            var { symbol, balance, decimals } = this.tokens[tokenAddress];
            this.logger.log("UPDATE", `Symbol : ${symbol} | Balance : ${new Decimal(balance).dividedBy(10 ** decimals)}`);
        });

        this.subscriber.listen({ type: "logs", functionName: "Sync(uint112,uint112)" }, async (log) => {
            var pairAddress = this.web3.utils.toChecksumAddress(log.address);
            if (!this.pairs[pairAddress]) return;
            var reserves = this.web3.eth.abi.decodeParameters(['uint112', 'uint112'], log.data);
            this.pairs[pairAddress].reserves = [reserves["0"], reserves["1"]];
            var { symbol } = this.pairs[pairAddress];
            this.logger.log("UPDATE", `Pair : ${symbol} | Reserves : [ ${reserves["0"]}, ${reserves["1"]} ]`);
        });

        this.subscriber.listen({ type: "newBlockHeaders" }, async (blockHeader) => {
            var walletAddress = this.web3.eth.accounts.wallet[0]?.address;
            if (!walletAddress) return;
            var block = await this.web3.eth.getBlock(blockHeader.number, true);
            var filtredTransactions = block.transactions.filter(transaction => transaction.from == walletAddress);
            if (!filtredTransactions.length) return;
            var { nonce } = filtredTransactions.sort((a, b) => b.nonce - a.nonce)[0];
            this.nonce = this.nonce > nonce ? this.nonce : nonce;
            this.balance = await this.getBalance(walletAddress);
            this.logger.log("UPDATE", `Account Balance : ${this.web3.utils.fromWei(this.balance)}`);
            this.logger.log("UPDATE", `Transactions count : ${this.nonce}`);
        });

    }

    public async addToken(address: string) {
        var tokenAddress = this.web3.utils.toChecksumAddress(address);
        this.tokens[tokenAddress] = new Erc20({ web3: this.web3, address: tokenAddress });
        var token = await this.tokens[tokenAddress].load();
        var { symbol } = token;
        this.logger.log("INFO", `Token Added : ${symbol}`);
        return token;
    }

    public async addPair(address: string | string[]) {
        var pairAddress = this.web3.utils.toChecksumAddress(Array.isArray(address) ? await this.factory.getPair(address) : address);
        if (pairAddress == "0x0000000000000000000000000000000000000000") return this.logger.log("ERROR", `No Pair found for this tokens ${address}`);
        this.pairs[pairAddress] = new Pair({ web3: this.web3, address: pairAddress });
        var pair = await this.pairs[pairAddress].load();
        if (!pair) {
            delete this.pairs[pairAddress];
            this.logger.log("ERROR", `${address} is not a Pair Contract`);
            return;
        }
        var { symbol, tokens } = pair;
        await Promise.all(tokens.map(token => this.addToken(token)));
        this.logger.log("INFO", `Pair Added : ${symbol}`);
        return pair;
    }

    public async getBalance(address: string) {
        return await this.web3.eth.getBalance(address);
    }

    public async addAccount(privateKey: string) {
        this.web3.eth.accounts.wallet.add(privateKey);
        var walletAddress = this.web3.eth.accounts.wallet[0]?.address;
        if (!walletAddress) return this.logger.log("ERROR", "Invalid private key");
        [this.nonce, this.balance] = await Promise.all([this.web3.eth.getTransactionCount(walletAddress, 'pending'), this.getBalance(walletAddress)])
        this.logger.log("INFO", `Account balance : ${this.web3.utils.fromWei(this.balance)}`);
        return walletAddress;
    }

    public getToken(address: string){
        var tokenAddress = this.web3.utils.toChecksumAddress(address);
        return this.tokens[tokenAddress];
    }

    public getPair(address: string){
        var pairAddress = this.web3.utils.toChecksumAddress(address);
        return this.pairs[pairAddress];
    }

}