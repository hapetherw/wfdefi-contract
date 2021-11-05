import { ethers } from "hardhat"
import { load, save } from "../utils"

async function main() {
  const [ owner ] = await ethers.getSigners()

  const height = await ethers.provider.getBlockNumber()

  const core = (await load('core')).core
  const strategies = await load('strategies')

  const MultiStrategyToken = await ethers.getContractFactory("MultiStrategyToken")

  const busd = '0xe9e7cea3dedca5984780bafc599bd69add087d56'

  const mtoken = await MultiStrategyToken.deploy(
    core,
    busd,
    [
      strategies.alpacaStrat,
      strategies.venusStrat,
      strategies.creamStrat
    ],
    [
      40,
      30,
      30
    ]
  )
  await mtoken.deployed()

  const StrategyAlpaca = await ethers.getContractFactory("StrategyAlpaca")
  const stratAlpaca = await StrategyAlpaca.attach(strategies.alpacaStrat)
  let tx = await stratAlpaca.transferOwnership(mtoken.address)
  await tx.wait()

  const StrategyVenus = await ethers.getContractFactory("StrategyVenus")
  const stratVenus = await StrategyVenus.attach(strategies.venusStrat)
  tx = await stratVenus.transferOwnership(mtoken.address)
  await tx.wait()

  const stratCream = await StrategyVenus.attach(strategies.creamStrat)
  tx = await stratCream.transferOwnership(mtoken.address)
  await tx.wait()

  const book = {
    height,
    mBUSD: mtoken.address
  }

  await save('mtoken', book)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })