import { Erc20Fetcher } from "@aymantaybi/dexclient-fetcher";
import Decimal from "decimal.js";
import { Account } from "./account";

export class Token {
  fetcher: Erc20Fetcher;
  account: Account;
  address: string;
  decimals: string;
  symbol: string;
  private rawBalance: string = "0";

  constructor({ fetcher, account }: { fetcher: Erc20Fetcher; account: Account }) {
    this.fetcher = fetcher;
    this.account = account;
    this.address = fetcher.address;
    this.decimals = fetcher.decimals;
    this.symbol = fetcher.symbol;
    this.fetcher.on("balanceUpdate", (data) => {
      this.rawBalance = data.balance;
    });
  }

  async initialize() {
    const address = this.account.address();
    if (!address) return;
    this.rawBalance = await this.fetcher.contract.methods.balanceOf(address).call();
    this.fetcher.subscribe(address);
    return this;
  }

  balance(raw: boolean = false) {
    const { rawBalance, decimals } = this;
    if (raw) return rawBalance;
    return new Decimal(rawBalance).dividedBy(Decimal.pow(10, decimals));
  }
}
