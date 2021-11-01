import _ from "lodash"
import { ethers } from "hardhat"
import { expect } from "chai"
import { Contract } from "@ethersproject/contracts"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { mineBlocks } from './helpers';
import { keccak256 } from "@ethersproject/keccak256"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const TIMELOCK_ROLE = keccak256(Buffer.from("TIMELOCK_ROLE", 'utf-8'))
const MASTER_ROLE = keccak256(Buffer.from("MASTER_ROLE", 'utf-8'))

describe("MasterChef unit test", () => {
  let chef: Contract
  let core: Contract
  let wtf: Contract

  let owner: SignerWithAddress
  let master: SignerWithAddress
  let timelock: SignerWithAddress
  let attacker: SignerWithAddress

  beforeEach(async () => {
    ;[owner, master, timelock, attacker] = await ethers.getSigners()

    const Core = await ethers.getContractFactory("Core")
    const MasterChef = await ethers.getContractFactory("MasterChef")
    const Token = await ethers.getContractFactory("Token")

    core = await Core.deploy()
    wtf = await Token.deploy("wtf", "wtf", 18)
    chef = await MasterChef.deploy(
      core.address,
      wtf.address,
      "1000000000000000000",
      0,
      "1000000000000000000"
    )

    await core.grantRole(TIMELOCK_ROLE, timelock.address)
    await core.grantRole(MASTER_ROLE, master.address)
    await chef.add(10)
    await chef.add(20)
    await chef.add(30)
    await wtf.mint(chef.address, "10000000000000000000000")
  })

  describe("set", () => {
    it("success", async () => {
      await chef.connect(timelock).set(0, 100, true)
      const pool = await chef.poolInfo(0)
      expect(pool).to.equal(100)
      expect(await chef.totalAllocPoint()).to.equal(150)
    })
  })

  describe("pendingReward", () => {
    const amount = 10000;
    it("1 pool", async () => {
      await chef.connect(master).updateStake(2, owner.address, amount)
      await chef.connect(master).start(1000000)
      await mineBlocks(100)
      expect(await chef.pendingReward(owner.address, 2)).to.equal("50000000000000000000")
    })
  })

  describe("claim", () => {
    const amount = 10000;
    it("success", async () => {
      await chef.connect(master).updateStake(2, owner.address, amount)
      await chef.connect(master).start(1000000)
      await mineBlocks(100)
      await chef.claim(2)
      expect(await wtf.balanceOf(owner.address)).to.equal("50500000000000000000")
      expect(await chef.pendingReward(owner.address, 2)).to.equal(0)
    })
  })

  describe("updateStake", () => {
    const amount = 10000;
    it("success", async () => {
      await chef.connect(master).updateStake(0, owner.address, amount)
      const u = await chef.userInfo(0, owner.address)
      expect(u.amount).to.equal(amount)
    })
  })

  describe("updateRewardPerBlock", () => {
    it("success", async () => {
      await chef.connect(timelock).updateRewardPerBlock(1000)
      expect(await chef.rewardPerBlock()).to.equal(1000)
    })
  })
})