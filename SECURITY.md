# 🛡️ Security Policy — AutoApp

Security and data integrity in B2B environments are fundamental to the design and implementation of AutoApp.

## Supported Versions

| Version | Supported |
| :--- | :--- |
| `0.1.x` (Main) | :white_check_mark: |

## Security Model & Defensive Posture

### 1. Fail-Closed Authentication
- All protected routes within the SaaS dashboard are cryptographically verified on the server side using `supabase.auth.getUser()`.
- On any network error, token expiration, or missing header, the middleware immediately redirects to the login screen (`fail-closed`), preventing unauthorized access.

### 2. Anti-SSRF Media Proxy Firewall
- The `/api/proxy-image` endpoint enforces strict request filtering:
  - Whitelists only `http:` and `https:` URL schemes.
  - Rejects private, loopback, and local IP addresses according to RFC 1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`).
  - Explicitly blocks cloud provider metadata endpoints (`169.254.169.254` for AWS/GCP).
  - Caps maximum download size to 15 MB and restricts MIME types strictly to valid images (`image/*`).

### 3. Third-Party OAuth Secret Isolation
- MercadoLibre VIS tokens are persisted in PostgreSQL (`agency_integrations`) safeguarded by Row Level Security (RLS).
- Tokens are never exposed in URL query parameters or insecure browser storage (`localStorage`).
- Token refresh cycles are handled transactionally on the backend to prevent race conditions across concurrent serverless function executions.

## Reporting a Vulnerability

If you discover a potential security issue in this repository, please disclose it responsibly:
- Please **do not** open a public issue.
- Send an email to `tomas.skarp@gmail.com` with:
  - Description of the potential vulnerability
  - Steps or proof of concept to reproduce the behavior
  - Estimated impact

We sincerely appreciate the security community and developers who help keep this project safe.
