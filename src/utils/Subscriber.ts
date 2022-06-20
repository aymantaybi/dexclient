import Web3 from "web3";
import events from "events";

export default class Subscriber {

    web3: Web3;
    subscriptions: { [key: string]: events };

    constructor(web3: Web3) {
        this.web3 = web3;
        this.subscriptions = {
            "logs": new events.EventEmitter(),
            "newBlockHeaders": new events.EventEmitter(),
        };
        this.web3.eth.subscribe("logs", {}).on("data", (log) => {
            this.subscriptions.logs.emit(log.topics[0], log);
        })
        this.web3.eth.subscribe("newBlockHeaders").on("data", (blockHeader) => {
            this.subscriptions.newBlockHeaders.emit("data", blockHeader);
        })
    }

    subscription(type: string) {
        return this.subscriptions[type];
    }

    listen({ type, functionName }: any, callback: (log: any) => void) {
        if (functionName) {
            var event = this.web3.eth.abi.encodeEventSignature(functionName);
            this.subscription(type).on(event, callback);
            return;
        }
        this.subscription(type).on("data", callback);
    }

}