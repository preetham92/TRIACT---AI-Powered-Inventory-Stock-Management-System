export async function askRag(query, topK = 5) {
  const jwtToken = localStorage.getItem("token"); // match AuthContext
  if (!jwtToken) throw new Error("Missing JWT token. Please log in.");

  try {
    const resp = await fetch("http://localhost:8011/api/rag/query", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${jwtToken}` },
      body: JSON.stringify({ query, topK }),
    });

    if (resp.status === 401) throw new Error("Unauthorized. JWT invalid or expired.");
    if (!resp.ok) throw new Error(`Server error: ${resp.status} - ${await resp.text()}`);

    return await resp.json();
  } catch (err) {
    console.error("RAG query failed:", err);
    return { answer: "Error: Could not fetch response.", sources: [] };
  }
}
