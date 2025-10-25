// frontend/src/api/rag.js
export async function askRag(query, topK = 5) {
  const jwtToken = localStorage.getItem("token");
  if (!jwtToken) throw new Error("Missing JWT token - login required");
  const resp = await fetch("http://localhost:8011/api/rag/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ query, topK }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`RAG error ${resp.status} - ${text}`);
  }
  return resp.json();
}
