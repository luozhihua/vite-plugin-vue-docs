import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDocs from "@bige/vite-plugin-vue-docs";
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.BASE_URL || "/vite-plugin-vue-docs/",
  server: {
    host: "0.0.0.0",
    port: 5000,
  },
  plugins: [
    vue(),
    vueDocs({
      excludes: ["**/VueSetup.vue", "**/_*.vue", "**/App.vue"],
    }),
  ],
  resolve: {
    alias: {
      vue: "vue/dist/vue.esm-bundler.js",
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // exclude: ["@pkg/components", "ant-design-vue"],
    include: [
      "highlight.js",
      "highlight.js/lib/core",
      "highlight.js/lib/languages/javascript.js",
      "highlight.js/lib/languages/xml.js",
      "highlight.js/lib/languages/css.js",
      "highlight.js/lib/languages/json.js",
      "highlight.js/lib/languages/markdown.js",
      "highlight.js/lib/languages/typescript.js",
      "highlight.js/lib/languages/less.js",
      "highlight.js/lib/languages/scss.js",
      "highlight.js/lib/languages/puppet.js",
      "highlight.js/lib/languages/shell.js",
      "highlight.js/lib/languages/bash.js",
      "highlight.js/lib/languages/vbscript-html.js",
    ],
    esbuildOptions: {
      keepNames: true, // https://cn.vitejs.dev/config/#optimizedeps-keepnames
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("highlight.js")) {
            if (id.includes("languages")) {
              return `hljs-languages-${
                id.split("languages/")[1].split(".js")[0]
              }`;
            } else {
              return "hljs";
            }
          }
        },
      },
    },
  },
});
