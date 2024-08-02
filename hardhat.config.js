require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-web3');
require('dotenv').config();

module.exports = {
  solidity: "0.8.4",
  networks: {
    moonbaseAlpha: {
      url: process.env.MOONBASE_ALPHA_RPC_URL || "https://rpc.testnet.moonbeam.network",
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};