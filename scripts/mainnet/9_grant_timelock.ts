import { keccak256 } from "@ethersproject/keccak256";
import { ethers } from "hardhat"
import { load, save } from "../utils"

const TIMELOCK_ROLE = keccak256(Buffer.from('TIMELOCK_ROLE', 'utf-8'));

async function main() {
  const [ owner ] = await ethers.getSigners()
  const height = await ethers.provider.getBlockNumber()

  const coreAddress = (await load('core')).core

  const Core = await ethers.getContractFactory("Core")
  const core = await Core.attach(coreAddress)

  let tx = await core.grantRole(TIMELOCK_ROLE, '0x3360deC490E74605c65CDb8D2F87137c1C5E8345')
  await tx.wait()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
