import type { Plugin, UserConfig } from "vite";
import fg from "fast-glob";
import { vueToJsonData } from "./main";
import DocsRoute from "./route";
import { MODULE_NAME, MODULE_NAME_VIRTUAL } from "./constants";
import path from "path";
import { hmr } from "./hmr";
import Cache from "./cache";
import { emitter } from "./event-bus";

// 可自定义的配置
export interface CustomConfig {
  // 文档路由地址
  base?: string;
  // 组件路径 相对于 src
  componentDir?: string;
  // router实例名称
  vueRoute?: string;
  // 显示使用指南
  showUse?: boolean;
  // header
  header?: ConfigHeader;
  // 指定组件库的入口文件
  entries?: string[];
  // 排除组件, 支持 Glob
  excludes?: string[];
}

interface ConfigHeader {
  title?: string;
}

export interface Config extends CustomConfig {
  // 组件绝对路径
  root: string;
  // 组件正则匹配
  fileExp: RegExp;
  // 缓存路径
  cacheDir: string;
  // vite
  viteConfig?: UserConfig;
  // 模板路径
  templateDir?: string;
  // 用户项目地址
  userProjectDir: string;
}

export default function vueDocs(rawOptions?: CustomConfig): Plugin {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const userPkg = require(`${process.cwd()}/package.json`);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require(`${path.join(__dirname, "../package.json")}`);
  const userProjectDir = process.cwd();

  const config: Config = {
    base: "/docs",
    componentDir: "/components",
    entries: ["main.ts", "main.js"],
    root: "",
    vueRoute: "router",
    fileExp: RegExp(""),
    showUse: true,
    userProjectDir: userProjectDir,
    cacheDir: path.join(userProjectDir.replace(/\\/g, "/"), ".cache-vue-docs"),
    header: {
      title: userPkg.name,
    },
    ...rawOptions,
  };

  // replace('\\','/') to fix windows root path
  config.root = `${process.cwd().replace(/\\/g, "/")}/src${
    config.componentDir
  }`;
  config.fileExp = RegExp(`${config.componentDir}\\/.*?.vue$`);
  config.templateDir = `${pkg.name}/dist/template`;

  const Route = DocsRoute.instance(config);
  Cache.createDir(config);

  return {
    name: "vite-plugin-vue-docs",
    enforce: "pre",
    config(viteConfig) {
      config.viteConfig = viteConfig;
      return {
        server: {
          force: true,
        },
      };
    },

    resolveId(id) {
      return id.includes(MODULE_NAME) ? MODULE_NAME_VIRTUAL : null;
    },

    async load(id) {
      if (id !== MODULE_NAME_VIRTUAL) return null;

      const globs = [
        ".editorconfig",
        `${config.root.replace(/\\/g, "/")}/**/*.vue`,
      ];
      const files = await fg(globs, { ignore: config.excludes });

      files.map((item) => {
        if (!item.includes("demo")) {
          Route.add(item);
        }
      });

      return Route.toClientCode();
    },

    transform(code, id) {
      if (
        config.entries &&
        config.entries.some((entries) => id.includes(entries))
      ) {
        code += `
          // import VueHighlightJS from 'vue3-highlightjs';
          // app.use(VueHighlightJS);

          import {default as hljs} from "highlight.js/lib/core";
          import javascript from "highlight.js/lib/languages/javascript.js";
          import xml from "highlight.js/lib/languages/xml.js";
          import css from "highlight.js/lib/languages/css.js";
          import json from "highlight.js/lib/languages/json.js";
          import markdown from "highlight.js/lib/languages/markdown.js";
          import typescript from "highlight.js/lib/languages/typescript.js";
          import less from "highlight.js/lib/languages/less.js";
          import scss from "highlight.js/lib/languages/scss.js";
          import puppet from "highlight.js/lib/languages/puppet.js";
          import shell from "highlight.js/lib/languages/shell.js";
          import bash from "highlight.js/lib/languages/bash.js";
          import vbscriptHtml from "highlight.js/lib/languages/vbscript-html.js";

          hljs.registerLanguage("javascript", javascript);
          hljs.registerLanguage("xml", xml);
          hljs.registerLanguage("css", css);
          hljs.registerLanguage('json', json);
          hljs.registerLanguage("markdown", markdown);
          hljs.registerLanguage("typescript", typescript);
          hljs.registerLanguage("less", less);
          hljs.registerLanguage("scss", scss);
          hljs.registerLanguage("puppet", puppet);
          hljs.registerLanguage("shell", shell);
          hljs.registerLanguage("bash", bash);
          hljs.registerLanguage("vbscript-html", vbscriptHtml);
          app.directive("highlightjs", (el, binding) => {
            const codeNodes = el.querySelectorAll("code");

            for (let i = 0; i < codeNodes.length; i++) {
              const codeNode = codeNodes[i];

              if (typeof binding.value === "string") {
                codeNode.textContent = binding.value;
              }

              hljs.highlightBlock(codeNode);
            }
          });
        `;
        return code;
      }

      if (!/vue&type=route/.test(id)) {
        return;
      }

      return {
        code: "export default {}",
        map: null,
      };
    },

    configureServer(server) {
      hmr(server, config, Route);
    },
  };
}

export { vueToJsonData, emitter };
