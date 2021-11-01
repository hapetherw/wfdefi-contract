import "@nomiclabs/hardhat-waffle";
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const { PRIVATE_KEY } = process.env;

export default {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
    },
    mainnet: {
      url: 'https://bsc-dataseed.binance.org',
      accounts: [ PRIVATE_KEY ],
      chainId: 56,
      gas: 6990000,
      gasPrice: 5000000000
    },
    testnet: {
      url: 'https://data-seed-prebsc-1-s3.binance.org:8545',
      accounts: [ PRIVATE_KEY ],
      chainId: 97,
      gas: 6990000,
      gasPrice: 10000000000
    }
  },
  solidity: {
    version: "0.6.12",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000
      }
    }
  },
  mocha: {
    timeout: 30000
  }
};
