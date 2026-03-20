const { ethers } = require("hardhat");
const { verify, verifyCon } = require("./verifyContract");

const fac = "0xca143ce32fe78f1f7019d7d551a6402fc5350c73";
const rou = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const stayAddresMain = "0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0";
const myusdAddress = "0xAD9317601872De47a92A175a94Feb18e72CB5bD5";
const rocksAddressMain = "0x6D635dc4a2A54664B54dF6a63e5ee31D5b29CF6e";
const pairAddress = "0x2397c1722ccb6934becf579351685a56030ea8f7";
const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const bnb = "0x0000000000000000000000000000000000000000";
const imperUSDC = "0x554B52bF57b387fD09D6644368C5A8AAcaAf5aE0";
const impermyusd = "0x0853fb6Fe69059823Bac7B05015e05419C22c64a";
const chris = "0x6eb06e1078cfbdCF9a3387584a8D934D85Ea1436";
const USDC = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";
const zeroAddress = "0x0000000000000000000000000000000000000000";

const _10kether = ethers.parseEther("10000");
const _1ether = ethers.parseEther("1");
const _10ether = ethers.parseEther("10");
const _25ether = ethers.parseEther("25");

async function main() {
  const [deployer, user1, user2, user3, user4, user5, user6, user7] =
    await ethers.getSigners();
  const feeAddress = "0x28df93Ad93d178a821a794eC2113DB0fD9FD22Da";
  const admin = "0xF72817AD1e1Ac47A15c9F4A7CCA16E76FE428F6e";
  const _10kether = ethers.parseEther("10000");
  const _20kether = ethers.parseEther("20000");
  const _40kether = ethers.parseEther("40000");
  const _1million = ethers.parseEther("1000000");
  const _10million = ethers.parseEther("10000000");

  us = await ethers.getContractAt("USDC", USDC);
  const stay = await ethers.getContractAt("Stay", stayAddresMain);
  const router = await ethers.getContractAt("Router", rou);
  const lp = await ethers.getContractAt("Pair", pairAddress);

  const tx = {
    to: imperUSDC,
    value: ethers.parseEther("100"),
  };

  const tx2 = {
    to: chris,
    value: ethers.parseEther("100"),
  };

  const tx3 = {
    to: impermyusd,
    value: ethers.parseEther("100"),
  };

  await deployer.sendTransaction(tx);
  await deployer.sendTransaction(tx2);
  await deployer.sendTransaction(tx3);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [imperUSDC],
  });

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [chris],
  });

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [impermyusd],
  });
  const provider = ethers.JsonRpcProvider;

  const signerChris = await ethers.getSigner(chris);
  const usdcSigner = await ethers.getSigner(imperUSDC);
  const myusdSigner = await ethers.getSigner(impermyusd);

  // const balance = await us.balanceOf(usdcSigner.getAddress())
  await us.connect(usdcSigner).transfer(deployer.address, _20kether);
  await us.connect(usdcSigner).transfer(deployer.address, _20kether);

  await stay.connect(signerChris).transfer(deployer.address, _20kether);
  await stay.connect(signerChris).transfer(user2.address, _20kether);
  await us.connect(usdcSigner).transfer(user2.address, _20kether);

  await stay.approve(rou, _1million);

  await us.approve(rou, _10kether);
  console.log("balalcen");

  console.log("LP balance before", await lp.balanceOf(deployer.address));
  console.log("usdc balance before", await us.balanceOf(deployer.address));
  console.log("stay balance before", await stay.balanceOf(deployer.address));

  await router.addLiquidity(
    stayAddresMain,
    USDC,
    _10kether,
    _10ether,
    0,
    0,
    deployer.getAddress(),
    Math.floor(Date.now() / 1000) + 60 * 10
  );
  console.log(
    "LP balance before after user11111",
    await us.balanceOf(deployer.address)
  );
  console.log("LP balance before", await lp.balanceOf(deployer.address));

  console.log("done");

  const buyLp = await ethers.getContractFactory("BuyLP");
  const buylp = await buyLp.deploy(deployer.address);
  await buylp.waitForDeployment();
  const buylpaddress = buylp.target;
  _10kether;
  console.log(buylpaddress);
  console.log(
    "LP balance before fro user",
    ethers.formatEther(await lp.balanceOf(user2.address))
  );

  await lp.approve(buylpaddress, _10million);

  await us.connect(user2).approve(buylpaddress, _10million);
  await stay.connect(user2).approve(buylpaddress, _10million);
  console.log(await stay.balanceOf(user2.address));
  console.log("er");

  await buylp
    .connect(user2)
    .buyLPToken(user2.address, USDC, _1ether, { value: 0 });

  console.log(
    "LP balance before after user",
    ethers.formatEther(await lp.balanceOf(user2.address))
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//
