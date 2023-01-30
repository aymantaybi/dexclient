import { Fetcher } from "@aymantaybi/dexclient-fetcher";
import Web3 from "web3";
import { WebsocketProvider } from "web3-providers-ws";
import { toChecksumAddress } from "web3-utils";
import { Token } from "./entities/token";
import { Account } from "./entities/account";

export class Client {
  websocketProvider: WebsocketProvider;
  web3: Web3;
  fetcher: Fetcher;
  account: Account;
  tokens: Token[] = [];

  constructor({ websocketProvider }: { websocketProvider: WebsocketProvider }) {
    this.websocketProvider = websocketProvider;
    this.web3 = new Web3(websocketProvider);
    this.fetcher = new Fetcher({ websocketProvider });
    this.account = new Account({ wallet: this.web3.eth.accounts.wallet, fetcher: this.fetcher });
  }

  async initialize() {
    await this.fetcher.initialize();
  }

  async addAccount(privateKey: string) {
    this.web3.eth.accounts.wallet.add(privateKey);
    await this.account.initialize();
    return this.account;
  }

  async addToken(address: string) {
    const { account } = this;
    const tokenAddress = toChecksumAddress(address);
    const tokenIndex = this.tokens.findIndex((token) => token.address === tokenAddress);
    if (tokenIndex > -1) return this.tokens[tokenIndex];
    const fetcher = await this.fetcher.erc20(tokenAddress);
    const token = new Token({ fetcher, account });
    await token.initialize();
    this.tokens.push(token);
    return token;
  }
}
