import { Fetcher } from "@aymantaybi/dexclient-fetcher";
import { WebsocketProvider } from "web3-providers-ws";
import { toChecksumAddress } from "web3-utils";
import { BlockTransactionObject } from "web3-eth";
import { Token } from "./entities/token";
import { Account } from "./entities/account";
import { Pair } from "./entities/pair";
import { GetPairArgument, SwapAmount } from "./interfaces";
import { isGetPairArgumentPairAddress } from "./helpers/customTypeGuards";
import { Swap } from "./entities/swap";
import { executeAsync } from "@aymantaybi/dexclient-fetcher/dist/helpers";

export class Client {
  websocketProvider: WebsocketProvider;
  router: string;
  fetcher: Fetcher;
  account: Account;
  tokens: Token[] = [];
  pairs: Pair[] = [];
  blocks: BlockTransactionObject[] = [];

  constructor({ websocketProvider, router }: { websocketProvider: WebsocketProvider; router: string }) {
    this.websocketProvider = websocketProvider;
    this.router = router;
    this.fetcher = new Fetcher({ websocketProvider });
    this.account = new Account({ wallet: this.fetcher.web3.eth.accounts.wallet, fetcher: this.fetcher });
  }

  async initialize() {
    const batch = new this.fetcher.web3.BatchRequest();
    await this.fetcher.initialize();
    this.fetcher.on("newBlock", (block) => {
      if (this.blocks.find((localBlock) => localBlock.number === block.number)) return;
      this.blocks.unshift(block);
    });
    const currentBlock = await this.fetcher.web3.eth.getBlock("latest", true);
    const { number: currentBlockNumber } = currentBlock;
    for (let blockNumber = currentBlockNumber; blockNumber > currentBlockNumber - 10; blockNumber--) {
      batch.add((this.fetcher.web3.eth.getBlock as any).request(blockNumber, true));
    }
    const blocks = await executeAsync(batch);
    this.blocks = blocks;
  }

  async addAccount(privateKey: string) {
    this.fetcher.web3.eth.accounts.wallet.add(privateKey);
    await this.account.initialize();
    return this.account;
  }

  async addToken(address: string) {
    const { account } = this;
    const tokenAddress = toChecksumAddress(address);
    const addedToken = this.getToken(tokenAddress);
    if (addedToken) return addedToken;
    const fetcher = await this.fetcher.erc20(tokenAddress);
    const token = new Token({ fetcher, account });
    await token.initialize();
    this.tokens.push(token);
    return token;
  }

  getToken(address: string) {
    const tokenAddress = toChecksumAddress(address);
    return this.tokens.find((token) => token.address === tokenAddress);
  }

  async addPair(address: string) {
    const pairAddress = toChecksumAddress(address);
    const fetcher = await this.fetcher.pair(pairAddress);
    const { token0, token1 } = fetcher;
    const tokens = await Promise.all([this.addToken(token0), this.addToken(token1)]);
    const pair = new Pair({ fetcher, tokens });
    await pair.initialize();
    this.pairs.push(pair);
    return pair;
  }

  getPair(argument: GetPairArgument) {
    if (isGetPairArgumentPairAddress(argument)) {
      const address = argument;
      const pairAddress = toChecksumAddress(address);
      return this.pairs.find((pair) => pair.address === pairAddress);
    } else {
      const tokens = argument;
      return this.pairs.find((pair) => tokens.every((token) => [pair.token0, pair.token1].includes(token.address)));
    }
  }

  getPairs(path: Token[]) {
    const pairs = [];
    for (let i = 0; i < path.length - 1; i++) {
      const pair = this.getPair([path[i], path[i + 1]]);
      pairs.push(pair);
    }
    return pairs;
  }

  swap(amount: SwapAmount, path: Token[]) {
    const { fetcher, router, account } = this;
    const pairs = this.getPairs(path);
    const swap = new Swap({ router, account, fetcher, path, pairs });
    swap.amounts(amount);
    return swap;
  }
}
