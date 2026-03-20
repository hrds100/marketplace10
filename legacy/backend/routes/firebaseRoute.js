const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { GoogleAuth } = require("google-auth-library");
const axios = require("axios");
const verifyAdmin = require("../middleware/adminAuthorization");

router.post("/send-notification", verifyAdmin, async (req, res) => {
  try {
    const accessToken = await _getAccessToken(); // Get OAuth token

    // Get title, body, and redirectUrl from the request body
    const { title, body, redirectUrl } = req.body;

    // Validate that title, body, and redirectUrl are provided
    if (!title || !body || !redirectUrl) {
      return res.status(400).json({
        message: "Missing title, body, or redirectUrl in request",
      });
    }

    // Fetch all users, only retrieving their fcmTokens
    const users = await User.find({}, { fcmTokens: 1 });

    // Extract all FCM tokens into a single array
    const allFcmTokens = users.reduce((tokens, user) => {
      return tokens.concat(user.fcmTokens);
    }, []);

    if (allFcmTokens.length === 0) {
      return res
        .status(400)
        .json({ message: "No FCM tokens found for any user" });
    }

    // Send notifications to all FCM tokens
    const sendNotificationPromises = allFcmTokens.map(async (token) => {
      const payload = {
        message: {
          token, // Single token
          webpush: {
            data: {
              title: title, // Title from request body
              body: body, // Body from request body
              redirectUrl: redirectUrl, // URL to redirect when clicked
            },
          },
        },
      };

      try {
        const response = await axios.post(
          "https://fcm.googleapis.com/v1/projects/nfstay-app-7cd7e/messages:send", // Your project ID
          JSON.stringify(payload), // Payload as JSON string
          {
            headers: {
              Authorization: `Bearer ${accessToken}`, // OAuth token for authentication
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Notification sent successfully to token:", token);
        return response.data; // Success response for each notification
      } catch (error) {
        console.error(
          "Error sending notification to token:",
          token,
          error.response?.data || error.message
        );
        throw error; // Handle the error, e.g., return an error response for this specific token
      }
    });

    // Wait for all notifications to be sent
    const results = await Promise.allSettled(sendNotificationPromises);

    // Check results for success or failure
    const successResults = results.filter(
      (result) => result.status === "fulfilled"
    );
    const failureResults = results.filter(
      (result) => result.status === "rejected"
    );

    console.log("Successfully sent to:", successResults.length, "users");
    console.log("Failed to send to:", failureResults.length, "users");

    res.status(200).json({
      message: "Notification sent to all users.",
      successCount: successResults.length,
      failureCount: failureResults.length,
    });
  } catch (error) {
    console.error(
      "Error in sending notification:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: "Server error, please try again later.",
      error: error.response?.data || error.message,
    });
  }
});

// router.get("/getAllFcmTokens", async (_, res) => {
//   try {
//     // Fetch all users, only retrieving their fcmTokens
//     const users = await User.find({}, { fcmTokens: 1 });

//     // Extract all FCM tokens into a single array
//     const allFcmTokens = users.reduce((tokens, user) => {
//       // Concatenate the fcmTokens of each user into the final array
//       return tokens.concat(user.fcmTokens);
//     }, []);

//     // Send the response with the array of FCM tokens
//     res.status(200).json({
//       success: true,
//       message: "All FCM tokens fetched successfully",
//       data: allFcmTokens,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error, please try again later." });
//   }
// });

const _getAccessToken = async () => {
  try {
    // Create an OAuth2 client instance using the default credentials
    const auth = new GoogleAuth({
      credentials: {
        client_id: process.env.FIREBASE_CLIENT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });

    // Get the OAuth2 token from the GoogleAuth instance
    const token = await auth.getAccessToken();
    return token; // Access token is returned in token.token
  } catch (error) {
    console.error("Error getting access token:", error);
  }
};

module.exports = router;
