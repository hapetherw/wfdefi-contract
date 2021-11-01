import _ from "lodash"
import { ethers } from "hardhat"
import { expect } from "chai"
import { Contract } from "@ethersproject/contracts"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { keccak256 } from "@ethersproject/keccak256"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const MASTER_ROLE = keccak256(Buffer.from("MASTER_ROLE", 'utf-8'))

describe("Strategy unit test", () => {
  let strategy: Contract
  let core: Contract
  let busd: Contract
  let alpacaToken: Contract
  let venusToken: Contract
  let creamFarm: Contract
  let alpacaFarm: Contract
  let venusFarm: Contract
  let uniswap: Contract

  let owner: SignerWithAddress
  let master: SignerWithAddress
  let attacker: SignerWithAddress

  beforeEach(async () => {
    ;[owner, master, attacker] = await ethers.getSigners()

    const Core = await ethers.getContractFactory("Core")
    const Strategy = await ethers.getContractFactory("Strategy")
    const AlpacaFake = await ethers.getContractFactory("AlpacaFake")
    const CreamFake = await ethers.getContractFactory("CreamFake")
    const Token = await ethers.getContractFactory("Token")
    const UniswapV2Router02 = await ethers.getContractFactory("UniswapV2Router02")
    const Oracle = await ethers.getContractFactory("Oracle")

    core = await Core.deploy()
    busd = await Token.deploy("busd", "busd", 18)
    alpacaToken = await Token.deploy("alpaca", "alpaca", 18)
    venusToken = await Token.deploy("venus", "venus", 18)
    creamFarm = await CreamFake.deploy(busd.address, ZERO_ADDRESS, 20, false)
    venusFarm = await CreamFake.deploy(busd.address, venusToken.address, 10, false)
    alpacaFarm = await AlpacaFake.deploy(busd.address, alpacaToken.address, 30, false)
    uniswap = await UniswapV2Router02.deploy(busd.address)
    strategy = await Strategy.deploy(core.address, busd.address)
    const alpacaOracle = await Oracle.deploy(50000000, 8)
    const xvsOracle = await Oracle.deploy(80000000, 8)

    await core.grantRole(MASTER_ROLE, master.address)
    await alpacaToken.mint(alpacaFarm.address, 80000)
    await venusToken.mint(venusFarm.address, 80000)
    await busd.mint(creamFarm.address, 80000)
    await busd.mint(venusFarm.address, 80000)
    await busd.mint(alpacaFarm.address, 80000)
    await busd.mint(uniswap.address, 80000)
    await busd.mint(master.address, 80000)

    await strategy.setFarms(
      creamFarm.address,
      30000,
      venusFarm.address,
      30000,
      alpacaFarm.address,
      40000
    )

    await strategy.setAlpacaToken(alpacaToken.address)
    await strategy.setVenusToken(venusToken.address)
    await strategy.setPancakeRouter(uniswap.address)
    await strategy.setAlpacaOracle(alpacaOracle.address)
    await strategy.setVenusOracle(xvsOracle.address)
  })

  describe("farm", () => {
    const total = 10000;
    it('onlyRole(MASTER_ROLE)', async () => {
      await expect(strategy.farm(total))
        .to.be.revertedWith("CoreRef::onlyRole: Not permit")
    })

    it("success", async () => {
      await busd.connect(master).approve(strategy.address, total)
      await expect(strategy.connect(master).farm(total))
        .to.emit(strategy, "Farm")
        .withArgs(total)

      expect(await busd.balanceOf(master.address)).to.equal(70000)
      expect(await creamFarm.balanceOf(strategy.address)).to.equal(3000)
      expect(await venusFarm.balanceOf(strategy.address)).to.equal(3000)
      expect(await alpacaFarm.balanceOf(strategy.address)).to.equal(4000)
      expect(await busd.balanceOf(creamFarm.address)).to.equal(83000)
      expect(await busd.balanceOf(venusFarm.address)).to.equal(83000)
      expect(await busd.balanceOf(alpacaFarm.address)).to.equal(84000)
    })
  })

  describe("redeem", () => {
    const total = 10000;

    beforeEach(async () => {
      await busd.connect(master).approve(strategy.address, total)
      await strategy.connect(master).farm(total)
    })

    it('onlyRole(MASTER_ROLE)', async () => {
      await expect(strategy.connect(attacker).redeem())
        .to.be.revertedWith("CoreRef::onlyRole: Not permit")
    })

    it("success", async () => {
      await expect(strategy.connect(master).redeem())
        .to.emit(strategy, "Redeem")
        .withArgs(20600)

      expect(await busd.balanceOf(master.address)).to.equal(90600)
      expect(await creamFarm.balanceOf(strategy.address)).to.equal(0)
      expect(await venusFarm.balanceOf(strategy.address)).to.equal(0)
      expect(await alpacaFarm.balanceOf(strategy.address)).to.equal(0)
      expect(await busd.balanceOf(creamFarm.address)).to.equal(79400)
      expect(await busd.balanceOf(venusFarm.address)).to.equal(79700)
      expect(await busd.balanceOf(alpacaFarm.address)).to.equal(78800)
      expect(await busd.balanceOf(uniswap.address)).to.equal(71500)
    })
  })

  describe("setAlpacaToken", () => {
    it('onlyGovernor', async () => {
      await expect(strategy.connect(attacker).setAlpacaToken(venusToken.address))
        .to.be.revertedWith("CoreRef::onlyGovernor: Caller is not a governor")
    })

    it("success", async () => {
      await strategy.setAlpacaToken(venusToken.address)
      expect(await strategy.AlpacaToken()).to.equal(venusToken.address)
    })
  })

  describe("setSlipPageFactor", () => {

  })
})