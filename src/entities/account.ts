import { WalletBase } from "web3-core";
import { Fetcher } from "@aymantaybi/dexclient-fetcher";
import { fromWei, toChecksumAddress } from "web3-utils";
import EventEmitter from "events";

export class Account extends EventEmitter {
  wallet: WalletBase;
  fetcher: Fetcher;
  private rawBalance = "0";
  nonce = 0;

  constructor({ wallet, fetcher }: { wallet: WalletBase; fetcher: Fetcher }) {
    super();
    this.wallet = wallet;
    this.fetcher = fetcher;
  }

  async initialize() {
    const address = this.address();
    if (!address) throw Error("Missing wallet address");
    await this.updateAll(address);
    this.fetcher.on("newBlock", async (block) => {
      const address = this.address();
      if (!address) return;
      if (!block.transactions.some(({ from, to }) => [from, to].includes(address))) return;
      this.updateAll(address);
    });
  }

  address() {
    return toChecksumAddress(this.wallet[0]?.address) || undefined;
  }

  balance(raw: boolean = false) {
    const { rawBalance } = this;
    if (raw) return rawBalance;
    return fromWei(rawBalance);
  }

  private async updateBalance(account: string) {
    const rawBalance = await this.fetcher.web3.eth.getBalance(account);
    if (this.rawBalance !== rawBalance) {
      this.rawBalance = rawBalance;
      const balance = this.balance();
      this.emit("balanceUpdate", { account, balance });
    }
  }

  private async updateNonce(account: string) {
    const nonce = await this.fetcher.web3.eth.getTransactionCount(account, "pending");
    if (this.nonce < nonce) {
      this.nonce = nonce;
      this.emit("nonceUpdate", { account, nonce });
    }
  }

  private async updateAll(account: string) {
    await Promise.all([this.updateBalance(account), this.updateNonce(account)]);
  }
}

export default Account;

export declare interface Account {
  on(event: "balanceUpdate", listener: (data: { account: string; balance: string }) => void): this;
  on(event: "nonceUpdate", listener: (data: { account: string; nonce: number }) => void): this;
}
