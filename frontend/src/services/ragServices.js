// src/services/ragService.js
// 📍 Location: src/services/ragService.js (NEW FILE)

import api from "./api.js";

/**
 * Query the RAG system with a natural language question
 * @param {string} query - The user's question
 * @param {number} topK - Number of relevant documents to retrieve (default: 5)
 * @returns {Promise<{answer: string, sources: Array}>}
 */
const queryRAG = async (query, topK = 5) => {
  try {
    const response = await api.post("/api/rag/query", {
      query,
      topK,
    });
    return response.data;
  } catch (error) {
    console.error("[RAG Service] Query failed:", error);
    throw error;
  }
};

/**
 * Clear the RAG cache for the current owner
 * (useful after ingesting new data)
 */
const clearCache = async () => {
  try {
    const response = await api.post("/api/rag/cache/clear");
    return response.data;
  } catch (error) {
    console.error("[RAG Service] Cache clear failed:", error);
    throw error;
  }
};

export default {
  queryRAG,
  clearCache,
};