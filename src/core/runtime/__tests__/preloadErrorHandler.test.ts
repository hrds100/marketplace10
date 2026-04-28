import { describe, it, expect, beforeEach, vi } from "vitest";

describe("preloadErrorHandler", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.resetModules();
  });

  const dispatch = () =>
    window.dispatchEvent(new Event("vite:preloadError", { cancelable: true }));

  it("reloads once when a chunk preload fails", async () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    });

    await import("../preloadErrorHandler");
    dispatch();

    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("nfs_preload_reloaded")).toBe("1");
  });

  it("does not reload again once the session flag is set", async () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    });

    await import("../preloadErrorHandler");
    dispatch();
    dispatch();
    dispatch();

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
