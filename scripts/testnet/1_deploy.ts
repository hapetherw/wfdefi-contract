import _ from "lodash"
import fs from "fs-extra"
import { ethers } from "hardhat"
import { keccak256 } from "@ethersproject/keccak256"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const one = "1000000000000000000"
const total = "100000000000000000000000000"
const target = "1000000000000000000000000" // 1M

const MASTER_ROLE = keccak256(Buffer.from("MASTER_ROLE", 'utf-8'))
const TIMELOCK_ROLE = keccak256(Buffer.from("TIMELOCK_ROLE", 'utf-8'))

async function main() {
  const [ owner ] = await ethers.getSigners()

  const Core = await ethers.getContractFactory("Core")
  const Strategy = await ethers.getContractFactory("Strategy")
  const Token = await ethers.getContractFactory("Token")
  const CreamFake = await ethers.getContractFactory("CreamFake")
  const AlpacaFake = await ethers.getContractFactory("AlpacaFake")
  const MasterChef = await ethers.getContractFactory("MasterChef")
  const UniswapV2Router02 = await ethers.getContractFactory("UniswapV2Router02")
  const TrancheMaster = await ethers.getContractFactory("TrancheMaster")
  const TimelockController = await ethers.getContractFactory("TimelockController")

  const core = await Core.deploy()
  await core.deployed()

  console.log(`CORE_ADDRESS=${core.address}`)

  const height = await ethers.provider.getBlockNumber()
  console.log(`START_HEIGHT=${height}`)

  const busd = await Token.deploy("BUSD", "BUSD", 18)
  await busd.deployed()

  console.log(`BUSD_ADDRESS=${busd.address}`)

  const alpacaToken = await Token.deploy("alpaca", "alpaca", 18)
  await alpacaToken.deployed()

  console.log(`ALPACA_ADDRESS=${alpacaToken.address}`)

  const venusToken = await Token.deploy("venus", "venus", 18)
  await venusToken.deployed()

  console.log(`VENUS_ADDRESS=${venusToken.address}`)

  const creamFarm = await CreamFake.deploy(
    busd.address,
    ZERO_ADDRESS,
    10,
    false
  )
  await creamFarm.deployed()

  console.log(`CREAM_FARM_ADDRESS=${creamFarm.address}`)

  const venusFarm = await CreamFake.deploy(
    busd.address,
    venusToken.address,
    20,
    false
  )
  await venusFarm.deployed()

  console.log(`VENUS_FARM_ADDRESS=${venusFarm.address}`)

  const alpacaFarm = await AlpacaFake.deploy(
    busd.address,
    alpacaToken.address,
    30,
    false
  )
  await alpacaFarm.deployed()

  console.log(`ALPACA_FARM_ADDRESS=${alpacaFarm.address}`)

  const uniswap = await UniswapV2Router02.deploy(busd.address)
  await uniswap.deployed()
  
  console.log(`UNISWAP_ROUTER_ADDRESS=${uniswap.address}`)

  const strategy = await Strategy.deploy(core.address, busd.address)
  await strategy.deployed()

  console.log(`STRATEGY_ADDRESS=${strategy.address}`)

  const wtf = await Token.deploy("WTF", "WTF", 18)
  await wtf.deployed()

  console.log(`WTF_ADDRESS=${wtf.address}`)

  const chef = await MasterChef.deploy(
    core.address,
    wtf.address,
    one,
    0,
    one
  )
  await chef.deployed()

  console.log(`CHEF_ADDRESS=${chef.address}`)

  let tx = await strategy.setFarms(
    creamFarm.address,
    30000,
    venusFarm.address,
    30000,
    alpacaFarm.address,
    40000
  )
  await tx.wait()

  tx = await strategy.setAlpacaToken(alpacaToken.address)
  await tx.wait()

  tx = await strategy.setVenusToken(venusToken.address)
  await tx.wait()

  tx = await strategy.setPancakeRouter(uniswap.address)
  await tx.wait()

  const trancheMaster = await TrancheMaster.deploy(
    core.address,
    busd.address,
    strategy.address,
    chef.address,
    owner.address
  )
  await trancheMaster.deployed()

  console.log(`TRANCHE_MASTER_ADDRESS=${trancheMaster.address}`)

  const timelock = await TimelockController.deploy(
    core.address,
    600
  )
  await timelock.deployed()

  console.log(`TIMELOCK_ADDRESS=${timelock.address}`)

  tx = await trancheMaster.add("600000000000000000000000", 3500, 5);
  await tx.wait()

  tx = await trancheMaster.add("300000000000000000000000", 5000, 7);
  await tx.wait()

  tx = await trancheMaster.add("100000000000000000000000", 0, 30);
  await tx.wait()

  tx = await trancheMaster.setDuration(86400);
  await tx.wait()

  tx = await core.grantRole(MASTER_ROLE, trancheMaster.address)
  await tx.wait()

  tx = await core.grantRole(TIMELOCK_ROLE, timelock.address)
  await tx.wait()

  tx = await core.grantRole(TIMELOCK_ROLE, owner.address)
  await tx.wait()

  tx = await chef.add(25)
  await tx.wait()

  tx = await chef.add(35)
  await tx.wait()

  tx = await chef.add(40)
  await tx.wait()

  tx = await wtf.mint(chef.address, "70000000000000000000000")
  await tx.wait()

  tx = await alpacaToken.mint(alpacaFarm.address, total)
  await tx.wait()

  tx = await venusToken.mint(venusFarm.address, total)
  await tx.wait()

  tx = await busd.mint(creamFarm.address, total)
  await tx.wait()

  tx = await busd.mint(venusFarm.address, total)
  await tx.wait()

  tx = await busd.mint(alpacaFarm.address, total)
  await tx.wait()

  tx = await busd.mint(uniswap.address, total)
  await tx.wait()

  tx = await busd.mint(owner.address, total)
  await tx.wait()

  const addressBook = {
    HEIGHT: height,
    CORE_ADDRESS: core.address.slice(2),
    TRANCHE_MASTER_ADDRESS: trancheMaster.address.slice(2),
    STRATEGY_ADDRESS: strategy.address.slice(2),
    CHEF_ADDRESS: chef.address.slice(2),
    BUSD_ADDRESS: busd.address.slice(2),
    ALPACA_ADDRESS: alpacaToken.address.slice(2),
    VENUS_ADDRESS: venusToken.address.slice(2),
    WTF_ADDRESS: wtf.address.slice(2),
    CREAM_FARM_ADDRESS: creamFarm.address.slice(2),
    VENUS_FARM_ADDRESS: venusFarm.address.slice(2),
    ALPACA_FARM_ADDRESS: alpacaFarm.address.slice(2),
    UNISWAP_ROUTER_ADDRESS: uniswap.address.slice(2),
    TIMELOCK_ADDRESS: timelock.address.slice(2)
  }

  const sharedAddressPath = `${process.cwd()}/addresses/${ethers.provider.network.chainId}.json`
  await fs.writeFile(sharedAddressPath, JSON.stringify(addressBook, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })