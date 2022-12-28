const { ethers, waffle } = require("hardhat");
const hre = require("hardhat");

async function main() {

  [signer1,signer2] = await ethers.getSigners();

  const Staking = await hre.ethers.getContractFactory("Staking",signer1);
  const staking = await Staking.deploy(
    {
      value : ethers.utils.parseEther("100")
    }
  );

  await staking.deployed();

  console.log(
    `Staking deployed to ${staking.address} by ${signer1.address}`
  );

  const provider = waffle.provider;

  let data;
  let tx;
  let receipt;
  let block;
  let newUnlockDate;

  data = { value : ethers.utils.parseEther("10") }
  tx = await staking.connect(signer2).stakeEthers(30,data) 

  data = { value : ethers.utils.parseEther("1") }
  tx = await staking.connect(signer2).stakeEthers(30,data)  

  data = { value : ethers.utils.parseEther("7") }
  tx = await staking.connect(signer2).stakeEthers(90,data) 
  
  data = { value : ethers.utils.parseEther("17") }
  tx = await staking.connect(signer2).stakeEthers(90,data)

  data = { value : ethers.utils.parseEther("27") }
  tx = await staking.connect(signer2).stakeEthers(90,data)
  receipt = await tx.wait();
  block =await provider.getBlock(receipt.blockNumber)
  newUnlockDate = block.timestamp - (60 * 60 * 24 * 100)
  await staking.connect(signer1).changeUnlockDate(4, newUnlockDate)

  data = { value : ethers.utils.parseEther("4") }
  tx = await staking.connect(signer2).stakeEthers(180,data)
  receipt = await tx.wait();
  block =await provider.getBlock(receipt.blockNumber)
  newUnlockDate = block.timestamp - (60 * 60 * 24 * 100)
  await staking.connect(signer1).changeUnlockDate(5, newUnlockDate)

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
