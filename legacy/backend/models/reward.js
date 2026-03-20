const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
    },
    rewards: [
      {
        rewardTime: {
          type: Number,
          required: true, // Must be manually set
        },
        status: {
          type: String,
          enum: ["pending", "paid"], // Only two statuses allowed
          default: "pending",
        },
        rewardValue: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

const Reward = mongoose.model("Reward", rewardSchema);
module.exports = Reward;
