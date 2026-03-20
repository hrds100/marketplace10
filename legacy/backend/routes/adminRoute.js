const express = require("express");
const router = express.Router();
const Order = require("../models/order");
const { getMarketplaceContract } = require("../utils/helpers");
const verifyAdmin = require("../middleware/adminAuthorization");
const { default: axios } = require("axios");


// POST route to complete the pending order
router.post("/complete-order", verifyAdmin, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) throw new Error("Order ID is required.");

    // Check if the order exists in the database
    const existingOrder = await Order.findOne({ orderId });

    if (!existingOrder) throw new Error("Order not found.");

    // Check the status of the order
    if (existingOrder.status !== "pending")
      throw new Error(
        `Order cannot be processed because its status is '${existingOrder.status}'.`
      );

    const samcartApiUrl = `https://api.samcart.com/v1/orders/${orderId}?test_mode=false`; //MAINNETBNB:for prod
    // const samcartApiUrl = `https://api.samcart.com/v1/orders/${orderId}?test_mode=true`; //TESTNETSEPOLIA:for dev

    const response = await axios.get(samcartApiUrl, {
      headers: {
        "sc-api": process.env.SAMCART_API_KEY, // Ensure this key is set in your environment variables
      },
    });
    const isValidOrder =
      response.status === 200 && response.data && response.data.id === orderId;
    if (isValidOrder) {
      // const orderData = response.data;
      const recipient = existingOrder.walletAddress;
      const agentWallet = existingOrder.agentAddress;
      const sharesRequested = existingOrder.shares_requested;
      const propertyId = existingOrder.propertyId;
      const contract = getMarketplaceContract();
      if (!contract)
        throw new Error(
          "Contract address is missing in environment variables."
        );
      // Interact with the smart contract
      await contract.callStatic.sendPrimaryShares(
        recipient,
        agentWallet,
        propertyId,
        sharesRequested
      ); // Simulate transaction
      const tx = await contract.sendPrimaryShares(
        recipient,
        agentWallet,
        propertyId,
        sharesRequested
      ); // Send transaction

      console.log("Transaction sent. Waiting for confirmation...");

      const receipt = await tx.wait(); // Wait for transaction confirmation
      console.log("Transaction confirmed:", receipt);

      // Update the order status to 'completed' and save the transaction hash
      existingOrder.status = "completed";
      existingOrder.txHash = receipt.transactionHash;
      await existingOrder.save();

      return res.status(200).json({
        message: "Order verified, processed, and shares sent.",
      });
    } else {
      console.warn("Order verification failed.", response.data);
      return res.status(400).json({ message: "Invalid order." });
    }
  } catch (error) {
    console.error("Error processing shares:", error.message);
    return res.status(500).json({
      message: error.message || "Server error. Please try again later.",
    });
  }
});

// PATCH route to update walletAddress, agentAddress, or propertyId in Order collection
router.patch("/order", async (req, res) => {
  try {
    const { orderId, walletAddress, agentAddress, propertyId } = req.body;

    // 1) orderId is mandatory
    if (orderId == null) {
      return res.status(400).json({ message: "orderId is required." });
    }

    // 2) collect only the fields the user actually passed
    const candidates = { walletAddress, agentAddress, propertyId };
    const updates = Object.entries(candidates).reduce((acc, [key, val]) => {
      if (val != null) acc[key] = val;
      return acc;
    }, {});

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message:
          "Provide at least one of walletAddress, agentAddress, or propertyId.",
      });
    }

    // 3) fetch & validate
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending orders can be updated." });
    }

    // 4) filter out fields that didn’t actually change
    const diff = Object.entries(updates).reduce((acc, [key, val]) => {
      if (order[key] !== val) acc[key] = val;
      return acc;
    }, {});

    if (Object.keys(diff).length === 0) {
      return res
        .status(400)
        .json({ message: "No changes detected; nothing to update." });
    }

    // 5) commit & return the updated doc, omitting timestamps and __v
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId },
      { $set: diff },
      { new: true }
    ).select("-createdAt -updatedAt -__v"); // <-- strip out those fields

    return res.status(200).json({
      message: "Order updated successfully.",
      order: updatedOrder,
    });
  } catch (err) {
    console.error("Error updating order:", err);
    return res
      .status(500)
      .json({ message: "Server error, please try again later." });
  }
});

// GET API to fetch all orders
router.get("/get-orders", async (req, res) => {
  try {
    const orders = await Order.find(
      {},
      {
        orderId: 1,
        walletAddress: 1,
        shares_requested: 1,
        agentAddress: 1,
        propertyId: 1,
        amount_paid: 1,
        status: 1,
        txHash: 1,
        _id: 0,
      }
    );
    return res.status(200).json({
      message: "Orders fetched successfully.",
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).json({ message: "Server error, please try again later." });
  }
});

// GET route to fetch current UTC time
router.get("/utc-time", async (req, res) => {
  try {
    const currentTimeUTC = Math.floor(Date.now() / 1000); // Convert to seconds
    return res.status(200).json({ utcTime: currentTimeUTC });
  } catch (error) {
    console.error("Error fetching UTC time:", error.message);
    res.status(500).json({ message: "Server error, please try again later." });
  }
});

module.exports = router;
