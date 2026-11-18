# v0.2.20 to v0.2.23 cumulative upgrade

The `0.2.23-clawai.1` derivative incorporates the complete upstream diff from v0.2.20 through v0.2.23, including v0.2.21 and v0.2.22. It retains unofficial-fork attribution, LGPL-3.0, Kiro, Linux.SB OIDC and its original icon, custom UI, and existing billing/authentication safeguards.

Upstream additions include GPT-6.2 Sol/Astra and Ultra Fast pricing, cache-write TTL accounting, pre-output stream idle retry, atomic refresh-token consumption, batched settlement and non-blocking usage rollups. Five new migration files retain their original names; duplicate numeric prefixes are valid because identity is the complete filename.

## Compatibility fixes

- Batched balance settlement disables accounts when actual charges create debt, in the same database update as the balance change. This preserves single-settlement behavior and auth-cache invalidation. Integration tests cover positive/zero/negative balances, disabled accounts, multiple keys and idempotent replay.
- Inflight estimates include possible forced Fast/Ultra Fast tiers from group and global policy, retaining the client's tier and channel multipliers. The highest candidate cost is reserved without changing the request. Unknown policy fails closed. Tests cover mappings, policy scopes/exceptions and GPT-6.2's 272K long-context threshold.
- Kiro mixed scheduling adopts upstream's configured-account-pool query while retaining Anthropic-only mixing.
- New test fixtures include this fork's Kiro/provider constructor dependencies. Two upstream clock-sensitive fixtures use deterministic distinct values instead of assuming successive clock calls differ.
- Linux.SB SVG checkout explicitly uses LF so Windows builds preserve the original bytes.

Build requirements: Go 1.27.4, Node.js 24, pnpm 11.20.0. No production credentials are included.

## Verification boundaries

CI runs Go unit/integration tests, lint, frontend type checks, source-secret checks and dependency scanning. Local frontend verification covered 1,045 tests across 52 files. The Go scanner reported no known vulnerabilities. Linux CI is authoritative for tests requiring symlinks, POSIX subprocesses and Docker.

There is one known unfixed development-only picomatch advisory. Production dependencies have zero audit findings. See [the strict expiring exception](DEPENDENCY_EXCEPTIONS.md); a passing policy gate does not mean the entire development dependency graph has zero vulnerabilities.

Inflight cost is still an estimate, not a mathematical upper bound for every provider: server-side historical context, cache-write TTL costs and time-dependent channel prices may differ from a request-body estimate. The pre-existing race between concurrent logout and refresh-token rotation is not fully resolved by this upgrade. Full host/container-image audits and every provider's paid end-to-end behavior are outside this update's validation.

Deployment retains a database/configuration backup and previous application/UI artifacts. Database migrations are additive or preserve existing function signatures; rollback compatibility must be checked on an isolated schema before release. Database dumps must never be automatically restored over live post-upgrade transactions.
