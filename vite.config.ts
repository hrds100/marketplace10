import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from "vite-plugin-node-polyfills";

/**
 * Particle WASM Plugin — copies thresh_sig_wasm_bg.wasm to the build output
 * and rewrites the import to point to the correct URL.
 *
 * The problem: @particle-network/thresh-sig loads WASM via:
 *   new URL("../wasm/thresh_sig_wasm_bg.wasm", import.meta.url)
 * After Vite bundles it, import.meta.url points to the JS chunk in /assets/,
 * and the relative path doesn't resolve. The WASM file never gets copied.
 *
 * Fix: copy the WASM file to dist/assets/ and let Vite's asset handling work.
 */
function particleWasmPlugin(): Plugin {
  const wasmFileName = "thresh_sig_wasm_bg.wasm";

  return {
    name: "particle-wasm",
    enforce: "post",

    // Dev server: serve the WASM file from node_modules
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith(wasmFileName)) {
          const wasmPath = path.resolve(
            __dirname,
            "node_modules/@particle-network/thresh-sig/wasm",
            wasmFileName,
          );
          if (fs.existsSync(wasmPath)) {
            res.setHeader("Content-Type", "application/wasm");
            res.setHeader("Cache-Control", "public, max-age=31536000");
            fs.createReadStream(wasmPath).pipe(res);
            return;
          }
        }
        next();
      });
    },

    // Build: copy WASM file to output and suppress circular dep warnings
    config() {
      return {
        build: {
          rollupOptions: {
            onwarn(warning, defaultHandler) {
              if (
                warning.code === "CIRCULAR_DEPENDENCY" &&
                warning.message?.includes("particle")
              )
                return;
              defaultHandler(warning);
            },
          },
        },
      };
    },

    // After build: copy WASM to dist/assets/
    closeBundle() {
      const wasmSrc = path.resolve(
        __dirname,
        "node_modules/@particle-network/thresh-sig/wasm",
        wasmFileName,
      );
      const wasmDest = path.resolve(__dirname, "dist/assets", wasmFileName);

      if (fs.existsSync(wasmSrc)) {
        const destDir = path.dirname(wasmDest);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(wasmSrc, wasmDest);
        console.log(`[particle-wasm] Copied ${wasmFileName} to dist/assets/`);
      }
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
      include: [
        "buffer",
        "crypto",
        "stream",
        "util",
        "process",
        "events",
        "url",
        "http",
        "https",
        "os",
        "path",
        "assert",
      ],
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
      // Force ALL React imports to use our React 18 — not the React 19 copy
      // nested inside @particle-network/authkit's @ant-design/v5-patch-for-react-19.
      // Without this, Vite resolves some React internals from React 19 which has
      // ReactSharedInternals.S (Suspense) that React 18 doesn't → crash: "reading 'S'"
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime"),
    },
  },
  // Pre-bundle Particle SDK deps so Vite handles them correctly
  optimizeDeps: {
    include: ["@particle-network/authkit", "ethers"],
    esbuildOptions: {
      target: "es2022",
    },
  },
  build: {
    target: "es2022",
    // Ensure WASM files referenced via new URL() are treated as assets
    assetsInlineLimit: 0,
  },
}));
