# Security policy

Security fixes target the latest derivative release. This project is an unofficial Sub2API derivative; upstream vulnerabilities and derivative-specific issues should be distinguished in reports.

Report privately through this repository's **Security → Report a vulnerability**. Include the affected commit, prerequisites, a minimal reproduction using disposable accounts, and expected/actual behavior. Do not post live keys, account exports, databases, cookies or exploit details against a live deployment in public issues.

Never commit deployment `.env`, config.yaml, private keys, database dumps, Redis snapshots or provider credentials. Public source contains no production credentials. Rotate credentials if a real leak occurs; deleting a public file does not erase Git history.

See [review scope and limitations](docs/fork/SECURITY_REVIEW.md). Passing tests and scanners is evidence for the listed checks, not a guarantee that every vulnerability has been eliminated.
