import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Trash2, Copy, ChevronUp, ChevronDown } from "lucide-react";
import { useActivityLog, clearActivityLog, type LogEntry } from "@/lib/activityLog";

const LEVEL_CONFIG: Record<
  LogEntry["level"],
  { icon: string; color: string }
> = {
  success: { icon: "\u2705", color: "text-emerald-400" },
  error: { icon: "\u274c", color: "text-red-400" },
  info: { icon: "\ud83d\udd04", color: "text-amber-400" },
  action: { icon: "\u26a1", color: "text-cyan-400" },
};

export default function ActivityTerminal() {
  const entries = useActivityLog();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, expanded]);

  const handleCopyAll = () => {
    const text = entries
      .map(
        (e) =>
          `${e.timestamp}  ${LEVEL_CONFIG[e.level].icon}  ${e.source} | ${e.message}`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    clearActivityLog();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800">
      {/* Collapsed bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gray-900 text-gray-400 text-xs px-4 py-2 cursor-pointer hover:bg-gray-800 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5" />
          <span>
            {expanded ? "\u25bc" : "\u25b6"} Activity Console —{" "}
            {entries.length} event{entries.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-gray-950 flex flex-col" style={{ maxHeight: "20rem" }}>
              {/* Toolbar */}
              <div className="flex items-center justify-end gap-2 px-4 py-1.5 border-b border-gray-800">
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? "Copied!" : "Copy All"}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>

              {/* Log entries */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs leading-relaxed"
                style={{ maxHeight: "17rem" }}
              >
                {entries.length === 0 ? (
                  <div className="text-gray-600 py-4 text-center">
                    No activity yet. Events will appear as health checks, tests, and pings run.
                  </div>
                ) : (
                  entries.map((entry, i) => {
                    const config = LEVEL_CONFIG[entry.level];
                    return (
                      <div key={`${entry.timestamp}-${i}`} className="flex gap-2 py-0.5">
                        <span className="text-gray-600 shrink-0 select-none">
                          {entry.timestamp}
                        </span>
                        <span className="shrink-0 select-none">{config.icon}</span>
                        <span className={config.color}>
                          {entry.source} | {entry.message}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
