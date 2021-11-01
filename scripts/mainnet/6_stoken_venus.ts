import { ethers } from "hardhat"
import { load, save } from "../utils"

async function main() {
  const [ owner ] = await ethers.getSigners()

  const height = await ethers.provider.getBlockNumber()

  const venusStrat = (await load('strategies')).venusStrat
  const book = (await load('stoken')) || {}

  const SingleStrategyToken = await ethers.getContractFactory("SingleStrategyToken")

  const busd = '0xe9e7cea3dedca5984780bafc599bd69add087d56'

  const stoken = await SingleStrategyToken.deploy(
    "sVENUS",
    "sVENUS",
    busd,
    venusStrat
  )
  await stoken.deployed()

  const StrategyVenus = await ethers.getContractFactory("StrategyVenus")
  const strat = await StrategyVenus.attach(venusStrat)

  let tx = await strat.transferOwnership(stoken.address)
  await tx.wait()

  book.sVENUS = stoken.address
  await save('stoken', book)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })