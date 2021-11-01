import { ethers } from "hardhat"

const provider = new ethers.providers.JsonRpcProvider();

async function getBlockNumber() {
  return await provider.getBlockNumber();
}

async function mineBlocks(n: Number) {
  for (let i = 0; i < n; i++) {
    await provider.send("evm_mine", []);
  }
}

function getCurrentTimestamp() {
  return Math.floor(new Date().getTime() / 1000);
}

async function getBlockTimestamp() {
  let block = await provider.getBlock(await getBlockNumber());
  return block.timestamp;
}

async function increaseTime(ts: Number) {
  await provider.send("evm_increaseTime", [ts]);
}

async function setBlockTime(ts: Number) {
  await provider.send("evm_setNextBlockTimestamp", [ts]);
}

export {
  getBlockNumber,
  mineBlocks,
  getCurrentTimestamp,
  getBlockTimestamp,
  increaseTime,
  setBlockTime
}