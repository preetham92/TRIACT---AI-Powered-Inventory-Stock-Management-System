import React, { useState } from "react";

function Chat({ jwtToken }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch("http://localhost:8011/api/rag/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwtToken}`, // must be valid!
        },
        body: JSON.stringify({ query: userMessage.text, topK: 5 })
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error("RAG server error:", resp.status, errorText);
        setMessages(prev => [
          ...prev,
          { role: "assistant", text: `⚠️ Server error ${resp.status}: ${errorText}` }
        ]);
        return;
      }

      const data = await resp.json();
      const aiMessage = { role: "assistant", text: data.answer || "No answer received." };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: "⚠️ Error talking to AI. Check if Python RAG server is running." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col border rounded-lg p-3 h-96">
      <div className="flex-1 overflow-y-auto space-y-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-2 rounded-lg max-w-xs ${
              msg.role === "user"
                ? "ml-auto bg-indigo-100 text-indigo-900"
                : "mr-auto bg-gray-100 text-gray-800"
            }`}
          >
            {msg.text}
          </div>
        ))}
        {loading && <div className="text-gray-400">AI is typing...</div>}
      </div>
      <div className="flex mt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask something..."
          className="flex-1 border rounded-l-lg p-2"
        />
        <button onClick={sendMessage} className="bg-indigo-600 text-white px-4 rounded-r-lg">
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;
