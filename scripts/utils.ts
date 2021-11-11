import _ from "lodash"
import fs from "fs-extra"
import { ethers } from "hardhat"

async function load(name: string) {
  try {
    const data = await fs.readFileSync(`${process.cwd()}/addresses/56.${name}.json`)
    return JSON.parse(data.toString())
  } catch (e) {
    console.log(e)
    return null
  }
}

async function save(name: string, content: any) {
    const sharedAddressPath = `${process.cwd()}/addresses/${ethers.provider.network.chainId}.${name}.json`
    await fs.writeFile(sharedAddressPath, JSON.stringify(content, null, 2))
}

export { load, save }