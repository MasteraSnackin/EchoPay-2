// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const EchoPayToken = await ethers.getContractFactory("EchoPayToken");
  const token = await EchoPayToken.deploy(ethers.parseEther("1000000")); // 1 million tokens

  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  console.log("EchoPayToken deployed to:", tokenAddress);
  
  // Authorize the deployer as a payer
  const authorizeTx = await token.authorizePayer(deployer.address);
  await authorizeTx.wait();
  console.log("Deployer authorized as payer");
  
  // Get initial balance
  const balance = await token.balanceOf(deployer.address);
  console.log("Deployer token balance:", ethers.formatEther(balance), "EPAY");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });