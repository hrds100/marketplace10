const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("RWA CONTRACT", function () {
  async function deployContractsFixture() {
    const [
      deployer,
      user1,
      user2,
      user3,
      user4,
      user5,
      user6,
      user7,
      user8,
      user9,
      user10,
    ] = await ethers.getSigners();

    const _1000ether = ethers.parseEther("1000");
    const _100ether = ethers.parseEther("100");
    const _500ether = ethers.parseEther("500");
    const _10ether = ethers.parseEther("10");
    const _10kether = ethers.parseEther("10000");
    const _200ether = ethers.parseEther("200");
    const _3million = ethers.parseEther("3000000");
    const _5million = ethers.parseEther("5000000");
    const _10million = ethers.parseEther("10000000");

    const _2million = ethers.parseEther("2000000");
    const _1million = ethers.parseEther("1000000");
    const _185ether = ethers.parseEther("185");
    const _90ether = ethers.parseEther("90");
    const _110ether = ethers.parseEther("110");
    const _50ether = ethers.parseEther("50");
    const _15ether = ethers.parseEther("15");
    const _5ether = ethers.parseEther("5");
    const _1ether = ethers.parseEther("1");
    const _1kether = ethers.parseEther("1000");
    const _20kether = ethers.parseEther("20000");

    const partners = [
      user1.address,
      user2.address,
      user3.address,
      user4.address,
      user5.address,
      user6.address,
      user7.address,
      user8.address,
      user9.address,
      user10.address,
    ];
    const shares = [5, 5, 10, 10, 19, 20, 12, 15, 18, 100];

    const zeroAddress = "0x0000000000000000000000000000000000000000";

    const stayAddress = "0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0";
    const lpAddress = "0x2397c1722ccb6934becf579351685a56030ea8f7";
    const imperUSDC = "0x554B52bF57b387fD09D6644368C5A8AAcaAf5aE0";
    const chris = "0x6eb06e1078cfbdCF9a3387584a8D934D85Ea1436";
    const USDC = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";
    const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    let rwaAddress;
    let rwaMarketplaceAddress;

    const usdc = await ethers.getContractAt("USDC", USDC);
    const stay = await ethers.getContractAt("Stay", stayAddress);
    const router = await ethers.getContractAt("Router", routerAddress);
    const lp = await ethers.getContractAt("Pair", lpAddress);
    const RWA = await ethers.getContractFactory("RWA");
    const rwa = await RWA.deploy();
    await rwa.waitForDeployment();
    rwaAddress = rwa.target;

    const RWAMarketplace = await ethers.getContractFactory("RWAMarketplace");
    const rwaMarketplace = await RWAMarketplace.deploy(rwaAddress, 250, 150);
    await rwaMarketplace.waitForDeployment();
    rwaMarketplaceAddress = rwaMarketplace.target;

    const tx = {
      to: imperUSDC,
      value: ethers.parseEther("100"),
    };

    const tx2 = {
      to: chris,
      value: ethers.parseEther("100"),
    };

    await deployer.sendTransaction(tx);
    await deployer.sendTransaction(tx2);

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [imperUSDC],
    });

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [chris],
    });

    const signerChris = await ethers.getSigner(chris);
    const usdcSigner = await ethers.getSigner(imperUSDC);

    await rwa.initialize(rwaMarketplaceAddress);
    console.log("INITIALIZED");

    return {
      shares,
      partners,
      stay,
      _20kether,
      _1kether,
      usdc,
      lp,
      user1,
      user2,
      user3,
      _100ether,
      _10ether,
      _200ether,
      _3million,
      _2million,
      _1million,
      _185ether,
      _90ether,
      _110ether,
      _50ether,
      _15ether,
      _5ether,
      _1000ether,
      user4,
      stayAddress,
      user5,
      user6,
      user7,
      _500ether,
      _1ether,
      deployer,
      zeroAddress,
      USDC,
      _50ether,
      rwa,
      rwaMarketplace,
      _1000ether,
      rwaAddress,
      rwaMarketplaceAddress,
    };
  }

  it("1. REGISTER and UPDATE PROPERTY ", async function () {
    const {
      rwa,
      partners,
      shares,
      rwaMarketplace,
      buylp,
      stay,
      usdc,
      lp,
      user1,
      user2,
      user3,
      _100ether,
      _10ether,
      user4,
      user5,
      user6,
      deployer,
      user7,
      _1kether,
      _500ether,
      _1ether,
      _50ether,
      zeroAddress,
      USDC,
      _20kether,
    } = await loadFixture(deployContractsFixture);

    await rwa.registerProperty(
      partners,
      shares,
      500,
      _10ether,
      "https://uri.com/testing-the-shit-outta-this"
    );

    console.log("Property registered");
    console.log(await rwa.getProperty(1));

    await rwa.changeUri(1, "https://i-got-updated/");
    console.log("Property uri updated");

    console.log(await rwa.getProperty(1));

    // console.log("Updating for a non existing id");
    // await rwa.changeUri(2, "https://i-got-updated/2");

    // console.log(await rwa.getProperty(2));

    await rwa.changePropertyDetails(1, _50ether, _10ether);

    console.log(await rwa.getProperty(1));

    //APR will be added manually once the property starts generating rent
  });
  it("2. TESTING SAFETRANSFERFROM ", async function () {
    const {
      rwa,
      partners,
      shares,
      rwaMarketplace,
      buylp,
      stay,
      usdc,
      lp,
      user1,
      user2,
      user3,
      _100ether,
      _10ether,
      user4,
      user5,
      user6,
      deployer,
      user7,
      _1kether,
      _500ether,
      _1ether,
      _1000ether,
      _50ether,
      zeroAddress,
      USDC,
      _20kether,
    } = await loadFixture(deployContractsFixture);

    await rwa.registerProperty(
      partners,
      shares,
      500,
      _10ether,
      "https://uri.com/testing-the-shit-outta-this"
    );

    console.log("Property registered");
    console.log(await rwa.getProperty(1));

    await rwa.changeUri(1, "https://i-got-updated/");
    console.log("Property uri updated");

    console.log(await rwa.getProperty(1));

    // console.log("Updating for a non existing id");
    // await rwa.changeUri(2, "https://i-got-updated/2");

    // console.log(await rwa.getProperty(2));

    await rwa.changePropertyDetails(1, _50ether, _50ether);
    console.log(await rwa.getProperty(1));

    //APR will be added manually once the property starts generating rent
  });
  it("3. REGISTER and UPDATE PROPERTY with invalid number of shares", async function () {
    const {
      rwa,
      partners,
      shares,
      rwaMarketplace,
      buylp,
      stay,
      usdc,
      lp,
      user1,
      user2,
      user3,
      _100ether,
      _10ether,
      user4,
      user5,
      user6,
      deployer,
      user7,
      _1kether,
      _500ether,
      _1ether,
      _50ether,
      zeroAddress,
      USDC,
      _20kether,
    } = await loadFixture(deployContractsFixture);

    await rwa.registerProperty(
      partners,
      shares,
      214,
      _10ether,
      "https://uri.com/testing-the-shit-outta-this"
    );

    console.log("Property registered");
    console.log(await rwa.getProperty(1));

    await rwa.changeUri(1, "https://i-got-updated/");
    console.log("Property uri updated");

    console.log(await rwa.getProperty(1));

    // console.log("Updating for a non existing id");
    // await rwa.changeUri(2, "https://i-got-updated/2");

    // console.log(await rwa.getProperty(2));

    await rwa.changePropertyDetails(1, _50ether, _10ether);

    console.log(await rwa.getProperty(1));

    //APR will be added manually once the property starts generating rent
  });
});
