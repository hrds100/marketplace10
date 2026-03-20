const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");
const User = require("../models/user");
const { isHexAddress, normalizeAddress } = require("../utils/helpers");
require("dotenv").config();

// const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
// const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
// const SUMSUB_BASE_URL = process.env.SUMSUB_BASE_URL;

// Create a custom Axios instance for KYC-related API requests
// const kycAxios = axios.create({
//   baseURL: SUMSUB_BASE_URL,
// });

// Interceptor to apply signature only for KYC requests
// kycAxios.interceptors.request.use(createSignature, function (error) {
//   return Promise.reject(error);
// });

// Function to create a signature for requests
// function createSignature(config) {
//   console.log("Creating a signature for the request...");
//   const ts = Math.floor(Date.now() / 1000);
//   const signature = crypto.createHmac("sha256", SUMSUB_SECRET_KEY);
//   signature.update(ts + config.method.toUpperCase() + config.url);

//   if (config.data instanceof FormData) {
//     signature.update(config.data.getBuffer());
//   } else if (config.data) {
//     signature.update(JSON.stringify(config.data));
//   }

//   config.headers["X-App-Access-Ts"] = ts;
//   config.headers["X-App-Access-Sig"] = signature.digest("hex");
//   return config;
// }

// Function to create an applicant
// function createApplicant(externalUserId, levelName) {
//   return {
//     method: "post",
//     url: "/resources/applicants?levelName=" + levelName,
//     headers: {
//       Accept: "application/json",
//       "Content-Type": "application/json",
//       "X-App-Token": SUMSUB_APP_TOKEN,
//     },
//     data: { externalUserId },
//   };
// }

// Function to get applicant status
// function getApplicantStatus(applicantId) {
//   return {
//     method: "get",
//     url: `/resources/applicants/${applicantId}/status`,
//     headers: {
//       Accept: "application/json",
//       "X-App-Token": SUMSUB_APP_TOKEN,
//     },
//   };
// }

// Function to get applicant details
// function getApplicant(externalUserId) {
//   return {
//     method: "get",
//     url: `/resources/applicants/-;externalUserId=${externalUserId}/one`,
//     headers: {
//       Accept: "application/json",
//       "X-App-Token": SUMSUB_APP_TOKEN,
//     },
//   };
// }

// Function to create an access token
// function createAccessToken(
//   externalUserId,
//   levelName = "basic-kyc-level",
//   ttlInSecs = 600
// ) {
//   return {
//     method: "post",
//     url: `/resources/accessTokens?userId=${externalUserId}&ttlInSecs=${ttlInSecs}&levelName=${levelName}`,
//     headers: {
//       Accept: "application/json",
//       "X-App-Token": SUMSUB_APP_TOKEN,
//     },
//   };
// }

// API Endpoint for KYC verification
router.post("/kycverification", async (req, res) => {
  try {
    const { externalUserId } = req.body;
    let applicantIdObj = {};

    let response = await kycAxios(
      createApplicant(externalUserId, "basic-kyc-level")
    );
    applicantIdObj.applicantId = response.data.id;

    response = await kycAxios(getApplicantStatus(applicantIdObj.applicantId));
    response = await kycAxios(
      createAccessToken(externalUserId, "basic-kyc-level", 1200)
    );
    applicantIdObj.response = response.data;

    res.status(200).json(applicantIdObj);
  } catch (error) {
    console.error(
      "Error in KYC verification:",
      error.response?.data || error.message
    );
    res.status(500).json({ message: "KYC verification failed." });
  }
});

// API to generate access token
router.post("/generateAccessToken", async (req, res) => {
  try {
    const { externalUserId } = req.body;

    let response = await kycAxios(
      createAccessToken(externalUserId, "basic-kyc-level", 1200)
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Error generating access token:",
      error.response?.data || error.message
    );
    res.status(500).json({ message: "Failed to generate access token." });
  }
});

// API to get applicant status
router.get("/getApplicantStatus", async (req, res) => {
  try {
    const { applicantId } = req.query;

    let response = await kycAxios(getApplicantStatus(applicantId));
    res.status(200).json({ reviewStatus: response.data.reviewStatus });
  } catch (error) {
    console.error(
      "Error getting applicant status:",
      error.response?.data || error.message
    );
    res.status(200).json({ reviewStatus: "notFound" });
  }
});

// API to get applicant details
router.get("/getApplicant", async (req, res) => {
  try {
    const { externalUserId } = req.query;

    let response = await kycAxios(getApplicant(externalUserId));
    res.status(200).json({ applicantId: response.data.id });
  } catch (error) {
    console.error(
      "Error getting applicant:",
      error.response?.data || error.message
    );
    res.status(200).json({ applicantId: null });
  }
});

//veriff

router.get("/check-wallet/:walletAddress", async (req, res) => {
  try {
    const raw = req.params.walletAddress ?? "";
    const addr = normalizeAddress(raw);

    // Validate basic EVM hex format (cheap + safe)
    if (!isHexAddress(addr)) {
      return res.status(400).json({ error: "Invalid wallet address format" });
    }

    // Query using normalized address
    const user = await User.findOne({ walletAddress: addr }).lean();

    if (!user) {
      return res.status(404).json({ message: "Wallet not registered" });
    }

    return res.json({ sessionId: user.sessionId || null });
  } catch (err) {
    console.error("check-wallet error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});


router.get("/kyc-status/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const endpoint = `/v1/sessions/${sessionId}/decision/fullauto?version=1.0.0`;

    // 🔹 Correct Payload: Only use sessionId
    const signature = crypto
      .createHmac("sha256", process.env.VERIFF_SECRET_KEY)
      .update(sessionId) // Only session ID should be used
      .digest("hex");
    const response = await axios.get(
      `https://stationapi.veriff.com${endpoint}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-AUTH-CLIENT": process.env.VERIFF_API_KEY,
          "X-HMAC-SIGNATURE": signature,
        },
      }
    );

    const status = response.data.decision;
    console.log(response.data.decision)
    res.json({ status });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err });
  }
});

router.post("/save-session", async (req, res) => {
  try {
    const { walletAddress, sessionId } = req.body;
    await User.findOneAndUpdate(
      { walletAddress },
      { sessionId },
      { upsert: true }
    );
    res.json({ message: "Session ID saved successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Error saving session ID" });
  }
});

module.exports = router;
