const express = require("express");
const userRoute = require("./routes/userRoute");
const adminRoute = require("./routes/adminRoute");
const kycRoute = require("./routes/kycRoute");
const firebaseRoute = require("./routes/firebaseRoute");
const samcartRoute = require("./routes/samcartRoute");
const cors = require("cors");
const mongoose = require("mongoose");
const { cert, initializeApp } = require("firebase-admin/app");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5001; // Use environment variable for port

// CORS configuration
app.use(
  cors({
    origin: ["https://app.nfstay.com", "https://rwa-nfstay.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Firebase initialization
initializeApp({
  credential: cert({
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    project_id: process.env.FIREBASE_PROJECT_ID,
  }),
});

// MongoDB connection with caching for serverless environments
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
    });

    console.log("Connected to MongoDB...");
    cachedDb = db;
    return db;
  } catch (err) {
    console.error("Could not connect to MongoDB:", err);
    throw err;
  }
}

// Middleware to ensure database connection before handling requests
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Hello World, I am alive!" });
});

app.use("/api/kyc/", kycRoute);
app.use("/api/user/", userRoute);
app.use("/api/admin/", adminRoute);
app.use("/api/firebase/", firebaseRoute);
app.use("/api/samcart/", samcartRoute);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
