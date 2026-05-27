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
var redirect_exports = {};
__export(redirect_exports, {
  redirect: () => redirect
});
module.exports = __toCommonJS(redirect_exports);
var import_server = require("@nocobase/server");
const redirect = async (ctx, next) => {
  const {
    params: { state }
  } = ctx.action;
  const search = new URLSearchParams(decodeURIComponent(state));
  const authenticator = search.get("name");
  const appName = search.get("app");
  const redirect2 = search.get("redirect") || "/admin";
  let prefix = process.env.APP_PUBLIC_PATH || "";
  if (appName && appName !== "main") {
    const appSupervisor = import_server.AppSupervisor.getInstance();
    if ((appSupervisor == null ? void 0 : appSupervisor.runningMode) !== "single") {
      prefix += `apps/${appName}`;
    }
  }
  const auth = await ctx.app.authManager.get(authenticator, ctx);
  if (prefix.endsWith("/")) {
    prefix = prefix.slice(0, -1);
  }
  try {
    const { token } = await auth.signIn();
    ctx.redirect(`${prefix}${redirect2}?authenticator=${authenticator}&token=${token}`);
  } catch (error) {
    ctx.logger.error("OIDC auth error", { error });
    ctx.redirect(`${prefix}/signin?redirect=${redirect2}&authenticator=${authenticator}&error=${error.message}`);
  }
  await next();
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  redirect
});
