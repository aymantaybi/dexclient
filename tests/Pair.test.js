const DexClient = require("../src").default;

const routerAddress = "0x7d0556d55ca1a92708681e2e231733ebd922597d";
const factoryAddress = "0xb255d6a720bb7c39fee173ce22113397119cb930";

const { websocketProvider, privateKey } = process.env;

const katanaClient = new DexClient({ websocketProvider, routerAddress, factoryAddress });

describe('Pair.ts', () => {

  it('should load Pair infos', async () => {

    await katanaClient.addPair("0x2ecb08f87f075b5769fe543d0e52e40140575ea7");

    expect(katanaClient.getPair("0x2ecb08f87f075b5769fe543d0e52e40140575ea7").symbol).toEqual('WETH-WRON');

  })

})