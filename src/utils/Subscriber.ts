import Web3 from "web3";
import events from "events";

export default class Subscriber {

    web3: Web3;
    eventEmitter: events;
    subscriptions: { [key: string]: any };

    constructor(web3: Web3) {
        this.web3 = web3;
        this.eventEmitter = new events.EventEmitter();
        this.subscriptions = {};
    }

    listen({ type, functionName }: any, callback: (log: any) => void) {

        var options: any = { topics: [] };

        if (type == "logs") {
            options.topics[0] = this.web3.eth.abi.encodeEventSignature(functionName);
        }

        this.subscriptions[type] = this.subscriptions[type] || type == "logs" ? this.web3.eth.subscribe(type as any, options) : this.web3.eth.subscribe(type as any);

        this.subscriptions[type].on("data", callback);

        return this.subscriptions[type];
    }

}