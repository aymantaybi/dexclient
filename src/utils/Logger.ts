import chalk from 'chalk';

export default class Logger {

    colors: { [type: string]: string };
    types: string[];

    constructor() {
        this.colors = {
            "UPDATE": "blue",
            "INFO": "yellow",
            "ERROR": "red",
        };
        this.types = ["UPDATE", "INFO", "ERROR"];
    }

    log(type: string, data: string) {
        if (!this.types.includes(type)) return;
        console.log(`[ ${chalk.grey(HandleTime())} ][ ${chalk`{${this.colors[type]} ${type}}`} ] ${data} `);
    }

    show(type: string) {
        if (this.types.includes(type)) return;
        this.types.push(type);
    }

    hide(type: string) {
        this.types = this.types.filter(item => item != type);
    }

}

function HandleTimeFormat(i: number) {
    return i < 10 ? `0${i}` : i;
}

function HandleTime() {
    var d = new Date();
    var h = HandleTimeFormat(d.getHours());
    var m = HandleTimeFormat(d.getMinutes());
    var s = HandleTimeFormat(d.getSeconds());
    var CurrentTime = `${h} : ${m} : ${s}`;
    return CurrentTime;
}