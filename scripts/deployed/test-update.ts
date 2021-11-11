import { load, save } from "../utils"
import { keccak256 } from "@ethersproject/keccak256"
import { ethers } from "hardhat"

const MASTER_ROLE = keccak256(Buffer.from("MASTER_ROLE", "utf-8"))
const busdAddress = "0xe9e7cea3dedca5984780bafc599bd69add087d56"

async function main() {
  const [owner] = await ethers.getSigners()

  const trancheMaster_address = (await load("trancheMaster")).master
  const masterWTF_address = (await load("masterWTF")).master
  const timelock_address = (await load("timelockcontroller")).timelockcontroller
  const mbusd_address = (await load("mtoken")).mBUSD

  const TrancheMaster = await ethers.getContractFactory("TrancheMaster")
  const tranchemaster = await TrancheMaster.attach(trancheMaster_address)

  const BUSD = await ethers.getContractFactory("Token")
  const busd = await BUSD.attach(busdAddress)

  const MasterWTF = await ethers.getContractFactory("MasterWTF")
  const masterwtf = await MasterWTF.attach(masterWTF_address)

  const TimelockController = await ethers.getContractFactory("TimelockController")
  const timelock = TimelockController.attach(timelock_address)

  const MultiStrategyToken = await ethers.getContractFactory("MultiStrategyToken")
  const mBUSD = await MultiStrategyToken.attach(mbusd_address)

  // Get mindelay

  let delay = await timelock.minDelay()
  console.log(`Delay: ${delay}`)

  //   const changeRatioAlpaca = timelock.interface.encodeFunctionData(
  //     "changeRatio",
  //     [mbusd_address, 0, 50 ]
  //   );
  //   const changeRatioVenus = timelock.interface.encodeFunctionData(
  //     "changeRatio",
  //     [mbusd_address, 1, 30 ]
  //   );
  //   const changeRatioCream = timelock.interface.encodeFunctionData(
  //     "changeRatio",
  //     [mbusd_address, 2, 20 ]
  //   );

  const predecessor = ethers.utils.formatBytes32String("")
  const salt = ethers.utils.formatBytes32String("")

  // Schedule
  //   const tx1 = await timelock.connect(owner).schedule(timelock_address, 0, changeRatioAlpaca, predecessor, salt, 130 );
  //   await tx1.wait()

  //   const tx2 = await timelock.connect(owner).schedule(timelock_address, 0, changeRatioVenus, predecessor, salt, 130 );
  //   await tx2.wait()

  //   const tx3 = await timelock.connect(owner).schedule(timelock_address, 0, changeRatioCream, predecessor, salt, 130 );
  //   await tx3.wait()

  // Execute
  //   const tx1 = await timelock.connect(owner).execute(timelock_address, 0, changeRatioAlpaca, predecessor, salt);
  //   await tx1.wait()

  //   const tx2 = await timelock.connect(owner).execute(timelock_address, 0, changeRatioVenus, predecessor, salt);
  //   await tx2.wait()

  //   const tx3 = await timelock.connect(owner).execute(timelock_address, 0, changeRatioCream, predecessor, salt);
  //   await tx3.wait()

  //   // Get ratios

  //   const ratioAlpaca = await mBUSD.ratios(stoken.sALPACA);
  //   const ratioVenus = await mBUSD.ratios(stoken.sVENUS);
  //   const ratioCream = await mBUSD.ratios(stoken.sCREAM);

  //   console.log(`New alpaca ratio: ${ratioAlpaca}`)
  //   console.log(`New venus ratio: ${ratioVenus}`)
  //   console.log(`New cream ratio: ${ratioCream}`)

  // 1e5 means 100%

  const setSenior = timelock.interface.encodeFunctionData("setTrancheMaster", [
    trancheMaster_address,
    0,
    ethers.utils.parseEther("6000.0"),
    3120,
    0,
  ])

  console.log(setSenior + "\n")

  const setMezzanine = timelock.interface.encodeFunctionData("setTrancheMaster", [
    trancheMaster_address,
    1,
    ethers.utils.parseEther("3000.0"),
    5150,
    0,
  ])

  console.log(setMezzanine + "\n")

  const setJunior = timelock.interface.encodeFunctionData("setTrancheMaster", [
    trancheMaster_address,
    2,
    ethers.utils.parseEther("1000.0"),
    0,
    0,
  ])

  console.log(setSenior)
  console.log(setJunior)

  console.log(salt)
  console.log(predecessor)

  // Schedule tranche settings

  //   const tx1 = await timelock.connect(owner).schedule(timelock_address, 0, setSenior, predecessor, salt, 130)
  //   await tx1.wait()

  //   const tx2 = await timelock.connect(owner).schedule(timelock_address, 0, setMezzanine, predecessor, salt, 130)
  //   await tx2.wait()

  //   const tx3 = await timelock.connect(owner).schedule(timelock_address, 0, setJunior, predecessor, salt, 130)

  //   await tx3.wait()

  //   // Execute tranche settings

  //   const tx4 = await timelock.connect(owner).execute(timelock_address, 0, setSenior, predecessor, salt)
  //   await tx4.wait()

  //   const tx5 = await timelock.connect(owner).execute(timelock_address, 0, setMezzanine, predecessor, salt)
  //   await tx5.wait()

  //   const tx6 = await timelock.connect(owner).execute(timelock_address, 0, setJunior, predecessor, salt)
  //   await tx6.wait()

  // Get new tranche info

  //   const trancheSenior = await tranchemaster.tranches(0)

  //   console.log(`Tranche senior: ${trancheSenior}`)

  //   const trancheMezz = await tranchemaster.tranches(1)

  //   console.log(`Tranche mezz: ${trancheMezz}`)

  //   const trancheJunior = await tranchemaster.tranches(2)

  //   console.log(`Tranche jun: ${trancheJunior}`)

  // set duration

  //   await tranchemaster.setDuration(18000)

  //   const duration = await tranchemaster.duration()
  //   console.log(`Duration: ${duration}`)

  // function setTrancheMaster(
  //     address _trancheMaster,
  //     uint256 _tid,
  //     uint256 _target,
  //     uint256 _apy,
  //     uint256 _fee
  // ) public onlySelf {
  //     ITrancheMaster(_trancheMaster).set(_tid, _target, _apy, _fee);
  // }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
