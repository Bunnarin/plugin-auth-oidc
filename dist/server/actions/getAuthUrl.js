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
var getAuthUrl_exports = {};
__export(getAuthUrl_exports, {
  getAuthUrl: () => getAuthUrl
});
module.exports = __toCommonJS(getAuthUrl_exports);
var import_nanoid = require("nanoid");
var import_constants = require("../../constants");
const getAuthUrl = async (ctx, next) => {
  const { redirect = "" } = ctx.action.params.values || {};
  const app = ctx.app.name;
  const auth = ctx.auth;
  const client = await auth.createOIDCClient();
  const { scope, stateToken } = auth.getOptions();
  const token = stateToken || (0, import_nanoid.nanoid)(15);
  ctx.cookies.set(import_constants.cookieName, token, {
    httpOnly: true
  });
  ctx.body = client.authorizationUrl({
    response_type: "code",
    scope: scope || "openid email profile",
    redirect_uri: `${auth.getRedirectUri()}`,
    state: encodeURIComponent(
      `token=${token}&name=${ctx.headers["x-authenticator"]}&app=${app}&redirect=${redirect}`
    )
  });
  return next();
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getAuthUrl
});
