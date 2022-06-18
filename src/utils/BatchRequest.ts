import Web3 from 'web3';

export default class BatchRequest {

    web3: Web3;
    batch: any;
    requests: any[];
    responses: any[];
    resolve: any;

    constructor(web3: Web3) {
        this.web3 = web3;
        this.batch = new this.web3.BatchRequest();
        this.requests = [];
        this.responses = [];
    }

    add({ methode, parameter, callback }: any) {
        this.requests.push({ methode, parameter });
        parameter = parameter || [];
        this.batch.add(methode.request(...parameter, (err: any, res: any) => {
            this.responses.push(res);
            callback && callback(err, res);
            if (this.responses.length != this.requests.length) return;
            this.resolve && this.resolve(this.responses);
            this.requests = [];
            this.responses = [];
        }))
    }

    execute() {
        this.batch.execute();
    }

    executeAsync() {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.execute();
        })
    }

}

