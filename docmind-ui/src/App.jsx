import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";

export default function App() {
  const [ingestedFiles, setIngestedFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return (
    <div className="flex h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <Sidebar
        ingestedFiles={ingestedFiles}
        setIngestedFiles={setIngestedFiles}
        dark={dark}
        setDark={setDark}
      />
      <Chat
        messages={messages}
        setMessages={setMessages}
        hasDocuments={ingestedFiles.length > 0}
      />
    </div>
  );
}
