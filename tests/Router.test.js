const Decimal = require("decimal.js");

const DexClient = require("../src").default;

const routerAddress = "0x7d0556d55ca1a92708681e2e231733ebd922597d";
const factoryAddress = "0xb255d6a720bb7c39fee173ce22113397119cb930";

const { websocketProvider, privateKey } = process.env;

const katanaClient = new DexClient({ websocketProvider, routerAddress, factoryAddress });

jest.setTimeout(50000)

describe('Router.ts', () => {

  it('should output exact value ', async () => {

    await katanaClient.addPair(["0xa8754b9fa15fc18bb59458815510e40a12cd2014", "0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5"]);
    await katanaClient.addPair(["0x97a9107c1793bc407d6f527b77e7fff4d812bece", "0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5"]);

    var amountIn = new Decimal(1);

    var [inQuantity, outQuantity] = katanaClient.router.getAmountsOut(amountIn, ["0x97a9107c1793bc407d6f527b77e7fff4d812bece", "0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5"])

    console.log(inQuantity, outQuantity);

    expect(katanaClient.getPair("0x306a28279d04a47468ed83d55088d0dcd1369294").symbol).toEqual('SLP-WETH');

  })

})