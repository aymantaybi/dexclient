This project is still in development phase, this documentation does not cover all features and usage exemples
I will keep updates on a daily basis

# DexClient

High performance client for all Decentralized Exchanges built on top of EVM compatible Blockchains

## Features

Realtime sync :

- Account erc20 tokens and native coin balance
- Account transactions count (nonce)
- Pairs (Liquidity providers) reserves

## Installation

Install @aymantaybi/dexclient with npm

```bash
  npm install @aymantaybi/dexclient
```

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`host` : http://127.0.0.1/:8546 for a local node

`privateKey` : wallet private key

## Usage/Examples

Initialize a DEX client :

```javascript
require("dotenv").config();

const DexClient = require("@aymantaybi/dexclient").default;

const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const factoryAddress = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";

const { WEBSOCKET_PROVIDER_HOST, PRIVATE_KEY } = process.env;

const pancakeSwapClient = new DexClient({
  host: WEBSOCKET_PROVIDER_HOST,
  routerAddress,
  factoryAddress,
});
```

Add an Account with some tokens :

```javascript
(async () => {
  //Load account infos
  //transactions count and native coin balance

  await pancakeSwapClient.addAccount(PRIVATE_KEY);

  //Load tokens infos
  //symbol, decimals, and account balance

  //Add WETH token
  await pancakeSwapClient.addToken(
    "0x4DB5a66E937A9F4473fA95b1cAF1d1E1D62E29EA"
  );

  //Add BUSD token
  await pancakeSwapClient.addToken(
    "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"
  );

  //Access added token info
  var { symbol, balance, decimals } = pancakeSwapClient.getToken(
    "0x4DB5a66E937A9F4473fA95b1cAF1d1E1D62E29EA"
  );

  console.log(symbol, balance, decimals);
})();
```

Output :

```
[ 14 : 17 : 53 ][ INFO ] Account balance : 9.602086118228354928
[ 14 : 17 : 53 ][ INFO ] Token Added : WETH
[ 14 : 17 : 53 ][ INFO ] Token Added : BUSD
BUSD,53,18
```

Execute a swap or any transaction changing the tokens balance :

```
[ 14 : 22 : 23 ][ UPDATE ] Symbol : WETH | Balance : 0.495962285261187137
[ 14 : 22 : 23 ][ UPDATE ] Symbol : BUSD | Balance : 256.081360856610278574
[ 14 : 22 : 23 ][ UPDATE ] Account balance : 9.601533408228354928
[ 14 : 22 : 23 ][ UPDATE ] Transactions Count : 3857
```
