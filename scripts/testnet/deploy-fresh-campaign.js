const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

const D18 = ethers.BigNumber.from("1000000000000000000");
const overrides = {
  gasPrice: ethers.utils.parseUnits("5", "gwei"),
  gasLimit: 8000000,
};

async function main() {
  const [operator, other1, other2, other3] = await ethers.getSigners();

  // all wtf will be mint to faucet
  let faucet = operator.address;

  const Token = await ethers.getContractFactory("Token");
  const CreamFarm = await ethers.getContractFactory("CreamFake");
  const AlpacaFarm = await ethers.getContractFactory("AlpacaFake");
  const CreamFarmLoss = await ethers.getContractFactory("CreamFakeLoss");
  const AlpacaFarmLoss = await ethers.getContractFactory("AlpacaFakeLoss");

  const WTF = await ethers.getContractFactory("WTF");
  const RewardFactory = await ethers.getContractFactory("RewardFactory");
  const TrancheTokenFactory = await ethers.getContractFactory("TrancheTokenFactory");

  const BUSD = await Token.deploy(
    "BUSD",
    "BUSD",
    18,
    D18.mul(1000000000),
    D18.mul(1000000000)
  );
  await BUSD.deployed();
  console.log(`BUSD is deployed at: ${BUSD.address}`);

  const ALPACA = await Token.deploy(
    "ALPACA",
    "ALPACA",
    18,
    D18.mul(10000000),
    D18.mul(10000000)
  );
  await ALPACA.deployed();
  console.log(`ALPACA is deployed at: ${ALPACA.address}`);

  const VENUS = await Token.deploy(
    "VENUS",
    "VENUS",
    18,
    D18.mul(10000000),
    D18.mul(10000000)
  );
  await VENUS.deployed();
  console.log(`VENUS is deployed at: ${VENUS.address}`);

  // for test purpose only, fixed 10% gains, with no protocol bonus
  const creamFarm = await CreamFarm.deploy(BUSD.address, 10);
  const venusFarm = await CreamFarm.deploy(BUSD.address, 10);
  const alpacaFarm = await AlpacaFarm.deploy(BUSD.address, 10);
  console.log(`cream farm is deployed at: ${creamFarm.address}`);
  console.log(`venus farm is deployed at: ${venusFarm.address}`);
  console.log(`alpaca farm is deployed at: ${alpacaFarm.address}`);

  const wtf = await WTF.deploy("WTF", "WTF", faucet, D18.mul(1000000000));
  const rewardFactory = await RewardFactory.deploy();
  const trancheTokenFactory = await TrancheTokenFactory.deploy();
  console.log(`WTF token is deployed at: ${wtf.address}`);
  console.log(`RewardFactory is deployed at: ${rewardFactory.address}`);
  console.log(`TrancheTokenFactory is deployed at: ${trancheTokenFactory.address}`);

  const Camp = await ethers.getContractFactory("CampaignContinuousCycles");
  let camp = await Camp.deploy(
    operator.address,
    0,
    "",
    wtf.address,
    rewardFactory.address,
    trancheTokenFactory.address,
    BUSD.address,
    D18.mul(1000000),
    86400 * 7,
    86400 * 1
  );
  await camp.deployed();
  console.log(`campaign is deployed at: ${camp.address}`);

  await camp.setTranches(
    [
      { apy: 10000, fee: 33, percentage: 40000 },
      { apy: 30000, fee: 50, percentage: 30000 },
      { apy: 0, fee: 200, percentage: 30000 },
    ]
  );
  await camp.setAlpacaToken(ALPACA.address);
  await camp.setVenusToken(VENUS.address);
  await camp.setFarms(
    creamFarm.address,
    40000,
    venusFarm.address,
    40000,
    alpacaFarm.address,
    20000
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
