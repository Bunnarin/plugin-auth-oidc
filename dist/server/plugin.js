/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var plugin_exports = {};
__export(plugin_exports, {
  PluginOIDCServer: () => PluginOIDCServer,
  default: () => plugin_default
});
module.exports = __toCommonJS(plugin_exports);
var import_server = require("@nocobase/server");
var import_actions = require("./actions");
var import_constants = require("../constants");
var import_oidc_auth = require("./oidc-auth");
var import_path = require("path");
class PluginOIDCServer extends import_server.Plugin {
  afterAdd() {
  }
  beforeLoad() {
  }
  async load() {
    this.db.addMigrations({
      namespace: "auth",
      directory: (0, import_path.resolve)(__dirname, "migrations"),
      context: { plugin: this }
    });
    this.app.authManager.registerTypes(import_constants.authType, {
      auth: import_oidc_auth.OIDCAuth
    });
    this.app.resource({
      name: "oidc",
      actions: {
        getAuthUrl: import_actions.getAuthUrl,
        redirect: import_actions.redirect
      }
    });
    this.app.acl.allow("oidc", "*", "public");
    import_server.Gateway.getInstance().addAppSelectorMiddleware(async (ctx, next) => {
      const { req } = ctx;
      const url = new URL(req.url, `http://${req.headers.host}`);
      const params = url.searchParams;
      const state = params.get("state");
      if (!state) {
        return next();
      }
      const search = new URLSearchParams(state);
      const appName = search.get("app");
      if (appName) {
        ctx.resolvedAppName = appName;
      }
      await next();
    });
  }
  async install(options) {
  }
  async afterEnable() {
  }
  async afterDisable() {
  }
  async remove() {
  }
}
var plugin_default = PluginOIDCServer;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PluginOIDCServer
});
