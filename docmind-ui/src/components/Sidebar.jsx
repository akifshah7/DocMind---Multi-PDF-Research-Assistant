import { useState } from "react";
import axios from "axios";
import {
  FileText,
  Upload,
  CheckCircle,
  Sun,
  Moon,
  FolderOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function Sidebar({
  ingestedFiles,
  setIngestedFiles,
  dark,
  setDark,
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setError("");
  };

  const handleIngest = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError("");

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const res = await axios.post("http://127.0.0.1:8000/ingest", formData);
      setIngestedFiles((prev) => [...prev, ...res.data.files]);
      setFiles([]);
    } catch (err) {
      setError("Failed to ingest PDFs. Make sure the server is running.",err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="w-72 min-w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col p-5 gap-6 overflow-y-auto transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="text-blue-500" size={22} />
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
            DocMind
          </h1>
        </div>
        <button
          onClick={() => setDark((d) => !d)}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-500 -mt-4">
        Multi-PDF Research Assistant
      </p>

      <div className="border-t border-zinc-200 dark:border-zinc-800" />

      {/* Upload */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-semibold">
          Upload PDFs
        </h2>

        <label className="flex flex-col items-center gap-2 p-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer text-zinc-400 dark:text-zinc-500 text-sm hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 transition-colors">
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload size={22} />
          <span>
            {files.length > 0
              ? `${files.length} file(s) selected`
              : "Click to select PDFs"}
          </span>
        </label>

        {files.length > 0 && (
          <ul className="flex flex-col gap-1">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 truncate"
              >
                <FileText size={12} />
                {f.name}
              </li>
            ))}
          </ul>
        )}

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={13} />
            {error}
          </div>
        )}

        <button
          onClick={handleIngest}
          disabled={files.length === 0 || loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Ingesting...
            </>
          ) : (
            <>
              <Upload size={15} />
              Ingest PDFs
            </>
          )}
        </button>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800" />

      {/* Ingested docs */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-semibold flex items-center gap-1.5">
          <FolderOpen size={13} />
          Ingested Documents
        </h2>
        {ingestedFiles.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            No documents yet
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ingestedFiles.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 truncate"
              >
                <CheckCircle size={13} className="text-green-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
