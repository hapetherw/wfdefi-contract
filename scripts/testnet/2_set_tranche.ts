import _ from "lodash"
import fs from "fs-extra"
import { ethers } from "hardhat"

const target = "100000000000000000000000"

async function main() {
  const [ owner ] = await ethers.getSigners()

  const height = await ethers.provider.getBlockNumber()
  console.log(`START_HEIGHT=${height}`)

  const sharedAddressPath = `${process.cwd()}/addresses/${ethers.provider.network.chainId}.json`
  const data = await fs.readFileSync(sharedAddressPath)
  const book = JSON.parse(data.toString())

  const TrancheMaster = await ethers.getContractFactory("TrancheMaster")

  const trancheMaster = await TrancheMaster.attach(book.TRANCHE_MASTER_ADDRESS)

  let tx = await trancheMaster.set(0, target, 10000, 500)
  await tx.wait()

  tx = await trancheMaster.set(1, target, 20000, 600)
  await tx.wait()

  tx = await trancheMaster.set(2, target, 0, 700)
  await tx.wait()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })