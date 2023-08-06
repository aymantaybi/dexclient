import { Wallet } from "web3-eth-accounts";
import { Fetcher } from "@aymantaybi/dexclient-fetcher";
import { fromWei, toChecksumAddress } from "web3-utils";
import EventEmitter from "events";

export class Account extends EventEmitter {
  wallet: Wallet;
  fetcher: Fetcher;
  private rawBalance = BigInt(0);
  nonce = BigInt(0);

  constructor({ wallet, fetcher }: { wallet: Wallet; fetcher: Fetcher }) {
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
      if (!block.transactions?.some(({ from, to }) => [from, to].includes(address))) return;
      this.updateAll(address);
    });
  }

  address() {
    const address = this.wallet[0]?.address;
    return address ? toChecksumAddress(address) : undefined;
  }

  balance(raw: boolean = false) {
    const { rawBalance } = this;
    if (raw) return rawBalance;
    return fromWei(rawBalance, "ether");
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
