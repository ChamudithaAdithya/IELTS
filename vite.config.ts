import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const isGitHubActions = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.GITHUB_ACTIONS === "true";

export default defineConfig({
  base: isGitHubActions ? "/ielts-academy/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "IELTS Learning Academy",
        short_name: "IELTS Academy",
        description: "Connected English and IELTS learning, ready for offline study.",
        theme_color: "#0a2540",
        background_color: "#f4f6f9",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "icons/academy-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icons/academy-mark.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
        ]
      }
    })
  ]
});
