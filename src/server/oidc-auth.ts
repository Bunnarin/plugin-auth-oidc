import { AuthConfig, BaseAuth } from '@nocobase/auth';
import { Issuer, BaseClient } from 'openid-client';
import { cookieName } from '../constants';
import * as zlib from 'zlib';

export class OIDCAuth extends BaseAuth {
  constructor(config: AuthConfig) {
    const { ctx } = config;
    super({
      ...config,
      userCollection: ctx.db.getCollection('users'),
    });
  }

  getRedirectUri() {
    const ctx = this.ctx;

    if (process.env.OIDC_REDIRECT_BASE_URL) {
      return `${process.env.OIDC_REDIRECT_BASE_URL}${process.env.API_BASE_PATH}oidc:redirect`;
    }

    const { http, port } = this.getOptions();
    const protocol = http ? 'http' : 'https';
    const host = port ? `${ctx.hostname}${port ? `:${port}` : ''}` : ctx.host;
    return `${protocol}://${host}${process.env.API_BASE_PATH}oidc:redirect`;
  }

  getOptions() {
    return this.options?.oidc || {};
  }

  getExchangeBody() {
    const options = this.getOptions();
    const { exchangeBodyKeys } = options;
    if (!exchangeBodyKeys) {
      return {};
    }
    const body: any = {};
    exchangeBodyKeys
      .filter((item: any) => item.enabled)
      .forEach((item: any) => {
        const name = item.paramName || item.optionsKey;
        body[name] = options[item.optionsKey];
      });
    return body;
  }

  mapField(userInfo: any) {
    const { fieldMap } = this.getOptions();
    if (!fieldMap) {
      return userInfo;
    }
    fieldMap.forEach((item: any) => {
      const { source, target } = item;
      if (userInfo[source]) {
        userInfo[target] = userInfo[source];
      }
    });
    return userInfo;
  }

  async createOIDCClient(): Promise<BaseClient> {
    const { issuer, clientId, clientSecret, idTokenSignedResponseAlg } = this.getOptions();
    
    let oidc;
    try {
      oidc = await Issuer.discover(issuer);
    } catch (err: any) {
      this.ctx.logger.info('OIDC Issuer.discover failed. Attempting manual fetch and gzip decompression...', { issuer, error: err.message });
      try {
        const res = await fetch(`${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`);
        const arrayBuffer = await res.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        let jsonText = '';
        if (uint8Array.length >= 2 && uint8Array[0] === 0x1f && uint8Array[1] === 0x8b) {
          jsonText = zlib.gunzipSync(uint8Array).toString('utf-8');
        } else {
          jsonText = Buffer.from(arrayBuffer).toString('utf-8');
        }
        const metadata = JSON.parse(jsonText);
        oidc = new Issuer(metadata);
      } catch (fallbackErr: any) {
        this.ctx.logger.error('OIDC manual fetch fallback also failed', { error: fallbackErr.message });
        throw err; // throw original error
      }
    }

    return new oidc.Client({
      client_id: clientId,
      client_secret: clientSecret,
      id_token_signed_response_alg: idTokenSignedResponseAlg || 'RS256',
    });
  }

  async validate() {
    const ctx = this.ctx;
    const { params: values } = ctx.action;
    const { userInfoMethod = 'GET', accessTokenVia = 'header', stateToken } = this.getOptions();

    const token = stateToken || ctx.cookies.get(cookieName);
    const search = new URLSearchParams(decodeURIComponent(values.state));

    if (search.get('token') !== token) {
      ctx.logger.error('nocobase_oidc state mismatch', { method: 'validate' });
      return null;
    }

    const client = await this.createOIDCClient();
    
    let tokens;
    try {
      tokens = await client.callback(
        this.getRedirectUri(),
        { code: values.code, iss: values.iss },
        {},
        { exchangeBody: this.getExchangeBody() }
      );
    } catch (err: any) {
      if (err.message && err.message.includes('id_token not present')) {
        this.ctx.logger.warn('id_token missing, falling back to oauthCallback', { error: err.message });
        tokens = await client.oauthCallback(
          this.getRedirectUri(),
          { code: values.code, iss: values.iss },
          {},
          { exchangeBody: this.getExchangeBody() }
        );
      } else {
        throw err;
      }
    }

    // Check if the token response itself contains an error (e.g. invalid_grant)
    if ((tokens as any).error) {
      throw new Error(`Token exchange failed: ${(tokens as any).error}${(tokens as any).error_description ? ' - ' + (tokens as any).error_description : ''}`);
    }

    let userInfo;
    if (client.issuer.metadata.issuer.includes('telegram')) {
      if (tokens.id_token) {
        userInfo = tokens.claims();
      } else {
        try {
           if (tokens.access_token && tokens.access_token.split('.').length === 3) {
             const payload = Buffer.from(tokens.access_token.split('.')[1], 'base64').toString('utf-8');
             userInfo = JSON.parse(payload);
           } else if (tokens.sub || tokens.id || tokens.email || tokens.username) {
             // Claims might be returned directly in the token response root!
             userInfo = { ...tokens };
           } else {
             this.ctx.logger.error('No claims found in Telegram token response', { tokens });
             // Fallback to userinfo even though it might throw, just in case
             userInfo = await client.userinfo(tokens, {
               method: userInfoMethod,
               via: accessTokenVia !== 'query' ? accessTokenVia : 'header',
               params: accessTokenVia === 'query' ? { access_token: tokens.access_token } : {},
             });
           }
        } catch (e: any) {
           this.ctx.logger.error('Failed to get userinfo for telegram fallback', { error: e.message, tokens });
           // If we still have some identifying info in tokens, use it
           if (tokens.sub || tokens.email) {
             userInfo = { ...tokens };
           } else {
             throw new Error('Telegram provider did not return an id_token and userinfo failed: ' + e.message);
           }
        }
      }
    } else {
      userInfo = await client.userinfo(tokens, {
        method: userInfoMethod,
        via: accessTokenVia !== 'query' ? accessTokenVia : 'header',
        params: accessTokenVia === 'query' ? { access_token: tokens.access_token } : {},
      });
    }

    const mappedUserInfo = this.mapField(userInfo);
    const { username, name, sub, email, phone } = mappedUserInfo;
    const authenticator = this.authenticator as any;

    this.ctx.logger.info('OIDC Validation: ', { mappedUserInfo, userBindField: this.getOptions().userBindField });

    let user = await authenticator.findUser(sub);

    const updateOverwrittenFields = async (foundUser: any) => {
      const { fieldMap = [] } = this.getOptions();
      const updates: any = {};
      let hasUpdates = false;

      fieldMap.forEach((item: any) => {
        if (mappedUserInfo[item.target] === undefined)
          return;

        if ((!item.overwrite && !foundUser.get(item.target)) ||
          (item.overwrite && foundUser.get(item.target) !== mappedUserInfo[item.target])
        ) {
          updates[item.target] = mappedUserInfo[item.target];
          hasUpdates = true;
        }
      });

      if (hasUpdates)
        await foundUser.update(updates);
    };

    if (user) {
      await updateOverwrittenFields(user);
      return user;
    }

    const { userBindField = ['email'] } = this.getOptions();
    const bindFields = Array.isArray(userBindField) ? userBindField : [userBindField];
    const orConditions: any[] = [];

    bindFields.forEach((field) => {
      const bindValue = mappedUserInfo[field];
      if (bindValue) {
        orConditions.push({ [field]: bindValue });
      }
    });

    if (orConditions.length > 0)
      user = await this.userRepository.findOne({ filter: { $or: orConditions } });

    this.ctx.logger.info('OIDC Found User: ', { user: user ? user.id : null, bindFields, orConditions });

    if (user) {
      await authenticator.addUser(user.id, {
        through: { uuid: sub },
      });
      await updateOverwrittenFields(user);
      return user;
    }

    const publicOpts = this.options?.public || {};
    this.ctx.logger.info('OIDC autoSignup check: ', { publicOpts, options: this.options });

    if (!publicOpts.autoSignup) {
      throw new Error(`User not found (autoSignup is ${publicOpts.autoSignup})`);
    }

    // @ts-ignore
    if (username && !this.validateUsername(username)) {
      throw new Error(`Username must be 2-16 characters in length (excluding @.<>"'/)`);
    }

    const newUserData: any = { username, email };

    const { fieldMap = [] } = this.getOptions();
    fieldMap.forEach((item: any) => {
      if (item.target && mappedUserInfo[item.target] !== undefined) {
        newUserData[item.target] = mappedUserInfo[item.target];
      }
    });

    return await authenticator.newUser(sub, newUserData);
  }
}
