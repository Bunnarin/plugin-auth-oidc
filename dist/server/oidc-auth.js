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
var oidc_auth_exports = {};
__export(oidc_auth_exports, {
  OIDCAuth: () => OIDCAuth
});
module.exports = __toCommonJS(oidc_auth_exports);
var import_auth = require("@nocobase/auth");
var import_openid_client = require("openid-client");
var import_constants = require("../constants");
class OIDCAuth extends import_auth.BaseAuth {
  constructor(config) {
    const { ctx } = config;
    super({
      ...config,
      userCollection: ctx.db.getCollection("users")
    });
  }
  getRedirectUri() {
    const ctx = this.ctx;
    if (process.env.OIDC_REDIRECT_BASE_URL) {
      return `${process.env.OIDC_REDIRECT_BASE_URL}${process.env.API_BASE_PATH}oidc:redirect`;
    }
    const { http, port } = this.getOptions();
    const protocol = http ? "http" : "https";
    const host = port ? `${ctx.hostname}${port ? `:${port}` : ""}` : ctx.host;
    return `${protocol}://${host}${process.env.API_BASE_PATH}oidc:redirect`;
  }
  getOptions() {
    var _a;
    return ((_a = this.options) == null ? void 0 : _a.oidc) || {};
  }
  getExchangeBody() {
    const options = this.getOptions();
    const { exchangeBodyKeys } = options;
    if (!exchangeBodyKeys) {
      return {};
    }
    const body = {};
    exchangeBodyKeys.filter((item) => item.enabled).forEach((item) => {
      const name = item.paramName || item.optionsKey;
      body[name] = options[item.optionsKey];
    });
    return body;
  }
  mapField(userInfo) {
    const { fieldMap } = this.getOptions();
    if (!fieldMap) {
      return userInfo;
    }
    fieldMap.forEach((item) => {
      const { source, target } = item;
      if (userInfo[source]) {
        userInfo[target] = userInfo[source];
      }
    });
    return userInfo;
  }
  async createOIDCClient() {
    const { issuer, clientId, clientSecret, idTokenSignedResponseAlg } = this.getOptions();
    const oidc = await import_openid_client.Issuer.discover(issuer);
    return new oidc.Client({
      client_id: clientId,
      client_secret: clientSecret,
      id_token_signed_response_alg: idTokenSignedResponseAlg || "RS256"
    });
  }
  async validate() {
    var _a;
    const ctx = this.ctx;
    const { params: values } = ctx.action;
    const { userInfoMethod = "GET", accessTokenVia = "header", stateToken } = this.getOptions();
    const token = stateToken || ctx.cookies.get(import_constants.cookieName);
    const search = new URLSearchParams(decodeURIComponent(values.state));
    if (search.get("token") !== token) {
      ctx.logger.error("nocobase_oidc state mismatch", { method: "validate" });
      return null;
    }
    const client = await this.createOIDCClient();
    const tokens = await client.callback(
      this.getRedirectUri(),
      {
        code: values.code,
        iss: values.iss
      },
      {},
      { exchangeBody: this.getExchangeBody() }
    );
    const userInfo = await client.userinfo(tokens, {
      method: userInfoMethod,
      via: accessTokenVia !== "query" ? accessTokenVia : "header",
      params: accessTokenVia === "query" ? { access_token: tokens.access_token } : {}
    });
    const mappedUserInfo = this.mapField(userInfo);
    const { nickname, username, name, sub, email, phone } = mappedUserInfo;
    const authenticator = this.authenticator;
    this.ctx.logger.info("OIDC Validation: ", { mappedUserInfo, userBindField: this.getOptions().userBindField });
    let user = await authenticator.findUser(sub);
    if (user) {
      return user;
    }
    const { userBindField = "email" } = this.getOptions();
    if (userBindField === "email" && email) {
      user = await this.userRepository.findOne({ filter: { email } });
    } else if (userBindField === "username" && username) {
      user = await this.userRepository.findOne({ filter: { username } });
    }
    this.ctx.logger.info("OIDC Found User: ", { user: user ? user.id : null, email, username });
    if (user) {
      await authenticator.addUser(user.id, {
        through: { uuid: sub }
      });
      return user;
    }
    const publicOpts = ((_a = this.options) == null ? void 0 : _a.public) || {};
    this.ctx.logger.info("OIDC autoSignup check: ", { publicOpts, options: this.options });
    if (!publicOpts.autoSignup) {
      throw new Error(`User not found (autoSignup is ${publicOpts.autoSignup})`);
    }
    if (username && !this.validateUsername(username)) {
      throw new Error(`Username must be 2-16 characters in length (excluding @.<>"'/)`);
    }
    return await authenticator.newUser(sub, {
      username: username ?? null,
      nickname: nickname || name || username || sub,
      email: email ?? null,
      phone: phone ?? null
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  OIDCAuth
});
