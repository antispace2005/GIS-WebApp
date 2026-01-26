import { defineConfig } from "vite";
import path from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  root: "./",
  publicDir: "public",
  server: {
    port: 5173,
    open: true,
    strictPort: false,
    host: "localhost",
    proxy: {
      "/geoserver": {
        target: "http://192.168.1.11:8090/",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    minify: "terser",
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
    },
  },
  optimizeDeps: {
    include: ["ol", "@turf/turf", "ol-cesium", "cesium"],
  },
  define: {
    // Define Cesium base URL
    CESIUM_BASE_URL: JSON.stringify("/cesium"),
  },
  plugins: [
    // Copy Cesium assets to build output
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/cesium/Build/Cesium/Workers",
          dest: "cesium",
        },
        {
          src: "node_modules/cesium/Build/Cesium/ThirdParty",
          dest: "cesium",
        },
        {
          src: "node_modules/cesium/Build/Cesium/Assets",
          dest: "cesium",
        },
        {
          src: "node_modules/cesium/Build/Cesium/Widgets",
          dest: "cesium",
        },
      ],
    }),
  ],
});
