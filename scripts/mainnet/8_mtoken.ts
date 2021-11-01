import { ethers } from "hardhat"
import { load, save } from "../utils"

async function main() {
  const [ owner ] = await ethers.getSigners()

  const height = await ethers.provider.getBlockNumber()

  const core = (await load('core')).core
  const stoken = await load('stoken')

  const MultiStrategyToken = await ethers.getContractFactory("MultiStrategyToken")

  const busd = '0xe9e7cea3dedca5984780bafc599bd69add087d56'

  const mtoken = await MultiStrategyToken.deploy(
    core,
    "mBUSD",
    "mBUSD",
    busd,
    [
      stoken.sALPACA,
      stoken.sVENUS,
      stoken.sCREAM
    ],
    [
      40,
      30,
      30
    ]
  )
  await mtoken.deployed()

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