const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: Number,
      required: true,
      unique: true,
    },
    renewalPrice: {
      type: Number,
      required: true,
    },
    subscriptionName: {
      type: String,
      required: true,
    },
    walletAddress: {
      type: String,
      required: true,
    },
    subscriptionEndTime: {
      type: Number,
      required: true,
    },
    sharesStatus: {
      type: String,
      enum: ["pending", "paid"],
    },
    txHash: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);
module.exports = Subscription;
