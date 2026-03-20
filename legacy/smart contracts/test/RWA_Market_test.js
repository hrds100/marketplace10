const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");

describe("RWA MARKETPLACE CONTRACT", function () {
  async function deployContractsFixture() {
    const [
      deployer,
      // //   user2,
      // //   user3,
      // //   user4,
      // //   user5,
      // //   user6,
      // //   user7,
      // //   user8,
      // //   user9,
      // //   user10,
      // //   user11,
      // //   user12,
      // //   user13,
      // //   user14,
      // //   user15,
    ] = await ethers.getSigners();

    const privateKeys = [
      "0x59c6995e998f97a5a0044966f0945384d56b51040e378f8b3fa4b16c7e6d5f61", // deployer
      "0x8e5b6c18e4291edc2a7c7c70a9a2d46cc111e60e3f418cde453c66b8b75c6d36", // user1
      "0xa0df350d2637096571F7A701CBc1C5fdE30dF76A63A7E819F8A6b85eFD5f7336", // user2
      "0xc526ee9fe37a5c18ed8e99f7c3b11bdbecb9c28c6b0e5c5e6c1b6fbeedecbd0f", // user3
      "0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2aafe81b584a73c22c63b7ff53", // user4
      "0x1563915e194d8cfba1943570603f7606a3115508a3bfaabedf8fbbd0b6cbe028", // user5
      "0xa0ee7a142d267c1f36714e4a8f75612f20a79720c1b4780f1d0eeb7c8f1c80d3", // user6
      "0x646f1ce2f920cba0f9f3d8c7aaae1f17c93659c0701f0df11254b85c682efcc4", // user7
      "0xadd53f9a7e588d0a48f174cf90313e3f5fa39f429ed875dfc4f17a99f31a0f5a", // user8
      "0x395df67f0c2e91b1b3267c80c63d703a7b4f6f680e67c9ed1bce6b6d77e3cc59", // user9
      "0xe485d098507f1fe13c7b91e9739d8a1e3466bb1b9e92636f1141a779e3d1a7a4", // user10
      "0xa453611d9419d0e7eb2393a3f3ac8c1f2b1bcd075b43b8b2e17d57fb6f5f8d2c", // user11
      "0x8b218f77f8b9437ed35b417b3f3f3a5123ce17b1c0dc391f3a82b8e36d4c5b2b", // user12
      "0x5f0b5bfb178b1ec0e356f0f5e96c0c7418d7f7a9e0dbbb51e7891a9c1a3f1848", // user13
      "0x84fbbb90f5b2f3b80aaeaeb70f01a75a7d69a3c73efb1c6dbad50e1a742e6e22", // user14
      "0x0f4b5e7b7c3d7d4b42f1f2ed3f3f12e962b0c00d4fa859a30f1e8182f3bb4a4c", // user15
    ];
    const stayWallet = "0xF72817AD1e1Ac47A15c9F4A7CCA16E76FE428F6e";

    // Create provider (e.g., local Hardhat node, testnet, or mainnet)
    const provider = ethers.provider;
    console.log(await provider.getBalance(deployer.address));

    // Create wallet instances
    const [
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
      user1,    
      deployer2,
      user12,
      user13,
      user14,
      user15,
    ] = privateKeys.map((key) => new ethers.Wallet(key, provider));
    const amountToSend = ethers.parseEther("2000");
    for (let i = 10; i < 13; i++) {
      const wallet = new ethers.Wallet(privateKeys[i], provider);

      const tx = await deployer.sendTransaction({
        to: wallet.address,
        value: amountToSend,
      });

      await tx.wait();
      console.log(`✅ Funded ${wallet.address} with 10 ETH/BNB`);
    }
    const tx9 = await deployer.sendTransaction({
      to: stayWallet,
      value: amountToSend,
    });

    await tx9.wait();

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
    const partners46 = [user1.address, user2.address, user3.address];
    const partners79 = [user1.address, user8.address, user9.address];
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
    const rwa = await RWA.connect(user1).deploy();
    await rwa.waitForDeployment();
    rwaAddress = rwa.target;

    const RWAMarketplace = await ethers.getContractFactory("RWAMarketplace");
    const rwaMarketplace = await RWAMarketplace.connect(user1).deploy(
      rwaAddress,
      managerAddress,
      user1.address,
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
    // await deployer.sendTransaction(tx2);

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

    // await rock
    //   .connect(signerChris)
    //   .safeTransferRocks([1257, 1259], user11.address);

    // console.log(await rock.balanceOf(user11.address));

    await usdc.connect(usdcSigner).transfer(deployer.address, _20kether);
    await usdc.connect(usdcSigner).transfer(user1.address, _20kether);
    await usdc.connect(usdcSigner).transfer(user11.address, _10kether);

    await rwa.connect(user1).initialize(
      rwaMarketplaceAddress,
      "0xD84aC4716A082B1F7eCDe9301aA91A7c4B62ECd7"
    );
    console.log("INITIALIZED");

    await rwa.connect(user1).registerProperty(
      partners13,
      shares13,
      1000,
      _1kether,
      "https://uri.com/testing-the-shit-outta-this1"
    );
    await rwa.connect(user1).registerProperty(
      partners46,
      shares46,
      2521,
      _5ether,
      "https://uri.com/testing-the-shit-outta-this2"
    );
    await rwa.connect(user1).registerProperty(
      partners79,
      shares79,
      2992,
      _15ether,
      "https://uri.com/testing-the-shit-outta-this3"
    );
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

  it("1. LISTING PROPERTY ", async function () {
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

    await rwa.connect(user1).registerProperty(
      partners,
      shares,
      500,
      _10ether,
      "https://uri.com/testing-the-shit-outta-this"
    );

    console.log("Property registered");
    console.log(await rwa.getProperty(1));

    await rwaMarketplace.connect(user1).startPrimarySale(1);

    console.log(await rwaMarketplace.getPrimarySale(1));
  });
  it("2. BUYING PRIMARY SHARE: passing invalid BNB amount ", async function () {
    const {
      rwa,
      partners13,
      shares13,
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
      USDC,
      _20kether,
    } = await loadFixture(deployContractsFixture);
    console.log("herer");

    console.log("Property registered");
    console.log(await rwa.getProperty(1));
    console.log("here1");

    await rwaMarketplace.startPrimarySale(1);

    console.log(await ethers.provider.getBalance(user1.address), "BNB = 10k");
    console.log(await usdc.balanceOf(user1.address), "USDC = 20k");

    await usdc.connect(user1).approve(rwaMarketplaceAddress, _10million);

    await rwaMarketplace
      .connect(user1)
      .buyPrimaryShares(user1.address, USDC, 1, 1, {
        value: 0,
      });

    console.log(await ethers.provider.getBalance(user1.address), "BNB");

    console.log(await usdc.balanceOf(user1.address), "USDC");

    await rwaMarketplace.endPrimarySale(1);

    console.log("__________");

    await rwa.connect(user1).setApprovalForAll(rwaMarketplaceAddress, true);

    await rwaMarketplace.connect(user1).startSecondarySale(1, 8, _1ether, 0);

    await usdc.approve(rwaMarketplace, _10million);

    console.log(await ethers.provider.getBalance(deployer.address), "BNB");

    console.log(await usdc.balanceOf(deployer.address), "USDC");

    await rwaMarketplace.buySecondaryShares(1, 2, deployer.address, USDC, {
      value: 0,
    });
    console.log(await ethers.provider.getBalance(deployer.address), "BNB");

    console.log(await usdc.balanceOf(deployer.address), "USDC");
    // await rwaMarketplace.buyPrimaryShares(user1.address, USDC, 1, 10);
  });
  it("3. BUYING PRIMARY SHARE: passing Higher BNB amount ", async function () {
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
    } = await loadFixture(deployContractsFixture);

    await rwa.registerProperty(
      partners,
      shares,
      500,
      _2kether,
      "https://uri.com/testing-the-shit-outta-this"
    );

    console.log("Property registered");
    console.log(await rwa.getProperty(1));
    console.log("here1");

    await rwaMarketplace.startPrimarySale(1);
    // console.log("here2");

    console.log(await rwaMarketplace.getPrimarySale(1));
    // console.log("her3");

    // await usdc.approve(rwaMarketplaceAddress, _10million);
    // await rwaMarketplace.addReferral(user1.address);
    // await rwaMarketplace.addExclusiveReferralBips(user1.address, 10);
    console.log(await ethers.provider.getBalance(user1.address), "BNB");
    console.log(await usdc.balanceOf(user1.address), "USDC");

    await rwaMarketplace
      .connect(user1)
      .buyPrimaryShares(user1.address, zeroAddress, 1, 1, {
        value: ethers.parseEther("2"),
      });
    console.log(await ethers.provider.getBalance(user1.address), "BNB");

    console.log(await usdc.balanceOf(user1.address), "USDC");

    console.log(await rwa.balanceOf(user1.address, 1), "SHARES");

    // await rwaMarketplace.buyPrimaryShares(user1.address, USDC, 1, 10);
  });
  it("4. BUYING PRIMARY SHARE: with an existirng owner ", async function () {
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
    } = await loadFixture(deployContractsFixture);

    await rwa.registerProperty(
      partners,
      shares,
      500,
      _2kether,
      "https://uri.com/testing-the-shit-outta-this"
    );

    console.log("Property registered");
    console.log(await rwa.getProperty(1));
    console.log("here1");

    await rwaMarketplace.startPrimarySale(1);
    // console.log("here2");

    console.log(await rwaMarketplace.getPrimarySale(1));
    // console.log("her3");

    // await usdc.approve(rwaMarketplaceAddress, _10million);
    // await rwaMarketplace.addReferral(user1.address);
    // await rwaMarketplace.addExclusiveReferralBips(user1.address, 10);
    console.log(await ethers.provider.getBalance(user1.address), "BNB");
    console.log(await usdc.balanceOf(user1.address), "USDC");

    await rwaMarketplace
      .connect(user1)
      .buyPrimaryShares(user1.address, zeroAddress, 1, 1, {
        value: ethers.parseEther("2"),
      });
    console.log(await ethers.provider.getBalance(user1.address), "BNB");

    console.log(await usdc.balanceOf(user1.address), "USDC");

    console.log(await rwa.balanceOf(user1.address, 1), "SHARES");

    console.log(await rwa.getProperty(1));

    // await rwaMarketplace.buyPrimaryShares(user1.address, USDC, 1, 10);
  });
  it("5. BUYING PRIMARY SHARE: with a non existent owner ", async function () {
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
    } = await loadFixture(deployContractsFixture);

    await rwa.registerProperty(
      partners,
      shares,
      500,
      _2kether,
      "https://uri.com/testing-the-shit-outta-this"
    );

    console.log("Property registered");
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

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, zeroAddress, 1, 1, {
        value: ethers.parseEther("2"),
      });
    console.log(await ethers.provider.getBalance(user11.address), "BNB");

    console.log(await usdc.balanceOf(user11.address), "USDC");

    console.log(await rwa.balanceOf(user11.address, 1), "SHARES");

    console.log(await rwa.getProperty(1));

    // await rwaMarketplace.buyPrimaryShares(user1.address, USDC, 1, 10);
  });
  it("6. BUYING PRIMARY SHARE WITH A NON REGISTERED USERS and referral address | SALE ENDED  ", async function () {
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
  it("7. ADDING EXCLUSIVE BIPS | update PLATFORM FEE ", async function () {
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

    await rwa.registerProperty(
      partners,
      shares,
      500,
      _2kether,
      "https://uri.com/testing-the-shit-outta-this"
    );

    console.log("Property registered");
    console.log(await rwa.getProperty(1));
    console.log("here1");

    await rwaMarketplace.startPrimarySale(1);
    // await rwaMarketplace.startPrimarySale(2);
    // console.log("here2");

    console.log(await rwaMarketplace.getPrimarySale(1));
    // console.log("her3");

    // await usdc.approve(rwaMarketplaceAddress, _10million);
    // await rwaMarketplace.addReferral(user1.address);
    // await rwaMarketplace.addExclusiveReferralBips(user1.address, 10);
    console.log(await ethers.provider.getBalance(user11.address), "BNB");
    console.log(await usdc.balanceOf(user11.address), "USDC");
    await rwaMarketplace.connect(user11).addReferral(user12);
    await rwaMarketplace.addExclusiveReferralBips(user12.address, 2000);

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, zeroAddress, 1, 1, {
        value: ethers.parseEther("2"),
      });
    console.log(await ethers.provider.getBalance(user11.address), "BNB");

    console.log(await usdc.balanceOf(user11.address), "USDC");

    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");
    console.log(await rwa.balanceOf(user12.address, 2), "SHARES USER12");

    console.log(await rwa.getProperty(1));

    console.log("referral balance", await usdc.balanceOf(user12.address));
    // await rwaMarketplace.approve();
    await usdc.connect(user12).approve(rwaMarketplaceAddress, _10million);

    await rwaMarketplace
      .connect(user12)
      .buyPrimaryShares(user12.address, USDC, 1, 1);
    console.log("referral balance", await usdc.balanceOf(user12.address));

    await rwaMarketplace
      .connect(user12)
      .buyPrimaryShares(user12.address, USDC, 1, 1);

    console.log(await rwa.getProperty(1));
    console.log("referral balance", await usdc.balanceOf(user12.address));

    // await rwaMarketplace.buyPrimaryShares(user1.address, USDC, 1, 10);
    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");
    console.log(await rwa.balanceOf(user12.address, 1), "SHARES USER12");
    console.log(
      "OWNER BALANCE END",
      await ethers.provider.getBalance(deployer.address),
      "BNB"
    );

    console.log(await rwaMarketplace.getPrimarySale(1));
    // await rwaMarketplace.endPrimarySale(1);
    // console.log(await rwaMarketplace.getPrimarySale(1));
    // await rwaMarketplace.changePlatformFee(1000,0,0)

    // await rwaMarketplace
    // .connect(user12)
    // .buyPrimaryShares(user12.address, zeroAddress, 1, 1, {value:_2kether});
  });
  it("8. Normal referral and update platform fee ", async function () {
    const {
      rwa,
      partners,
      shares,
      user13,
      user14,
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

    await rwa.registerProperty(
      partners,
      shares,
      500,
      _1kether,
      "https://uri.com/testing-the-shit-outta-this"
    );
    await rwa.registerProperty(
      partners,
      shares,
      500,
      _2kether,
      "https://uri.com/testing-the-shit-outta-this"
    );
    console.log("Property registered");
    console.log(await rwa.getProperty(1));
    console.log(await rwa.getProperty(2));
    console.log("here1");

    await rwaMarketplace.startPrimarySale(1);
    await rwaMarketplace.startPrimarySale(2);

    // await rwaMarketplace.startPrimarySale(2);
    // console.log("here2");

    console.log(await rwaMarketplace.getPrimarySale(1));
    console.log(await rwaMarketplace.getPrimarySale(2));

    // console.log("her3");

    // await usdc.approve(rwaMarketplaceAddress, _10million);
    // await rwaMarketplace.addReferral(user1.address);
    // await rwaMarketplace.addExclusiveReferralBips(user1.address, 10);
    console.log(await ethers.provider.getBalance(user11.address), "BNB");
    console.log(await usdc.balanceOf(user11.address), "USDC");
    await rwaMarketplace.connect(user11).addReferral(user12);
    await rwaMarketplace.connect(user13).addReferral(user14);
    await rwaMarketplace.addExclusiveReferralBips(user12.address, 2000);

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, zeroAddress, 1, 1, {
        value: ethers.parseEther("2"),
      });
    console.log("id 2");
    await rwaMarketplace.changePlatformFee(1000, 0, 2000);
    await rwaMarketplace
      .connect(user13)
      .buyPrimaryShares(user13.address, zeroAddress, 2, 1, {
        value: ethers.parseEther("4"),
      });
    console.log(await usdc.balanceOf(user14.address), "USER 14");

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, zeroAddress, 1, 1, {
        value: ethers.parseEther("2"),
      });

    console.log(await ethers.provider.getBalance(user11.address), "BNB");

    console.log(await usdc.balanceOf(user11.address), "USDC");

    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");
    console.log(await rwa.balanceOf(user12.address, 2), "SHARES USER12");

    console.log(await rwa.getProperty(1));

    console.log("referral balance", await usdc.balanceOf(user12.address));
    // await rwaMarketplace.approve();
    await usdc.connect(user12).approve(rwaMarketplaceAddress, _10million);

    await rwaMarketplace
      .connect(user12)
      .buyPrimaryShares(user12.address, USDC, 1, 1);
    console.log("referral balance", await usdc.balanceOf(user12.address));

    await rwaMarketplace
      .connect(user12)
      .buyPrimaryShares(user12.address, USDC, 1, 1);

    console.log(await rwa.getProperty(1));
    console.log("referral balance", await usdc.balanceOf(user12.address));

    // await rwaMarketplace.buyPrimaryShares(user1.address, USDC, 1, 10);
    console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");
    console.log(await rwa.balanceOf(user12.address, 1), "SHARES USER12");
    console.log(
      "OWNER BALANCE END",
      await ethers.provider.getBalance(deployer.address),
      "BNB"
    );

    console.log(await rwaMarketplace.getPrimarySale(1));
    // await rwaMarketplace.endPrimarySale(1);
    // console.log(await rwaMarketplace.getPrimarySale(1));
    // await rwaMarketplace.changePlatformFee(1000,0,0)

    // await rwaMarketplace
    // .connect(user12)
    // .buyPrimaryShares(user12.address, zeroAddress, 1, 1, {value:_2kether});
  });
  it("9. STARTING SECODARY SALE BUYING WITH BNB", async function () {
    const {
      rwa,
      partners,
      shares,
      user13,
      user14,
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

    // console.log(
    //   "OWNER BALANCE START",
    //   await ethers.provider.getBalance(deployer.address),
    //   "BNB"
    // );

    await rwa.registerProperty(
      partners,
      shares,
      500,
      _1kether,
      "https://uri.com/testing-the-shit-outta-this"
    );
    await rwa.registerProperty(
      partners,
      shares,
      500,
      _2kether,
      "https://uri.com/testing-the-shit-outta-this"
    );
    console.log("Property registered");
    console.log(await rwa.getProperty(1));
    // console.log(await rwa.getProperty(2));
    // console.log("here1");

    await rwaMarketplace.startPrimarySale(1);
    // await rwaMarketplace.startPrimarySale(2);

    // // await rwaMarketplace.startPrimarySale(2);
    // // console.log("here2");

    // console.log(await rwaMarketplace.getPrimarySale(1));
    // console.log(await rwaMarketplace.getPrimarySale(2));

    // // console.log("her3");

    // // await usdc.approve(rwaMarketplaceAddress, _10million);
    // // await rwaMarketplace.addReferral(user1.address);
    // // await rwaMarketplace.addExclusiveReferralBips(user1.address, 10);
    // console.log(await ethers.provider.getBalance(user11.address), "BNB");
    // console.log(await usdc.balanceOf(user11.address), "USDC");
    // await rwaMarketplace.connect(user11).addReferral(user12);
    // await rwaMarketplace.connect(user13).addReferral(user14);
    // await rwaMarketplace.addExclusiveReferralBips(user12.address, 2000);

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, zeroAddress, 1, 1, {
        value: ethers.parseEther("2"),
      });

    await rwa.changePropertyDetails(1, _10million, 0);
    // console.log("id 2");
    // await rwaMarketplace.changePlatformFee(1000, 0, 2000);
    // await rwaMarketplace
    //   .connect(user13)
    //   .buyPrimaryShares(user13.address, zeroAddress, 2, 1, {
    //     value: ethers.parseEther("4"),
    //   });
    // console.log(await usdc.balanceOf(user14.address), "USER 14");

    // await rwaMarketplace
    //   .connect(user11)
    //   .buyPrimaryShares(user11.address, zeroAddress, 1, 1, {
    //     value: ethers.parseEther("2"),
    //   });

    // console.log(await ethers.provider.getBalance(user11.address), "BNB");

    // console.log(await usdc.balanceOf(user11.address), "USDC");

    // console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");
    // console.log(await rwa.balanceOf(user12.address, 2), "SHARES USER12");

    console.log(await rwa.getProperty(1));

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
    await rwa.connect(user3).setApprovalForAll(rwaMarketplaceAddress, true);
    // console.log(await rwa.balanceOf(deployer.address, 1), "deployer balance");
    // console.log(
    //   await rwa.balanceOf(rwaMarketplaceAddress, 1),
    //   "marketplace balanace"
    // );
    await rwaMarketplace.endPrimarySale(1);
    // console.log(await rwaMarketplace.getPrimarySale(1));
    // await rwaMarketplace.changePlatformFee(1000,0,0)

    // await rwaMarketplace
    // .connect(user12)

    // .buyPrimaryShares(user12.address, zeroAddress, 1, 1, {value:_2kether});

    // -----------------------------------------

    console.log("secondary sale started");
    await rwaMarketplace.connect(user3).startSecondarySale(1, 8, _1ether, 0);
    // await rwaMarketplace.startSecondarySale(1,385, _1ether, 0);
    // console.log(
    //   "marketplace balanace",
    //   await rwa.balanceOf(rwaMarketplaceAddress, 1)
    // );

    console.log(await rwaMarketplace.getSecondaryListing(1));
    console.log(await ethers.provider.getBalance(user13.address));
    await rwaMarketplace
      .connect(user13)
      .buySecondaryShares(1, 2, user13.address, zeroAddress, {
        value: _2kether,
      });
    console.log(await usdc.balanceOf(user13.address));

    console.log(await rwa.balanceOf(user3.address, 1));
    console.log(await rwa.balanceOf(user13.address, 1));
    console.log(await ethers.provider.getBalance(user13.address));
    console.log(await usdc.balanceOf(user13.address));
  });
  it("10. STARTING SECODARY SALE BUYING WITH USDC", async function () {
    const {
      rwa,
      partners,
      shares,
      user13,
      user14,
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

    // console.log(
    //   "OWNER BALANCE START",
    //   await ethers.provider.getBalance(deployer.address),
    //   "BNB"
    // );

    console.log(await rwa.getProperty(1));
    // console.log(await rwa.getProperty(2));
    // console.log("here1");

    await rwaMarketplace.startPrimarySale(1);

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, zeroAddress, 1, 1, {
        value: ethers.parseEther("2"),
      });

    await rwa.changePropertyDetails(1, _10million, 0);

    console.log(await rwa.getProperty(1));

    // console.log(await rwaMarketplace.getPrimarySale(1));
    await rwa.connect(user3).setApprovalForAll(rwaMarketplaceAddress, true);
    // console.log(await rwa.balanceOf(deployer.address, 1), "deployer balance");
    // console.log(
    //   await rwa.balanceOf(rwaMarketplaceAddress, 1),
    //   "marketplace balanace"
    // );
    await rwaMarketplace.endPrimarySale(1);
    await rwaMarketplace.startPrimarySale(1);

    // console.log(await rwaMarketplace.getPrimarySale(1));
    // await rwaMarketplace.changePlatformFee(1000,0,0)

    // await rwaMarketplace
    // .connect(user12)

    // .buyPrimaryShares(user12.address, zeroAddress, 1, 1, {value:_2kether});

    // -----------------------------------------

    console.log("secondary sale started");
    await rwaMarketplace.connect(user3).startSecondarySale(1, 8, _1ether, 0);

    await rwa.changePropertyDetails(1, 2);
    // await rwaMarketplace.startSecondarySale(1,385, _1ether, 0);
    // console.log(
    //   "marketplace balanace",
    //   await rwa.balanceOf(rwaMarketplaceAddress, 1)
    // );

    console.log(await rwaMarketplace.getSecondaryListing(1));
    console.log(await ethers.provider.getBalance(user13.address));
    await rwaMarketplace
      .connect(user13)
      .buySecondaryShares(1, 2, user13.address, zeroAddress, {
        value: _2kether,
      });
    console.log(await usdc.balanceOf(user13.address));

    console.log(await rwa.balanceOf(user3.address, 1));
    console.log(await rwa.balanceOf(user13.address, 1));
    console.log(await ethers.provider.getBalance(user13.address));
    console.log(await usdc.balanceOf(user13.address));
    await rwaMarketplace.updateSecondarySale(1, 0);
    console.log(await rwaMarketplace.getSecondaryListing(1));
  });
  it("11. MULTIPLE PROPERTIES", async function () {
    const {
      rwa,
      partners,
      shares,
      user13,
      user14,
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
      user10,
      _5ether,
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
    const property1 = await rwa.getProperty(1);
    const property2 = await rwa.getProperty(2);
    const property3 = await rwa.getProperty(3);
    const property4 = await rwa.getProperty(4);
    const property5 = await rwa.getProperty(5);
    const property6 = await rwa.getProperty(6);

    console.log("Property ID 1", property1);
    console.log("Property ID 2", property2);
    console.log("Property ID 3", property3);
    console.log("Property ID 4", property4);
    console.log("Property ID 5", property5);
    // console.log(await rwa.getProperty(2));
    // console.log("here1");

    console.log("++++++++STARTING PRIMARY SALE++++++++");

    console.log("Primary sale on for id 1 and 3");
    await rwaMarketplace.startPrimarySale(1);
    await rwaMarketplace.startPrimarySale(3);
    // await rwaMarketplace.startPrimarySale(5);
    console.log(await rwaMarketplace.getPrimarySale(1));
    console.log(await rwaMarketplace.getPrimarySale(3));

    console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));
    console.log(
      "USER11 BNB balance",
      await ethers.provider.getBalance(user11.address)
    );
    console.log("USER11 buying in 1st campaign ID 1");

    // await rwaMarketplace
    //   .connect(user11)
    //   .buyPrimaryShares(user11.address, zeroAddress, 1, 1, {
    //     value: ethers.parseEther("2"),
    //   });

    console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));
    console.log(
      "USER11 BNB balance",
      await ethers.provider.getBalance(user11.address)
    );

    console.log("USER11 buying in 1st campaign ID 3");

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, zeroAddress, 3, 3, {
        value: ethers.parseEther("1"),
      });

    console.log("Lets check how many have our share:");

    // await rwa.changePropertyDetails(1, _10million, 0);

    console.log(await rwa.getProperty(1));
    console.log(await rwa.getProperty(3));

    await rwaMarketplace.endPrimarySale(1);
    // await rwaMarketplace.endPrimarySale(5);
    // await rwaMarketplace.endPrimarySale(1);

    await rwa.connect(user12).setApprovalForAll(rwaMarketplaceAddress, true);

    console.log(await rwa.balanceOf(user12.address, 5));

    console.log(await rwaMarketplace.getTotalListings());
    console.log("total before");
    await rwaMarketplace
      .connect(user12)
      .startSecondarySale(5, 9, _5ether, 1727385238);

    console.log("started secondary for ID 5");
    console.log(await rwaMarketplace.getTotalListings());
    console.log("total after");

    // console.log("total after camncel");

    // await rwaMarketplace
    // .connect(user12)
    // .buyPrimaryShares(user11.address, zeroAddress, 1, 3, {
    //   value: ethers.parseEther("7"),
    // });

    // console.log(await rwaMarketplace.getPrimarySale(1));
    await rwa.connect(user3).setApprovalForAll(rwaMarketplaceAddress, true);
    await rwa.connect(user10).setApprovalForAll(rwaMarketplaceAddress, true);
    await rwa.setApprovalForAll(rwaMarketplaceAddress, true);

    console.log(await rwaMarketplace.getPrimarySale(1));
    console.log(await rwaMarketplace.getPrimarySale(3));
    console.log(await rwaMarketplace.getSecondaryListing(1));

    await rwaMarketplace.connect(user12).updateSecondarySale(1, 4, _10ether);

    console.log(await rwaMarketplace.getSecondaryListing(1));

    console.log("total after camncel");

    await rwaMarketplace.buySecondaryShares(
      1,
      2,
      deployer.address,
      zeroAddress,
      { value: _10ether }
    );
    await rwaMarketplace.connect(user12).cancelSecondarySale(1);
    console.log(await rwaMarketplace.getSecondaryListing(1));

    console.log(await rwaMarketplace.getTotalListings());

    console.log(await rwa.balanceOf(user12, 5), "balance updated should be 7");

    await rwaMarketplace.connect(user12).startSecondarySale(5, 7, _5ether, 120);

    console.log(await rwaMarketplace.getTotalListings(), "should be 1");

    console.log(
      await rwaMarketplace.getSecondaryListing(1),
      "should be non zero butis not"
    );
    console.log(await rwa.getProperty(5));

    await usdc.approve(rwaMarketplaceAddress, _10million);
    console.log("buyer balance", await rwa.balanceOf(deployer.address, 5));

    console.log("buyer USDC Bal", await usdc.balanceOf(deployer.address));
    console.log(
      "buyer BNB Bal",
      await ethers.provider.getBalance(deployer.address)
    );
    console.log("SELLER USDC Bal", await usdc.balanceOf(user12.address));

    await rwaMarketplace.buySecondaryShares(
      2,
      4,
      deployer.address,
      zeroAddress,
      {
        value: ethers.parseEther("2"),
      }
    );

    console.log("buyer USDC Bal", await usdc.balanceOf(deployer.address));
    console.log(
      "buyer BNB Bal",
      await ethers.provider.getBalance(deployer.address)
    );
    console.log("SELLER USDC Bal", await usdc.balanceOf(user12.address));

    console.log(await rwa.getProperty(5));

    console.log("buyer balance", await rwa.balanceOf(deployer.address, 5));
    console.log(await rwaMarketplace.getSecondaryListing(3));

    await rwaMarketplace.startSecondarySale(5, 6, _1ether, 120);
    await rwaMarketplace
      .connect(user2)
      .buySecondaryShares(2, 4, deployer.address, zeroAddress, {
        value: ethers.parseEther("2"),
      });
    await rwaMarketplace
      .connect(user10)
      .buySecondaryShares(2, 4, deployer.address, zeroAddress, {
        value: ethers.parseEther("2"),
      });
    await rwaMarketplace
      .connect(user11)
      .buySecondaryShares(2, 4, deployer.address, zeroAddress, {
        value: ethers.parseEther("2"),
      });
    await rwaMarketplace
      .connect(user4)
      .buySecondaryShares(2, 4, deployer.address, zeroAddress, {
        value: ethers.parseEther("2"),
      });
    await rwaMarketplace
      .connect(user5)
      .buySecondaryShares(2, 4, deployer.address, zeroAddress, {
        value: ethers.parseEther("2"),
      });
    await rwaMarketplace
      .connect(user1)
      .buySecondaryShares(2, 4, deployer.address, zeroAddress, {
        value: ethers.parseEther("2"),
      });

    // console.log(await rwaMarketplace.getTotalListings());

    // console.log(await rwa.balanceOf(deployer.address, 1), "deployer balance");
    // console.log(
    //   await rwa.balanceOf(rwaMarketplaceAddress, 1),
    //   "marketplace balanace"
    // );
    // await rwaMarketplace.startPrimarySale(1);

    // await rwaMarketplace.changePlatformFee(1000,0,0)

    // await rwaMarketplace
    // .connect(user12)

    // .buyPrimaryShares(user12.address, zeroAddress, 1, 1, {value:_2kether});

    // -----------------------------------------

    // console.log("secondary sale started");
    // await rwaMarketplace.connect(user3).startSecondarySale(1, 8, _1ether, 0);

    // await rwa.changePropertyDetails(1, 2);
    // await rwaMarketplace.startSecondarySale(1,385, _1ether, 0);
    // console.log(
    //   "marketplace balanace",
    //   await rwa.balanceOf(rwaMarketplaceAddress, 1)
    // );

    // console.log(await rwaMarketplace.getSecondaryListing(1));
    // console.log(await ethers.provider.getBalance(user13.address));
    // await rwaMarketplace
    //   .connect(user13)
    //   .buySecondaryShares(1, 2, user13.address, zeroAddress, {
    //     value: _2kether,
    //   });
    // console.log(await usdc.balanceOf(user13.address));

    // console.log(await rwa.balanceOf(user3.address, 1));
    // console.log(await rwa.balanceOf(user13.address, 1));
    // console.log(await ethers.provider.getBalance(user13.address));
    // console.log(await usdc.balanceOf(user13.address));
    // await rwaMarketplace.updateSecondarySale(1, 0);
    // console.log(await rwaMarketplace.getSecondaryListing(1));
  });
  it("12. NEW PRIMARY TESTING with BNB", async function () {
    const {
      rwa,
      partners,
      shares,
      user13,
      user14,
      rwaMarketplace,
      wbnb,
      buylp,
      stay,
      usdc,
      lp,
      user1,
      router,
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
      user10,
      _5ether,
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
    const property1 = await rwa.getProperty(1);
    const property2 = await rwa.getProperty(2);
    const property3 = await rwa.getProperty(3);
    const property4 = await rwa.getProperty(4);
    const property5 = await rwa.getProperty(5);
    const property6 = await rwa.getProperty(6);

    console.log("Property ID 1", property1);
    console.log("Property ID 2", property2);
    console.log("Property ID 3", property3);
    console.log("Property ID 4", property4);
    console.log("Property ID 5", property5);
    // console.log(await rwa.getProperty(2));
    // console.log("here1");

    console.log("++++++++STARTING PRIMARY SALE++++++++");

    console.log("Primary sale on for id 1 and 3");
    await rwaMarketplace.startPrimarySale(1);
    await rwaMarketplace.startPrimarySale(3);
    // await rwaMarketplace.startPrimarySale(5);
    console.log(await rwaMarketplace.getPrimarySale(1));
    console.log(await rwaMarketplace.getPrimarySale(3));

    console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));
    console.log(
      "USER11 BNB balance",
      await ethers.provider.getBalance(user11.address)
    );
    console.log("USER11 buying in 1st campaign ID 1");

    const path = [USDC, wbnb];

    // Call the getAmountsOut function
    // console.log(await rwa.getProperty(1));
    let fee = await rwaMarketplace.getPlaformFee();
    console.log(fee);
    fee = Number(fee[0]) / 100;
    console.log(fee, "fee");
    let addedFee = ((fee + 2.5) * ethers.formatEther(_1kether)) / 100;
    console.log(addedFee, "usdcwith fee");
    let usdcWithFee = _1kether + ethers.parseEther(addedFee.toString());
    console.log(usdcWithFee);
    let amounts = await router.getAmountsOut(usdcWithFee, path);
    console.log(amounts);

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, zeroAddress, 1, _1kether, 0, {
        value: amounts[1],
      });

    console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));
    console.log(
      "USER11 BNB balance",
      await ethers.provider.getBalance(user11.address)
    );
  });
  it("13. NEW PRIMARY TESTING with USDC", async function () {
    const {
      rwa,
      partners,
      shares,
      user13,
      user14,
      rwaMarketplace,
      wbnb,
      buylp,
      stay,
      usdc,
      lp,
      user1,
      router,
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
      user10,
      _5ether,
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
      rock,
    } = await loadFixture(deployContractsFixture);

    console.log(
      "OWNER BALANCE START",
      await ethers.provider.getBalance(deployer.address),
      "BNB"
    );
    const property1 = await rwa.getProperty(1);
    const property2 = await rwa.getProperty(2);
    const property3 = await rwa.getProperty(3);
    const property4 = await rwa.getProperty(4);
    const property5 = await rwa.getProperty(5);
    const property6 = await rwa.getProperty(6);

    console.log("Property ID 1", property1);
    console.log("Property ID 2", property2);
    console.log("Property ID 3", property3);
    console.log("Property ID 4", property4);
    console.log("Property ID 5", property5);
    // console.log(await rwa.getProperty(2));
    // console.log("here1");

    console.log("++++++++STARTING PRIMARY SALE++++++++");
    // console.log(await rwaMarketplace.getPrimarySale(1));
    // await rwaMarketplace.startPrimarySale(1);
    // await rwaMarketplace.endPrimarySale(1);
    await rwa.connect(user1).setApprovalForAll(rwaMarketplace, true);
    console.log(await rwaMarketplace.getPrimarySale(1));

    console.log("Primary sale on for id 1 and 3");
    console.log(await rwa.balanceOf(user1.address, 1));

    await rwaMarketplace
      .connect(user1)
      .startSecondarySale(1, 10, _1ether, 17900867529);
    await rwaMarketplace.startPrimarySale(3);
    // await rwaMarketplace.startPrimarySale(5);
    console.log(await rwaMarketplace.getPrimarySale(1));
    console.log(await rwaMarketplace.getPrimarySale(3));

    console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));
    console.log(
      "USER11 BNB balance",
      await ethers.provider.getBalance(user11.address)
    );
    console.log("USER11 buying in 1st campaign ID 1");

    const path = [USDC, wbnb];

    // Call the getAmountsOut function
    // console.log(await rwa.getProperty(1));
    let fee = await rwaMarketplace.getPlaformFee();
    console.log(fee);
    fee = Number(fee[0]) / 100;
    console.log(fee, "fee");
    let addedFee = (fee * ethers.formatEther(_1kether)) / 100;
    console.log(addedFee, "usdcwith fee");
    let usdcWithFee = _1kether + ethers.parseEther(addedFee.toString());
    console.log(usdcWithFee);
    let amounts = await router.getAmountsOut(usdcWithFee, path);
    console.log(amounts);

    await usdc.connect(user11).approve(rwaMarketplaceAddress, _10million);
    console.log(await rwa.getProperty(1));
    console.log(await rwa.balanceOf(user11.address, 1));

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, USDC, 1, usdcWithFee, 0, {
        value: "0",
      });

    console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));
    console.log(
      "USER11 BNB balance",
      await ethers.provider.getBalance(user11.address)
    );
    console.log(await rwa.getProperty(1));
    console.log(await rwa.balanceOf(user11.address, 1));
  });
  it("14. NEW PRIMARY TESTING with ROCK", async function () {
    const {
      rwa,
      partners,
      shares,
      user13,
      user14,
      rwaMarketplace,
      wbnb,
      buylp,
      stay,
      usdc,
      lp,
      user1,
      router,
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
      user10,
      _5ether,
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
      rock,
      rockAddress,
    } = await loadFixture(deployContractsFixture);

    console.log(
      "OWNER BALANCE START",
      await ethers.provider.getBalance(deployer.address),
      "BNB"
    );
    const property1 = await rwa.getProperty(1);
    const property2 = await rwa.getProperty(2);
    const property3 = await rwa.getProperty(3);
    const property4 = await rwa.getProperty(4);
    const property5 = await rwa.getProperty(5);
    const property6 = await rwa.getProperty(6);

    console.log("Property ID 1", property1);
    console.log("Property ID 2", property2);
    console.log("Property ID 3", property3);
    console.log("Property ID 4", property4);
    console.log("Property ID 5", property5);
    // console.log(await rwa.getProperty(2));
    // console.log("here1");

    console.log("++++++++STARTING PRIMARY SALE++++++++");

    console.log("Primary sale on for id 1 and 3");
    await rwaMarketplace.startPrimarySale(1);
    await rwaMarketplace.startPrimarySale(3);
    // await rwaMarketplace.startPrimarySale(5);
    console.log(await rwaMarketplace.getPrimarySale(1));
    console.log(await rwaMarketplace.getPrimarySale(3));

    console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));
    console.log(
      "USER11 BNB balance",
      await ethers.provider.getBalance(user11.address)
    );
    console.log("USER11 buying in 1st campaign ID 1");

    await rock.connect(user11).setApprovalForAll(rwaMarketplaceAddress, true);

    const path = [USDC, wbnb];

    // Call the getAmountsOut function
    // console.log(await rwa.getProperty(1));
    let fee = await rwaMarketplace.getPlaformFee();
    console.log(fee);
    fee = Number(fee[0]) / 100;
    console.log(fee, "fee");
    let addedFee = (fee * ethers.formatEther(_1kether)) / 100;
    console.log(addedFee, "usdcwith fee");
    let usdcWithFee = _1kether + ethers.parseEther(addedFee.toString());
    console.log(usdcWithFee);
    let amounts = await router.getAmountsOut(usdcWithFee, path);
    console.log(amounts);

    await usdc.connect(user11).approve(rwaMarketplaceAddress, _10million);
    console.log(await rock.walletOfOwner(user11.address), "rockk");
    console.log(await rwa.getProperty(1));
    console.log(await rwa.balanceOf(user11.address, 1));

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, rockAddress, 1, 0, 2, {
        value: "0",
      });

    console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));
    console.log(
      "USER11 BNB balance",
      await ethers.provider.getBalance(user11.address)
    );
    console.log(await rwa.getProperty(1));
    console.log(await rwa.balanceOf(user11.address, 1));
    console.log(await rock.walletOfOwner(user11.address), "rockk");
  });
  it("15. referrral", async function () {
    const {
      rwa,
      partners,
      shares,
      user13,
      user14,
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

    await rwaMarketplace.startPrimarySale(1);

    console.log("her3");

    await usdc.connect(user11).approve(rwaMarketplaceAddress, _10million);
    console.log(
      await usdc.balanceOf(user12.address),
      "USDC of referrer before"
    );
    console.log(await usdc.balanceOf(user11.address), "USDC of BUYER before");

    // await rwaMarketplace.addExclusiveReferralBips(user1.address, 10);
    // console.log(await ethers.provider.getBalance(user11.address), "BNB");
    // console.log(await usdc.balanceOf(user11.address), "USDC");
    await rwaMarketplace.connect(user11).addReferral(user12);
    // await rwaMarketplace.addExclusiveReferralBips(user12.address, 2000);

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, usdc, 1, _1kether, 0, {
        value: 0,
      });

    console.log(await usdc.balanceOf(user12.address), "USDC of referrer after");
    console.log(await usdc.balanceOf(user11.address), "USDC of BUYER after ");

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, usdc, 1, _1kether, 0, {
        value: 0,
      });

    console.log(
      await usdc.balanceOf(user12.address),
      "USDC of referrer after 2"
    );
    console.log(await usdc.balanceOf(user11.address), "USDC of BUYER after 2");
    // await rwaMarketplace.connect(user11).addReferral(user12);
    // await rwaMarketplace.connect(user13).addReferral(user14);
    // await rwaMarketplace.changePlatformFee(1000, 0, 2000);
    // await rwaMarketplace
    //   .connect(user13)
    //   .buyPrimaryShares(user13.address, zeroAddress, 2, 1, {
    //     value: ethers.parseEther("4"),
    //   });
    // console.log(await usdc.balanceOf(user14.address), "USER 14");

    // await rwaMarketplace
    //   .connect(user11)
    //   .buyPrimaryShares(user11.address, zeroAddress, 1, 1, {
    //     value: ethers.parseEther("2"),
    //   });

    // console.log(await ethers.provider.getBalance(user11.address), "BNB");

    // console.log(await usdc.balanceOf(user11.address), "USDC");

    // console.log(await rwa.balanceOf(user11.address, 1), "SHARES USER11");
    // console.log(await rwa.balanceOf(user12.address, 2), "SHARES USER12");

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
    // await rwaMarketplace.changePlatformFee(1000,0,0)

    // await rwaMarketplace
    // .connect(user12)
    // .buyPrimaryShares(user12.address, zeroAddress, 1, 1, {value:_2kether});
  });
  it("16. manager testing", async function () {
    const {
      rwa,
      partners,
      shares,
      user13,
      user14,
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
      user15,
    } = await loadFixture(deployContractsFixture);

    await rwaMarketplace.startPrimarySale(1);
    console.log(await rwa.balanceOf(user12.address, 1));
    console.log(await rwaMarketplace.getManagerAddress());

    await rwaMarketplace.changeManager(user1.address);
    // await rwaMarketplace.endPrimarySale(1);
    // await rwaMarketplace
    //   .connect(user1)
    //   .sendPrimaryShares(user12.address, 1, 100);

    console.log(await rwa.balanceOf(user12.address, 1));
    console.log(await rwaMarketplace.getManagerAddress());
    console.log(await user14.address);
    console.log(await user1.address);
  });
  it.only("17. manager testing", async function () {
    const {
      rwa,
      partners,
      shares,
      user13,
      user14,
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
      user15,
    } = await loadFixture(deployContractsFixture);
    console.log(await rwa.balanceOf(user12.address, 1));
    console.log(await rwa.balanceOf(user12.address, 2));
    console.log(await rwa.balanceOf(user12.address, 3));
    console.log(await rwa.isRegistered(user3.address))
       console.log(await rwa.balanceOf(user3.address, 1));


    console.log("hjere");
    console.log(await rwa.getProperty(1));

    await rwa.connect(user1).setAuthorizedOperator(user1.address, true);
    console.log("here")
    await rwaMarketplace.startPrimarySale(1); 

  
console.log(deployer.address)
    await rwa.connect(user1).safeBatchTransferFrom(
      user1.address,
      user12.address,
      [1, 2, 3],
      [4, 1, 1],
      "0x6b697373206d7920617373"
    );
    console.log(await rwa.balanceOf(user12.address, 1));
    console.log(await rwa.balanceOf(user12.address, 2));
    console.log(await rwa.balanceOf(user12.address, 3));
    console.log(await rwa.getProperty(1));
    console.log(await rwa.isRegistered(user3.address))
  });
});

//1 list and buy with bnb test calcukations
//2 buy with usdc and test the calculations
//3
