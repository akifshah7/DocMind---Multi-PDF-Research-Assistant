import { useState, useRef, useEffect } from "react";
import axios from "axios";
import Message from "./Message";
import { Send, FileSearch } from "lucide-react";

export default function Chat({ messages, setMessages, hasDocuments }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/query`, { question });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.answer,
          sources: res.data.sources,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col flex-1 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="m-auto text-center flex flex-col items-center gap-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-2xl">
              <FileSearch size={36} className="text-blue-500" />
            </div>
            <h2 className="text-lg font-medium text-zinc-500 dark:text-zinc-400">
              Ask anything about your documents
            </h2>
            <p className="text-sm text-zinc-400 dark:text-zinc-600 max-w-xs">
              {hasDocuments
                ? "Your documents are ready — ask a question below"
                : "Upload and ingest a PDF from the sidebar to get started"}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={i} message={msg} />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center transition-colors duration-300">
              <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!hasDocuments || loading}
          placeholder={
            hasDocuments
              ? "Ask something about your documents..."
              : "Upload a PDF first..."
          }
          className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 text-sm px-4 py-3 rounded-xl transition-colors disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!hasDocuments || loading || !input.trim()}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </main>
  );
}
