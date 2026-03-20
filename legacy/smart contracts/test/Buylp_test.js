const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("BUYLP CONTRACT", function () {
  async function deployContractsFixture() {
    const [deployer, user1, user2, user3, user4, user5, user6, user7] =
      await ethers.getSigners();

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

    const zeroAddress = "0x0000000000000000000000000000000000000000";

    const stayAddress = "0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0";
    const lpAddress = "0x2397c1722ccb6934becf579351685a56030ea8f7";
    const imperUSDC = "0x554B52bF57b387fD09D6644368C5A8AAcaAf5aE0";
    const chris = "0x6eb06e1078cfbdCF9a3387584a8D934D85Ea1436";
    const USDC = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";
    const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    let buyLpAddress;

    const usdc = await ethers.getContractAt("USDC", USDC);
    const stay = await ethers.getContractAt("Stay", stayAddress);
    const router = await ethers.getContractAt("Router", routerAddress);
    const lp = await ethers.getContractAt("Pair", lpAddress);
    const BuyLp = await ethers.getContractFactory("BuyLP");
    const buylp = await BuyLp.deploy(deployer.address);
    await buylp.waitForDeployment();
    buyLpAddress = buylp.target;

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

    await lp.approve(buyLpAddress, _10million);

    // console.log("Owner receives stay 2M and usdc 20k");
    await usdc.connect(usdcSigner).transfer(deployer.address, _20kether);
    await stay.connect(signerChris).transfer(deployer.address, _2million);

    // console.log("Buyer receives usdc 20k and stay 20k");
    await stay.connect(signerChris).transfer(user2.address, _20kether);
    await stay.connect(signerChris).transfer(user2.address, _20kether);
    await stay.connect(signerChris).transfer(user2.address, _20kether);
    await usdc.connect(usdcSigner).transfer(user2.address, _20kether);

    // console.log("Buyer approved STAY & USDC to BuyLP Contract");
    await usdc.connect(user2).approve(buyLpAddress, _10million);
    await stay.connect(user2).approve(buyLpAddress, _10million);

    await stay.approve(router, _10million);
    await usdc.approve(router, _10million);
    // console.log("here");

    await router.addLiquidity(
      stayAddress,
      USDC,
      _10kether,
      _10ether,
      0,
      0,
      deployer.getAddress(),
      Math.floor(Date.now() / 1000) + 60 * 10
    );

    // console.log("Owner added liqudity.");

    console.log("Initial Balance:");

    console.log("LP balance of owner: ", await lp.balanceOf(deployer.address));

    console.log("LP PRICE: ", await buylp.getLpPrice());

    return {
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
      buylp,
      _1ether,
      deployer,
      zeroAddress,
      USDC,
      _50ether,
    };
  }

  it("1. BUYING LP with BNB ", async function () {
    const {
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
      zeroAddress,
      USDC,
      _20kether,
    } = await loadFixture(deployContractsFixture);

    console.log(
      "BNB balance of owner: ",
      await ethers.provider.getBalance(deployer.address)
    );

    console.log("_--------_");

    console.log(
      "BNB balance of buyer: ",
      await ethers.provider.getBalance(user2.address)
    );

    console.log("Buying LP with $500 worth of BNB (0.87 BNB)");
    await buylp
      .connect(user2)
      .buyLPToken(zeroAddress, _500ether, user2.address, { value: _10ether });

    console.log(
      "BNB Balance of buyer: ",
      await ethers.provider.getBalance(user2.address)
    );
    console.log(
      "BNB Balance of Owner: ",
      await ethers.provider.getBalance(deployer.address)
    );

    console.log(
      "LP Balance of Buyer should be 62: ",
      await lp.balanceOf(user2.address)
    );
    console.log(
      "LP balance of owner should be 98 ",
      await lp.balanceOf(deployer.address)
    );
  });

  it.only("2. BUYING LP with STAY", async function () {
    const {
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
      user7,
      _500ether,
      _1ether,
      stayAddress,
      deployer,
      _20kether,
      _50ether,
      _1kether,
    } = await loadFixture(deployContractsFixture);

    console.log("Buying LP with $100 worth of STAY");
    console.log("Stay value: 27k");
    console.log("STAY Balance of buyer: ", await stay.balanceOf(user2.address));
    console.log(
      "STAY Balance of Owner: ",
      await stay.balanceOf(deployer.address)
    );

    await buylp
      .connect(user2)
      .buyLPToken(stayAddress, _100ether, user2.address, { value: 0 });

    console.log(
      "STAY Balance of buyer should be 32k: ",
      await stay.balanceOf(user2.address)
    );
    console.log(
      "STAY Balance of Owner ",
      await stay.balanceOf(deployer.address)
    );

    console.log(
      "LP Balance of Buyer should be 12: ",
      await lp.balanceOf(user2.address)
    );
    console.log("LP balance of owner: ", await lp.balanceOf(deployer.address));
  });

  it("3. BUYING LP with USDC", async function () {
    const {
      _20kether,
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
      user7,
      _500ether,
      _1ether,
      USDC,
      stayAddress,
      deployer,
      _1kether,
      usdcAddress,
    } = await loadFixture(deployContractsFixture);

    console.log("Buying LP with $1000 worth of USDC");
    await buylp
      .connect(user2)
      .buyLPToken(USDC, _1kether, user2.address, { value: 0 });

    console.log(
      "USDC Balance of buyer: ",
      await stay.balanceOf(deployer.address)
    );
    console.log(
      "USDC Balance of Owner: ",
      await stay.balanceOf(deployer.address)
    );

    console.log("LP Balance of Buyer: ", await lp.balanceOf(user2.address));
    console.log("LP balance of owner: ", await lp.balanceOf(deployer.address));
  });

  it("4. BUYING LP with USDC MORE THAN LIMIT: Should fail with insufficient funds", async function () {
    const {
      _20kether,
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
      user7,
      _500ether,
      _1ether,
      USDC,
      stayAddress,
      deployer,
      _1kether,
      usdcAddress,
    } = await loadFixture(deployContractsFixture);

    console.log("Buying LP with $1000 worth of USDC");
    await buylp
      .connect(user2)
      .buyLPToken(USDC, _500ether, user2.address, { value: 0 });
    console.log("1");
    await buylp
      .connect(user2)
      .buyLPToken(USDC, _500ether, user2.address, { value: 0 });
    console.log("1");

    await buylp
      .connect(user2)
      .buyLPToken(USDC, _500ether, user2.address, { value: 0 });
    console.log("1");

    await buylp
      .connect(user2)
      .buyLPToken(USDC, _500ether, user2.address, { value: 0 });

    console.log(
      "USDC Balance of buyer: ",
      await stay.balanceOf(deployer.address)
    );
    console.log(
      "USDC Balance of Owner: ",
      await stay.balanceOf(deployer.address)
    );

    console.log("LP Balance of Buyer: ", await lp.balanceOf(user2.address));
    console.log("LP balance of owner: ", await lp.balanceOf(deployer.address));
  });
  it("5. SHOULD FAIL WITH UPDATED OWNER", async function () {
    const {
      _20kether,
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
      user7,
      _500ether,
      _1ether,
      USDC,
      stayAddress,
      deployer,
      _1kether,
      usdcAddress,
    } = await loadFixture(deployContractsFixture);

    await buylp.changeLpWallet(user5.address)
    console.log("Buying LP with $1000 worth of USDC");
    await buylp
      .connect(user2)
      .buyLPToken(USDC, _500ether, user2.address, { value: 0 });
  

    console.log(
      "USDC Balance of buyer: ",
      await stay.balanceOf(deployer.address)
    );
    console.log(
      "USDC Balance of Owner: ",
      await stay.balanceOf(deployer.address)
    );

    console.log("LP Balance of Buyer: ", await lp.balanceOf(user2.address));
    console.log("LP balance of owner: ", await lp.balanceOf(deployer.address));
  });
});
