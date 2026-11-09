# Linux.SB OIDC setup

Create an application at https://linux.sb/forum_oauth_apps?view=apply using your own site domain.
Register exactly `https://YOUR_HOST/api/v1/auth/oauth/oidc/callback`.

| Setting | Value |
| --- | --- |
| Provider name | Linux.SB |
| Issuer | https://linux.sb |
| Discovery | https://linux.sb/forum_oauth_discovery |
| Authorization endpoint | https://linux.sb/forum_oauth_authorize |
| Token endpoint | https://linux.sb/forum_oauth_token |
| UserInfo | https://linux.sb/forum_oauth_userinfo |
| JWKS | https://linux.sb/forum_oauth_jwks |
| Scopes | openid profile email |
| Token auth method | client_secret_post |
| Signing algorithms | RS256 |
| PKCE / validate ID token | enabled / enabled |
| Require verified email | disabled |
| ID / email / username paths | sub / email / preferred_username |
| Frontend callback | /auth/oidc/callback |

Enter your own Client ID and Client Secret in administrator settings. Never place the secret in frontend environment variables or Git.

Linux.SB supplies an application-specific virtual email with `email_verified=false`; it is not a mailbox and cannot receive password-reset messages. Account identity is the issuer and subject. Existing users should sign in normally and bind Linux.SB from their profile. New users follow the deployment's invitation and email verification policy; do not relax those controls to make OAuth work.

On 2026-11-09 the operating deployment completed the real authorization-code + S256 PKCE flow, ID-token validation and authenticated account binding. After deployment, logout and a fresh Linux.SB login returned to the dashboard successfully. A separate fresh signup using invitation/email policy was not performed in that check.

`frontend/public/provider-icons/linux-sb.svg` is the operator-supplied original mark, SHA-256 `4c3d42db2a3698944da5dcdf70c44c86a02089ec5f503ade554e8c5b1a1e88ae`.
