// @ts-nocheck
import { css } from '@nocobase/client';
import { useAPIClient, useApp, i18n, SchemaComponent, Plugin } from '@nocobase/client';
import { CopyOutlined, LoginOutlined } from '@ant-design/icons';
import { Button, Card, Input, Space, message } from 'antd';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ArrayItems, FormItem, FormTab } from '@formily/antd-v5';
import { observer } from '@formily/react';
import { authType } from '../constants';

const NAMESPACE = 'oidc';

function t(key: string) {
  return i18n.t(key, { ns: NAMESPACE });
}

function useOidcTranslation() {
  return useTranslation(NAMESPACE);
}

const SignInButton = ({ authenticator }: any) => {
  const { t: translate } = useOidcTranslation();
  const api = useAPIClient();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect');

  const onSignIn = async () => {
    const res = await api.request({
      method: 'post',
      url: 'oidc:getAuthUrl',
      headers: {
        'X-Authenticator': authenticator.name,
      },
      data: {
        redirect: redirectUrl,
      },
    });
    const url = res?.data?.data;
    if (url) {
      window.location.replace(url);
    }
  };

  useEffect(() => {
    const authName = searchParams.get('authenticator');
    const errorMsg = searchParams.get('error');
    if (authName === authenticator.name && errorMsg) {
      message.error(translate(errorMsg));
      return;
    }
  }, []);

  return (
    <Space
      direction="vertical"
      className={css`
        display: flex;
      `}
    >
      <Button shape="round" block icon={<LoginOutlined />} onClick={onSignIn}>
        {translate(authenticator.title)}
      </Button>
    </Space>
  );
};

const Usage = observer(() => {
  const { t: translate } = useOidcTranslation();
  const app = useApp();
  const redirectUrl = useMemo(() => app.getApiUrl('oidc:redirect'), [app]);

  const onCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success(translate('Copied'));
  };

  return (
    <Card title={translate('Usage')} type="inner">
      <FormItem label={translate('Redirect URL')}>
        <Input
          value={redirectUrl}
          disabled
          addonBefore={<CopyOutlined onClick={() => onCopy(redirectUrl)} />}
        />
      </FormItem>
    </Card>
  );
});
Usage.displayName = 'Usage';

const schema = {
  type: 'object',
  properties: {
    public: {
      type: 'object',
      properties: {
        autoSignup: {
          'x-decorator': 'FormItem',
          type: 'boolean',
          title: '{{t("Sign up automatically when the user does not exist")}}',
          'x-component': 'Checkbox',
          default: true,
        },
      },
    },
    oidc: {
      type: 'object',
      properties: {
        collapse: {
          type: 'void',
          'x-component': 'FormTab',
          properties: {
            basic: {
              type: 'void',
              'x-component': 'FormTab.TabPane',
              'x-component-props': {
                tab: t('Basic configuration'),
              },
              properties: {
                issuer: {
                  type: 'string',
                  title: '{{t("Issuer")}}',
                  'x-component': 'Input',
                  'x-decorator': 'FormItem',
                  required: true,
                },
                clientId: {
                  type: 'string',
                  title: '{{t("Client ID")}}',
                  'x-component': 'Input',
                  'x-decorator': 'FormItem',
                  required: true,
                },
                clientSecret: {
                  type: 'string',
                  title: '{{t("Client Secret")}}',
                  'x-component': 'Input',
                  'x-decorator': 'FormItem',
                  required: true,
                },
                scope: {
                  type: 'string',
                  title: '{{t("scope")}}',
                  'x-component': 'Input',
                  'x-decorator': 'FormItem',
                  'x-decorator-props': {
                    tooltip: '{{t("Default: openid profile email")}}',
                  },
                },
                idTokenSignedResponseAlg: {
                  type: 'string',
                  title: '{{t("id_token signed response algorithm")}}',
                  'x-component': 'Select',
                  'x-decorator': 'FormItem',
                  enum: [
                    { label: 'HS256', value: 'HS256' },
                    { label: 'HS384', value: 'HS384' },
                    { label: 'HS512', value: 'HS512' },
                    { label: 'RS256', value: 'RS256' },
                    { label: 'RS384', value: 'RS384' },
                    { label: 'RS512', value: 'RS512' },
                    { label: 'ES256', value: 'ES256' },
                    { label: 'ES384', value: 'ES384' },
                    { label: 'ES512', value: 'ES512' },
                    { label: 'PS256', value: 'PS256' },
                    { label: 'PS384', value: 'PS384' },
                    { label: 'PS512', value: 'PS512' },
                  ],
                },
              },
            },
            mapping: {
              type: 'void',
              'x-component': 'FormTab.TabPane',
              'x-component-props': {
                tab: t('Field mapping'),
              },
              properties: {
                fieldMap: {
                  title: '{{t("Field Map")}}',
                  type: 'array',
                  'x-decorator': 'FormItem',
                  'x-component': 'ArrayItems',
                  items: {
                    type: 'object',
                    'x-decorator': 'ArrayItems.Item',
                    properties: {
                      space: {
                        type: 'void',
                        'x-component': 'Space',
                        properties: {
                          source: {
                            type: 'string',
                            'x-decorator': 'FormItem',
                            'x-component': 'Input',
                            'x-component-props': {
                              placeholder: '{{t("source")}}',
                            },
                          },
                          target: {
                            type: 'string',
                            'x-decorator': 'FormItem',
                            'x-component': 'Select',
                            'x-component-props': {
                              placeholder: '{{t("target")}}',
                            },
                            enum: [
                              { label: t('Nickname'), value: 'nickname' },
                              { label: t('Email'), value: 'email' },
                              { label: t('Phone'), value: 'phone' },
                              { label: t('Username'), value: 'username' },
                            ],
                          },
                          remove: {
                            type: 'void',
                            'x-decorator': 'FormItem',
                            'x-component': 'ArrayItems.Remove',
                          },
                        },
                      },
                    },
                  },
                  properties: {
                    add: {
                      type: 'void',
                      title: 'Add',
                      'x-component': 'ArrayItems.Addition',
                    },
                  },
                },
                userBindField: {
                  type: 'string',
                  title: '{{t("Use this field to bind the user")}}',
                  'x-component': 'Select',
                  'x-decorator': 'FormItem',
                  default: 'email',
                  enum: [
                    { label: t('Email'), value: 'email' },
                    { label: t('Username'), value: 'username' },
                  ],
                  required: true,
                },
              },
            },
            advanced: {
              type: 'void',
              'x-component': 'FormTab.TabPane',
              'x-component-props': {
                tab: t('Advanced configuration'),
              },
              properties: {
                http: {
                  type: 'boolean',
                  title: '{{t("HTTP")}}',
                  'x-component': 'Checkbox',
                  'x-decorator': 'FormItem',
                  'x-decorator-props': {
                    tooltip: '{{t("Check if NocoBase is running on HTTP protocol")}}',
                  },
                },
                port: {
                  type: 'number',
                  title: '{{t("Port")}}',
                  'x-component': 'InputNumber',
                  'x-decorator': 'FormItem',
                  'x-decorator-props': {
                    tooltip: '{{t("The port number of the NocoBase service if it is not 80 or 443")}}',
                  },
                  'x-component-props': {
                    style: { width: '15%', minWidth: '100px' },
                  },
                },
                stateToken: {
                  type: 'string',
                  title: '{{t("State token")}}',
                  'x-component': 'Input',
                  'x-decorator': 'FormItem',
                  description: t(
                    "The state token helps prevent CSRF attacks. It's recommended to leave it blank for automatic random generation."
                  ),
                },
                exchangeBodyKeys: {
                  type: 'array',
                  title: '{{t("Pass parameters in the authorization code grant exchange")}}',
                  'x-decorator': 'FormItem',
                  'x-component': 'ArrayItems',
                  default: [
                    { paramName: '', optionsKey: 'clientId' },
                    { paramName: '', optionsKey: 'clientSecret' },
                  ],
                  items: {
                    type: 'object',
                    'x-decorator': 'ArrayItems.Item',
                    properties: {
                      space: {
                        type: 'void',
                        'x-component': 'Space',
                        properties: {
                          enabled: {
                            type: 'boolean',
                            'x-decorator': 'FormItem',
                            'x-component': 'Checkbox',
                          },
                          optionsKey: {
                            type: 'string',
                            'x-decorator': 'FormItem',
                            'x-decorator-props': {
                              style: { width: '100px' },
                            },
                            'x-component': 'Select',
                            'x-read-pretty': true,
                            enum: [
                              { label: t('Client ID'), value: 'clientId' },
                              { label: t('Client Secret'), value: 'clientSecret' },
                            ],
                          },
                          paramName: {
                            type: 'string',
                            'x-decorator': 'FormItem',
                            'x-component': 'Input',
                            'x-component-props': {
                              placeholder: '{{t("Parameter name")}}',
                            },
                          },
                        },
                      },
                    },
                  },
                },
                userInfoMethod: {
                  type: 'string',
                  title: '{{t("Method to call the user info endpoint")}}',
                  'x-decorator': 'FormItem',
                  'x-component': 'Radio.Group',
                  default: 'GET',
                  enum: [
                    { label: 'GET', value: 'GET' },
                    { label: 'POST', value: 'POST' },
                  ],
                  'x-reactions': [
                    {
                      dependencies: ['.accessTokenVia'],
                      when: '{{$deps[0] === "query"}}',
                      fulfill: {
                        state: {
                          value: 'GET',
                        },
                      },
                    },
                    {
                      dependencies: ['.accessTokenVia'],
                      when: '{{$deps[0] === "body"}}',
                      fulfill: {
                        state: {
                          value: 'POST',
                        },
                      },
                    },
                  ],
                },
                accessTokenVia: {
                  type: 'string',
                  title: '{{t("Where to put the access token when calling the user info endpoint")}}',
                  'x-decorator': 'FormItem',
                  'x-component': 'Radio.Group',
                  default: 'header',
                  enum: [
                    { label: t('Header'), value: 'header' },
                    { label: t('Body (Use with POST method)'), value: 'body' },
                    { label: t('Query parameters (Use with GET method)'), value: 'query' },
                  ],
                },
              },
            },
          },
        },
        usage: {
          type: 'void',
          'x-component': 'Usage',
        },
      },
    },
  },
};

const AdminSettingsForm = () => {
  const { t: translate } = useOidcTranslation();
  return (
    <SchemaComponent
      scope={{ t: translate }}
      components={{ Usage, ArrayItems, Space, FormTab }}
      schema={schema}
    />
  );
};

export class PluginOIDCClient extends Plugin {
  async load() {
    // @ts-ignore
    this.app.pm.get('@nocobase/plugin-auth').registerType(authType, {
      components: {
        SignInButton,
        AdminSettingsForm,
      },
    });
  }
}

export default PluginOIDCClient;
