import { load, save } from "../utils"
import { ethers } from "hardhat"

async function main() {
    const [owner] = await ethers.getSigners()

    const height = await ethers.provider.getBlockNumber()
    const coreAddress = (await load('core')).core

    const minDelay = 86400; // 1 day
    const minDelay2 = 120 // 2 minutes

    const TimelockController = await ethers.getContractFactory("TimelockController")

    const timelockcontroller = await TimelockController.deploy(coreAddress, minDelay2);
    await timelockcontroller.deployed()

    console.log(`timelock=${timelockcontroller.address}`)

    const book = {
        height,
        timelockcontroller: timelockcontroller.address
    }

    await save('timelockcontroller', book)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    })