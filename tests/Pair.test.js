const Web3 = require("web3");
const Pair = require("../src/modules/Pair").default;

const { websocketProvider, privateKey } = process.env;

const options = { reconnect: { auto: true, delay: 10, maxAttempts: 10, onTimeout: false } };

const web3 = new Web3(new Web3.providers.WebsocketProvider(websocketProvider, options));

const pair = new Pair({ web3, address: "0x2ecb08f87f075b5769fe543d0e52e40140575ea7" });

describe('Pair.ts', () => {

  it('should load Pair infos', async () => {

    await pair.load();

    expect(pair.symbol).toEqual('WETH-WRON');

  })

})