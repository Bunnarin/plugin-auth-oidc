# @bunnarin/plugin-auth-oidc

An enhanced OpenID Connect (OIDC) authentication plugin for NocoBase. This plugin extends the default OIDC capabilities with advanced mapping, dynamic binding, and improved compatibility with various identity providers.

## Features

### 1. Advanced User Binding (Multiple Fields)
Instead of being restricted to a single field (like `email` or `username`), you can now select **multiple fields** to bind the OIDC identity to an existing NocoBase user.
- If a user has multiple emails (e.g., work and personal) stored in different columns, you can select both.
- The plugin will automatically construct an `$or` query to find and authenticate the user if the OIDC payload matches *any* of the selected bind fields.

### 2. Field Mapping with "Overwrite" Sync
When mapping fields from the OIDC provider's callback data to your NocoBase `users` collection, you can now toggle the **Overwrite** option for each specific mapped field.
- **Enabled (Overwrite: true)**: Every time the user logs in via OIDC, the plugin will sync the latest data from the provider (e.g., updating their `name`, `phone_number`, or `picture`) to the NocoBase database, overwriting existing values.
- **Disabled (Overwrite: false)**: The plugin will only populate the field if the NocoBase user record currently has no value for it.

### 3. Custom Authorization URL Query Parameters
You can inject custom query parameters directly into the authorization URL when redirecting users to the OIDC provider.
- Useful for providers that require specific flags like `prompt=consent`, `access_type=offline`, or custom branding parameters.
- Configurable directly from the Admin Settings UI under the **Advanced** tab.

### 4. Smart Telegram OIDC Compatibility
Unlike standard OIDC providers, Telegram does not provide a standard `userinfo_endpoint`.
- This plugin automatically detects if the provider lacks a `userinfo_endpoint` (like Telegram).
- It smoothly falls back to extracting the user claims directly from the ID token, preventing the standard `userinfo_endpoint must be configured on the issuer` error.
- Works out-of-the-box without requiring manual toggles.

## Configuration

1. Go to your NocoBase Admin Panel -> **Authentication**.
2. Add or Edit the **OIDC** authenticator.
3. In the settings form, you will find the new options for **Custom query parameters**, **Overwrite** checkboxes in the **Field mapping** tab, and a multi-select dropdown for **Use this field to bind the user**.
