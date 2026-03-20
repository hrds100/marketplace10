const { run } = require("hardhat");

const verify = async (contractAddress, args) => {
  try {
    console.log("verifying..");
    await hre.run(`verify:verify`, {
      address: contractAddress,
      constructorArguments: args,
      // constract: "contracts/TestnetMyRocks.sol:TestnetMyRocks",
    });
    console.log("done");
  } catch (err) {
    if (err.message.toLowerCase().includes("already verified")) {
      console.log("Already Verified!");
    } else {
      console.log(err);
    }
  }
};
module.exports = { verify };

module.exports = [
  "0xff7B8030cB58C5d2886c186aB2794B5E7e53a5a6",
  "0x28df93Ad93d178a821a794eC2113DB0fD9FD22Da",
];

// npx hardhat verify --contract "contracts/TestnetSwapper.sol:TestnetSwapper" --network goerli --constructor-args scripts/verifyContract.js "0x06E216498970a1FEb4700266F6A38dA4d4Cc4315"
