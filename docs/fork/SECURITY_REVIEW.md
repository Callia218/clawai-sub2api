# Security review — 2026-11-09

Scope: upstream v0.2.20 merge, derivative billing/auth/Kiro/Pelican paths, Linux.SB integration, dependency risks and public-source disclosure. This is a targeted engineering review, not a complete independent penetration test or a claim of zero vulnerabilities.

## Findings and evidence

| ID | Result | Evidence / reproduction boundary |
| --- | --- | --- |
| E1 / D1 | Retained subscription inflight reservations; daily, weekly and monthly budgets passed | `backend/cmd/security-verify/main.go`; isolated PostgreSQL copy + Redis: 20 requests, 1 admitted/19 rejected for each budget; holds survive delayed async settlement; stale cache rejected |
| E2 / D2 | Retained balance reservation and authoritative post-reserve reads | Same isolated test: 20 requests, 1 admitted/19 rejected, final balance zero; repeated billing command applied once; underestimated actual cost recorded -0.01 debt and disabled test user |
| E3 / P1 | Exact issued access-token registry plus isolated configuration mount | Correctly signed but unissued administrator JWT rejected, both empty/nonempty binding; actual candidate HTTP returned 401; logout revoked access; Redis outage refused issuance. Does not protect against an attacker with DB + Redis write control |
| E4 | Fixed a non-atomic token-revocation index delete | `auth_issued_token_cache.go` now uses Lua; concurrency regression ensures live tokens are not orphaned from the family index |
| E5 | Hardened OIDC claim validation and errors | Required exp and iat, validates future iat and any supplied azp, existing issuer/audience/signature/nonce/sub checks retained; negative tests in `auth_oidc_oauth_test.go`. Provider token error bodies no longer enter callback URLs or logs |
| E6 | Removed Pelican metadata/error disclosure to ordinary users | `pelican/handler.go` redacts historical error rows, key IDs/names/fragments and shared status reports without mutating shared state; admin-only configuration/run routes retained; regression in `handler_test.go` |
| E7 | Restricted generated HTML network surface | `pelicanPreview.ts` installs CSP before all generated content; iframe keeps `sandbox="allow-scripts"` without same-origin. Connect/frame/object/form/base restricted. Browser CPU exhaustion by malicious scripts is not fully addressed |
| E8 | Real Linux.SB provider flow verified | Authorization code, S256 PKCE, signed ID Token and authenticated profile binding succeeded. Identity uses issuer + sub; virtual unverified email is not treated as a verified local mailbox. New-account invitation/email flow not exercised live |
| E9 | Dependencies checked | `govulncheck` v1.9.0 after x/crypto and x/image fixes: no vulnerabilities found. `pnpm audit` on final lockfile: 0 info/low/moderate/high/critical, including dev dependencies |
| E10 | Public-source disclosure checks | Gitleaks found 53 reviewed upstream examples/test fixtures/public verification keys/SQL identifiers. Every span matched upstream; source-span hashes stored in `.github/reviewed-secret-findings.json`. Separate private production comparison checked 22 sensitive values (followed by a fresh comparison after provider client migration) with no match; no values are published |
| E11 | Build and compatibility | Go targeted regression across handlers/services/repositories/middleware/Kiro/payment passed; frontend typecheck/build and 229 targeted tests passed; migration 249 ran on isolated production copy; MCP authorization/ownership/redaction tests passed |

## Static analysis limits

Gosec scanned 978 files / about 392k lines and reported 188 candidates. 187 source contexts were identical to upstream; the derivative hit was the Kiro loopback redirect URI (not a credential). Manual review covered the changed identity/billing/Pelican paths, cookie attributes, key examples, dynamic SQL query construction, backup process invocation, plugin execution boundary and relevant authorization.

SQL candidates inspected build identifiers/clauses from fixed choices with values passed as parameters; psql uses an argument array rather than a shell; plugin execution is an explicit trusted-admin capability with package verification and executable checksum. Cookie Secure is derived from HTTPS and the trusted reverse proxy. Weak-random candidates include scheduling jitter, probes, display/tool IDs and order identifiers; they must not be repurposed as authentication secrets.

The Windows Gosec run could not build SSA for some large service/repository packages despite Go compilation/tests passing. **A full interprocedural SAST review of all upstream candidates remains backlog.** No statement that all 188 candidates are false positives is made. A broader Linux CodeQL/SAST review and isolated resource-exhaustion tests should be scheduled independently before treating this as a comprehensive audit.

## Deployment boundaries

- Keep production `.env` and configuration readable only by the required owner, mount application configuration read-only outside writable data, and never serve deployment directories as static files.
- Restrict the origin to the intended reverse proxy; do not trust client-supplied forwarding headers on an exposed origin. The operating deployment uses Cloudflare authenticated origin pulls.
- PostgreSQL and Redis must not have public port mappings. Redis is part of the token authenticity boundary; it is not an untrusted cache.
- MCP defaults off; enabling it creates a management surface and requires HTTPS plus least-privilege OAuth grants.
- Do not install untrusted native plugins or expose administrator exports/backups to ordinary users.
- Production upstream accounts were not used for destructive concurrency tests. No paid load/DoS test, fresh Linux.SB registration, exhaustive all-provider suite, independent asset-license audit or container-base-image CVE scan was performed.
- Inflight prices are estimates. Unexpected actual overrun is recorded and the account is disabled; preventing all loss would require true upper bounds or prepaid execution supported by every upstream.

Local deployment logs, host paths, account records and screenshots are intentionally excluded from this public report. The source tests and commands in README allow independent reproduction on disposable infrastructure.

## Publication gate follow-up

GitHub push protection flagged two upstream native Google OAuth client pairs. They were removed from the unpublished initial history, not bypassed. The derivative now requires operator-supplied client IDs and secrets; missing configuration fails closed. Test fixtures use fake values. Production values were migrated locally into permission-600 deployment files without printing them. Focused unit and service tests cover the new configuration path.
