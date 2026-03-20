const { default: axios } = require("axios");
const express = require("express");
const Order = require("../models/order");
const { getMarketplaceContract } = require("../utils/helpers");

const router = express.Router();

router.post("/webhook", async (req, res) => {
  try {
    console.log("Received Webhook:", JSON.stringify(req.body));
    const webhookType = req.body?.type;
    if (!webhookType) {
      console.error("Webhook type not found.");
      return res.status(400).json({ message: "Webhook type not found." });
    }

    if (webhookType === "Order" || webhookType === "Refund") {
      const orderId = req.body.order?.id;
      if (!orderId) {
        console.error("Order ID not found in webhook payload.");
        return res
          .status(400)
          .json({ message: "Order ID not found in webhook payload." });
      }

      const samcartApiUrl = `https://api.samcart.com/v1/orders/${orderId}?test_mode=false`; //MAINNETBNB:for prod
      // const samcartApiUrl = `https://api.samcart.com/v1/orders/${orderId}?test_mode=true`; // TESTNETSEPOLIA:for dev

      const response = await axios.get(samcartApiUrl, {
        headers: {
          "sc-api": process.env.SAMCART_API_KEY, // Ensure this key is set in your environment variables
        },
      });

      const isValidOrder =
        response.status === 200 &&
        response.data &&
        response.data.id === orderId;

      if (isValidOrder) {
        const orderData = response.data;
        const customerId = orderData.customer_id;
        const samcartCustomerApi = `https://api.samcart.com/v1/customers/${customerId}?test_mode=false`; //MAINNETBNB:for prod
        // const samcartCustomerApi = `https://api.samcart.com/v1/customers/${customerId}?test_mode=true`; // TESTNETSEPOLIA:for dev
        const customerDetails = await axios.get(samcartCustomerApi, {
          headers: {
            "sc-api": process.env.SAMCART_API_KEY, // Ensure this key is set in your environment variables
          },
        });
        let {
          propertyId = 0,
          agentWallet,
          recipient,
        } = parseData(customerDetails.data.phone);
        agentWallet = extractWalletAddress(agentWallet);
        recipient = extractWalletAddress(recipient);
        const amountPaid = orderData.cart_items[0].initial_price.subtotal / 100;
        const sharesRequested = Math.floor(amountPaid);
        // Check if the order already exists in the database
        const existingOrder = await Order.findOne({ orderId: orderData.id });

        // Check the status of each item in cart_items
        for (const item of orderData.cart_items) {
          const itemStatus = item.status;
          if (itemStatus === "refunded") {
            if (existingOrder && existingOrder.status !== "pending") {
              console.error(
                `Order with ID ${orderId} cannot be marked as refunded because it is already processed with status '${existingOrder.status}'.`
              );
              return res.status(400).json({
                message: `Order is already processed with status '${existingOrder.status}'.`,
              });
            }
            // Update the order to refunded in the database, whether it exists or not
            await Order.findOneAndUpdate(
              { orderId: orderData.id },
              {
                $set: { status: "refunded" },
              }
            );
            return res
              .status(200)
              .json({ message: "Order refunded successfully." });
          }
        }
        if (existingOrder) {
          if (existingOrder.status !== "pending") {
            console.error(
              `Order cannot be processed because its status is '${existingOrder.status}`
            );
            return res.status(400).json({
              message: `Order cannot be processed because its status is '${existingOrder.status}`,
            });
          }
        } else {
          // If the order doesn't exist, create it with status 'pending'
          await Order.create({
            orderId: orderData.id,
            propertyId: propertyId,
            walletAddress: recipient,
            agentAddress: agentWallet,
            shares_requested: sharesRequested,
            amount_paid: amountPaid,
            status: "pending",
          });
        }
        // Interact with the smart contract
        try {
          if (!propertyId) throw new Error("Property ID not found");
          const contract = getMarketplaceContract();
          if (!contract) throw new Error("Unable to fetch the contract");
          await contract.callStatic.sendPrimaryShares(
            recipient,
            agentWallet,
            propertyId,
            sharesRequested
          );
          const tx = await contract.sendPrimaryShares(
            recipient,
            agentWallet,
            propertyId,
            sharesRequested
          );
          console.log("Transaction sent. Waiting for confirmation...");

          const receipt = await tx.wait(); // Wait for transaction confirmation

          // Update order status to completed and save the transaction hash
          await Order.findOneAndUpdate(
            { orderId: orderData.id },
            {
              status: "completed",
              txHash: receipt.transactionHash,
            }
          );

          console.log(
            "Order updated with transaction hash and completed status."
          );
          return res
            .status(200)
            .json({ message: "Order verified, processed, and shares sent." });
        } catch (contractError) {
          console.error(
            "Error interacting with smart contract:",
            contractError.message
          );
          return res
            .status(500)
            .json({ message: "Error interacting with smart contract." });
        }
      } else {
        console.error("Order verification failed.", response.data);
        return res.status(400).json({ message: "Invalid order." });
      }
    }
    else {
      console.error("Unknown type received.");
      return res.status(400).json({ message: "Unknown type received." });
    }
  } catch (error) {
    console.error("Error handling webhook:", error.message);
    res.status(500).json({ message: "Server error, please try again later." });
  }
});

function extractWalletAddress(text) {
  const regex = /0x[a-fA-F0-9]{40}/; // Ethereum wallet address pattern
  const match = text.match(regex);
  return match ? match[0] : "Invalid wallet address"; // Returns the address if found, otherwise error message
}

function parseData(data) {

  const cleaned = data
    // 1. Quote the keys
    .replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":')
    // 2. Quote the values if they are unquoted strings (e.g., 0xaddress)
    .replace(/:\s*([a-zA-Z_][\w]*|0x[\w]+)/g, (match, p1) => {
      if (['true', 'false', 'null'].includes(p1)) return `: ${p1}`;
      return `: "${p1}"`;
    });

  return JSON.parse(cleaned);
}

module.exports = router;
