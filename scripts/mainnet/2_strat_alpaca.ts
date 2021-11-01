import { ethers } from "hardhat"
import { load, save } from "../utils"

async function main() {
  const [ owner ] = await ethers.getSigners()

  const height = await ethers.provider.getBlockNumber()
  console.log(`height=${height}`)

  const core = (await load('core')).core

  const strategies = (await load('strategies')) || {}

  const StrategyAlpaca = await ethers.getContractFactory("StrategyAlpaca")

  const wbnb = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
  const vault = '0x7C9e73d4C71dae564d41F78d56439bB4ba87592f'
  const busd = '0xe9e7cea3dedca5984780bafc599bd69add087d56'
  const pancakeRouter = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
  const alpacaToken = '0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F'
  const pid = 3

  const strat = await StrategyAlpaca.deploy(
    core,
    vault,
    busd,
    pancakeRouter,
    pid,
    [
        alpacaToken,
        wbnb,
        busd
    ]
  )
  await strat.deployed()

  strategies.alpacaStrat = strat.address
  await save('strategies', strategies)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })