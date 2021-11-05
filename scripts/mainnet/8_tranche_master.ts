import { ethers } from "hardhat"
import { load, save } from "../utils"
import { keccak256 } from "@ethersproject/keccak256"

const MASTER_ROLE = keccak256(Buffer.from("MASTER_ROLE", 'utf-8'))

async function main() {
  const [ owner ] = await ethers.getSigners()

  const height = await ethers.provider.getBlockNumber()

  const coreAddress = (await load('core')).core
  const mtoken = await load('mtoken')
  const masterWTF = (await load('masterWTF')).master

  const TrancheMaster = await ethers.getContractFactory("TrancheMaster")
  const Core = await ethers.getContractFactory("Core")
  const core = await Core.attach(coreAddress)

  const busd = '0xe9e7cea3dedca5984780bafc599bd69add087d56'
  const duration = 600

  const trancheMaster = await TrancheMaster.deploy(
    core,
    busd,
    mtoken.mBUSD,
    masterWTF,
    owner.address,
    duration,
    [
      {
        target: '600000000000000000',
        apy: 4760,
        fee: 0
      },
      {
        target: '300000000000000000',
        apy: 7140,
        fee: 0
      },
      {
        target: '100000000000000000',
        apy: 0,
        fee: 0
      }
    ]
  )
  await trancheMaster.deployed()

  let tx = await core.grantRole(MASTER_ROLE, trancheMaster.address)
  await tx.wait()

  const book = {
    height,
    master: trancheMaster.address
  }

  await save('trancheMaster', book)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })