const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers } = require("hardhat");
const textEncoder = new TextEncoder();

describe("Booster", function () {
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

    const partners13 = [
      deployer.address,
      user1.address,
      user2.address,
      user3.address,
    ];
    const partners46 = [
      user3.address,
      user4.address,
      user5.address,
      user6.address,
    ];
    const partners79 = [user7.address, user8.address, user9.address];
    const partners1011 = [user10.address, user11.address];
    const partners1213 = [user12.address, user13.address];

    const shares13 = [9, 15, 25, 100];
    const shares46 = [59, 51, 102, 8];
    const shares79 = [90, 78, 112];
    const shares1011 = [5, 5];
    const shares1213 = [9, 52];

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
    const rwa = await RWA.deploy();
    await rwa.waitForDeployment();
    rwaAddress = rwa.target;
    let mngrAddress = user2.address;

    const RWAMarketplace = await ethers.getContractFactory("RWAMarketplace");
    const rwaMarketplace = await RWAMarketplace.deploy(
      rwaAddress,
      mngrAddress,
      250,
      150,
      1000
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

    const Boost = await ethers.getContractFactory("Booster");
    const boost = await Boost.deploy(rwaAddress, user1.address, 5, 25);
    await boost.waitForDeployment();
    const boostAddress = boost.target;

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
    await stay.connect(signerChris).transfer(user1.address, _1million);
    await stay.connect(signerChris).transfer(user2.address, _10kether);
    await stay.connect(signerChris).transfer(user4.address, _10kether);
    await stay.connect(signerChris).transfer(user3.address, _10kether);

    await rwa.initialize(rwaMarketplaceAddress);
    console.log("INITIALIZED");

    await rwa.registerProperty(
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
      _5ether,
      "https://uri.com/testing-the-shit-outta-this2"
    );
    await rwa.registerProperty(
      partners79,
      shares79,
      2992,
      _15ether,
      "https://uri.com/testing-the-shit-outta-this3"
    );
    await rwa.registerProperty(
      partners1011,
      shares1011,
      1001,
      _2kether,
      "https://uri.com/testing-the-shit-outta-this4"
    );
    await rwa.registerProperty(
      partners1213,
      shares1213,
      509,
      _2kether,
      "https://uri.com/testing-the-shit-outta-this5"
    );

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
      boost,
      boostAddress,
    };
  }

  it("1. Voting ", async function () {
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

    // console.log("Property ID 1", property1);
    // console.log("Property ID 2", property2);
    // console.log("Property ID 3", property3);
    // console.log("Property ID 4", property4);
    // console.log("Property ID 5", property5);
    // console.log(await rwa.getProperty(2));
    // console.log("here1");

    // console.log("++++++++STARTING PRIMARY SALE++++++++");

    // console.log("Primary sale on for id 1 and 3");
    // await rwaMarketplace.startPrimarySale(1);
    // await rwaMarketplace.startPrimarySale(3);
    // await rwaMarketplace.startPrimarySale(5);
    // console.log(await rwaMarketplace.getPrimarySale(1));
    // console.log(await rwaMarketplace.getPrimarySale(3));

    // console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));
    // console.log(
    //   "USER11 BNB balance",
    //   await ethers.provider.getBalance(user11.address)
    // );
    // console.log("USER11 buying in 1st campaign ID 1");

    // await rwaMarketplace
    //   .connect(user11)
    //   .buyPrimaryShares(user11.address, zeroAddress, 1, 1, {
    //     value: ethers.parseEther("2"),
    //   });

    // console.log("USER11 usdc balance", await usdc.balanceOf(user11.address));
    // console.log(
    //   "USER11 BNB balance",
    //   await ethers.provider.getBalance(user11.address)
    // );

    // console.log("USER11 buying in 1st campaign ID 3");

    // await rwaMarketplace
    //   .connect(user11)
    //   .buyPrimaryShares(user11.address, zeroAddress, 3, 3, {
    //     value: ethers.parseEther("1"),
    //   });

    // console.log("Lets check how many have our share:");

    // await rwa.changePropertyDetails(1, _10million, 0);

    // console.log(await rwa.getProperty(1));
    // console.log(await rwa.getProperty(3));

    // await rwaMarketplace.endPrimarySale(1);
    // await rwaMarketplace.endPrimarySale(5);
    // await rwaMarketplace.endPrimarySale(1);

    // await rwa.connect(user12).setApprovalForAll(rwaMarketplaceAddress, true);

    // console.log(await rwa.balanceOf(user12.address, 5));

    // console.log(await rwaMarketplace.getTotalListings());
    // console.log("total before");
    // await rwaMarketplace
    //   .connect(user12)
    //   .startSecondarySale(5, 9, _5ether, 1727385238);

    // console.log("started secondary for ID 5");
    // console.log(await rwaMarketplace.getTotalListings());
    // console.log("total after");

    // console.log("total after camncel");

    // await rwaMarketplace
    // .connect(user12)
    // .buyPrimaryShares(user11.address, zeroAddress, 1, 3, {
    //   value: ethers.parseEther("7"),
    // });

    // console.log(await rwaMarketplace.getPrimarySale(1));
    // await rwa.connect(user3).setApprovalForAll(rwaMarketplaceAddress, true);
    // await rwa.connect(user10).setApprovalForAll(rwaMarketplaceAddress, true);
    // await rwa.setApprovalForAll(rwaMarketplaceAddress, true);

    // console.log(await rwaMarketplace.getPrimarySale(1));
    // console.log(await rwaMarketplace.getPrimarySale(3));
    // console.log(await rwaMarketplace.getSecondaryListing(1));

    // await rwaMarketplace.connect(user12).updateSecondarySale(1, 4, _10ether);

    // console.log(await rwaMarketplace.getSecondaryListing(1));

    // console.log("total after camncel");

    // await rwaMarketplace.buySecondaryShares(
    //   1,
    //   2,
    //   deployer.address,
    //   zeroAddress,
    //   { value: _10ether }
    // );
    // await rwaMarketplace.connect(user12).cancelSecondarySale(1);
    // console.log(await rwaMarketplace.getSecondaryListing(1));

    // console.log(await rwaMarketplace.getTotalListings());

    // console.log(await rwa.balanceOf(user12, 5), "balance updated should be 7");

    // await rwaMarketplace.connect(user12).startSecondarySale(5, 7, _5ether, 120);

    // console.log(await rwaMarketplace.getTotalListings(), "should be 1");

    // console.log(
    //   await rwaMarketplace.getSecondaryListing(1),
    //   "should be non zero butis not"
    // );
    // console.log(await rwa.getProperty(5));

    // await usdc.approve(rwaMarketplaceAddress, _10million);
    // console.log("buyer balance", await rwa.balanceOf(deployer.address, 5));

    // console.log("buyer USDC Bal", await usdc.balanceOf(deployer.address));
    // console.log(
    //   "buyer BNB Bal",
    //   await ethers.provider.getBalance(deployer.address)
    // );
    // console.log("SELLER USDC Bal", await usdc.balanceOf(user12.address));

    // await rwaMarketplace.buySecondaryShares(
    //   2,
    //   4,
    //   deployer.address,
    //   zeroAddress,
    //   {
    //     value: ethers.parseEther("2"),
    //   }
    // );

    // console.log("buyer USDC Bal", await usdc.balanceOf(deployer.address));
    // console.log(
    //   "buyer BNB Bal",
    //   await ethers.provider.getBalance(deployer.address)
    // );
    // console.log("SELLER USDC Bal", await usdc.balanceOf(user12.address));

    // console.log(await rwa.getProperty(5));

    // console.log("buyer balance", await rwa.balanceOf(deployer.address, 5));
    // console.log(await rwaMarketplace.getSecondaryListing(3));

    // await rwaMarketplace.startSecondarySale(5, 6, _1ether, 120);
    // await rwaMarketplace
    //   .connect(user2)
    //   .buySecondaryShares(3, 1, user2.address, zeroAddress, {
    //     value: ethers.parseEther("1"),
    //   });
    // await rwaMarketplace
    //   .connect(user10)
    //   .buySecondaryShares(3, 1, user10.address, zeroAddress, {
    //     value: ethers.parseEther("1"),
    //   });
    // await rwaMarketplace
    //   .connect(user11)
    //   .buySecondaryShares(3, 1, user11.address, zeroAddress, {
    //     value: ethers.parseEther("1"),
    //   });
    // await rwaMarketplace
    //   .connect(user4)
    //   .buySecondaryShares(3, 1, user4.address, zeroAddress, {
    //     value: ethers.parseEther("2"),
    //   });
    // await rwaMarketplace
    //   .connect(user5)
    //   .buySecondaryShares(2, 1, user5.address, zeroAddress, {
    //     value: ethers.parseEther("2"),
    //   });
    // await rwaMarketplace
    //   .connect(user1)
    //   .buySecondaryShares(2, 1, user1.address, zeroAddress, {
    //     value: ethers.parseEther("2"),
    //   });

    // console.log(await stay.balanceOf(user1.address));

    console.log("Voting SHizzzz");

    await stay.connect(user1).approve(votingAddress, _10million);
    await stay.connect(user2).approve(votingAddress, _10million);
    await stay.connect(user4).approve(votingAddress, _10million);

    const proposal = "0x6b697373206d7920617373";
    const proposal2 = "0x6e6f20706c6973206d696e65206f6e6c69";

    await voting.connect(user4).addProposal(2, proposal);
    await voting.connect(user2).addProposal(1, proposal2);

    await network.provider.request({
      method: "evm_increaseTime",
      params: [_30days - 25],
    });

    await network.provider.request({
      method: "evm_mine",
      params: [],
    });
    console.log(await rwa.getProperty(1));
    // await rwa.safeTransferFrom

    await voting.connect(user1).vote(1, true);
    console.log("1");
    console.log(await voting.getProposal(1));
    await voting.connect(user1).addProposal(1, proposal);
    // await voting.connect(user1).vote(1, true);
    console.log("2");

    await voting.connect(user2).vote(1, false);
    console.log("3");

    await voting.connect(user4).vote(2, false);
    console.log(await voting.getProposal(1));
    console.log(await voting.getProposal(2));

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
    await rwa.connect(user2).setApprovalForAll(rwaMarketplaceAddress, true);
    console.log("here");

    await rwaMarketplace
      .connect(user2)
      .startSecondarySale(1, 9, _5ether, 1727385238);

    await voting.changeProposalFee(50);
    await stay.connect(user3).approve(votingAddress, _10million);
    console.log(await rwa.balanceOf(user3.address, 2), "baaal");
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
      params: [1],
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
    console.log(ethers.formatEther(await usdc.balanceOf(deployer.address)));
    await rent.withdrawRent(1);
    // await rent.withdrawRent(1);
    await rent.connect(user3).withdrawRent(2);
    console.log(ethers.formatEther(await usdc.balanceOf(user3.address)));

    // await rent.addRent(1, _100ether);
  });
  it("5 Boosting: Boost and boost again after 10 years then claim after 1 year  ", async function () {
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
      boost,
      boostAddress,
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
    console.log("boosting Shizzz");

    // console.log("STAY balance of Owner: ", await stay.balanceOf(user1.address));
    // console.log("USDC Balance of owner: ", await usdc.balanceOf(user1.address));
    // console.log(
    //   "STAY balance of Booster: ",
    //   await stay.balanceOf(deployer.address)
    // );
    // console.log(
    //   "USDC balance of Booster: ",
    //   await usdc.balanceOf(deployer.address)
    // );
    // console.log(
    //   await ethers.provider.getBalance(deployer.address),
    //   "BOOSTER BNB"
    // );
    await usdc.approve(boostAddress, _10million);
    await stay.connect(user1).approve(boostAddress, _10million);

    await boost.boost(1, USDC);

    await network.provider.request({
      method: "evm_increaseTime",
      params: [86400 * 24 * 365 * 10],
    });

    await network.provider.request({
      method: "evm_mine",
      params: [],
    });

    await boost.boost(1, USDC);

    console.log("dets", await boost.getBoostDetails(deployer.address, 1));

    await network.provider.request({
      method: "evm_increaseTime",
      params: [86400 * 24 * 365],
    });

    // await network.provider.request({
    //   method: "evm_mine",
    //   params: [],
    // });

    // await boost.boost(1, USDC);
    // await network.provider.request({
    //   method: "evm_increaseTime",
    //   params: [1],
    // });245498614011575796560171n;

    // await network.provider.request({
    //   method: "evm_mine",
    //   params: [],
    // });
    // console.log("STAY balance of Owner: ", await stay.balanceOf(user1.address));

    await boost.claimRewards(1);
    console.log("dets", await boost.getBoostDetails(deployer.address, 1));

    console.log("STAY balance of Owner: ", await stay.balanceOf(user1.address));
    // console.log("USDC Balance of owner: ", await usdc.balanceOf(user1.address));
    // console.log(
    //   "STAY balance of Booster: ",
    //   await stay.balanceOf(deployer.address)
    // );
    // console.log(
    //   "USDC balance of Booster: ",
    //   await usdc.balanceOf(deployer.address)
    // );
    // console.log(
    //   await ethers.provider.getBalance(deployer.address),
    //   "BOOSTER BNB"
    // );

    // console.log("dets", await boost.getBoostDetails(deployer.address, 1));

    // const proposal = "0x6b697373206d7920617373";
    // const proposal2 = "0x6e6f20706c6973206d696e65206f6e6c69";
    // await stay.connect(user2).approve(votingAddress, _10million);

    // await stay.connect(user3).approve(votingAddress, _10million);
    // await rwa.connect(user2).setApprovalForAll(rwaMarketplaceAddress, true);
    // console.log("here");

    // await rwaMarketplace
    //   .connect(user2)
    //   .startSecondarySale(1, 9, _5ether, 1727385238);

    // await voting.changeProposalFee(50);
    // await stay.connect(user3).approve(votingAddress, _10million);
    // console.log(await rwa.balanceOf(user3.address, 2), "baaal");
    // // await usdc.connect(user2).approve(rwaMarketplaceAddress, _10million);
    // await voting.connect(user3).addProposal(1, proposal);
    // await voting.connect(user3).addProposal(2, proposal);
    // console.log("here");

    // await stay.connect(user3).approve(votingAddress, _10million);
    // await stay.connect(deployer).approve(votingAddress, _10million);
    // console.log("here");

    // await voting.connect(user2).vote(1, true);

    // await voting.connect(user3).vote(2, true);
    // // await voting.connect(deployer).vote(1, true);
    // await voting.vote(1, true);
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
    // await rent.addRent(1, _10ether);
    // console.log("RENTTT1");

    // await rent.addRent(2, _100ether);
    // console.log(await rent.getRentDetails(2));

    // // await network.provider.request({
    // //   method: "evm_increaseTime",
    // //   params: [_30days],
    // // });

    // // await network.provider.request({
    // //   method: "evm_mine",
    // //   params: [],
    // // });
    // // await rent.resetPropertyDetails(1);
    // console.log(ethers.formatEther(await usdc.balanceOf(deployer.address)));
    // await rent.withdrawRent(1);
    // // await rent.withdrawRent(1);
    // await rent.connect(user3).withdrawRent(2);
    // console.log(ethers.formatEther(await usdc.balanceOf(user3.address)));

    // await rent.addRent(1, _100ether);
  });
  it("6 Boosting: boost then buy more property and then boost again within limit and claim after year", async function () {
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
      boost,
      boostAddress,
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
    console.log("boosting Shizzz");

    // console.log("STAY balance of Owner: ", await stay.balanceOf(user1.address));
    // console.log("USDC Balance of owner: ", await usdc.balanceOf(user1.address));
    // console.log(
    //   "STAY balance of Booster: ",
    //   await stay.balanceOf(deployer.address)
    // );
    // console.log(
    //   "USDC balance of Booster: ",
    //   await usdc.balanceOf(deployer.address)
    // );
    // console.log(
    //   await ethers.provider.getBalance(deployer.address),
    //   "BOOSTER BNB"
    // );
    await usdc.approve(boostAddress, _10million);
    await stay.connect(user1).approve(boostAddress, _10million);

    await boost.boost(deployer.address, 1, USDC);

    await network.provider.request({
      method: "evm_increaseTime",
      params: [86400 * 35],
    });

    await network.provider.request({
      method: "evm_mine",
      params: [],
    });

    await stay.approve(votingAddress, _10million);
    await rwa.setApprovalForAll(rwaMarketplaceAddress, true);
    console.log("here");

    // await rwaMarketplace
    //   .connect(user1)
    //   .startSecondarySale(1, 2, _5ether, 1727385238);

    console.log("dets", await boost.getBoostDetails(deployer.address, 1));
    await boost.boost(deployer.address, 1, USDC);

    // await network.provider.request({
    //   method: "evm_increaseTime",
    //   params: [86400 * 24 * 365],
    // });

    // await rwaMarketplace.buySecondaryShares(
    //   1,
    //   2,
    //   deployer.address,
    //   zeroAddress,
    //   {
    //     value: _10ether,
    //   }
    // );

    // await network.provider.request({
    //   method: "evm_mine",
    //   params: [],
    // });

    // await boost.boost(1, USDC);
    // await network.provider.request({
    //   method: "evm_increaseTime",
    //   params: [1],
    // });245498614011575796560171n;

    // await network.provider.request({
    //   method: "evm_mine",
    //   params: [],
    // });

    // await boost.boost(1, USDC);
    // console.log("dets", await boost.getBoostDetails(deployer.address, 1));

    // console.log("STAY balance of Owner: ", await stay.balanceOf(user1.address));
    // console.log("USDC Balance of owner: ", await usdc.balanceOf(user1.address));
    // console.log(
    //   "STAY balance of Booster: ",
    //   await stay.balanceOf(deployer.address)
    // );
    // console.log(
    //   "USDC balance of Booster: ",
    //   await usdc.balanceOf(deployer.address)
    // );
    // console.log(
    //   await ethers.provider.getBalance(deployer.address),
    //   "BOOSTER BNB"
    // );

    // console.log("dets", await boost.getBoostDetails(deployer.address, 1));

    // const proposal = "0x6b697373206d7920617373";
    // const proposal2 = "0x6e6f20706c6973206d696e65206f6e6c69";
    // await stay.connect(user2).approve(votingAddress, _10million);

    // await stay.connect(user3).approve(votingAddress, _10million);
    // await rwa.connect(user2).setApprovalForAll(rwaMarketplaceAddress, true);
    // console.log("here");

    // await rwaMarketplace
    //   .connect(user2)
    //   .startSecondarySale(1, 9, _5ether, 1727385238);

    // await voting.changeProposalFee(50);
    // await stay.connect(user3).approve(votingAddress, _10million);
    // console.log(await rwa.balanceOf(user3.address, 2), "baaal");
    // // await usdc.connect(user2).approve(rwaMarketplaceAddress, _10million);
    // await voting.connect(user3).addProposal(1, proposal);
    // await voting.connect(user3).addProposal(2, proposal);
    // console.log("here");

    // await stay.connect(user3).approve(votingAddress, _10million);
    // await stay.connect(deployer).approve(votingAddress, _10million);
    // console.log("here");

    // await voting.connect(user2).vote(1, true);

    // await voting.connect(user3).vote(2, true);
    // // await voting.connect(deployer).vote(1, true);
    // await voting.vote(1, true);
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
    // await rent.addRent(1, _10ether);
    // console.log("RENTTT1");

    // await rent.addRent(2, _100ether);
    // console.log(await rent.getRentDetails(2));

    // // await network.provider.request({
    // //   method: "evm_increaseTime",
    // //   params: [_30days],
    // // });

    // // await network.provider.request({
    // //   method: "evm_mine",
    // //   params: [],
    // // });
    // // await rent.resetPropertyDetails(1);
    // console.log(ethers.formatEther(await usdc.balanceOf(deployer.address)));
    // await rent.withdrawRent(1);
    // // await rent.withdrawRent(1);
    // await rent.connect(user3).withdrawRent(2);
    // console.log(ethers.formatEther(await usdc.balanceOf(user3.address)));

    // await rent.addRent(1, _100ether);
  });
  it.only("7 Boosting: boost then buy more property and then boost again within limit and claim after year", async function () {
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
      boost,
      boostAddress,
    } = await loadFixture(deployContractsFixture);

    const property1 = await rwa.getProperty(1);
    // const property2 = await rwa.getProperty(2);
    // const property3 = await rwa.getProperty(3);
    // const property4 = await rwa.getProperty(4);
    // const property5 = await rwa.getProperty(5);
    // const property6 = await rwa.getProperty(6);

    console.log("Property ID 1", property1);
    // console.log("Property ID 2", property2);
    // console.log("Property ID 3", property3);
    // console.log("Property ID 4", property4);
    // console.log("Property ID 5", property5);
    console.log("boosting Shizzz");

    // console.log("STAY balance of Owner: ", await stay.balanceOf(user1.address));
    // console.log("USDC Balance of owner: ", await usdc.balanceOf(user1.address));
    // console.log(
    //   "STAY balance of Booster: ",
    //   await stay.balanceOf(deployer.address)
    // );
    // console.log(
    //   "USDC balance of Booster: ",
    //   await usdc.balanceOf(deployer.address)
    // );
    // console.log(
    //   await ethers.provider.getBalance(deployer.address),
    //   "BOOSTER BNB"
    // );
    await usdc.approve(boostAddress, _10million);
    await stay.connect(user1).approve(boostAddress, _10million);

    await boost.boostOnBehalfOf(user1.address, 1);
    // await boost.boost(user1.address, 1, usdc, { value: ethers.parseEther("1") });
    console.log(await boost.isBoosted(user1.address, 1));


    await network.provider.request({
      method: "evm_increaseTime",
      params: [86400 * 365 + 1],
    });

    await network.provider.request({
      method: "evm_mine",
      params: [],
    });
    console.log(await boost.isBoosted(user1.address, 1));
    await boost.boostOnBehalfOf(user1.address, 1);
    console.log(await boost.isBoosted(user1.address, 1));

    await boost.connect(user1).claimRewards(1)
    


    // await stay.approve(votingAddress, _10million);
    // await rwa.setApprovalForAll(rwaMarketplaceAddress, true);
    // console.log("here");

    // await rwaMarketplace
    //   .connect(user1)
    //   .startSecondarySale(1, 2, _5ether, 1727385238);

    console.log("dets", await boost.getBoostDetails(user1.address, 1));
    // await boost.boost(deployer.address, 1, USDC);

    // await network.provider.request({
    //   method: "evm_increaseTime",
    //   params: [86400 * 24 * 365],
    // });

    // await rwaMarketplace.buySecondaryShares(
    //   1,
    //   2,
    //   deployer.address,
    //   zeroAddress,
    //   {
    //     value: _10ether,
    //   }
    // );

    // await network.provider.request({
    //   method: "evm_mine",
    //   params: [],
    // });

    // await boost.boost(1, USDC);
    // await network.provider.request({
    //   method: "evm_increaseTime",
    //   params: [1],
    // });245498614011575796560171n;

    // await network.provider.request({
    //   method: "evm_mine",
    //   params: [],
    // });

    // await boost.boost(1, USDC);
    // console.log("dets", await boost.getBoostDetails(deployer.address, 1));

    // console.log("STAY balance of Owner: ", await stay.balanceOf(user1.address));
    // console.log("USDC Balance of owner: ", await usdc.balanceOf(user1.address));
    // console.log(
    //   "STAY balance of Booster: ",
    //   await stay.balanceOf(deployer.address)
    // );
    // console.log(
    //   "USDC balance of Booster: ",
    //   await usdc.balanceOf(deployer.address)
    // );
    // console.log(
    //   await ethers.provider.getBalance(deployer.address),
    //   "BOOSTER BNB"
    // );

    // console.log("dets", await boost.getBoostDetails(deployer.address, 1));

    // const proposal = "0x6b697373206d7920617373";
    // const proposal2 = "0x6e6f20706c6973206d696e65206f6e6c69";
    // await stay.connect(user2).approve(votingAddress, _10million);

    // await stay.connect(user3).approve(votingAddress, _10million);
    // await rwa.connect(user2).setApprovalForAll(rwaMarketplaceAddress, true);
    // console.log("here");

    // await rwaMarketplace
    //   .connect(user2)
    //   .startSecondarySale(1, 9, _5ether, 1727385238);

    // await voting.changeProposalFee(50);
    // await stay.connect(user3).approve(votingAddress, _10million);
    // console.log(await rwa.balanceOf(user3.address, 2), "baaal");
    // // await usdc.connect(user2).approve(rwaMarketplaceAddress, _10million);
    // await voting.connect(user3).addProposal(1, proposal);
    // await voting.connect(user3).addProposal(2, proposal);
    // console.log("here");

    // await stay.connect(user3).approve(votingAddress, _10million);
    // await stay.connect(deployer).approve(votingAddress, _10million);
    // console.log("here");

    // await voting.connect(user2).vote(1, true);

    // await voting.connect(user3).vote(2, true);
    // // await voting.connect(deployer).vote(1, true);
    // await voting.vote(1, true);
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
    // await rent.addRent(1, _10ether);
    // console.log("RENTTT1");

    // await rent.addRent(2, _100ether);
    // console.log(await rent.getRentDetails(2));

    // // await network.provider.request({
    // //   method: "evm_increaseTime",
    // //   params: [_30days],
    // // });

    // // await network.provider.request({
    // //   method: "evm_mine",
    // //   params: [],
    // // });
    // // await rent.resetPropertyDetails(1);
    // console.log(ethers.formatEther(await usdc.balanceOf(deployer.address)));
    // await rent.withdrawRent(1);
    // // await rent.withdrawRent(1);
    // await rent.connect(user3).withdrawRent(2);
    // console.log(ethers.formatEther(await usdc.balanceOf(user3.address)));

    // await rent.addRent(1, _100ether);
  });
});

// Boost and boost again after 10 years then claim after 1 year
// boost then buy more property and then boost again within limit and claim after year
// boost then sell property and then claim
// boost and boost again after a month
// boost with bnb check balances
// boost with usdc check balances
