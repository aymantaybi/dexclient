import Web3 from "web3";
import Decimal from "decimal.js";
import Options from "./options";

import Router from "./modules/Router";
import Factory from "./modules/Factory";
import Erc20 from "./modules/Erc20";
import Pair from "./modules/Pair";

import Subscriber from "./utils/Subscriber";
import Logger from "./utils/Logger";

import Account from "./Account";

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
    account: Account;

    constructor({ websocketProvider, routerAddress, factoryAddress }: DexClientConstructor) {

        this.web3 = new Web3(new Web3.providers.WebsocketProvider(websocketProvider, Options.provider));
        this.router = new Router({ web3: this.web3, address: routerAddress });
        this.factory = new Factory({ web3: this.web3, address: factoryAddress });
        this.subscriber = new Subscriber(this.web3);
        this.logger = new Logger();
        this.account = new Account({ web3: this.web3 });

        this.tokens = {};
        this.pairs = {};

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
            //this.logger.log("UPDATE", `Pair : ${symbol} | Reserves : [ ${reserves["0"]}, ${reserves["1"]} ]`);
        });

        this.subscriber.listen({ type: "newBlockHeaders" }, async (blockHeader) => {
            var address = this.account?.address;
            if (!address) return;
            var block = await this.web3.eth.getBlock(blockHeader.number, true);
            var filtredTransactions = block.transactions.filter(transaction => transaction.from == address);
            if (!filtredTransactions.length) return;
            var { nonce } = filtredTransactions.sort((a, b) => b.nonce - a.nonce)[0];
            this.account.nonce = Math.max(this.account.nonce, nonce);
            this.account.balance = await this.account.getBalance(address);
            var { nonce, balance } = this.account;
            this.logger.log("UPDATE", `Account Balance : ${this.web3.utils.fromWei(balance)}`);
            this.logger.log("UPDATE", `Transactions count : ${nonce}`);
        });

    }

    public async addToken(address: string) {
        var tokenAddress = this.web3.utils.toChecksumAddress(address);
        this.tokens[tokenAddress] = new Erc20({ web3: this.web3, address: tokenAddress });
        var token = await this.tokens[tokenAddress].load();
        var { symbol } = token;
        this.logger.log("INFO", `Token Added : ${symbol}`);
        return this.getToken(tokenAddress);
    }

    public getToken(address: string) {
        var tokenAddress = this.web3.utils.toChecksumAddress(address);
        return this.tokens[tokenAddress] ? {
            ...this.tokens[tokenAddress],
            balance: new Decimal(this.tokens[tokenAddress].balance)
        } : null;
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
        return this.getPair(pairAddress);
    }

    public getPair(address: string) {
        var pairAddress = this.web3.utils.toChecksumAddress(address);
        return this.pairs[pairAddress];
    }

    public async addAccount(privateKey: string) {
        var { address, balance, nonce } = await this.account.load(privateKey);
        this.logger.log("INFO", `Account balance : ${this.web3.utils.fromWei(balance)}`);
        return this.account;
    }

}