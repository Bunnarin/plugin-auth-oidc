import { Plugin, Gateway, InstallOptions } from '@nocobase/server';
import { getAuthUrl, redirect } from './actions';
import { authType } from '../constants';
import { OIDCAuth } from './oidc-auth';
import { resolve } from 'path';

export class PluginOIDCServer extends Plugin {
  afterAdd() { }

  beforeLoad() { }

  async load() {
    this.db.addMigrations({
      namespace: 'auth',
      directory: resolve(__dirname, 'migrations'),
      context: { plugin: this },
    });

    this.app.authManager.registerTypes(authType, {
      auth: OIDCAuth,
    });

    this.app.resource({
      name: 'oidc',
      actions: {
        getAuthUrl,
        redirect,
      },
    });

    this.app.acl.allow('oidc', '*', 'public');

    Gateway.getInstance().addAppSelectorMiddleware(async (ctx: any, next: any) => {
      const { req } = ctx;
      const url = new URL(req.url, `http://${req.headers.host}`);
      const params = url.searchParams;
      const state = params.get('state');

      if (!state) {
        return next();
      }

      const search = new URLSearchParams(state);
      const appName = search.get('app');

      if (appName) {
        ctx.resolvedAppName = appName;
      }

      await next();
    });
  }

  async install() {
    const { execSync } = require('child_process');
    const result = execSync('yarn install', {
      stdio: 'pipe',
      encoding: 'utf8'
    });
  }
}

export default PluginOIDCServer;
