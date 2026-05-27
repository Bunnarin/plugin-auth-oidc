import { AuthConfig, BaseAuth } from '@nocobase/auth';
import { BaseClient } from 'openid-client';
export declare class OIDCAuth extends BaseAuth {
    constructor(config: AuthConfig);
    getRedirectUri(): string;
    getOptions(): any;
    getExchangeBody(): any;
    mapField(userInfo: any): any;
    createOIDCClient(): Promise<BaseClient>;
    validate(): Promise<any>;
}
