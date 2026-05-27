import { Plugin, InstallOptions } from '@nocobase/server';
export declare class PluginOIDCServer extends Plugin {
    afterAdd(): void;
    beforeLoad(): void;
    load(): Promise<void>;
    install(options?: InstallOptions): Promise<void>;
    afterEnable(): Promise<void>;
    afterDisable(): Promise<void>;
    remove(): Promise<void>;
}
export default PluginOIDCServer;
