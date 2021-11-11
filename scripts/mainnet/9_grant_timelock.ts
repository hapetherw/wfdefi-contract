import { load, save } from "../utils"
import { keccak256 } from "@ethersproject/keccak256";
import { ethers } from "hardhat"

const TIMELOCK_ROLE = keccak256(Buffer.from('TIMELOCK_ROLE', 'utf-8'));

async function main() {
  const [owner] = await ethers.getSigners()
  const coreAddress = (await load('core')).core
  const timelockcontroller_address = (await load('timelockcontroller')).timelockcontroller;

  const Core = await ethers.getContractFactory('Core')
  const core = await Core.attach(coreAddress)

  const TimelockController = await ethers.getContractFactory('TimelockController')
  const timelockcontroller = await TimelockController.attach(timelockcontroller_address);

  // Grant timelock role to timelock

  let tx1 = await core.grantRole(TIMELOCK_ROLE, timelockcontroller_address)
  await tx1.wait()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
