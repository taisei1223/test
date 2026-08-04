import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "姿勢分析アプリ",
        short_name: "姿勢分析",
        description: "スマートフォンで撮影した写真から姿勢の左右・前後の傾きを分析するアプリ",
        theme_color: "#2f6fed",
        background_color: "#f5f6f8",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // Pose model (.task) and wasm assets are fetched from a CDN and are
        // multi-MB; don't try to precache the app shell over them.
        globPatterns: ["**/*.{js,css,html,svg}"],
      },
    }),
  ],
});
