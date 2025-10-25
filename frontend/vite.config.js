import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      include: "**/*.{jsx,js}",
    }),
  ],
  // Use the more robust object syntax for the proxy
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true, // This is often necessary
        secure: false,
      },
    },
  },
});
