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
    const stayWallet = "0xF72817AD1e1Ac47A15c9F4A7CCA16E76FE428F6e"

    // Create provider (e.g., local Hardhat node, testnet, or mainnet)
    const provider = ethers.provider;
    console.log(await provider.getBalance(deployer.address));

    // Create wallet instances
    const [
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
     const tx9= await deployer.sendTransaction({
        to:stayWallet,
        value: amountToSend,
      });

      await tx9.wait();
    const _1000ether = ethers.parseEther("1000");
    const _100ether = ethers.parseEther("100");
    const _500ether = ethers.parseEther("500");
    const _10ether = ethers.parseEther("10");
    const _2ether = ethers.parseEther("2");
    const _3kether = ethers.parseEther("3000");
    const _4kether = ethers.parseEther("4000");
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
    const rwa = await RWA.connect(deployer2).deploy();
    await rwa.waitForDeployment();
    rwaAddress = rwa.target;

    const RWAMarketplace = await ethers.getContractFactory("RWAMarketplace");
    const rwaMarketplace = await RWAMarketplace.connect(deployer2).deploy(
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
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [stayWallet],
    });

    const staySigner = await ethers.getSigner(stayWallet)
    const signerChris = await ethers.getSigner(chris);
    const usdcSigner = await ethers.getSigner(imperUSDC);

    await rock
      .connect(signerChris)
      .safeTransferRocks([1260, 1257, 283], user11.address);

    console.log(await rock.balanceOf(user11.address));

    await usdc.connect(usdcSigner).transfer(deployer.address, _20kether);
    await usdc.connect(usdcSigner).transfer(user1.address, _20kether);
    await usdc.connect(usdcSigner).transfer(user11.address, _20kether);

    await stay.connect(staySigner).transfer(user11.address,_10kether)
    await rwa.connect(deployer2).initialize(rwaMarketplaceAddress);
    console.log("INITIALIZED");
    console.log("here");

    console.log(partners13);
    await rwa
      .connect(deployer2)
      .registerProperty(
        partners79,
        shares13,
        1000,
        _1kether,
        "https://uri.com/testing-the-shit-outta-this1"
      );
    await rwa.registerProperty(
      partners46,
      shares46,
      2521,
      _500ether,
      "https://uri.com/testing-the-shit-outta-this2"
    );
    await rwa.registerProperty(
      partners79,
      shares79,
      2992,
      _500ether,
      "https://uri.com/testing-the-shit-outta-this3"
    );
    // await rwa.registerProperty(
    //   partners1011,
    //   shares1011,
    //   1001,
    //   _1kether,
    //   "https://uri.com/testing-the-shit-outta-this4"
    // );
    // await rwa.registerProperty(
    //   partners1213,
    //   shares1213,
    //   509,
    //   _1kether,
    //   "https://uri.com/testing-the-shit-outta-this5"
    // );

    console.log("Properties registered");
    let shares = 0;
    let partners = 0;

    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy(rwaAddress, _10ether);
    await voting.waitForDeployment();
    const votingAddress = voting.target;

    const Rent = await ethers.getContractFactory("Rent");
    const rent = await Rent.deploy(rwaAddress, votingAddress);
    await rent.waitForDeployment();
    const rentAddress = rent.target;

    return {
      rent,
      voting,
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
      _4kether,
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
      _3kether,
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
      deployer2,
      votingAddress,
      _1000ether,
      rwaAddress,
      rwaMarketplaceAddress,
      user10,
      wbnb,
      _2ether,
    };
  }

  it("1.BULKING BUYING USDC", async function () {
    const {
      rwa,
      votingAddress,
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
      rent,
      voting,
    } = await loadFixture(deployContractsFixture);
    console.log("RUN");
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
    // console.log("Property ID 3", property3);
    // console.log("Property ID 4", property4);
    // console.log("Property ID 5", property5);
    // console.log(await rwa.getProperty(2));
    // console.log("here1");

    console.log("++++++++STARTING PRIMARY SALE++++++++");

    console.log("Primary sale on for id 1 and 3");
    await rwaMarketplace.startPrimarySale(1);
    // await rwaMarketplace.startPrimarySale(2);
    // await rwaMarketplace.startPrimarySale(5);
    // await rwaMarketplace.startPrimarySale(3);
    // await rwaMarketplace.startPrimarySale(4);
    // console.log(await rwaMarketplace.getPrimarySale(1));
    // console.log(await rwaMarketplace.getPrimarySale(2));

    console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));
    console.log(
      "USER11 BNB balance",
      await ethers.provider.getBalance(user11.address)
    );
    console.log("USER11 buying in 1st campaign ID 1");

    await rock.connect(user11).setApprovalForAll(rwaMarketplaceAddress, true);

    // const path = [USDC, wbnb];

    // Call the getAmountsOut function
    // console.log(await rwa.getProperty(1));
    // let fee = await rwaMarketplace.getPlaformFee();
    // console.log(fee);
    // fee = Number(fee[0]) / 100;
    // console.log(fee, "fee");
    // let addedFee = (fee * ethers.formatEther(_1kether)) / 100;
    // console.log(addedFee, "usdcwith fee");
    // let usdcWithFee = _1kether + ethers.parseEther(addedFee.toString());
    // console.log(usdcWithFee);
    // let amounts = await router.getAmountsOut(usdcWithFee, path);
    // console.log(amounts);

    await usdc.connect(user11).approve(rwaMarketplaceAddress, _10million);
    await stay.connect(user11).approve(votingAddress, _10million);
    // console.log(await rock.walletOfOwner(user11.address), "rockk");
    // console.log(await rwa.getProperty(1));
    console.log(await rwa.balanceOf(user11.address, 1));

    // await rwaMarketplace
    //   .connect(user11)
    //   .buyPrimaryShares(user11.address, usdc, 1, 0, 2, {
    //     value: "0",
    //   });
    console.log("USER11 usdc balance", await usdc.balanceOf(user14.address));

    await rwaMarketplace
      .connect(user11)
      .bulkBuyPrimaryShares(user11.address, USDC, user14.address, [
        { _propertyId: 1, _usdcAmount: _2kether },
        // { _propertyId: 3, _usdcAmount: _2kether },
        // { _propertyId: 2, _usdcAmount: _2kether },
        // { _propertyId: 4, _usdcAmount: _2kether },
        // { _propertyId: 5, _usdcAmount: _2kether },
      ]);

    console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));

    await rwaMarketplace.endPrimarySale(1);
    const proposal = "0x6b697373206d7920617373";
    console.log("1");

    console.log(await stay.balanceOf(user11.address));
    await stay.connect(user11).approve(votingAddress, _10million);

    await voting.connect(user11).addProposal(1, proposal);
    console.log("1");

    await rent.addRent(1, _10ether);
    console.log("1");

    await voting.connect(user2).vote(1, true);
    console.log("1");

    await rent.connect(user11).withdrawRent(1);
    console.log("1");

    // console.log(
    //   "USER11 BNB balance",
    //   await ethers.provider.getBalance(user11.address)
    // );
    // console.log(await rwa.getProperty(1));
    console.log(await rwa.balanceOf(user11.address, 1));
    console.log(await rwa.balanceOf(user11.address, 2));
    console.log(
      "USER11 usdc balance referree",
      await usdc.balanceOf(user14.address)
    );

    // console.log(await rock.walletOfOwner(user11.address), "rockk");
  });

  it.only("2.BULKING BUYING BNB", async function () {
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
      _2ether,
      _3kether,
      _4kether,
    } = await loadFixture(deployContractsFixture);
    console.log("RUN");
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
    // const property6 = await rwa.getProperty(6);

    console.log("Property ID 1", property1);
    console.log("Property ID 2", property2);
    console.log("Property ID 3", property3);
    console.log("Property ID 4", property4);
    console.log("Property ID 5", property5);
    // console.log("Property ID 6", property6);
    // console.log(await rwa.getProperty(2));
    // console.log("here1");

    console.log("++++++++STARTING PRIMARY SALE++++++++");

    await rwaMarketplace.startPrimarySale(1);
    await rwaMarketplace.startPrimarySale(2);
    await rwaMarketplace.startPrimarySale(3);
    // await rwaMarketplace.startPrimarySale(4);
    // await rwaMarketplace.startPrimarySale(5);
    // await rwaMarketplace.startPrimarySale(6);

    console.log("Primary sale on for 5 properties");
    // console.log(await rwaMarketplace.getPrimarySale(1));
    // console.log(await rwaMarketplace.getPrimarySale(2));

    console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));
    console.log(
      "USER11 BNB balance",
      await ethers.provider.getBalance(user11.address)
    );

    console.log("USER14 usdc balance", await usdc.balanceOf(user14.address));
    console.log(
      "USER14 BNB balance",
      await ethers.provider.getBalance(user12.address)
    );

    console.log("USER11 and USER12 buying ID 1,2,3,4,5,6");

    // await rock.connect(user11).setApprovalForAll(rwaMarketplaceAddress, true);

    // const path = [USDC, wbnb];

    // Call the getAmountsOut function
    // console.log(await rwa.getProperty(1));
    // let fee = await rwaMarketplace.getPlaformFee();
    // console.log(fee);
    // fee = Number(fee[0]) / 100;
    // console.log(fee, "fee");
    // let addedFee = (fee * ethers.formatEther(_1kether)) / 100;
    // console.log(addedFee, "usdcwith fee");
    // let usdcWithFee = _1kether + ethers.parseEther(addedFee.toString());
    // console.log(usdcWithFee);
    // let amounts = await router.getAmountsOut(usdcWithFee, path);
    // console.log(amounts);

    await usdc.connect(user11).approve(rwaMarketplaceAddress, _10million);
    await usdc.connect(user12).approve(rwaMarketplaceAddress, _10million);

    // console.log(await rwa.balanceOf(user11.address, 1));
    // console.log(await rwa.balanceOf(user11.address, 2));
    // console.log(await rwa.balanceOf(user11.address, 3));
    // console.log(await rwa.balanceOf(user11.address, 4));
    // console.log(await rwa.balanceOf(user11.address, 5));
    // console.log(await rwa.balanceOf(user11.address, 6));

    // console.log(await rwa.balanceOf(user12.address, 1));
    // console.log(await rwa.balanceOf(user12.address, 2));
    // console.log(await rwa.balanceOf(user12.address, 3));
    // console.log(await rwa.balanceOf(user12.address, 4));
    // console.log(await rwa.balanceOf(user12.address, 5));
    // console.log(await rwa.balanceOf(user12.address, 6));

    // console.log(await rock.walletOfOwner(user11.address), "rockk");
    // console.log(await rwa.getProperty(1));

    await rwaMarketplace
      .connect(user11)
      .buyPrimaryShares(user11.address, usdc, 1, 0, 0,  user14.addresss, {
        value: "0",
      });

    // console.log("USER11 usdc balance", await usdc.balanceOf(user14.address));
    console.log(
      "referral balance before",
      await usdc.balanceOf(user14.address)
    );

    // await rwaMarketplace.addExclusiveReferralBips(user14.address, 1000);
    // await rwaMarketplace.updateAgentWhitelistStatus(user14.address, true);
    // await rwaMarketplace.connect(user11).bulkBuyPrimaryShares(
    //   user11.address,
    //   USDC,
    //   user14.address,
    //   [
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     { _propertyId: 2, _usdcAmount: _1kether },
    //     { _propertyId: 3, _usdcAmount: _1kether },
    //     // { _propertyId: 4, _usdcAmount: _2kether },
    //     // { _propertyId: 5, _usdcAmount: _2kether },
    //     // { _propertyId: 6, _usdcAmount: _2kether },
    //   ],
    //   { value: 0 }
    // );

    console.log("referral balance after", await usdc.balanceOf(user14.address));

    console.log("REFERRL BIPS UPDATED");

    // await rwaMarketplace.connect(user11).bulkBuyPrimaryShares(
    //   user11.address,
    //   USDC,
    //   user14.address,
    //   [
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     { _propertyId: 3, _usdcAmount: _1kether },
    //     { _propertyId: 2, _usdcAmount: _1kether },
    //     // { _propertyId: 4, _usdcAmount: _2kether },
    //     // { _propertyId: 5, _usdcAmount: _2kether },
    //     // { _propertyId: 6, _usdcAmount: _2kether },
    //   ],
    //   { value: 0 }
    // );

    // await rwaMarketplace.updateAgentWhitelistStatus(user14.address, true);

    // await rwaMarketplace.connect(user11).bulkBuyPrimaryShares(
    //   user11.address,
    //   USDC,
    //   user14.address,
    //   [
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     // { _propertyId: 4, _usdcAmount: _2kether },
    //     // { _propertyId: 5, _usdcAmount: _2kether },
    //     // { _propertyId: 6, _usdcAmount: _2kether },
    //   ],
    //   { value: 0 }
    // );
    // console.log(
    //   "USER11 usdc balance after",
    //   await usdc.balanceOf(user11.address)
    // );

    // console.log(
    //   "USER11 BNB balance after",
    //   await ethers.provider.getBalance(user11.address)
    // );

    // await rwaMarketplace.connect(user11).bulkBuyPrimaryShares(
    //   user11.address,
    //   USDC,
    //   user14.address,
    //   [
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     // { _propertyId: 4, _usdcAmount: _2kether },
    //     // { _propertyId: 5, _usdcAmount: _2kether },
    //     // { _propertyId: 6, _usdcAmount: _2kether },
    //   ],
    //   { value: 0 }
    // );

    console.log("USER BOUGHT THE STUFFF+++++++");

    console.log(
      "USER11 usdc balance after",
      await usdc.balanceOf(user11.address)
    );

    console.log(
      "USER11 BNB balance after",
      await ethers.provider.getBalance(user11.address)
    );

    // console.log("referral balance after", await usdc.balanceOf(user13.address));
    console.log(
      "referral balance after 2",
      await usdc.balanceOf(user14.address)
    );

    // console.log(await rwa.getProperty(1));
    // console.log(
    //   "USER11 balance of property 1",
    //   await rwa.balanceOf(user11.address, 1)
    // );
    // console.log(
    //   "USER11 balance of property 3",
    //   await rwa.balanceOf(user11.address, 3)
    // );
    // console.log(
    //   "USER14 usdc balance referree",
    //   await usdc.balanceOf(user14.address)
    // );

    // console.log(await rock.walletOfOwner(user11.address), "rockk");
  });

  it("3. BURNIGN TEST", async function () {
    const {
      rwa,
      partners,
      shares,
      user13,
      user14,
      rwaMarketplace,
      wbnb,
      buylp,
      deployer2,
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
      _2ether,
      _3kether,
      _4kether,
    } = await loadFixture(deployContractsFixture);
    console.log("RUN");
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
    // const property6 = await rwa.getProperty(6);

    console.log("Property ID 1", property1);
    console.log("Property ID 2", property2);
    console.log("Property ID 3", property3);
    console.log("Property ID 4", property4);
    console.log("Property ID 5", property5);
    // console.log("Property ID 6", property6);
    // console.log(await rwa.getProperty(2));
    // console.log("here1");

    console.log("++++++++STARTING PRIMARY SALE++++++++");

    await rwaMarketplace.connect(deployer2).startPrimarySale(1);
    // await rwaMarketplace.startPrimarySale(2);
    // await rwaMarketplace.startPrimarySale(3);
    // await rwaMarketplace.startPrimarySale(4);
    // await rwaMarketplace.startPrimarySale(5);
    // await rwaMarketplace.startPrimarySale(6);

    await rock.connect(user11).setApprovalForAll(rwaMarketplaceAddress, true);

    console.log("Primary sale on for 5 properties");
    // console.log(await rwaMarketplace.getPrimarySale(1));
    // console.log(await rwaMarketplace.getPrimarySale(2));

    console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));
    console.log(
      "USER11 BNB balance",
      await ethers.provider.getBalance(user11.address)
    );

    console.log("USER12 usdc balance", await usdc.balanceOf(user12.address));
    console.log(
      "USER12 BNB balance",
      await ethers.provider.getBalance(user12.address)
    );

    // console.log("USER11 and USER12 buying ID 1,2,3,4,5,6");

    await rock.connect(user11).setApprovalForAll(rwaMarketplaceAddress, true);

    // const path = [USDC, wbnb];

    // Call the getAmountsOut function
    // console.log(await rwa.getProperty(1));
    // let fee = await rwaMarketplace.getPlaformFee();
    // console.log(fee);
    // fee = Number(fee[0]) / 100;
    // console.log(fee, "fee");
    // let addedFee = (fee * ethers.formatEther(_1kether)) / 100;
    // console.log(addedFee, "usdcwith fee");
    // let usdcWithFee = _1kether + ethers.parseEther(addedFee.toString());
    // console.log(usdcWithFee);
    // let amounts = await router.getAmountsOut(usdcWithFee, path);
    // console.log(amounts);

    await usdc.connect(user11).approve(rwaMarketplaceAddress, _10million);
    await usdc.connect(user12).approve(rwaMarketplaceAddress, _10million);

    // console.log(await rwa.balanceOf(user11.address, 1));
    // console.log(await rwa.balanceOf(user11.address, 2));
    // console.log(await rwa.balanceOf(user11.address, 3));
    // console.log(await rwa.balanceOf(user11.address, 4));
    // console.log(await rwa.balanceOf(user11.address, 5));
    // console.log(await rwa.balanceOf(user11.address, 6));

    // console.log(await rwa.balanceOf(user12.address, 1));
    // console.log(await rwa.balanceOf(user12.address, 2));
    // console.log(await rwa.balanceOf(user12.address, 3));
    // console.log(await rwa.balanceOf(user12.address, 4));
    // console.log(await rwa.balanceOf(user12.address, 5));
    // console.log(await rwa.balanceOf(user12.address, 6));

    console.log(await rock.walletOfOwner(user11.address), "rockk");
    // console.log(await rwa.getProperty(1));

    // await rwaMarketplace
    //   .connect(user11)
    //   .buyPrimaryShares(
    //     user11.address,
    //     rockAddress,
    //     1,
    //     _2kether,
    //     2,
    //     zeroAddress,
    //     {
    //       value: 0,
    //     }
    //   );

    console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));
    // console.log(
    //   "referral balance before",
    //   await usdc.balanceOf(user14.address)
    console.log("curent supply", await stay.totalSupply());
    // );

    // await rwaMarketplace.connect(deployer2).endPrimarySale(1);
    // await rwa.connect(deployer2).setApprovalForAll(rwaMarketplaceAddress, true);
    // await rwaMarketplace.connect(deployer2).startSecondarySale(1, 8, _1kether, 0);

    // await rwaMarketplace
    //   .connect(user11)
    //   .buySecondaryShares(user11.address, USDC, 1, _1kether, {
    //     value: 0,
    //   });

    await rwaMarketplace.connect(user11).bulkBuyPrimaryShares(
      user11.address,
      zeroAddress,
      user14.address,
      [
        { _propertyId: 1, _usdcAmount: _1kether },
        { _propertyId: 2, _usdcAmount: _500ether },
        // { _propertyId: 1, _usdcAmount: _1kether },
        // { _propertyId: 4, _usdcAmount: _2kether },
        // { _propertyId: 5, _usdcAmount: _2kether },
        // { _propertyId: 6, _usdcAmount: _2kether },
      ],
      { value: _5ether }
    );

    //  await rwaMarketplace
    //   .connect(user11)
    //   .buyPrimaryShares(user11.address, zeroAddress, 1, _1kether, 0, zeroAddress, {
    //     value: _5ether,
    //   });

    // await rwaMarketplace.updateAgentWhitelistStatus(user14.address, true);

    //  console.log(
    //   "referral balance after",
    //   await usdc.balanceOf(user14.address)
    // );
    // await rwaMarketplace.connect(user11).bulkBuyPrimaryShares(
    //   user11.address,
    //   USDC,
    //   user14.address,
    //   [
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     { _propertyId: 3, _usdcAmount: _1kether },
    //     { _propertyId: 2, _usdcAmount: _1kether },
    //     // { _propertyId: 4, _usdcAmount: _2kether },
    //     // { _propertyId: 5, _usdcAmount: _2kether },
    //     // { _propertyId: 6, _usdcAmount: _2kether },
    //   ],
    //   { value: 0 }
    // );
    //  await rwaMarketplace.connect(user11).bulkBuyPrimaryShares(
    //   user11.address,
    //   USDC,
    //   user13.address,
    //   [
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     // { _propertyId: 4, _usdcAmount: _2kether },
    //     // { _propertyId: 5, _usdcAmount: _2kether },
    //     // { _propertyId: 6, _usdcAmount: _2kether },
    //   ],
    // { value: 0 }
    // );
    console.log(
      "USER11 usdc balance after",
      await usdc.balanceOf(user11.address)
    );

    console.log("curent supply", await stay.totalSupply());

    // console.log(
    //   "USER11 BNB balance after",
    //   await ethers.provider.getBalance(user11.address)
    // );

    //  await rwaMarketplace.connect(user11).bulkBuyPrimaryShares(
    //   user11.address,
    //   USDC,
    //   user14.address,
    //   [
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     { _propertyId: 1, _usdcAmount: _1kether },
    //     // { _propertyId: 4, _usdcAmount: _2kether },
    //     // { _propertyId: 5, _usdcAmount: _2kether },
    //     // { _propertyId: 6, _usdcAmount: _2kether },
    //   ],
    //   { value: 0 }
    // );

    // console.log("USER BOUGHT THE STUFFF+++++++");

    // console.log(
    //   "USER11 usdc balance after",
    //   await usdc.balanceOf(user11.address)
    // );

    // console.log(
    //   "USER11 BNB balance after",
    //   await ethers.provider.getBalance(user11.address)
    // );

    // console.log("referral balance after", await usdc.balanceOf(user13.address));
    // console.log("referral balance after 2", await usdc.balanceOf(user14.address));

    // // console.log(await rwa.getProperty(1));
    console.log(await rock.walletOfOwner(user11.address), "rockk");

    console.log(
      "USER11 balance of property 1",
      await rwa.balanceOf(user11.address, 1)
    );
    // console.log("USER11 balance of property 3",await rwa.balanceOf(user11.address, 3));
    // console.log(
    //   "USER14 usdc balance referree",
    //   await usdc.balanceOf(user14.address)
    // );

    // console.log(await rock.walletOfOwner(user11.address), "rockk");
  });
});

//1 list and buy with bnb test calcukations
//2 buy with usdc and test the calculations
//3
