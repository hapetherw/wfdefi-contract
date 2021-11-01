import { ethers } from "hardhat"
import { load, save } from "../utils"

async function main() {
  const [ owner ] = await ethers.getSigners()

  const height = await ethers.provider.getBlockNumber()
  console.log(`height=${height}`)

  const alpacaStrat = (await load('strategies')).alpacaStrat
  const book = (await load('stoken')) || {}

  const SingleStrategyToken = await ethers.getContractFactory("SingleStrategyToken")

  const busd = '0xe9e7cea3dedca5984780bafc599bd69add087d56'

  const stoken = await SingleStrategyToken.deploy(
    "sALPACA",
    "sALPACA",
    busd,
    alpacaStrat
  )
  await stoken.deployed()

  const StrategyAlpaca = await ethers.getContractFactory("StrategyAlpaca")
  const strat = await StrategyAlpaca.attach(alpacaStrat)

  let tx = await strat.transferOwnership(stoken.address)
  await tx.wait()

  book.sALPACA = stoken.address
  await save('stoken', book)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })