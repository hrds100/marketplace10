const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      default: "", // Default value for username
    },
    email: {
      type: String,
      default: "", // Default empty string for email
    },
    twitter: {
      type: String,
      default: "", // Default empty string for twitter
    },
    profilePhoto: {
      type: String,
      default: "", // Default empty string for profile photo
    },
    fcmTokens: {
      type: [String], // Array of strings for FCM tokens
      default: [], // Default is an empty array
    },
    sessionId: { type: String, default: "" }, // Store session ID from Veriff
  },

  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
