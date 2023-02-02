import { Decimal } from "decimal.js";
import { BlockTransactionObject } from "web3-eth";

export function formatAmount(amount: number | string | Decimal, decimals: number | string | Decimal) {
  return new Decimal(amount).times(Decimal.pow(10, decimals));
}

export function getAverageBlockTime(blocks: BlockTransactionObject[]) {
  const durations: number[] = [];
  blocks.sort((a, b) => a.number - b.number);
  blocks.forEach((block, index) => {
    if (index === blocks.length - 1) return;
    const nextBlock = blocks[index + 1];
    const duration = Number(nextBlock.timestamp) - Number(block.timestamp);
    durations.push(duration);
  });
  const sum = durations.reduce((a, b) => a + b, 0);
  return sum / durations.length || 0;
}

export function getNextBlockTime(blocks: BlockTransactionObject[]) {
  const blockTime = getAverageBlockTime(blocks);
  blocks.sort((a, b) => b.number - a.number);
  const timestamp = Number(blocks[0].timestamp) + blockTime;
  const number = Number(blocks[0].number) + 1;
  return { timestamp, number };
}
