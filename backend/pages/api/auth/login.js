// pages/api/auth/login.js
// 📍 LOCATION: pages/api/auth/login.js
// 📍 ACTION: REPLACE your existing pages/api/auth/login.js with this

import connectDB from "../../../lib/db.js";
import User from "../../../models/User.js";
import { signToken } from "../../../lib/auth.js";

export default async function handler(req, res) {
  // Handle OPTIONS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST method
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  await connectDB();
  const { email, password } = req.body;

  console.log("--- [LOGIN] ATTEMPT ---");
  console.log("[LOGIN] Email:", email);

  try {
    // Find user with password hash
    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      console.log("[LOGIN] User not found");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      console.log("[LOGIN] Password mismatch");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = signToken(user);

    // Prepare user response (without password)
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
    };

    console.log("[LOGIN] ✅ Success for user:", user.email);

    return res.status(200).json({
      message: "Logged in successfully",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("[LOGIN] ❌ Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}