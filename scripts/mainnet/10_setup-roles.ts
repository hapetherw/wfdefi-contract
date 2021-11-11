import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { load, save } from "../utils"
import { keccak256 } from "@ethersproject/keccak256";
import _ from "lodash"
import { ethers } from "hardhat"

const TIMELOCK_ROLE = keccak256(Buffer.from('TIMELOCK_ROLE', 'utf-8'));
const MASTER_ROLE = keccak256(Buffer.from('MASTER_ROLE', 'utf-8'));
const PROPOSER_ROLE = keccak256(Buffer.from('PROPOSER_ROLE', 'utf-8'));
const EXECUTOR_ROLE = keccak256(Buffer.from('EXECUTOR_ROLE', 'utf-8'));

const multisig = '0x46D0C754463E3Bd07c1451CF4a683fEcD507d36B'

async function main() {
    const [owner] = await ethers.getSigners()
    const core_address = (await load('core')).core
    const timelockcontroller_address = (await load('timelockcontroller')).timelockcontroller;

    const Core = await ethers.getContractFactory('Core')
    const core = await Core.attach(core_address)

    // Grant governor role to multisig

    let tx1 = await core.grantGovernor(multisig);
    await tx1.wait();

    // Set up multisig as proposer and executor

    let tx2 = await core.grantRole(PROPOSER_ROLE, multisig);
    await tx2.wait();
    let tx3 = await core.grantRole(EXECUTOR_ROLE, multisig);
    await tx3.wait();

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    })