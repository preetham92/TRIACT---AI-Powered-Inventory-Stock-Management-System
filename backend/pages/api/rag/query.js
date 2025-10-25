import { ownerMiddleware } from "../../../lib/auth.js";

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8011";

async function ragQueryHandler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { query, topK = 5 } = req.body;

  if (!query) {
    return res.status(400).json({ message: "Query parameter is required" });
  }

  try {
    // Extract the JWT token from the request
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    console.log("[RAG PROXY] Forwarding query to Python service:", query);
    console.log("[RAG PROXY] User shopId:", req.user.shopId);

    // Forward the request to the Python RAG service WITH the JWT
    const response = await fetch(`${RAG_SERVICE_URL}/api/rag/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader, // 🔑 Forward the JWT token!
      },
      body: JSON.stringify({ query, topK }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[RAG PROXY] Python service error:", errorText);
      return res.status(response.status).json({
        message: "RAG service error",
        error: errorText,
      });
    }

    const data = await response.json();
    console.log("[RAG PROXY] ✅ Response received from Python service");

    return res.status(200).json(data);
  } catch (error) {
    console.error("[RAG PROXY] ❌ Error:", error);
    return res.status(500).json({
      message: "Failed to query RAG service",
      error: error.message,
    });
  }
}

// Export with owner middleware to ensure only shop owners can query
export default ownerMiddleware(ragQueryHandler);