import _ from "lodash"
import { ethers } from "hardhat"
import { expect } from "chai"
import { Contract } from "@ethersproject/contracts"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { increaseTime } from './helpers'
import { keccak256 } from "@ethersproject/keccak256"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const MASTER_ROLE = keccak256(Buffer.from("MASTER_ROLE", 'utf-8'))
const TIMELOCK_ROLE = keccak256(Buffer.from("TIMELOCK_ROLE", 'utf-8'))
const DURATION = 86400 * 7

describe("TrancheMaster unit test", () => {
  let strategy: Contract
  let core: Contract
  let chef: Contract
  let wtf: Contract
  let busd: Contract
  let alpacaToken: Contract
  let venusToken: Contract
  let creamFarm: Contract
  let alpacaFarm: Contract
  let venusFarm: Contract
  let uniswap: Contract
  let trancheMaster: Contract

  let owner: SignerWithAddress
  let dev: SignerWithAddress
  let timelock: SignerWithAddress
  let attacker: SignerWithAddress

  beforeEach(async () => {
    ;[owner, dev, timelock, attacker] = await ethers.getSigners()

    const Core = await ethers.getContractFactory("Core")
    const Strategy = await ethers.getContractFactory("Strategy")
    const MasterChefFake = await ethers.getContractFactory("MasterChefFake")
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

    wtf = await Token.deploy("wtf", "wtf", 18)
    chef = await MasterChefFake.deploy()

    await alpacaToken.mint(alpacaFarm.address, 80000)
    await venusToken.mint(venusFarm.address, 80000)
    await busd.mint(creamFarm.address, 80000)
    await busd.mint(venusFarm.address, 80000)
    await busd.mint(alpacaFarm.address, 80000)
    await busd.mint(uniswap.address, 80000)

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

    const TrancheMaster = await ethers.getContractFactory("TrancheMaster")
    trancheMaster = await TrancheMaster.deploy(
      core.address,
      busd.address,
      strategy.address,
      chef.address,
      dev.address
    )

    await trancheMaster.add(10000, 10000, 0)
    await trancheMaster.add(10000, 20000, 0)
    await trancheMaster.add(10000, 0, 0)
    await trancheMaster.setDuration(DURATION)

    await busd.mint(owner.address, 30000)
    await core.grantRole(MASTER_ROLE, trancheMaster.address)
    await core.grantRole(TIMELOCK_ROLE, timelock.address)
    /*
    await chef.add(10)
    await chef.add(20)
    await chef.add(30)
    await wtf.mint(chef.address, "10000000000000000000000")
    */
  })

  describe("deposit", () => {
    it("invalid amount", async () => {
      await expect(trancheMaster.deposit(0)).to.be.revertedWith("invalid amount")
    })

    it("success", async () => {
      const amount = 10000
      await busd.approve(trancheMaster.address, amount)
      await expect(trancheMaster.deposit(amount))
        .to.emit(trancheMaster, "Deposit")
        .withArgs(owner.address, amount)

      expect(await busd.balanceOf(trancheMaster.address)).to.equal(amount)
      const ret = await trancheMaster.balanceOf(owner.address)
      expect(ret.balance).to.equal(amount)
      expect(ret.invested).to.equal(0)
    })
  })

  describe("invest", () => {
    const amount = 10000
    const total = 30000
    beforeEach(async () => {
      await busd.approve(trancheMaster.address, total)
      await trancheMaster.deposit(total)
    })

    it("checkTrancheID", async () => {
      await expect(trancheMaster.invest(5, amount, false))
        .to.be.revertedWith("invalid tranche id")
    })

    it("checkNotActive", async () => {
      await trancheMaster.invest(0, amount, false)
      await trancheMaster.invest(1, amount, false)
      await trancheMaster.invest(2, amount, false)
      await expect(trancheMaster.invest(0, amount, false))
        .to.be.revertedWith("already active")
    })

    it("invalid amount", async () => {
      await expect(trancheMaster.invest(0, 0, false))
        .to.be.revertedWith("invalid amount")
    })

    it("balance not enough", async () => {
      await expect(trancheMaster.invest(0, amount * 5, false))
        .to.be.revertedWith("balance not enough")
    })

    it("not enough quota", async () => {
      await expect(trancheMaster.invest(0, amount * 2, false))
      .to.be.revertedWith("not enough quota")
    })

    it("success", async () => {
      await expect(trancheMaster.invest(0, amount, false))
        .to.emit(trancheMaster, "Invest")
        .withArgs(owner.address, 0, 0, amount)

      const ret = await trancheMaster.balanceOf(owner.address)
      expect(ret.balance).to.equal(amount * 2)
      expect(ret.invested).to.equal(amount)
    })

    it("start cycle", async () => {
      await trancheMaster.invest(0, amount, false)
      await trancheMaster.invest(1, amount, false)
      await trancheMaster.invest(2, amount, false)
      expect(await trancheMaster.active()).to.equal(true)
      expect(await busd.balanceOf(trancheMaster.address)).to.equal(0)
      const ret = await trancheMaster.balanceOf(owner.address)
      expect(ret.balance).to.equal(0)
      expect(ret.invested).to.equal(total)
    })
  })

  describe("redeem", () => {
    const amount = 10000
    const total = 30000
    beforeEach(async () => {
      await busd.approve(trancheMaster.address, total)
      await trancheMaster.deposit(total)
      await trancheMaster.invest(0, amount, false)
    })

    it("checkTrancheID", async () => {
      await expect(trancheMaster.redeem(5))
        .to.be.revertedWith("invalid tranche id")
    })

    it("checkNotActive", async () => {
      await trancheMaster.invest(1, amount, false)
      await trancheMaster.invest(2, amount, false)
      await expect(trancheMaster.redeem(0))
        .to.be.revertedWith("already active")
    })

    it("not enough principal", async () => {
      await expect(trancheMaster.redeem(1))
        .to.be.revertedWith("not enough principal")
    })

    it("success", async () => {
      await expect(trancheMaster.redeem(0))
        .to.emit(trancheMaster, "Redeem")
        .withArgs(owner.address, 0, 0, amount)

      const ret = await trancheMaster.balanceOf(owner.address)
      expect(ret.balance).to.equal(total)
      expect(ret.invested).to.equal(0)
    })
  })

  describe("withdraw", () => {
    const amount = 10000
    beforeEach(async () => {
      await busd.approve(trancheMaster.address, amount)
      await trancheMaster.deposit(amount)      
    })

    it("invalid amount", async () => {
      await expect(trancheMaster.withdraw(0))
        .to.be.revertedWith("invalid amount")
    })

    it("balance not enough", async () => {
      await expect(trancheMaster.withdraw(amount * 2))
        .to.be.revertedWith("balance not enough")
    })

    it("success", async () => {
      await expect(trancheMaster.withdraw(amount))
        .to.emit(trancheMaster, "Withdraw")
        .withArgs(owner.address, amount)

      expect(await busd.balanceOf(owner.address)).to.equal(30000)
      expect(await busd.balanceOf(trancheMaster.address)).to.equal(0)
    })
  })

  describe("balanceOf", () => {
    it("only deposit", async () => {
      const amount = 10000
      await busd.approve(trancheMaster.address, amount)
      await trancheMaster.deposit(amount)
      const ret = await trancheMaster.balanceOf(owner.address)
      expect(ret.balance).to.equal(amount)
      expect(ret.invested).to.equal(0)
    })

    it("deposit and invest", async () => {
      const amount = 10000
      await busd.approve(trancheMaster.address, amount)
      await trancheMaster.deposit(amount)
      await trancheMaster.invest(0, amount, false)
      const ret = await trancheMaster.balanceOf(owner.address)
      expect(ret.balance).to.equal(0)
      expect(ret.invested).to.equal(amount)
    })

    it("cycle active", async () => {
      const amount = 10000;
      const total = 30000;
      await busd.approve(trancheMaster.address, total)
      await trancheMaster.deposit(total)
      await trancheMaster.invest(0, amount, false)
      await trancheMaster.invest(1, amount, false)
      await trancheMaster.invest(2, amount, false)
      const ret = await trancheMaster.balanceOf(owner.address)
      expect(ret.balance).to.equal(0)
      expect(ret.invested).to.equal(total)
    })
  })

  describe("stop", () => {
    const amount = 10000
    const total = 30000
    beforeEach(async () => {
      await busd.approve(trancheMaster.address, total)
      await trancheMaster.deposit(total)
      await trancheMaster.invest(0, amount, false)
      await trancheMaster.invest(1, amount, false)
      await trancheMaster.invest(2, amount, false)
    })

    it("cycle not expired", async () => {
      await expect(trancheMaster.connect(timelock).stop()).to.be.revertedWith("cycle not expired")
    })

    it("success", async () => {
      await increaseTime(DURATION)
      expect(await trancheMaster.cycle()).to.equal(0)
      await expect(trancheMaster.connect(timelock).stop())
        .emit(trancheMaster, "TrancheSettle")
        .withArgs(0, 0, 10000, 10019, "1001900000000000000")
        .emit(trancheMaster, "TrancheSettle")
        .withArgs(1, 0, 10000, 10038, "1003800000000000000")
        .emit(trancheMaster, "TrancheSettle")
        .withArgs(2, 0, 10000, 41743, "4174300000000000000")

      expect(await trancheMaster.active()).to.equal(false)
      expect(await trancheMaster.cycle()).to.equal(1)
      expect(await busd.balanceOf(trancheMaster.address)).to.equal(61800)

      const snapshot0 = await trancheMaster.trancheSnapshots(0, 0)
      expect(snapshot0.capital).to.equal(10019)
      expect(snapshot0.rate).to.equal("1001900000000000000")
      const snapshot1 = await trancheMaster.trancheSnapshots(0, 1)
      expect(snapshot1.capital).to.equal(10038)
      expect(snapshot1.rate).to.equal("1003800000000000000")
      const snapshot2 = await trancheMaster.trancheSnapshots(0, 2)
      expect(snapshot2.capital).to.equal(41743)
      expect(snapshot2.rate).to.equal("4174300000000000000")

      const ret = await trancheMaster.balanceOf(owner.address)
      expect(ret.balance).to.equal(61800)
      expect(ret.invested).to.equal(0)

      await trancheMaster.withdraw(61800)
      expect(await busd.balanceOf(owner.address)).to.equal(61800)
    })
  })

  describe("add", () => {
    it("onlyGovernor", async () => {
      await expect(trancheMaster.connect(attacker).add(100000, 100000, 10000))
        .to.be.revertedWith("CoreRef::onlyGovernor: Caller is not a governor")
    })

    it("success", async () => {
      await expect(trancheMaster.add(100000, 100000, 10000))
        .to.emit(trancheMaster, "TrancheAdd")
        .withArgs(3, 100000, 100000, 10000)
    })
  })

  describe("set", () => {
    it("onlyRole(TIMELOCK_ROLE)", async () => {
      await expect(trancheMaster.connect(attacker).set(1, 100000, 100000, 10000))
        .to.be.revertedWith("CoreRef::onlyRole: Not permit")
    })

    it("checkTrancheID", async () => {
      await expect(trancheMaster.connect(timelock).set(3, 100000, 100000, 10000))
        .to.be.revertedWith("invalid tranche id")
    })

    it("success", async () => {
      await expect(trancheMaster.connect(timelock).set(1, 200000, 100000, 10000))
        .to.emit(trancheMaster, "TrancheUpdated")
        .withArgs(1, 200000, 100000, 10000)
    })
  })

  describe("investDirect", () => {
    const amount = 10000
    it("success", async () => {
      await busd.approve(trancheMaster.address, amount)
      await expect(trancheMaster.investDirect(amount, 0, amount))
        .to.emit(trancheMaster, "Deposit")
        .withArgs(owner.address, amount)

      expect(await busd.balanceOf(trancheMaster.address)).to.equal(amount)
      const ret = await trancheMaster.balanceOf(owner.address)
      expect(ret.balance).to.equal(0)
      expect(ret.invested).to.equal(amount)
    })

    it("start cycle", async () => {
      await busd.approve(trancheMaster.address, amount * 3)
      await trancheMaster.investDirect(amount, 0, amount)
      await trancheMaster.investDirect(amount, 1, amount)
      await trancheMaster.investDirect(amount, 2, amount)
      expect(await trancheMaster.active()).to.equal(true)
      expect(await busd.balanceOf(trancheMaster.address)).to.equal(0)
      const ret = await trancheMaster.balanceOf(owner.address)
      expect(ret.balance).to.equal(0)
      expect(ret.invested).to.equal(amount * 3)
    })
  })

  describe("redeemDirect", () => {
    const amount = 10000
    const total = 30000
    beforeEach(async () => {
      await busd.approve(trancheMaster.address, total)
      await trancheMaster.deposit(total)
      await trancheMaster.invest(0, amount, false)
    })

    it("checkTrancheID", async () => {
      await expect(trancheMaster.redeemDirect(5))
        .to.be.revertedWith("invalid tranche id")
    })

    it("checkNotActive", async () => {
      await trancheMaster.invest(1, amount, false)
      await trancheMaster.invest(2, amount, false)
      await expect(trancheMaster.redeemDirect(0))
        .to.be.revertedWith("already active")
    })

    it("not enough principal", async () => {
      await expect(trancheMaster.redeemDirect(1))
        .to.be.revertedWith("not enough principal")
    })

    it("success", async () => {
      await expect(trancheMaster.redeemDirect(0))
        .to.emit(trancheMaster, "Redeem")
        .withArgs(owner.address, 0, 0, amount)
        .to.emit(trancheMaster, "Withdraw")
        .withArgs(owner.address, amount)

      const ret = await trancheMaster.balanceOf(owner.address)
      expect(ret.balance).to.equal(total - amount)
      expect(ret.invested).to.equal(0)
    })
  })
})