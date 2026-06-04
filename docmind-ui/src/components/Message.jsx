import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";

export default function Message({ message }) {
  const [showSources, setShowSources] = useState(false);
  const isAssistant = message.role === "assistant";

  return (
    <div className={`flex animate-slide-up ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed transition-colors duration-300 ${
          isAssistant
            ? "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-bl-sm"
            : "bg-blue-600 text-white rounded-br-sm"
        }`}
      >
        <p>{message.content}</p>

        {isAssistant && message.sources?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setShowSources((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              <BookOpen size={12} />
              {showSources ? "Hide" : "Show"} sources ({message.sources.length})
              {showSources ? (
                <ChevronUp size={12} />
              ) : (
                <ChevronDown size={12} />
              )}
            </button>

            <div
              className="grid transition-all duration-300 ease-in-out"
              style={{ gridTemplateRows: showSources ? "1fr" : "0fr" }}
            >
              <ul className="overflow-hidden flex flex-col gap-1 mt-2">
                {message.sources.map((source, i) => (
                  <li
                    key={i}
                    className="text-xs text-zinc-400 dark:text-zinc-500"
                  >
                    — {source}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
