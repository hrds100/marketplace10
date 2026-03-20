const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: Number,
      required: true,
      unique: true,
    },
    propertyId: {
      type: Number,
      required: true,
      default: 0,
    },
    walletAddress: {
      type: String,
      required: true,
    },
    agentAddress: {
      type: String,
      required: true,
    },
    shares_requested: {
      type: Number,
      required: true,
    },
    amount_paid: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "refunded"],
      required: true,
    },
    txHash: {
      type: String,
      default: null, // Defaults to null if not provided
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
