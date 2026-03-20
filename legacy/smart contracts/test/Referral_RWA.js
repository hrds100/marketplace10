const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");

describe("RWA MARKETPLACE CONTRACT", function () {
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
      user11,
      user12,
      user13,
      user14,
      user15,
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
    const _2kether = ethers.parseEther("2000");
    const _20kether = ethers.parseEther("20000");

    const partners13 = [user1.address, user2.address, user3.address];
    const partners46 = [user4.address, user5.address, user6.address];
    const partners79 = [user7.address, user8.address, user9.address];
    const partners1011 = [user10.address];
    const partners1213 = [user12.address, user13.address];

    const shares13 = [15, 25, 100];
    const shares46 = [59, 51, 102];
    const shares79 = [90, 78, 112];
    const shares1011 = [5];
    const shares1213 = [9, 52];

    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const wbnb = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    const stayAddress = "0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0";
    const lpAddress = "0x2397c1722ccb6934becf579351685a56030ea8f7";
    const imperUSDC = "0x554B52bF57b387fD09D6644368C5A8AAcaAf5aE0";
    const chris = "0x6eb06e1078cfbdCF9a3387584a8D934D85Ea1436";
    const USDC = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";
    const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const rockAddress = "0x6D635dc4a2A54664B54dF6a63e5ee31D5b29CF6e";
    const managerAddress = user14.address;
    let rwaAddress;
    let rwaMarketplaceAddress;

    const usdc = await ethers.getContractAt("USDC", USDC);
    const rock = await ethers.getContractAt("MyRocks", rockAddress);
    const stay = await ethers.getContractAt("Stay", stayAddress);
    const router = await ethers.getContractAt("Router", routerAddress);
    const lp = await ethers.getContractAt("Pair", lpAddress);
    const RWA = await ethers.getContractFactory("RWA");
    const rwa = await RWA.deploy();
    await rwa.waitForDeployment();
    rwaAddress = rwa.target;

    const RWAMarketplace = await ethers.getContractFactory("RWAMarketplace");
    const rwaMarketplace = await RWAMarketplace.deploy(
      rwaAddress,
      managerAddress,
      250,
      150,
      500
    );
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

    await rock
      .connect(signerChris)
      .safeTransferRocks([1257, 1259], user11.address);

    console.log(await rock.balanceOf(user11.address));

    await usdc.connect(usdcSigner).transfer(deployer.address, _20kether);
    await usdc.connect(usdcSigner).transfer(user1.address, _20kether);
    await usdc.connect(usdcSigner).transfer(user11.address, _10kether);

    await rwa.initialize(rwaMarketplaceAddress);
    console.log("INITIALIZED");

    await rwa.registerProperty(
      partners13,
      shares13,
      1000,
      _1kether,
      "https://uri.com/testing-the-shit-outta-this1"
    );
    // await rwa.registerProperty(
    //   partners46,
    //   shares46,
    //   2521,
    //   _5ether,
    //   "https://uri.com/testing-the-shit-outta-this2"
    // );
    // await rwa.registerProperty(
    //   partners79,
    //   shares79,
    //   2992,
    //   _15ether,
    //   "https://uri.com/testing-the-shit-outta-this3"
    // );
    // await rwa.registerProperty(
    //   partners1011,
    //   shares1011,
    //   1001,
    //   _2kether,
    //   "https://uri.com/testing-the-shit-outta-this4"
    // );
    // await rwa.registerProperty(
    //   partners1213,
    //   shares1213,
    //   509,
    //   _2kether,
    //   "https://uri.com/testing-the-shit-outta-this5"
    // );

    console.log("Properties registered");
    let shares = 0;
    let partners = 0;

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
      user13,
      user14,
      user3,
      _100ether,
      _10ether,
      _200ether,
      _3million,
      _2million,
      _2kether,
      _1million,
      _185ether,
      user11,
      rock,
      rockAddress,
      _90ether,
      _110ether,
      _50ether,
      _15ether,
      _5ether,
      _1000ether,
      user4,
      stayAddress,
      user5,
      router,
      user6,
      user7,
      _500ether,
      _1ether,
      user12,
      deployer,
      zeroAddress,
      USDC,
      _50ether,
      _10million,
      rwa,
      rwaMarketplace,
      _1000ether,
      rwaAddress,
      rwaMarketplaceAddress,
      user10,
      wbnb,
    };
  }

  it("1. buy with no referral(pass 0x)  ", async function () {
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
      rwaMarketplaceAddress,
      deployer,
      user7,
      _1kether,
      _500ether,
      _10million,
      _1ether,
      _50ether,
      zeroAddress,
      _2kether,
      USDC,
      _20kether,
      user11,
      user12,
    } = await loadFixture(deployContractsFixture);

    console.log(
      "OWNER BALANCE START",
      await ethers.provider.getBalance(deployer.address),
      "BNB"
    );

    // await rwa.registerProperty(
    //   partners,
    //   shares,
    //   500,
    //   _2kether,
    //   "https://uri.com/testing-the-shit-outta-this"
    // );

    // console.log("Property registered");
    console.log(await rwa.getProperty(1));
    console.log("here1");

    await rwaMarketplace.startPrimarySale(1);
    // console.log("here2");

    console.log(await rwaMarketplace.getPrimarySale(1));
    // console.log("her3");

    // await usdc.approve(rwaMarketplaceAddress, _10million);
    // await rwaMarketplace.addReferral(user1.address);
    // await rwaMarketplace.addExclusiveReferralBips(user1.address, 10);
    console.log(await ethers.provider.getBalance(user11.address), "BNB");
    console.log(await usdc.balanceOf(user11.address), "USDC");
    console.log(await usdc.balanceOf(user12.address), "USDC referral before");

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(
        user11.address,
        zeroAddress,
        1,
        _1kether,
        0,
        zeroAddress,
        {
          value: ethers.parseEther("2"),
        }
      );
    console.log(await ethers.provider.getBalance(user11.address), "BNB");

    console.log(await usdc.balanceOf(user11.address), "USDC");

    // console.log(await usdc.balanceOf(user12.address), "USDC referral");

    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");
    // console.log(await rwa.balanceOf(user12.address, 1), "SHARES USER12");

    // console.log(await rwa.getProperty(1));

    // console.log("referral balance", await usdc.balanceOf(user12.address));
    // // await rwaMarketplace.approve();
    // await usdc.connect(user12).approve(rwaMarketplaceAddress, _10million);
    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);
    // console.log("referral balance", await usdc.balanceOf(user12.address));

    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);

    // console.log(await rwa.getProperty(1));
    // console.log("referral balance", await usdc.balanceOf(user12.address));

    // // await rwaMarketplace.buyPrimaryShares(user1.address, USDC, 1, 10);
    // console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");
    // console.log(await rwa.balanceOf(user12.address, 1), "SHARES USER12");
    // console.log(
    //   "OWNER BALANCE END",
    //   await ethers.provider.getBalance(deployer.address),
    //   "BNB"
    // );

    // console.log(await rwaMarketplace.getPrimarySale(1));
    // await rwaMarketplace.endPrimarySale(1);
    // console.log(await rwaMarketplace.getPrimarySale(1));

    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);
  });

  it("2. pass some non whitelisted address  ", async function () {
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
      rwaMarketplaceAddress,
      deployer,
      user7,
      _1kether,
      _500ether,
      _10million,
      _1ether,
      _50ether,
      zeroAddress,
      _2kether,
      USDC,
      _20kether,
      user11,
      user12,
    } = await loadFixture(deployContractsFixture);

    console.log(
      "OWNER BALANCE START",
      await ethers.provider.getBalance(deployer.address),
      "BNB"
    );

    // await rwa.registerProperty(
    //   partners,
    //   shares,
    //   500,
    //   _2kether,
    //   "https://uri.com/testing-the-shit-outta-this"
    // );

    // console.log("Property registered");
    console.log(await rwa.getProperty(1));
    console.log("here1");

    await rwaMarketplace.startPrimarySale(1);
    // console.log("here2");

    console.log(await rwaMarketplace.getPrimarySale(1));
    // console.log("her3");

    // await usdc.approve(rwaMarketplaceAddress, _10million);
    // await rwaMarketplace.addReferral(user1.address);
    // await rwaMarketplace.addExclusiveReferralBips(user1.address, 10);
    console.log(await ethers.provider.getBalance(user11.address), "BNB");
    console.log(await usdc.balanceOf(user11.address), "USDC");
    console.log(await usdc.balanceOf(user12.address), "USDC referral before");
    console.log("referral balance", await usdc.balanceOf(user12.address));
    await usdc.connect(user11).approve(rwaMarketplaceAddress, _10million);

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, USDC, 1, _1kether, 0, user12.address, {
        value: ethers.parseEther("0"),
      });
    console.log(await ethers.provider.getBalance(user11.address), "BNB");

    console.log(await usdc.balanceOf(user11.address), "USDC");

    console.log(await usdc.balanceOf(user12.address), "USDC referral");

    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");

    console.log("referral balance", await usdc.balanceOf(user12.address));
    /// buying again to see if agent receives commission again. (it shouldnt)
    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, USDC, 1, _1kether, 0, user12.address, {
        value: ethers.parseEther("0"),
      });
    console.log(await ethers.provider.getBalance(user11.address), "BNB");

    console.log(await usdc.balanceOf(user11.address), "USDC");

    // console.log(await usdc.balanceOf(user12.address), "USDC referral");

    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");

    console.log("referral balance", await usdc.balanceOf(user12.address));
    // console.log(await rwa.balanceOf(user12.address, 1), "SHARES USER12");

    // console.log(await rwa.getProperty(1));
    // // await rwaMarketplace.approve();
    // await usdc.connect(user12).approve(rwaMarketplaceAddress, _10million);
    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);
    // console.log("referral balance", await usdc.balanceOf(user12.address));

    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);

    // console.log(await rwa.getProperty(1));
    // console.log("referral balance", await usdc.balanceOf(user12.address));

    // // await rwaMarketplace.buyPrimaryShares(user1.address, USDC, 1, 10);
    // console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");
    // console.log(await rwa.balanceOf(user12.address, 1), "SHARES USER12");
    // console.log(
    //   "OWNER BALANCE END",
    //   await ethers.provider.getBalance(deployer.address),
    //   "BNB"
    // );

    // console.log(await rwaMarketplace.getPrimarySale(1));
    // await rwaMarketplace.endPrimarySale(1);
    // console.log(await rwaMarketplace.getPrimarySale(1));

    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);
  });
  it("3. pass whitelisted address  ", async function () {
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
      rwaMarketplaceAddress,
      deployer,
      user7,
      _1kether,
      _500ether,
      _10million,
      _1ether,
      _50ether,
      zeroAddress,
      _2kether,
      USDC,
      _20kether,
      user11,
      user12,
    } = await loadFixture(deployContractsFixture);

    console.log(
      "OWNER BALANCE START",
      await ethers.provider.getBalance(deployer.address),
      "BNB"
    );

    // await rwa.registerProperty(
    //   partners,
    //   shares,
    //   500,
    //   _2kether,
    //   "https://uri.com/testing-the-shit-outta-this"
    // );

    // console.log("Property registered");
    console.log(await rwa.getProperty(1));
    console.log("here1");

    await rwaMarketplace.startPrimarySale(1);
    // console.log("here2");

    console.log(await rwaMarketplace.getPrimarySale(1));
    // console.log("her3");

    // await usdc.approve(rwaMarketplaceAddress, _10million);
    // await rwaMarketplace.addReferral(user1.address);
    // await rwaMarketplace.addExclusiveReferralBips(user1.address, 10);
    console.log(await ethers.provider.getBalance(user11.address), "BNB");
    console.log(await usdc.balanceOf(user11.address), "USDC");
    console.log(await usdc.balanceOf(user12.address), "USDC referral before");
    console.log("referral balance", await usdc.balanceOf(user12.address));
    await usdc.connect(user11).approve(rwaMarketplaceAddress, _10million);

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, USDC, 1, _1kether, 0, user12.address, {
        value: ethers.parseEther("0"),
      });
    console.log(await ethers.provider.getBalance(user11.address), "BNB");

    console.log(await usdc.balanceOf(user11.address), "USDC");

    // console.log(await usdc.balanceOf(user12.address), "USDC referral");

    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");

    console.log("referral balance", await usdc.balanceOf(user12.address));

    // await rwaMarketplace.updateAgentWhitelistStatus(user12.address, false);

    /// buying again to see if agent receives commission again.
    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, USDC, 1, _1kether, 0, user12.address, {
        value: ethers.parseEther("0"),
      });
    console.log(await ethers.provider.getBalance(user11.address), "BNB");

    console.log(await usdc.balanceOf(user11.address), "USDC");

    // console.log(await usdc.balanceOf(user12.address), "USDC referral");

    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");

    console.log("referral balance", await usdc.balanceOf(user12.address));
    await rwaMarketplace.updateAgentWhitelistStatus(user12.address, true);

    /// buying again to see if agent receives commission again.
    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, USDC, 1, _1kether, 0, user12.address, {
        value: ethers.parseEther("0"),
      });
    console.log(await ethers.provider.getBalance(user11.address), "BNB");

    console.log(await usdc.balanceOf(user11.address), "USDC");

    // console.log(await usdc.balanceOf(user12.address), "USDC referral");

    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");

    console.log("referral balance", await usdc.balanceOf(user12.address));
    // console.log(await rwa.balanceOf(user12.address, 1), "SHARES USER12");

    // console.log(await rwa.getProperty(1));
    // // await rwaMarketplace.approve();
    // await usdc.connect(user12).approve(rwaMarketplaceAddress, _10million);
    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);
    // console.log("referral balance", await usdc.balanceOf(user12.address));

    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);

    // console.log(await rwa.getProperty(1));
    // console.log("referral balance", await usdc.balanceOf(user12.address));

    // // await rwaMarketplace.buyPrimaryShares(user1.address, USDC, 1, 10);
    // console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");
    // console.log(await rwa.balanceOf(user12.address, 1), "SHARES USER12");
    // console.log(
    //   "OWNER BALANCE END",
    //   await ethers.provider.getBalance(deployer.address),
    //   "BNB"
    // );

    // console.log(await rwaMarketplace.getPrimarySale(1));
    // await rwaMarketplace.endPrimarySale(1);
    // console.log(await rwaMarketplace.getPrimarySale(1));

    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);
  });
  it("4. user adds himself as referral  ", async function () {
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
      rwaMarketplaceAddress,
      deployer,
      user7,
      _1kether,
      _500ether,
      _10million,
      _1ether,
      _50ether,
      zeroAddress,
      _2kether,
      USDC,
      _20kether,
      user11,
      user12,
    } = await loadFixture(deployContractsFixture);

    console.log(
      "OWNER BALANCE START",
      await ethers.provider.getBalance(deployer.address),
      "BNB"
    );

    // await rwa.registerProperty(
    //   partners,
    //   shares,
    //   500,
    //   _2kether,
    //   "https://uri.com/testing-the-shit-outta-this"
    // );

    // console.log("Property registered");
    console.log(await rwa.getProperty(1));
    console.log("here1");

    await rwaMarketplace.startPrimarySale(1);
    // console.log("here2");

    console.log(await rwaMarketplace.getPrimarySale(1));
    // console.log("her3");

    // await usdc.approve(rwaMarketplaceAddress, _10million);
    // await rwaMarketplace.addReferral(user1.address);
    // await rwaMarketplace.addExclusiveReferralBips(user1.address, 10);
    console.log(await ethers.provider.getBalance(user11.address), "BNB");
    console.log(await usdc.balanceOf(user11.address), "USDC");
    console.log(await usdc.balanceOf(user6.address), "USDC referral before");

    await usdc.connect(user11).approve(rwaMarketplaceAddress, _10million);

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, USDC, 1, _1kether, 0, user6.address, {
        value: ethers.parseEther("0"),
      });
    console.log(await ethers.provider.getBalance(user11.address), "BNB");
    console.log(await usdc.balanceOf(user11.address), "USDC");
    console.log(await usdc.balanceOf(user6.address), "USDC referral");
    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");

    await rwaMarketplace.updateAgentWhitelistStatus(user12.address, true);

    console.log("BUYGIN WITH ANOTHER REFERRAL");

    console.log(await ethers.provider.getBalance(user11.address), "BNB");
    console.log(await usdc.balanceOf(user11.address), "USDC");
    console.log(await usdc.balanceOf(user12.address), "USDC referral before");

    await usdc.connect(user11).approve(rwaMarketplaceAddress, _10million);

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, USDC, 1, _1kether, 0, user12.address, {
        value: ethers.parseEther("0"),
      });
    console.log(await ethers.provider.getBalance(user11.address), "BNB");
    console.log(await usdc.balanceOf(user11.address), "USDC");
    console.log(await usdc.balanceOf(user12.address), "USDC referral");
    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");

    // console.log(await rwa.getProperty(1));
    // // await rwaMarketplace.approve();
    // await usdc.connect(user12).approve(rwaMarketplaceAddress, _10million);
    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);
    // console.log("referral balance", await usdc.balanceOf(user12.address));

    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);

    // console.log(await rwa.getProperty(1));
    // console.log("referral balance", await usdc.balanceOf(user12.address));

    // // await rwaMarketplace.buyPrimaryShares(user1.address, USDC, 1, 10);
    // console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");
    // console.log(await rwa.balanceOf(user12.address, 1), "SHARES USER12");
    // console.log(
    //   "OWNER BALANCE END",
    //   await ethers.provider.getBalance(deployer.address),
    //   "BNB"
    // );

    // console.log(await rwaMarketplace.getPrimarySale(1));
    // await rwaMarketplace.endPrimarySale(1);
    // console.log(await rwaMarketplace.getPrimarySale(1));

    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);
  });
  it.only("5. update aprbrips  ", async function () {
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
      rwaMarketplaceAddress,
      deployer,
      user7,
      _1kether,
      _500ether,
      _10million,
      _1ether,
      _50ether,
      zeroAddress,
      _2kether,
      USDC,
      _20kether,
      user11,
      user12,
    } = await loadFixture(deployContractsFixture);

    console.log(
      "OWNER BALANCE START",
      await ethers.provider.getBalance(deployer.address),
      "BNB"
    );

    // await rwa.registerProperty(
    //   partners,
    //   shares,
    //   500,
    //   _2kether,
    //   "https://uri.com/testing-the-shit-outta-this"
    // );

    // console.log("Property registered");
    console.log(await rwa.getProperty(1));
    console.log("here1");

    await rwaMarketplace.startPrimarySale(1);
    // console.log("here2");

    console.log(await rwaMarketplace.getPrimarySale(1));
    await rwaMarketplace.updateAgentWhitelistStatus(user12.address, true);

    console.log(await ethers.provider.getBalance(user11.address), "BNB");
    console.log(await usdc.balanceOf(user11.address), "USDC");
    console.log(await usdc.balanceOf(user12.address), "USDC referral before");

    await usdc.connect(user11).approve(rwaMarketplaceAddress, _10million);

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, USDC, 1, _1kether, 0, user12.address, {
        value: ethers.parseEther("0"),
      });
    console.log(await ethers.provider.getBalance(user11.address), "BNB");
    console.log(await usdc.balanceOf(user11.address), "USDC");
    console.log(await usdc.balanceOf(user12.address), "USDC referral");
    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");


    console.log("BUYGIN WITH ANOTHER REFERRAL");
    await usdc.connect(user11).approve(rwaMarketplaceAddress, _10million);

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, USDC, 1, _1kether, 0, user12.address, {
        value: ethers.parseEther("0"),
      });
    console.log(await ethers.provider.getBalance(user11.address), "BNB");
    console.log(await usdc.balanceOf(user11.address), "USDC");
    console.log(await usdc.balanceOf(user12.address), "USDC referral");
    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");

    await rwaMarketplace.addExclusiveReferralBips(user12.address, 1000);
    await rwaMarketplace.updateAgentWhitelistStatus(user12.address, false);


    console.log("BUYGIN WITH ANOTHER REFERRAL");

    await usdc.connect(user11).approve(rwaMarketplaceAddress, _10million);

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, USDC, 1, _1kether, 0, user12.address, {
        value: ethers.parseEther("0"),
      });
    console.log(await ethers.provider.getBalance(user11.address), "BNB");
    console.log(await usdc.balanceOf(user11.address), "USDC");
    console.log(await usdc.balanceOf(user12.address), "USDC referral");
    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");

    console.log(await rwaMarketplace.isAgentWhitelisted(user12.address));

    // console.log(await rwa.getProperty(1));
    // // await rwaMarketplace.approve();
    // await usdc.connect(user12).approve(rwaMarketplaceAddress, _10million);
    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);
    // console.log("referral balance", await usdc.balanceOf(user12.address));

    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);

    // console.log(await rwa.getProperty(1));
    // console.log("referral balance", await usdc.balanceOf(user12.address));

    // // await rwaMarketplace.buyPrimaryShares(user1.address, USDC, 1, 10);
    // console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");
    // console.log(await rwa.balanceOf(user12.address, 1), "SHARES USER12");
    // console.log(
    //   "OWNER BALANCE END",
    //   await ethers.provider.getBalance(deployer.address),
    //   "BNB"
    // );

    // console.log(await rwaMarketplace.getPrimarySale(1));
    // await rwaMarketplace.endPrimarySale(1);
    // console.log(await rwaMarketplace.getPrimarySale(1));

    // await rwaMarketplace
    //   .connect(user12)
    //   .buyPrimaryShares(user12.address, USDC, 1, 1);
  });
});

//1 list and buy with bnb test calcukations
//2 buy with usdc and test the calculations
//3
