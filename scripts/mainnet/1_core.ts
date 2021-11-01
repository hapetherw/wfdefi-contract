import { ethers } from "hardhat"
import { save } from "../utils"

async function main() {
  const [ owner ] = await ethers.getSigners()

  const Core = await ethers.getContractFactory("Core")
  const core = await Core.deploy()
  await core.deployed()

  console.log(`core=${core.address}`)

  const height = await ethers.provider.getBlockNumber()
  console.log(`height=${height}`)

  const book = {
    height,
    core: core.address
  }

  await save('core', book)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })