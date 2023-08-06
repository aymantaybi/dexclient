import { Decimal } from "decimal.js";
import EventEmitter from "events";

export * from "./typeGuards";

export function formatAmount(amount: number | string | Decimal, decimals: number | string | Decimal) {
  return new Decimal(amount).times(Decimal.pow(10, decimals));
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
