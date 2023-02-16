import { Decimal } from "decimal.js";
import { BlockHeader } from "web3-eth";
import EventEmitter from "events";

export * from "./customTypeGuards";

export function formatAmount(amount: number | string | Decimal, decimals: number | string | Decimal) {
  return new Decimal(amount).times(Decimal.pow(10, decimals));
}

export function getAverageBlockTime(blocksHeaders: BlockHeader[]) {
  const durations: number[] = [];
  blocksHeaders.sort((a, b) => a.number - b.number);
  blocksHeaders.forEach((block, index) => {
    if (index === blocksHeaders.length - 1) return;
    const nextBlock = blocksHeaders[index + 1];
    const duration = Number(nextBlock.timestamp) - Number(block.timestamp);
    durations.push(duration);
  });
  const sum = durations.reduce((a, b) => a + b, 0);
  return sum / durations.length || 0;
}

export function getNextBlockTime(blocksHeaders: BlockHeader[]) {
  const blockTime = getAverageBlockTime(blocksHeaders);
  blocksHeaders.sort((a, b) => b.number - a.number);
  const timestamp = Number(blocksHeaders[0].timestamp) + blockTime;
  const number = Number(blocksHeaders[0].number) + 1;
  return { timestamp, number };
}

export function waitForEvent(eventEmitter: EventEmitter, eventName: string, options: { timeout?: number; condition?: (...args: any) => boolean }) {
  return new Promise((resolve) => {
    const timeoutID = options.timeout
      ? setTimeout(() => {
          listener(undefined);
        }, options.timeout)
      : 0;
    const listener = (data: unknown) => {
      if (options.condition) {
        if (!options.condition(data)) return;
        resolve(data);
      }
      clearTimeout(timeoutID);
      eventEmitter.off(eventName, listener);
      resolve(data);
    };
    eventEmitter.on(eventName, listener);
  });
}
