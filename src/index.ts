import { Fetcher } from "@aymantaybi/dexclient-fetcher";
import { WebsocketProvider } from "web3-providers-ws";
import { toChecksumAddress } from "web3-utils";
import { BlockHeader } from "web3-eth";
import { Token } from "./entities/token";
import { Account } from "./entities/account";
import { Pair } from "./entities/pair";
import { GetPairArgument, SwapAmount } from "./interfaces";
import { isGetPairArgumentPairAddress } from "./helpers/customTypeGuards";
import { Swap, SwapType } from "./entities/swap";
import { Route } from "./entities/route";

export class Client {
  websocketProvider: WebsocketProvider;
  router: string;
  fetcher: Fetcher;
  account: Account;
  tokens: Token[] = [];
  pairs: Pair[] = [];
  blocksHeaders: BlockHeader[] = [];

  constructor({ websocketProvider, router }: { websocketProvider: WebsocketProvider; router: string }) {
    this.websocketProvider = websocketProvider;
    this.router = router;
    this.fetcher = new Fetcher({ websocketProvider });
    this.account = new Account({ wallet: this.fetcher.web3.eth.accounts.wallet, fetcher: this.fetcher });
  }

  async initialize() {
    await this.fetcher.initialize();
    this.fetcher.subscription?.on("data", (blockHeader) => {
      if (this.blocksHeaders.find((localBlockHeader) => localBlockHeader.number === blockHeader.number)) return;
      this.blocksHeaders.unshift(blockHeader);
      this.blocksHeaders.pop();
    });
    const currentBlock = await this.fetcher.web3.eth.getBlock("latest");
    const previousBlock = await this.fetcher.web3.eth.getBlock(currentBlock.number - 1);
    const blocks = [currentBlock, previousBlock];
    this.blocksHeaders = blocks;
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

  swap(path: Token[], type: SwapType, amount: SwapAmount) {
    const { fetcher, router, pairs } = this;
    const route = new Route({ path, pairs });
    const swap = new Swap({ fetcher, router, route, type }, amount);
    return swap;
  }
}
