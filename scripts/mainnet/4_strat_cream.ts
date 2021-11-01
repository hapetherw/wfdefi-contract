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
  const vToken = '0x2bc4eb013ddee29d37920938b96d353171289b7c'
  const cream = '0xd4CB328A82bDf5f03eB737f37Fa6B370aef3e888'
  const distributionAddress = '0x589DE0F0Ccf905477646599bb3E5C622C84cC0BA'
  const pancakeRouter = '0x10ED43C718714eb63d5aA57B78B54704E256024E'

  const strat = await StrategyVenus.deploy(
    core,
    busd,
    vToken,
    pancakeRouter,
    cream,
    distributionAddress,
    [
      cream,
      wbnb,
      busd
    ],
    true
  )
  await strat.deployed()

  strategies.creamStrat = strat.address
  await save('strategies', strategies)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })