# Temporary development dependency exception

There is **one known, unfixed high-severity development-tool dependency advisory**. A passing security workflow does not mean that the complete dependency graph has zero advisories. Production dependencies must still have zero findings.

| Field | Reviewed scope |
| --- | --- |
| Advisory | [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), CVE-2026-112366 |
| Package / locked versions | `picomatch` 2.3.2 and 4.0.7 |
| Risk | A crafted repeated extglob can cause excessive regexp backtracking and block a Node.js event loop |
| Review date | 2026-11-18 |
| Expires | **2026-12-02 00:00 UTC**; CI rejects the exception from that date onward |
| Owner | Fork maintainer, Callia218 |
| Reachability | Vite, Vitest, Tailwind and ESLint development-tool chains; no production finding in `pnpm audit --prod` |
| Fix availability | The npm registry has published only through 4.0.7; GitHub lists no first patched release. The registry audit suggests `>=4.0.8`, but that version was not available at review time. The linked upstream PR was not merged. |

The exception in `tools/check_frontend_audit.py` requires all of the following:

- The exact GHSA ID, package, high severity and one of the two reviewed locked versions match.
- **Every finding explicitly reports `dev: true`**, with non-empty dependency paths and no bundled/optional ambiguity.
- Every path starts at a dependency listed only in this frontend's `devDependencies`, not in `dependencies`, `optionalDependencies` or `peerDependencies`, and ends at `picomatch`.
- The separately executed production audit succeeds and contains no advisories at any severity.
- Both reports use the expected schema, their vulnerability counters agree with their findings, their command exit codes agree with their contents, and the exception has not expired.

Unknown advisories, ambiguous scopes, a production path, unexpected versions, invalid/failed audit output or expiry cause CI failure. There is no package-wide ignore, general severity exception or `continue-on-error`. The complete audit JSON, stderr, exit codes and policy decision are retained in the `frontend-dependency-audit` workflow artifact for 30 days, including failed runs.

Until a released fix is available, keep development and build tools on trusted project inputs. Do not expose a development server publicly or pass untrusted user-controlled glob patterns to this tooling. Production deployment serves built static files and does not run Vite/Vitest/ESLint/Tailwind. These controls reduce exposure; they do not repair the vulnerable package.

Before expiry, check the upstream release and advisory, update the lockfile to a verified fixed version, run frontend build/lint/tests and both audits, then remove the exception. If no fix exists, the expiry must trigger a new explicit risk review rather than automatic extension.

Local verification:

```bash
python tools/check_frontend_audit.py --self-test
```

The self-test checks normal reports and rejection of unknown GHSA IDs, production/ambiguous findings, production dependency roots, unsupported versions, expired exceptions, audit command failures and malformed output. The CI workflow supplies the real reports and command exit codes; it does not override the clock.
