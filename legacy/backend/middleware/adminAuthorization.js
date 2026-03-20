const { ethers } = require("ethers");

const verifyAdmin = (req, res, next) => {
  const ADMIN_WALLET = process.env.ADMIN_WALLET;

  const { message, signature } = req.body;

  if (!message || !signature) {
    return res
      .status(400)
      .json({ message: "Both message and signature are required." });
  }

  try {
    // Extract timestamp from the message
    const [, timestampStr] = message.split("|Timestamp: ");
    if (!timestampStr) {
      return res.status(400).json({ message: "Invalid message format" });
    }

    // Parse the UTC timestamp (in seconds)
    const messageTimestamp = parseInt(timestampStr, 10);
    if (isNaN(messageTimestamp)) {
      return res.status(400).json({ message: "Invalid timestamp" });
    }

    // Get the current UTC time (in seconds)
    const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds
    const timeDifference = currentTime - messageTimestamp;

    // Ensure the timestamp is within a 1-minute window (60 seconds)
    if (timeDifference > 60 || timeDifference < 0) {
      return res.status(401).json({ message: "Message expired" });
    }

    // Recover the signer address
    const signer = ethers.utils.verifyMessage(message, signature);

    // Check if the recovered address matches the admin wallet
    if (signer.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // If everything is valid, proceed to the next middleware
    next();
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(401).json({ message: "Invalid signature" });
  }
};

module.exports = verifyAdmin;
