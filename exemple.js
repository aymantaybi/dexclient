require('dotenv').config();

const Decimal = require("decimal.js");

const DexClient = require("./dist").default;

const routerAddress = "0x7d0556d55ca1a92708681e2e231733ebd922597d";
const factoryAddress = "0xb255d6a720bb7c39fee173ce22113397119cb930";

const { websocketProvider, privateKey } = process.env;

const katanaClient = new DexClient({ websocketProvider, routerAddress, factoryAddress });

(async () => {

    var walletAddress = await katanaClient.addAccount(privateKey);

    await katanaClient.addToken("0x97a9107c1793bc407d6f527b77e7fff4d812bece");
    await katanaClient.addToken("0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5");

    var tokenOut = katanaClient.getToken("0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5");
    var tokenIn = katanaClient.getToken("0x97a9107c1793bc407d6f527b77e7fff4d812bece");

    await katanaClient.addPair([tokenIn.address, tokenOut.address]);

    var amountOut = new Decimal(1);

    var path = katanaClient.getPath(tokenIn.address, tokenOut.address);

    var [inQuantity, outQuantity] = katanaClient.router.getAmountsIn(amountOut, path);

    return

    var [inQuantity, outQuantity] = katanaClient.router.getAmountsOut(amountIn, path);

    var amountIn = inQuantity;
    var amountOutMin = outQuantity;

    var transaction = await katanaClient.swap({ amountIn, amountOutMin }, path, walletAddress, Math.round(Date.now() / 1000) + 86400);


})()