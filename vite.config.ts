import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { timetableDevApi } from "./plugins/timetableDevApi.ts";

export default defineConfig({
  plugins: [react(), timetableDevApi()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        embed: fileURLToPath(new URL("./embed.html", import.meta.url)),
      },
    },
  },
});
