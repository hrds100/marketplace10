import { useEffect, useState } from "react";

export type LogLevel = "success" | "error" | "info" | "action";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
}

const activityLog: LogEntry[] = [];
const listeners: Set<() => void> = new Set();

export function logActivity(level: LogLevel, source: string, message: string) {
  activityLog.push({
    timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    level,
    source,
    message,
  });
  // Keep max 500 entries
  if (activityLog.length > 500) activityLog.shift();
  listeners.forEach((fn) => fn());
}

export function clearActivityLog() {
  activityLog.length = 0;
  listeners.forEach((fn) => fn());
}

export function getActivityLog(): LogEntry[] {
  return activityLog;
}

export function useActivityLog(): LogEntry[] {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const cb = () => forceUpdate((n) => n + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return activityLog;
}
