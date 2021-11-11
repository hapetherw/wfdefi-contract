import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { ethers } from "hardhat"
import { load, save } from "../utils"
import { keccak256 } from "@ethersproject/keccak256"
const MASTER_ROLE = keccak256(Buffer.from("MASTER_ROLE", 'utf-8'))
const multisig = process.env.MULTISIG
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
  const duration = 10800

  const trancheMaster = await TrancheMaster.deploy(
    coreAddress,
    busd,
    mtoken.mBUSD,
    masterWTF,
    multisig,
    duration,
    [
      {
        target: '6000000000000000000000',
        apy: 7080,
        fee: 33
      },
      {
        target: '3000000000000000000000',
        apy: 10620,
        fee: 50
      },
      {
        target: '1000000000000000000000',
        apy: 0,
        fee: 200
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