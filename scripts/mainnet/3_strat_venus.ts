import { ethers } from "hardhat"
import { load, save } from "../utils"

async function main() {
  const [ owner ] = await ethers.getSigners()

  const height = await ethers.provider.getBlockNumber()

  const core = (await load('core')).core

  const strategies = (await load('strategies')) || {}

  const StrategyVenus = await ethers.getContractFactory("StrategyVenus")

  const wbnb = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
  const busd = '0xe9e7cea3dedca5984780bafc599bd69add087d56'
  const vToken = '0x95c78222b3d6e262426483d42cfa53685a67ab9d'
  const xvs = '0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63'
  const distributionAddress = '0xfD36E2c2a6789Db23113685031d7F16329158384'
  const pancakeRouter = '0x10ED43C718714eb63d5aA57B78B54704E256024E'

  const strat = await StrategyVenus.deploy(
    core,
    busd,
    vToken,
    pancakeRouter,
    xvs,
    distributionAddress,
    [
      xvs,
      wbnb,
      busd
    ],
    false
  )
  await strat.deployed()

  strategies.venusStrat = strat.address
  await save('strategies', strategies)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })