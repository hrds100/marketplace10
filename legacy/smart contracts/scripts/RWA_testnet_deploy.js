const { ethers } = require("hardhat");
const { verify, verifyCon } = require("./verifyContract");

const fac = "0x7E0987E5b3a30e3f2828572Bb659A548460a3003";
const rou = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008";

const wbnb = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";
const _10kether = ethers.parseEther("10000");
const _20kether = ethers.parseEther("20000");
const chris = "0x6eb06e1078cfbdCF9a3387584a8D934D85Ea1436";
const impermyusd = "0x0853fb6Fe69059823Bac7B05015e05419C22c64a";
const bnb = "0x0000000000000000000000000000000000000000";

async function main() {
  const [deployer, user1, user2, user3, user4, user5, user6, user7] =
    await ethers.getSigners();

  const feeAddress = "0x28df93Ad93d178a821a794eC2113DB0fD9FD22Da";
  const depoyer = "0xF72817AD1e1Ac47A15c9F4A7CCA16E76FE428F6e";

  // const depoyer = deployer.address;

  const depoyer2 = "0x8e9317F034945A3d26f12732B76BD0102db567d8";

  const _10kether = ethers.parseEther("10000");
  const _1ether = ethers.parseEther("1");
  const _01ether = ethers.parseEther("0.1");
  const _001ether = ethers.parseEther("0.01");
  const _15ether = ethers.parseEther("1.5");
  const _2ether = ethers.parseEther("2");
  const _3ether = ethers.parseEther("3");
  const _1kether = ethers.parseEther("1000");
  const _50ether = ethers.parseEther("50");
  const _2kether = ethers.parseEther("2000");
  const _1million = ethers.parseEther("1000000");
  const _10million = ethers.parseEther("10000000");
  const _100kether = ethers.parseEther("100000");

  const _02 = ethers.parseEther("0.2");
  const _05 = ethers.parseEther("0.5");

  // const rockAddress = "0xc648cb38CE27B102079CaCb3dDB093525e923505";
  // const stayAddress = "0xc907F397551c3D81C64A6c8E1d955E96C62BCf04";
  // const marketplaceAddress = "0x0FDd527b37fE500cdCeD9E3B9FD9fB5e4a0d4ff6";
  // const referralAddress = "0xE21Ee78CBE36e8734aDaC5De2600Ce000FAA897A";
  // const farmingAddress = "0x327e47f35f7ef48caa17bda72c339e6ffaa3468d";
  // const printerAddress =  "0x50FAa8cB7630bBC9Ff394483fE9b9874BFaB04bc"
  //  const swapperAddress =  "0xDEb30E07D82a24143AEd1ecEACc0f49322dc90EE"
  // const zapAddress = "0xde2dD2F2aF20c730F494cB26231b32f5941Ca3ee";
  // const usdcAddress = "0x49c2D5e6F839E923b74CBBa69E640942149Bcf56";
  // const myusdAddress =  "0x399Df6CA808fab0A6be4C5fD3287C2B8723Dfb92"
  // const lpAddress = "0xa745c2b0C74c380d7955f5ee53bE3fBFcc84337A";
  // const lpAddressMyusd = "0xdbCa4D98976e5746d69F34D71b7992d98eaa1f5D"
  const lpAddressStay = "0x438d50aa8bc3e2aa1b27c41ad9e436c567b9f909";
  const _25ether = ethers.parseEther("25");
  const routerAddress = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008";

  console.log("starting nigga");

  // const Stay = await ethers.getContractFactory("TestnetStay");
  // const stay = await Stay.deploy(depoyer);
  // await stay.waitForDeployment();
  const stayAddress = "0x8423cece3ce700d2101822ed4040c5e6a55e0d95";
  const stay = await ethers.getContractAt("TestnetStay", stayAddress);
  // const stayAddress = stay.target;
  console.log("STAY: ", stayAddress);

  // const USDC = await ethers.getContractFactory("TestnetUSDC");
  // const usdc = await USDC.deploy(depoyer);
  // await usdc.waitForDeployment();
  const usdcAddress = "0x49c2d5e6f839e923b74cbba69e640942149bcf56";
  const usdc = await ethers.getContractAt("TestnetUSDC", usdcAddress);
  // const usdcAddress = usdc.target;
  console.log("USDC: ", usdcAddress);

  // const router = await ethers.getContractAt("Router", routerAddress);

  // factory = await ethers.getContractAt("Factory", fac);
  // router = await ethers.getContractAt("Router", rou);

  // await factory.createPair(wbnb, usdcAddress);
  // await factory.createPair(stayAddress, usdcAddress);

  // const lpAddressStay = await factory.getPair(stayAddress, usdcAddress);
  // const lpAddressWbnb = await factory.getPair(wbnb, usdcAddress);
  // console.log(lpAddressStay, lpAddressWbnb);

  // await stay.approve(rou, _10million);
  // console.log("here111");

  // await usdc.approve(rou, _10million);

  // await router.addLiquidityETH(
  //   usdcAddress,
  //   _1kether,
  //   0,
  //   0,
  //   depoyer,
  //   Math.floor(Date.now() / 1000) + 60 * 10,
  //   { value: _1ether }
  // );

  // await router.addLiquidity(
  //   stayAddress,
  //   usdcAddress,
  //   _1million,
  //   _10kether,
  //   0,
  //   0,
  //   depoyer,
  //   Math.floor(Date.now() / 1000) + 60 * 10
  // );
  // console.log("here111");

  // const BuyLp = await ethers.getContractFactory("BuyLPTestnet");
  // const buylp = await BuyLp.deploy(depoyer);
  // await buylp.waitForDeployment();
  // const buylpAddress = buylp.target;
  // console.log("buyLp: ", buylpAddress);

  const RWA = await ethers.getContractFactory("RWATestnet");
  const rwa = await RWA.deploy();
  await rwa.waitForDeployment();
  const rwaAddress = rwa.target;
  console.log("rwa: ", rwaAddress);


  const RWAMarketplace = await ethers.getContractFactory(
    "RWAMarketplaceTestnet"
  );
  const rwaMarketplace = await RWAMarketplace.deploy(
    rwaAddress,
    "0xBfF4846B0B04bc92389dd1a3327f241E5A0464B7",
    "0xEC5bB3Bd3f99f766C348871813B620E035A5C7C3",
    250,
    150,
    1000
  ); //2.5,1.5,10
  await rwaMarketplace.waitForDeployment();
  const rwaMarketplaceAddress = rwaMarketplace.target;
  //   -> verify manager address
  // -> admin(Deployer) will approve USDC to marketplace 

  await usdc.approve(rwaMarketplaceAddress, _10million);
  console.log("rwaMarketplace: ", rwaMarketplaceAddress);
///FUN MARKETPLACE CONTRACT WITH BNBs 
  await rwa.initialize(rwaMarketplaceAddress,"0xD84aC4716A082B1F7eCDe9301aA91A7c4B62ECd7");

  // const Voting = await ethers.getContractFactory("VotingTestnet");
  // const voting = await Voting.deploy(rwaAddress, ethers.parseEther("100"));
  // await voting.waitForDeployment();
  // const votingAddress = voting.target;
  // console.log("voting: ", votingAddress);

  // const Rent = await ethers.getContractFactory("RentTestnet");
  // const rent = await Rent.deploy(rwaAddress, votingAddress);
  // await rent.waitForDeployment();
  // const rentAddress = rent.target;
  // console.log("rent: ", rentAddress);

  // const Boost = await ethers.getContractFactory("BoosterTestnet");
  // const boost = await Boost.deploy(
  //   rwaAddress,
  //   "0xBfF4846B0B04bc92389dd1a3327f241E5A0464B7",
  //   50,
  //   25
  // );
  // await boost.waitForDeployment();
  // const boostAddress = boost.target;
  // console.log("booster: ", boostAddress);
  // //APPROVE THIS CONTRACT FOR STAY FROM STAYWALLET(4B7) in this case
  // const pair = await ethers.getContractAt("Pair", lpAddressStay);

  // await stay.approve(boostAddress, _10million);
  // await stay.approve(buylpAddress, _10million);
  // await pair.approve(buylpAddress, _10million);
  // await usdc.approve(rentAddress, _10million);

  // await hre.run("verify:verify", {
  //   address: stayAddress,
  //   contract: "contracts/TestnetStay.sol:TestnetStay",
  //   constructorArguments: [depoyer],
  // });

  // await hre.run("verify:verify", {
  //   address: usdcAddress,
  //   contract: "contracts/TestnetUSDC.sol:TestnetUSDC",

  //   constructorArguments: [depoyer],
  // });

  await hre.run("verify:verify", {
    address: rwaAddress,
    contract: "contracts/testnet contracts/RWATestnet.sol:RWATestnet",
  });

  // await hre.run("verify:verify", {
  //   address: boostAddress,
  //   contract: "contracts/testnet contracts/BoosterTestnet.sol:BoosterTestnet",
  //   constructorArguments: [
  //     rwaAddress,
  //     "0xBfF4846B0B04bc92389dd1a3327f241E5A0464B7",
  //     50,
  //     25,
  //   ],
  // });

  await hre.run("verify:verify", {
    address: rwaMarketplaceAddress,
    contract:
      "contracts/testnet contracts/RWAMarketplaceTestnet.sol:RWAMarketplaceTestnet",

    constructorArguments: [
      rwaAddress,
      "0xBfF4846B0B04bc92389dd1a3327f241E5A0464B7",
      "0xEC5bB3Bd3f99f766C348871813B620E035A5C7C3",
      250,
      150,
      1000,
    ],
  });

  // await hre.run("verify:verify", {
  //   address: buylpAddress,
  //   contract: "contracts/BuyLPTestnet.sol:BuyLPTestnet",

  //   constructorArguments: [depoyer],
  // });

  // await hre.run("verify:verify", {
  //   address: votingAddress,
  //   contract: "contracts/testnet contracts/VotingTestnet.sol:VotingTestnet",

  //   constructorArguments: [rwaAddress, ethers.parseEther("100")],
  // });

  // await hre.run("verify:verify", {
  //   address: rentAddress,
  //   contract: "contracts/testnet contracts/RentTestnet.sol:RentTestnet",

  //   constructorArguments: [rwaAddress, votingAddress],
  // });

  console.log("done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// npx hardhat run scripts/maindeploy.js --network hardhat
//
