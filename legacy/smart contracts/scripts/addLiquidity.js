const { ethers } = require("hardhat");

// Sepolia Network
const routerAddress = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008";
const usdcAddress = "0x0c86A754A29714C4Fe9C6F1359fa7099eD174c0b";
const stayAddress = "0x8423cEcE3CE700D2101822ed4040C5E6a55E0D95";

const _1Mether = ethers.parseEther("1000000");
const _14240ether = ethers.parseEther("14240");
const _1000ether = ethers.parseEther("1000");

async function main() {
    const [deployer] = await ethers.getSigners();
    const usdc = await ethers.getContractAt("USDC", usdcAddress);
    const stay = await ethers.getContractAt("Stay", stayAddress);
    const router = await ethers.getContractAt("Router", routerAddress);

    // Approve router for liquidity
    await usdc.approve("0xaF1e96eAa37F8D4543F005A0941cF8aBB87E0286", _1Mether);
    // console.log("Approved USDC for router");
    // await stay.approve(routerAddress, _1Mether);
    // console.log("Approved STAY for router");

    // console.log("USDC balance before:", await usdc.balanceOf(deployer.address));
    // console.log("STAY balance before:", await stay.balanceOf(deployer.address));

    // await router.addLiquidity(
    //     usdcAddress,           // token A
    //     stayAddress,           // token B
    //     _14240ether,              // amount A desired (USDC)
    //     _1Mether,                // amount B desired (STAY)
    //     0,                     // amount A min
    //     0,                     // amount B min
    //     deployer.address,  // recipient
    //     Math.floor(Date.now() / 1000) + 60 * 10 // deadline
    // );
    // console.log("Liquidity Added Successfully");


    // // Swap STAY to USDC token
    // const path = [stayAddress, usdcAddress];

    // const tx = await router.swapExactTokensForTokens(
    //     _1000ether,
    //     0, // amountOutMin
    //     path,
    //     deployer.address,
    //     Math.floor(Date.now() / 1000) + 60 * 10
    // );
    // await tx.wait();
    // console.log("Swap executed successfully");


    // console.log("USDC balance After:", await usdc.balanceOf(deployer.address));
    // console.log("STAY balance After:", await stay.balanceOf(deployer.address));

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });