require('dotenv').config();

const Decimal = require("decimal.js");

const DexClient = require("./dist").default;

const routerAddress = "0x7d0556d55ca1a92708681e2e231733ebd922597d";
const factoryAddress = "0xb255d6a720bb7c39fee173ce22113397119cb930";

const { WEBSOCKET_PROVIDER_HOST, PRIVATE_KEY } = process.env;

const katanaClient = new DexClient({ host: WEBSOCKET_PROVIDER_HOST, routerAddress, factoryAddress });

(async () => {

    var account = await katanaClient.addAccount(PRIVATE_KEY);

    await katanaClient.addToken("0xa8754b9fa15fc18bb59458815510e40a12cd2014");
    await katanaClient.addToken("0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5");

    var tokenIn = katanaClient.getToken("0xa8754b9fa15fc18bb59458815510e40a12cd2014");
    var tokenOut = katanaClient.getToken("0xc99a6a985ed2cac1ef41640596c5a5f9f4e19ef5");

    await katanaClient.addPair([tokenIn.address, tokenOut.address]);

    var amountIn = tokenIn.balance;

    var path = katanaClient.getPath(tokenIn.address, tokenOut.address);

    var [inQuantity, outQuantity] = katanaClient.router.getAmountsOut(amountIn, path);

    var amountOut = outQuantity;

    var [inQuantity, outQuantity] = katanaClient.router.getAmountsIn(amountOut, path);

    var amountInMax = inQuantity;

    var transaction = await katanaClient.swap({ amountOut, amountInMax }, path, account.address, Math.round(Date.now() / 1000) + 86400);

    return

    var [inQuantity, outQuantity] = katanaClient.router.getAmountsOut(amountIn, path);

    var amountIn = inQuantity;
    var amountOutMin = outQuantity;

    var transaction = await katanaClient.swap({ amountIn, amountOutMin }, path, walletAddress, Math.round(Date.now() / 1000) + 86400);


})()