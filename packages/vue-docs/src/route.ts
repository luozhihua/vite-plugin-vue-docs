import { Config, vueToJsonData } from "./index";
import { debug, getBaseUrl, toLine, toPascalCase } from "./utils";
import { RenderData } from "./type";
import { ViteDevServer } from "vite";
import * as fs from "fs";
import Cache from "./cache";

// 子组件
export interface Route {
  name: string;
  path: string;
  file: string;
  component: string;
  data?: RenderData | null;
  demo?: Demo | null;
  meta: { [k: string]: any };
  beforeEnter?: (to: Route, from: Route) => Promise<any>;
}

export interface Demo {
  file: string;
  name: string;
  code: string;
}

export interface NavRoute {
  title: string;
  data: {
    path: string;
    name: string;
  }[];
}

class DocsRoute {
  // key: routePath
  route: { [key: string]: Route };
  config: Config;
  baseRoute: string;
  server: ViteDevServer | null | undefined;
  private static _instance: DocsRoute;

  private constructor(config: Config) {
    this.route = {};
    this.config = config;
    this.baseRoute = getBaseUrl(this.config);
  }

  static instance(config?: Config): DocsRoute {
    if (!this._instance && config) {
      this._instance = new this(config);
    }

    return this._instance;
  }

  initWs(server: ViteDevServer): void {
    this.server = server;
  }

  getRoutePathByFile(file: string): string | null {
    let newFile = file;
    if (file.includes("demo")) {
      newFile = file.replace(".demo.vue", ".vue");
    }

    if (this.config.fileExp.test(newFile)) {
      const path = newFile.replace(this.config.root, "").replace(".vue", "");
      return toLine(path);
    }

    return null;
  }

  getRouteNameByFile(file: string): string | null {
    const routePath = this.getRoutePathByFile(file);
    if (routePath) {
      return toPascalCase(routePath.replace(/\//g, "_"));
    }

    return null;
  }

  getRouteByFile(file: string): Route | null {
    const routePath = this.getRoutePathByFile(file);
    if (routePath) return this.route[routePath];
    return null;
  }

  getRouteDemo(route: Route, demoFile: string): Demo {
    return {
      file: demoFile,
      name: route.name + "Demo",
      code: fs.readFileSync(demoFile, "utf-8"),
    };
  }

  add(file: string): { [key: string]: Route } {
    const routePath = this.getRoutePathByFile(file);
    if (!routePath) return this.route;

    const routeName = this.getRouteNameByFile(file) || "";
    const demoFile = file.replace(".vue", ".demo.vue");

    const result = vueToJsonData(fs.readFileSync(file, "utf-8"));

    const route: Route = {
      path: routePath,
      name: routeName,
      file,
      component: "",
      data: result?.content,
      meta: {},
    };

    if (fs.existsSync(demoFile)) {
      route.meta.demo = this.getRouteDemo(route, demoFile);
      // debug.route("add demo %O", route.meta.demo);
    }

    const cacheDir = Cache.childFile(this.config, route);
    route.meta.componentPath = cacheDir.replace(/\\/g, "/");

    route.component = `() => import('${cacheDir.replace(/\\/g, "/")}')`;

    if (fs.existsSync(demoFile)) {
      route.meta.demo = {
        file: demoFile,
        name: toPascalCase(routeName + "-demo"),
        code: fs.readFileSync(demoFile, "utf-8"),
      };
    }

    this.route[routePath] = route;

    return this.route;
  }

  change(file: string): void {
    const routePath = this.getRoutePathByFile(file);
    if (!routePath || !this.route[routePath]) return;
    const route = this.route[routePath];

    if (file.includes(".demo.vue")) {
      route.meta.demo = this.getRouteDemo(route, file);
    } else {
      const result = vueToJsonData(fs.readFileSync(file, "utf-8"));
      // debug.route("change %O", this.route[routePath]);
      this.route[routePath].data = result?.content;
    }

    Cache.childFile(this.config, this.route[routePath]);
  }

  toArray(): Route[] {
    const arr = [];
    for (const key in this.route) {
      arr.push(this.route[key]);
    }

    return arr;
  }

  toClientCode(): string {
    const docs = [
      `{path: "changelog",name: "ChangeLog",component: () => import('${this.config.templateDir}/ChangeLog.vue')}`,
      `{path: "",name: "HelloWorld",component: () => import('${this.config.templateDir}/HelloWorld.vue')}`,
    ];

    for (const key in this.route) {
      const route = this.route[key];
      docs.push(`
        {
          path: "${route.path.replace(/^[\/\\]/, "")}",
          name: "${route.name}",
          component: () => import("${route.meta.componentPath}"),
          props: {
            content: ${JSON.stringify(route.data, null, 2)},
          },
          meta: ${JSON.stringify(route.meta, null, 2)},
          beforeEnter: onBeforeEnter
        }
      `);
    }

    const layout = `[{
      path: '${this.config.base || "/docs"}',
      /* @vite-ignore */
      component: () => import('${this.config.cacheDir.replace(
        /\\/g,
        "/"
      )}/vue-doc-layout.vue'),
      children: [
        ${docs.join(",\r\n").replace(/\s+/g, " ")}
      ]
    }]`
      .replace(/\s+/g, " ")
      .replace(/\n+/g, "\n");

    Cache.createLayout(this.config, this);

    const code = `
      // import {emitter} from '@bige/vite-plugin-vue-docs/dist';
      let Vue = null;
      const loaded = {};
      const onBeforeEnter = async function(to, from) {
        const demoMeta = to.meta.demo;
        if (demoMeta) {
          // emitter.emit('beforeDemoLoad', to.meta.demo);
          const demoComp = await import(/* @vite-ignore */demoMeta.file);
          const demo = demoComp.default || demoComp;
          // emitter.emit('afterDemoLoad', demo);
          Vue.component(demoMeta.name, demo);
          // loaded[demoMeta.name] = true;
        }
      }
      export function initVueDocsDemo(_vue) { Vue = _vue; };
      export const routes = ${layout};
      export default routes;
      `;

    return code;
  }

  xtoClientCode(): string {
    const arr = [];
    const demoImports = [];
    const demoComponent = [];
    for (const key in this.route) {
      const route = this.route[key];
      const json = {
        path: route.path.replace(/^[\/\\]/, ""),
        name: route.name,
        component: route.component,
        // meta: route.meta,
        // beforeEnter: route.beforeEnter,
        props: {
          content: route.data,
        },
      };

      const demo = route.meta.demo;
      if (demo) {
        const demoName = demo.name;
        demoImports.push(`import ${demoName} from "${demo.file}"`);
        demoComponent.push(`Vue.component('${demoName}', ${demoName})`);
      }

      arr.push(
        JSON.stringify(json).replace(/"\(\) => .*?\)"/, function (str) {
          return str.replace(/"/g, "");
        })
      );
    }

    arr.push(
      `{path: "changelog",name: "ChangeLog",component: () => import('${this.config.templateDir}/ChangeLog.vue')}`
    );

    arr.push(
      `{path: "",name: "HelloWorld",component: () => import('${this.config.templateDir}/HelloWorld.vue')}`
    );

    const layout = `[{
      path: '${this.config.base || "/docs"}',
      component: () => import('${this.config.cacheDir}/vue-doc-layout.vue'),
      children: [${arr.join(",\n").replace(/\s+/g, "")}]
    }]`;

    Cache.createLayout(this.config, this);

    // debug.route("demo imports %O", demoImports);
    // debug.route("demo component %O", demoComponent);

    let code = `export const routes = ${layout
      .replace(/\s+|\n+/g, "")
      .replace(/\\/g, "/")};\n`;
    code += `${
      demoImports.length <= 1
        ? demoImports.join(";") + ";\n"
        : demoImports.join(";") + ";\n"
    }`;

    code += `export function initVueDocsDemo(Vue) {${
      demoComponent.length <= 1
        ? demoComponent.join(",") + "\n"
        : demoComponent.join(";\n")
    }};`.replace(/\n+/g, "");
    code += `export default routes;`;

    return code;
  }

  toNavRouteData(): NavRoute[] {
    const navs: NavRoute[] = [];

    const config = this.config;
    const routes = this.toArray();

    if (config.showUse) {
      navs.push({
        title: "使用指南",
        data: [
          { path: config.base, name: "使用说明" },
          {
            path: config.base + "/changelog",
            name: "更新日志",
          },
        ],
      });
    }

    // 组件路由
    navs.push({
      title: "组件",
      data: routes.map((item) => {
        return {
          name: item.name,
          path: config.base + item.path,
        };
      }),
    });
    return navs;
  }

  clean(): void {
    this.route = {};
    Cache.clean(this.config);
  }
}

export default DocsRoute;
