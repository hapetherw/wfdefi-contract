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

  const Strategy = await ethers.getContractFactory("Strategy")
  const Oracle = await ethers.getContractFactory("Oracle")

  const strategy = await Strategy.attach(book.STRATEGY_ADDRESS)

  const alpacaOracle = await Oracle.deploy(50000000, 8)
  await alpacaOracle.deployed()

  const xvsOracle = await Oracle.deploy(80000000, 8)
  await xvsOracle.deployed()

  let tx = await strategy.setAlpacaOracle(alpacaOracle.address)
  await tx.wait()

  tx = await strategy.setVenusOracle(xvsOracle.address)
  await tx.wait()

  book.ALPACA_ORACLE_ADDRESS = alpacaOracle.address
  book.VENUS_ORACLE_ADDRESS = xvsOracle.address

  await fs.writeFile(sharedAddressPath, JSON.stringify(book, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })