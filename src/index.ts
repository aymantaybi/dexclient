import Web3 from "web3";
import { WebsocketProvider } from "web3-providers-ws";
import Decimal from "decimal.js";
import { websocketProviderOptions } from "./constants";

import Router from "./modules/Router";
import Factory from "./modules/Factory";
import Erc20 from "./modules/Erc20";
import Pair from "./modules/Pair";

import Subscriber from "./utils/Subscriber";
import Logger from "./utils/Logger";

import Account from "./Account";

interface DexClientConstructor {
  host?: string;
  websocketProvider?: WebsocketProvider;
  routerAddress: string;
  factoryAddress: string;
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
  websocketProvider: WebsocketProvider | undefined;

  constructor({
    host,
    websocketProvider,
    routerAddress,
    factoryAddress,
  }: DexClientConstructor) {
    if (!host && !websocketProvider)
      throw new Error(
        "You need to provide either 'host' or 'websocketProvider' to the constructor "
      );

    this.websocketProvider = host
      ? new WebsocketProvider(host, websocketProviderOptions)
      : websocketProvider;

    this.web3 = new Web3(this.websocketProvider!);

    this.tokens = {};
    this.pairs = {};

    this.router = new Router({
      web3: this.web3,
      address: routerAddress,
      tokens: this.tokens,
      pairs: this.pairs,
    });
    this.factory = new Factory({ web3: this.web3, address: factoryAddress });
    this.subscriber = new Subscriber(this.web3);
    this.logger = new Logger();
    this.account = new Account({ web3: this.web3 });

    this.subscriber.listen(
      { type: "logs", functionName: "Transfer(address,address,uint256)" },
      async (log) => {
        var walletAddress = this.web3.eth.accounts.wallet[0]?.address;
        if (
          !walletAddress ||
          !log.topics.includes(
            this.web3.utils.padLeft(
              walletAddress.toLowerCase(),
              log.topics[0].length - 2
            )
          )
        )
          return;
        var tokenAddress = this.web3.utils.toChecksumAddress(log.address);
        if (!this.tokens[tokenAddress]) return;
        this.tokens[tokenAddress].balance = await this.tokens[
          tokenAddress
        ].balanceOf(walletAddress);
        var { symbol, balance, decimals } = this.tokens[tokenAddress];
        this.logger.log(
          "UPDATE",
          `Symbol : ${symbol} | Balance : ${new Decimal(balance).dividedBy(
            10 ** decimals
          )}`
        );
      }
    );

    this.subscriber.listen(
      { type: "logs", functionName: "Sync(uint112,uint112)" },
      async (log) => {
        var pairAddress = this.web3.utils.toChecksumAddress(log.address);
        if (!this.pairs[pairAddress]) return;
        var reserves = this.web3.eth.abi.decodeParameters(
          ["uint112", "uint112"],
          log.data
        );
        this.pairs[pairAddress].reserves = [
          new Decimal(reserves["0"]),
          new Decimal(reserves["1"]),
        ];
        var { symbol } = this.pairs[pairAddress];
        //this.logger.log("UPDATE", `Pair : ${symbol} | Reserves : [ ${reserves["0"]}, ${reserves["1"]} ]`);
      }
    );

    this.subscriber.listen({ type: "newBlockHeaders" }, async (blockHeader) => {
      var { address } = this.account;
      if (this.web3.utils.toBN(address).isZero()) return;
      var block = await this.web3.eth.getBlock(blockHeader.number, true);
      var filtredTransactions = block.transactions.filter(
        (transaction) => transaction.from == address
      );
      if (!filtredTransactions.length) return;
      var { nonce } = filtredTransactions.sort((a, b) => b.nonce - a.nonce)[0];
      this.account.nonce = Math.max(this.account.nonce, nonce);
      this.account.balance = await this.account.getBalance(address);
      var { nonce, balance } = this.account;
      this.logger.log(
        "UPDATE",
        `Account Balance : ${this.web3.utils.fromWei(balance)}`
      );
      this.logger.log("UPDATE", `Transactions count : ${nonce}`);
    });
  }

  public async addToken(address: string) {
    var tokenAddress = this.web3.utils.toChecksumAddress(address);
    if (this.tokens[tokenAddress]) return this.tokens[tokenAddress];
    this.tokens[tokenAddress] = new Erc20({
      web3: this.web3,
      address: tokenAddress,
    });
    var token = await this.tokens[tokenAddress].load();
    var { symbol } = token;
    this.logger.log("INFO", `Token Added : ${symbol}`);
    return this.getToken(tokenAddress);
  }

  public getToken(address: string) {
    var tokenAddress = this.web3.utils.toChecksumAddress(address);
    if (!this.tokens[tokenAddress])
      return {
        address: null,
        balance: new Decimal(0),
        decimals: 0,
        symbol: "",
      };
    var { balance, decimals } = this.tokens[tokenAddress];
    return {
      ...this.tokens[tokenAddress],
      balance: new Decimal(balance).dividedBy(10 ** decimals),
    };
  }

  public async addPair(address: string | string[]) {
    var pairAddress = this.web3.utils.toChecksumAddress(
      Array.isArray(address)
        ? await this.factory.getPair(address[0], address[1])
        : address
    );
    if (this.web3.utils.toBN(pairAddress).isZero())
      return this.logger.log(
        "ERROR",
        `No Pair found for this tokens ${address}`
      );
    this.pairs[pairAddress] = new Pair({
      web3: this.web3,
      address: pairAddress,
    });
    var pair = await this.pairs[pairAddress].load();
    if (!pair) {
      delete this.pairs[pairAddress];
      this.logger.log("ERROR", `${address} is not a Pair Contract`);
      return;
    }
    var { symbol, tokens } = pair;
    await Promise.all(tokens.map((token) => this.addToken(token)));
    this.logger.log("INFO", `Pair Added : ${symbol}`);
    return this.getPair(pairAddress);
  }

  public getPair(address: string) {
    var pairAddress = this.web3.utils.toChecksumAddress(address);
    return this.pairs[pairAddress];
  }

  public async addAccount(privateKey: string) {
    var { address, balance, nonce } = await this.account.load(privateKey);
    this.logger.log(
      "INFO",
      `Account balance : ${this.web3.utils.fromWei(balance)}`
    );
    return this.account;
  }

  public getPath(tokenIn: string, tokenOut: string) {
    var pair = Object.values(this.pairs).find(
      (pair) => pair.tokens.includes(tokenIn) && pair.tokens.includes(tokenOut)
    );
    if (pair) return [tokenIn, tokenOut];
  }

  public waitForTransaction(filter = (transaction: any) => true) {
    return new Promise((resolve, reject) => {
      var callback = async (blockHeader: any) => {
        var block = await this.web3.eth.getBlock(blockHeader.number, true);
        var transaction = block.transactions.find((transaction) =>
          filter(transaction)
        );
        if (transaction) {
          this.subscriber.subscription("newBlockHeaders").off("data", callback);
          var receipt = await this.web3.eth.getTransactionReceipt(
            transaction.hash
          );
          resolve(receipt);
        }
      };
      this.subscriber.listen({ type: "newBlockHeaders" }, callback);
    });
  }

  public async swap(
    {
      amountIn = null,
      amountOutMin = null,
      amountOut = null,
      amountInMax = null,
    }: any,
    path: string[],
    to: string,
    deadline: number,
    options: any = {}
  ) {
    var from = this.account.address;

    if (this.web3.utils.toBN(from).isZero())
      throw new Error("No Account Added");

    var tokenIn = this.getToken(path[0]);
    var tokenOut = this.getToken(path[path.length - 1]);

    if (!tokenIn.address || !tokenOut.address)
      throw new Error("Tokens in path not added");

    if (
      tokenIn.balance.lessThan(amountIn || 0) ||
      tokenIn.balance.lessThan(amountInMax || 0)
    )
      throw new Error("Insufficient balance for this trade");

    this.router.contract.options.from = from;

    var method: string = "";
    var inputs: Decimal[] = [];
    var message: string = "";

    if (amountIn && amountOutMin) {
      method = "swapExactTokensForTokens";
      var amountInWithDecimals = amountIn.times(10 ** tokenIn.decimals);
      var amountOutMinWithDecimals = amountOutMin.times(
        10 ** tokenOut.decimals
      );
      inputs = [amountInWithDecimals, amountOutMinWithDecimals];
      message = `Swap ${amountIn} ${tokenIn.symbol} for a minimum of ${amountOutMin} ${tokenOut.symbol} ...`;
    } else if (amountOut && amountInMax) {
      method = "swapTokensForExactTokens";
      var amountOutWithDecimals = amountOut.times(10 ** tokenOut.decimals);
      var amountInMaxWithDecimals = amountInMax.times(10 ** tokenIn.decimals);
      inputs = [amountOutWithDecimals, amountInMaxWithDecimals];
      message = `Swap a maximum of ${amountInMax} ${tokenIn.symbol} for ${amountOut} ${tokenOut.symbol} ...`;
    }

    var data = this.router.contract.methods[method](
      ...inputs.map((amount) => amount.toString()),
      path,
      to,
      deadline
    ).encodeABI();

    var nonce = this.account.nonce;

    options.gas = options.gas || 300000;
    options.gasPrice = options.gasPrice || 1000000000;

    this.web3.eth
      .sendTransaction({
        from,
        data,
        nonce,
        to: this.router.contract.options.address,
        ...options,
      })
      .catch((e) => {
        this.logger.log(
          "ERROR",
          "The following error has occurred while sending the transaction : "
        );
        console.log(e.message);
      });

    this.account.nonce += 1;

    this.logger.log("INFO", message);

    var transaction: any = await this.waitForTransaction(
      (transaction: any) =>
        transaction.from == from && String(transaction.nonce) == String(nonce)
    );

    var { status, transactionHash } = transaction;

    this.logger.log(
      "UPDATE",
      `${
        status ? "Swap executed successfully" : "Swap failed"
      } ( ${transactionHash} )`
    );

    return transaction;
  }
}
