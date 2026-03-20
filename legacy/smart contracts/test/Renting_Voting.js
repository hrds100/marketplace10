const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");
const textEncoder = new TextEncoder();

describe("RENTING VOTING", function () {
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
    // Create provider (e.g., local Hardhat node, testnet, or mainnet)
    const provider = ethers.provider;
    console.log(await provider.getBalance(deployer.address));

    // Create wallet instances
    const [
      user4,
      user5,
      user6,
      user7,
      user8,
      user9,
      user11,
      user10,
      user3,
      user1,
      user2,
      deployer2,
      user12,
      user13,
      user14,
      user15,
    ] = privateKeys.map((key) => new ethers.Wallet(key, provider));
    const amountToSend = ethers.parseEther("2000");
    for (let i = 9; i < 12; i++) {
      const wallet = new ethers.Wallet(privateKeys[i], provider);

      const tx = await deployer.sendTransaction({
        to: wallet.address,
        value: amountToSend,
      });

      await tx.wait();
      console.log(`✅ Funded ${wallet.address} with 10 ETH/BNB`);
    }
    const managerAddress = user14.address;

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

    const zeroAddress = "0x0000000000000000000000000000000000000000";

    const stayAddress = "0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0";
    const lpAddress = "0x2397c1722ccb6934becf579351685a56030ea8f7";
    const imperUSDC = "0x554B52bF57b387fD09D6644368C5A8AAcaAf5aE0";
    const chris = "0x6eb06e1078cfbdCF9a3387584a8D934D85Ea1436";
    const USDC = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";
    const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    let rwaAddress;
    let rwaMarketplaceAddress;
    const _30days = 2592000;
    const usdc = await ethers.getContractAt("USDC", USDC);
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
      deployer,
      managerAddress,
      250,
      150,
      500
    );
    await rwaMarketplace.waitForDeployment();
    rwaMarketplaceAddress = rwaMarketplace.target;
    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy(rwaAddress, _10ether);
    await voting.waitForDeployment();
    const votingAddress = voting.target;

    const Rent = await ethers.getContractFactory("Rent");
    const rent = await Rent.deploy(rwaAddress, votingAddress);
    await rent.waitForDeployment();
    const rentAddress = rent.target;

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

    await usdc.connect(usdcSigner).transfer(deployer.address, _20kether);
    await usdc.connect(usdcSigner).transfer(user12.address, _20kether);
    await stay.connect(signerChris).transfer(user1.address, _10kether);
    await stay.connect(signerChris).transfer(user1.address, _10kether);
    await stay.connect(signerChris).transfer(user1.address, _10kether);
    await stay.connect(signerChris).transfer(user1.address, _10kether);
    await stay.connect(signerChris).transfer(user1.address, _10kether);
    await stay.connect(signerChris).transfer(user1.address, _10kether);
    await stay.connect(signerChris).transfer(user1.address, _10kether);
    await stay.connect(signerChris).transfer(user1.address, _10kether);
    await stay.connect(signerChris).transfer(user1.address, _10kether);
    await stay.connect(signerChris).transfer(user1.address, _10kether);
    await stay.connect(signerChris).transfer(user1.address, _10kether);
    await stay.connect(signerChris).transfer(user2.address, _10kether);
    await stay.connect(signerChris).transfer(user4.address, _10kether);
    await stay.connect(signerChris).transfer(user3.address, _10kether);
    await stay.connect(signerChris).transfer(user3.address, _10kether);
    await stay.connect(signerChris).transfer(user3.address, _10kether);

    await rwa.connect(deployer2).initialize(rwaMarketplaceAddress);

    console.log("INITIALIZED", user1.address);

    const partners13 = [user1.address, user2.address, user3.address];
    const partners46 = [user3.address, user4.address, user5.address];
    const partners79 = [user7.address, user8.address, user9.address];
    const partners1011 = [user10.address, user11.address];
    const partners1213 = [user12.address, user13.address];
    const shares13 = [15, 25, 100];
    const shares46 = [59, 51, 102];
    const shares79 = [90, 78, 10];
    const shares1011 = [5];
    const shares1213 = [9, 52];
    await rwa
      .connect(deployer2)
      .registerProperty(
        partners13,
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

    return {
      rentAddress,
      rent,
      votingAddress,
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
      _30days,
      _185ether,
      user11,
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
      deployer2,
    };
  }

  it.only("1. Voting ", async function () {
    const {
      rentAddress,
      rent,
      rwa,
      voting,
      votingAddress,
      partners,
      _30days,
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

    console.log("Voting SHizzzz");

    await stay.connect(user1).approve(votingAddress, _10million);
    await usdc.connect(user1).approve(votingAddress, _10million);
    await usdc.approve(rentAddress, _10million);
    await stay.connect(user2).approve(votingAddress, _10million);
    // await stay.connect(user3).approve(votingAddress, _10million);

    // console.log(await stay.balanceOf(0xd70ce58AFCBBD26E20584781b40af341086b4044))

    const proposal = "0x6b697373206d7920617373";
    const proposal2 = "0x6e6f20706c6973206d696e65206f6e6c69";
    // await voting.connect(user4).addProposal(2, proposal);
    console.log(await rwa.balanceOf(user1.address, 1));
    await voting.connect(user1).addProposal(1, proposal2);

    // await network.provider.request({
    //   method: "evm_increaseTime",
    //   params: [_30days - 25],
    // });

    // await network.provider.request({
    //   method: "evm_mine",
    //   params: [],
    // });
    // console.log(await rwa.getProperty(1));
    // await rwa.safeTransferFrom

    await voting.connect(user1).vote(1, true);
    console.log("here");
    // console.log("1");
    // console.log(await voting.getProposal(1));
    // await voting.connect(user1).addProposal(1, proposal);
    // // await voting.connect(user1).vote(1, true);
    // console.log("2");

    // await voting.connect(user2).vote(1, false);
    // console.log("3");

    // await voting.connect(user4).vote(2, false);
    // console.log(await voting.getProposal(1));
    // console.log(await voting.getProposal(2));
    console.log(await rwa.balanceOf(user1.address,1),"prop")
    await rent.addRent(1, _100ether);
    console.log(await rent.isEligibleForRent(1, user1.address));
    await rent.connect(user1).withdrawRent(1);

    // await voting.addProposal(1, proposal);
    // console.log(await stay.balanceOf(user1.address));
  });
  it("2 replace. Voting ", async function () {
    const {
      rwa,
      voting,
      votingAddress,
      partners,
      _30days,
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
    console.log("Voting SHizzzz");

    const proposal = "0x6b697373206d7920617373";
    const proposal2 = "0x6e6f20706c6973206d696e65206f6e6c69";
    await stay.connect(user2).approve(votingAddress, _10million);
    await stay.connect(user3).approve(votingAddress, _10million);
    // await usdc.connect(user2).approve(rwaMarketplaceAddress, _10million);
    await voting.connect(user3).addProposal(1, proposal);
    console.log("here");

    await stay.connect(user3).approve(votingAddress, _10million);
    await rwa.connect(user2).setApprovalForAll(rwaMarketplaceAddress, true);
    console.log("here");

    await rwaMarketplace
      .connect(user2)
      .startSecondarySale(1, 9, _5ether, 1727385238);

    console.log("here");
    await rwaMarketplace
      .connect(user3)
      .buySecondaryShares(1, 2, user3.address, zeroAddress, {
        value: _10ether,
      });

    await network.provider.request({
      method: "evm_increaseTime",
      params: [_30days - 1000],
    });

    await network.provider.request({
      method: "evm_mine",
      params: [],
    });
    await voting.connect(user2).vote(1, true);
    await voting.connect(user1).vote(1, false);
    console.log("ran till here");
    await voting.connect(user3).vote(1, false);
    await network.provider.request({
      method: "evm_increaseTime",
      params: [_30days],
    });

    await network.provider.request({
      method: "evm_mine",
      params: [],
    });

    console.log(await voting.getProposal(1));

    await voting.connect(user2).addProposal(1, proposal2);

    // console.log(await voting.getProposal(2));
    console.log(await voting.getProposalStatus(1));
    // console.log(await voting.getProposal(3));
  });
  it("3 voting FInale ", async function () {
    const {
      rwa,
      voting,
      votingAddress,
      partners,
      _30days,
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
    console.log("Voting SHizzzz");

    const proposal = "0x6b697373206d7920617373";
    const proposal2 = "0x6e6f20706c6973206d696e65206f6e6c69";
    await stay.connect(user2).approve(votingAddress, _10million);

    await voting.changeProposalFee(50);
    await stay.connect(user3).approve(votingAddress, _10million);
    // await usdc.connect(user2).approve(rwaMarketplaceAddress, _10million);
    await voting.connect(user3).addProposal(1, proposal);
    console.log("here");

    await stay.connect(user3).approve(votingAddress, _10million);
    console.log("here");

    await voting.connect(user2).vote(1, true);
    console.log(await voting.getProposalStatus(1));

    await network.provider.request({
      method: "evm_increaseTime",
      params: [_30days],
    });

    await network.provider.request({
      method: "evm_mine",
      params: [],
    });
    // await voting.connect(user1).vote(1, false);
    // console.log("ran till here");
    // await voting.connect(user3).vote(1, false);

    // console.log(await voting.getProposal(1));

    // await voting.connect(user2).addProposal(1, proposal2);

    // console.log(await voting.getProposal(2));
    console.log(await voting.getProposalStatus(1));
    // console.log(await voting.getProposal(3));
  });
  it("4 Renting ", async function () {
    const {
      rwa,
      rentAddress,
      rent,
      voting,
      votingAddress,
      partners,
      _30days,
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
      deployer2,
    } = await loadFixture(deployContractsFixture);

    const property1 = await rwa.getProperty(1);
    const property2 = await rwa.getProperty(2);
    const property3 = await rwa.getProperty(3);
    const property4 = await rwa.getProperty(4);
    const property5 = await rwa.getProperty(5);
    const property6 = await rwa.getProperty(6);

    // console.log("Property ID 1", property1);
    // console.log("Property ID 2", property2);
    // console.log("Property ID 3", property3);
    // console.log("Property ID 4", property4);
    // console.log("Property ID 5", property5);
    console.log("Voting SHizzzz");

    const proposal = "0x6b697373206d7920617373";
    const proposal2 = "0x6e6f20706c6973206d696e65206f6e6c69";
    await stay.connect(user2).approve(votingAddress, _10million);

    await stay.connect(user3).approve(votingAddress, _10million);
    await rwa.connect(user2).setApprovalForAll(rwaMarketplaceAddress, true);
    console.log("here");

    await rwaMarketplace.connect(deployer2).startPrimarySale(1);
    await rwaMarketplace
      .connect(user2)
      .buyPrimaryShares(zeroAddress, usdc, 1, 0, 2, {
        value: 0,
      });
    await rwaMarketplace.connect(deployer2).endPrimarySale(1);

    console.log(await rwa.balanceOf(user2.address, 1), "baaal");

    // await rwaMarketplace
    //   .connect(user2)
    //   .startSecondarySale(1, 1, _5ether, 1727385238);

    // await voting.changeProposalFee(50);
    await stay.connect(user3).approve(votingAddress, _10million);
    // await usdc.connect(user2).approve(rwaMarketplaceAddress, _10million);
    await voting.connect(user3).addProposal(1, proposal);
    await voting.connect(user3).addProposal(2, proposal);
    console.log("here");

    await stay.connect(user3).approve(votingAddress, _10million);
    await stay.connect(deployer).approve(votingAddress, _10million);
    console.log("here");

    await voting.connect(user2).vote(1, true);

    await voting.connect(user3).vote(2, true);
    // await voting.connect(deployer).vote(1, true);
    await voting.vote(1, true);
    console.log(await voting.getProposalStatus(1));

    await network.provider.request({
      method: "evm_increaseTime",
      params: [_30days - 1000],
    });

    await network.provider.request({
      method: "evm_mine",
      params: [],
    });
    await rwaMarketplace.buySecondaryShares(
      1,
      1,
      deployer.address,
      zeroAddress,
      {
        value: _10ether,
      }
    );

    console.log(await voting.getProposalStatus(1));
    await usdc.approve(rentAddress, _10million);

    console.log("RENTTT");
    console.log(
      "USER balance of property 1",
      await rwa.balanceOf(user11.address, 1)
    );

    console.log(await rwa.getProperty(1));
    await rent.addRent(1, _10ether);
    console.log("RENTTT1");

    await rent.addRent(2, _100ether);
    console.log(await rent.getRentDetails(2));

    // await network.provider.request({
    //   method: "evm_increaseTime",
    //   params: [_30days],
    // });

    // await network.provider.request({
    //   method: "evm_mine",
    //   params: [],
    // });
    // await rent.resetPropertyDetails(1);
    console.log("PROPERTY BALANCE");
    console.log(ethers.formatEther(await usdc.balanceOf(deployer.address)));
    await rent.withdrawRent(1);
    // await rent.withdrawRent(1);
    await rent.connect(user3).withdrawRent(2);
    console.log(ethers.formatEther(await usdc.balanceOf(user3.address)));

    // await rent.addRent(1, _100ether);
  });
  it("5 Renting voting again ", async function () {
    const {
      rwa,
      rentAddress,
      rent,
      voting,
      votingAddress,
      partners,
      _30days,
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

    const proposal = "0x6b697373206d7920617373";
    const proposal2 = "0x6e6f20706c6973206d696e65206f6e6c69";
    await stay.connect(user2).approve(votingAddress, _10million);
    await stay.connect(user3).approve(votingAddress, _10million);
    // await rwa.connect(user2).setApprovalForAll(rwaMarketplaceAddress, true);
    console.log(await rwa.balanceOf(deployer.address, 1), "baaal");

    // console.log("here");

    // await rwaMarketplace
    //   .connect(user2)
    //   .startSecondarySale(1, 9, _5ether, 1727385238);

    // await voting.changeProposalFee(50);
    await stay.connect(user3).approve(votingAddress, _10million);
    console.log(await rwa.balanceOf(user3.address, 1), "baaal");
    console.log(await stay.balanceOf(user3.address));
    // await usdc.connect(user2).approve(rwaMarketplaceAddress, _10million);
    await voting.connect(user3).addProposal(1, proposal);
    // await voting.connect(user3).addProposal(2, proposal);
    console.log("here");

    // await voting.connect(user2).vote(1, true);

    // await voting.connect(user3).vote(2, true);
    // await voting.connect(deployer).vote(1, true);
    await voting.vote(1, true);
    // console.log(await voting.getProposalStatus(1));

    // await network.provider.request({
    //   method: "evm_increaseTime",
    //   params: [_30days - 1000],
    // });

    // await network.provider.request({
    //   method: "evm_mine",
    //   params: [],
    // });
    // await rwaMarketplace.buySecondaryShares(
    //   1,
    //   1,
    //   deployer.address,
    //   zeroAddress,
    //   {
    //     value: _10ether,
    //   }
    // );

    // console.log(await voting.getProposalStatus(1));
    // await usdc.approve(rentAddress, _10million);

    // console.log("RENTTT");

    // console.log(await rwa.getProperty(1));
    await rent.addRent(1, _10ether);
    console.log("RENTTT1");

    // await rent.addRent(2, _100ether);
    // console.log(await rent.getRentDetails(2));

    // await network.provider.request({
    //   method: "evm_increaseTime",
    //   params: [_30days],
    // });

    // await network.provider.request({
    //   method: "evm_mine",
    //   params: [],
    // });
    // await rent.resetPropertyDetails(1);
    // console.log(ethers.formatEther(await usdc.balanceOf(deployer.address)));
    await rent.withdrawRent(1);
    await rent.withdrawRent(1);
    // await rent.connect(user3).withdrawRent(2);
    // console.log(ethers.formatEther(await usdc.balanceOf(user3.address)));

    // await rent.addRent(1, _100ether);
  });
});

//1 list and buy with bnb test calcukations
//2 buy with usdc and test the calculations
//3
