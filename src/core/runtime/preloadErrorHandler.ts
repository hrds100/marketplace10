// One-shot reload when a code-split chunk 404s after a deploy.
// Without this, a stale tab shows "Failed to fetch dynamically imported module".
// Flag is per-tab-session and never cleared — at most one auto-reload per tab,
// so a broken deploy can never put us in a reload loop.
const RELOAD_KEY = "nfs_preload_reloaded";

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (e) => {
    (e as Event).preventDefault();
    if (sessionStorage.getItem(RELOAD_KEY)) return;
    sessionStorage.setItem(RELOAD_KEY, "1");
    window.location.reload();
  });
}
