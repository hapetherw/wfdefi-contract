import { ethers } from "hardhat"
import { load, save } from "../utils"

async function main() {
  const [ owner ] = await ethers.getSigners()

  const height = await ethers.provider.getBlockNumber()

  const core = (await load('core')).core

  const MasterWTF = await ethers.getContractFactory("MasterWTF")

  const wtf = '0x2fa0cac2c75efb50382b5091c6494194eacf65b0'

  const master = await MasterWTF.deploy(
    core,
    wtf,
    '0',
    0,
    0,
    [
      25,
      35,
      40
    ]
  )
  await master.deployed()

  const book = {
    height,
    master: master.address
  }

  await save('masterWTF', book)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })