
// 📍 LOCATION: lib/auth.js
// 📍 ACTION: REPLACE your existing lib/auth.js with this

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Please define the JWT_SECRET environment variable inside .env");
}

/**
 * Signs a JWT token for a user
 */
export const signToken = (user) => {
  const payload = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    shopId: user.shopId,
    salary: user.salary,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
};

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authMiddleware = (handler) => async (req, res) => {
  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ 
      message: "Authorization token not found or invalid" 
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return handler(req, res);
  } catch (error) {
    console.error("[AUTH] Token verification failed:", error.message);
    return res.status(401).json({ 
      message: "Invalid or expired token" 
    });
  }
};

/**
 * Middleware to verify user has owner role
 */
export const ownerMiddleware = (handler) =>
  authMiddleware(async (req, res) => {
    if (req.user.role !== "owner") {
      return res.status(403).json({ 
        message: "Access denied. Owner role required." 
      });
    }
    return handler(req, res);
  });

/**
 * Utility to extract and verify token (for direct use)
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};