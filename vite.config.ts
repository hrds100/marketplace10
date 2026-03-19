import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Custom plugin to handle Particle Network's WASM modules (thresh-sig)
function particleWasmPlugin(): Plugin {
  return {
    name: "particle-wasm",
    apply: "build",
    enforce: "post",
    // Ensure .wasm files are treated as assets, not processed by Vite
    config() {
      return {
        build: {
          rollupOptions: {
            // Don't warn about circular deps in Particle SDK
            onwarn(warning, defaultHandler) {
              if (warning.code === "CIRCULAR_DEPENDENCY" &&
                  warning.message?.includes("particle")) return;
              defaultHandler(warning);
            },
          },
        },
      };
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Node.js polyfills needed by Particle SDK (Buffer, crypto, process, etc.)
    nodePolyfills({
      include: ["buffer", "crypto", "stream", "util", "process", "events", "url", "http", "https", "os", "path", "assert"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    particleWasmPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Pre-bundle Particle SDK deps so Vite handles them correctly
  optimizeDeps: {
    include: [
      "@particle-network/authkit",
      "ethers",
    ],
    esbuildOptions: {
      // Ensure esbuild targets modern browsers that support top-level await + WASM
      target: "es2022",
    },
  },
  build: {
    target: "es2022",
  },
}));
