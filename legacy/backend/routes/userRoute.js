const express = require("express");
const router = express.Router();
const User = require("../models/user");

router.post("/updateUser", async (req, res) => {
  try {
    const { walletAddress, username, email, twitter, profilePhoto } = req.body;

    // Ensure walletAddress is provided, as it is required to find or create the user
    if (!walletAddress) {
      return res.status(400).json({ message: "Wallet address is required." });
    }

    // Prepare the fields to update
    const updateFields = {};

    if (username !== undefined && username !== "")
      updateFields.username = username;
    if (email !== undefined && email !== "") updateFields.email = email;
    if (twitter !== undefined && twitter !== "") updateFields.twitter = twitter;
    if (profilePhoto !== undefined && profilePhoto !== "")
      updateFields.profilePhoto = profilePhoto;

    // If no update fields are provided (other than walletAddress), initialize with default values
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No valid fields to update." });
    }

    // Perform the update (or create the user if it doesn't exist)
    const updatedUser = await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { $set: updateFields },
      { new: true, upsert: true } // upsert ensures user is created if not found
    );

    // Send the response with updated user data
    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error, please try again later." });
  }
});

router.post("/addFcmToken", async (req, res) => {
  try {
    const { walletAddress, fcmToken } = req.body;

    // Ensure walletAddress and fcmToken are provided
    if (!walletAddress || !fcmToken) {
      return res
        .status(400)
        .json({ message: "Wallet address and FCM token are required." });
    }

    // Perform the update: add the fcmToken to the array using $addToSet to avoid duplicates
    const updatedUser = await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() }, // Find the user by wallet address
      { $addToSet: { fcmTokens: fcmToken } }, // Add fcmToken to the array if it doesn't already exist
      { new: true, upsert: true } // upsert ensures user is created if not found
    );

    // Send response with the updated user data
    res.status(200).json({
      success: true,
      message: "FCM token added successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error, please try again later." });
  }
});

router.patch("/deleteProfilePhoto", async (req, res) => {
  try {
    const { walletAddress } = req.body; // Wallet address is used to find the user

    if (!walletAddress) {
      return res.status(400).json({ message: "Wallet address is required" });
    }

    const user = await User.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Set the profilePhoto to an empty string
    user.profilePhoto = "";

    // Save the updated user
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile photo deleted successfully",
      user: user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error deleting profile photo",
      error: error.message,
    });
  }
});

router.get("/userDetails", async (req, res) => {
  try {
    const { walletAddress } = req.query; // Get the wallet address from query params

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }
    const _walletAddress = walletAddress.toLowerCase();
    // Find the user by wallet address, excluding unwanted fields
    const user = await User.findOne({ walletAddress: _walletAddress }).select(
      "-_id -__v -createdAt -updatedAt"
    ); // Exclude _id, __v, createdAt, updatedAt

    res.status(200).json(user || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/allUserDetails", async (_, res) => {
  try {
    // Fetch all users, excluding unwanted fields
    const users = await User.find().select(
      "walletAddress username email twitter -_id"
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
