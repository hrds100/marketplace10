const { ethers } = require("hardhat");
const { verify, verifyCon } = require("./verifyContract");

const fac = "0xca143ce32fe78f1f7019d7d551a6402fc5350c73";
const rou = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const stayAddresMain = "0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0";
const myusdAddress = "0xAD9317601872De47a92A175a94Feb18e72CB5bD5";
const rocksAddressMain = "0x6D635dc4a2A54664B54dF6a63e5ee31D5b29CF6e";
const pairAddress = "0x2397C1722CCb6934BECF579351685A56030EA8F7";
const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const bnb = "0x0000000000000000000000000000000000000000";
const imperUSDC = "0x554B52bF57b387fD09D6644368C5A8AAcaAf5aE0";
const impermyusd = "0x0853fb6Fe69059823Bac7B05015e05419C22c64a";
const chris = "0x6eb06e1078cfbdCF9a3387584a8D934D85Ea1436";
const USDC = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";
const myrockAddress = "0x6D635dc4a2A54664B54dF6a63e5ee31D5b29CF6e";
const zeroAddress = "0x0000000000000000000000000000000000000000";

const _10kether = ethers.parseEther("10000");
const _1ether = ethers.parseEther("1");
const _10ether = ethers.parseEther("10");
const _25ether = ethers.parseEther("25");

const _20kether = ethers.parseEther("20000");
const badgePrices = [
  ethers.parseEther("62.50"),
  ethers.parseEther("187.50"),
  ethers.parseEther("312.50"),
  ethers.parseEther("437.50"),
  ethers.parseEther("625"),
  ethers.parseEther("937.50"),
  ethers.parseEther("1250"),
  ethers.parseEther("1875"),
  ethers.parseEther("3125"),
  ethers.parseEther("6250"),
];
const boostersAmount = [
  ethers.parseEther("12500"),
  ethers.parseEther("37500"),
  ethers.parseEther("62500"),
  ethers.parseEther("87500"),
  ethers.parseEther("125000"),
  ethers.parseEther("187500"),
  ethers.parseEther("250000"),
  ethers.parseEther("375000"),
  ethers.parseEther("625000"),
  ethers.parseEther("1250000"),
];
async function main() {
  const [deployer, user1, user2, user3, user4, user5, user6, user7] =
    await ethers.getSigners();
  const feeAddress = "0x28df93Ad93d178a821a794eC2113DB0fD9FD22Da";
  const admin = "0x6eb06e1078cfbdCF9a3387584a8D934D85Ea1436";
  const _10kether = ethers.parseEther("10000");
  const _20kether = ethers.parseEther("20000");
  const _40kether = ethers.parseEther("40000");
  const _1million = ethers.parseEther("1000000");
  const _10million = ethers.parseEther("10000000");

  us = await ethers.getContractAt("USDC", USDC);

  router = await ethers.getContractAt

  // const tx = {
  //   to: imperUSDC,
  //   value: ethers.parseEther("100"),
  // };

  // const tx2 = {
  //   to: chris,
  //   value: ethers.parseEther("100"),
  // };

  // const tx3 = {
  //   to: impermyusd,
  //   value: ethers.parseEther("100"),
  // };

  // await deployer.sendTransaction(tx);
  // await deployer.sendTransaction(tx2);
  // await deployer.sendTransaction(tx3);

  // await network.provider.request({
  //   method: "hardhat_impersonateAccount",
  //   params: [imperUSDC],
  // });

  // await network.provider.request({
  //   method: "hardhat_impersonateAccount",
  //   params: [chris],
  // });

  // await network.provider.request({
  //   method: "hardhat_impersonateAccount",
  //   params: [impermyusd],
  // });

  // const signerChris = await ethers.getSigner(chris);
  // const usdcSigner = await ethers.getSigner(imperUSDC);
  // const myusdSigner = await ethers.getSigner(impermyusd);

  // const myRock = await ethers.getContractAt("MyRocks", myrockAddress);

  // await us.connect(usdcSigner).transfer(deployer.getAddress(), _40kether);
  // await us.connect(usdcSigner).transfer(user1.getAddress(), _10kether);
  // await us.connect(usdcSigner).transfer(user2.getAddress(), _10kether);

  // await us.connect(user1).approve(myrockAddress, _1million);
  // await us.approve(myrockAddress, _1million);

  // await us.connect(deployer).approve(myrockAddress, _1million);

  // await myRock.connect(user1).mint(10);
  // await myRock.mint(10);

  // console.log("done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//
