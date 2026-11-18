#!/usr/bin/env python3
"""Fail closed on pnpm findings, with one expiring, verified dev-only exception."""

import argparse
import copy
import json
import sys
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path

ADVISORY = "GHSA-fc5q-39xc-vjpf"
EXPIRES_ON = date(2026, 12, 2)  # Invalid from 00:00 UTC on this date.
REVIEWED_VERSIONS = {"2.3.2", "4.0.7"}
SEVERITIES = {"info", "low", "moderate", "high", "critical"}


def advisories(report, label):
    if not isinstance(report, dict) or report.get("error") or report.get("errors"):
        raise ValueError(f"{label}: malformed report or audit transport error")
    items = report.get("advisories")
    metadata = report.get("metadata")
    if not isinstance(items, dict) or not isinstance(metadata, dict):
        raise ValueError(f"{label}: unsupported audit schema")
    counts = metadata.get("vulnerabilities")
    if not isinstance(counts, dict) or set(counts) != SEVERITIES:
        raise ValueError(f"{label}: missing or unexpected vulnerability counters")
    if any(type(n) is not int or n < 0 for n in counts.values()):
        raise ValueError(f"{label}: invalid vulnerability counters")
    actual = Counter()
    for item in items.values():
        if not isinstance(item, dict) or item.get("severity") not in SEVERITIES:
            raise ValueError(f"{label}: invalid advisory")
        actual[item["severity"]] += 1
    if any(counts[severity] != actual[severity] for severity in SEVERITIES):
        raise ValueError(f"{label}: findings and counters disagree")
    if report.get("vulnerabilities"):
        raise ValueError(f"{label}: unexpected additional vulnerability schema")
    return list(items.values())


def validate(full, production, manifest, full_exit, production_exit, today):
    all_items = advisories(full, "all dependencies")
    prod_items = advisories(production, "production")
    if production_exit != 0 or prod_items:
        raise ValueError("production audit must succeed with zero findings")
    if full_exit != (1 if all_items else 0):
        raise ValueError("all-dependency audit exit code does not match its findings")
    dev_roots = manifest.get("devDependencies")
    if not isinstance(dev_roots, dict):
        raise ValueError("manifest must identify development dependencies")
    prod_roots = set()
    for field in ("dependencies", "optionalDependencies", "peerDependencies"):
        entries = manifest.get(field, {})
        if not isinstance(entries, dict):
            raise ValueError(f"invalid manifest {field}")
        prod_roots.update(entries)
    accepted = []
    for item in all_items:
        if (item.get("github_advisory_id") != ADVISORY
                or item.get("module_name") != "picomatch"
                or item.get("severity") != "high"):
            raise ValueError("an advisory has no exact reviewed exception")
        if today >= EXPIRES_ON:
            raise ValueError(f"{ADVISORY} exception expired on {EXPIRES_ON}")
        findings = item.get("findings")
        if not isinstance(findings, list) or not findings:
            raise ValueError("excepted advisory has no dependency-scope evidence")
        path_count = 0
        for finding in findings:
            if (not isinstance(finding, dict) or finding.get("dev") is not True
                    or finding.get("version") not in REVIEWED_VERSIONS
                    or finding.get("optional") is not False
                    or finding.get("bundled") is not False):
                raise ValueError("finding is not an exact reviewed development dependency")
            paths = finding.get("paths")
            if not isinstance(paths, list) or not paths:
                raise ValueError("finding has no inspectable dependency paths")
            for path in paths:
                parts = path.split(">") if isinstance(path, str) else []
                if (len(parts) < 3 or parts[0] != "." or parts[-1] != "picomatch"
                        or not all(parts) or parts[1] not in dev_roots
                        or parts[1] in prod_roots):
                    raise ValueError("finding path does not prove an exclusively dev root")
                path_count += 1
        accepted.append({"advisory": ADVISORY, "package": "picomatch",
                         "severity": "high", "scope": "dev-only",
                         "dependency_paths_checked": path_count,
                         "expires_on_utc": EXPIRES_ON.isoformat(),
                         "status": "known-unfixed-temporary-exception"})
    return {"status": "passed", "production_findings": 0,
            "all_dependency_advisories": len(all_items),
            "known_unfixed_dev_exceptions": accepted}


def self_test():
    clean = {"advisories": {}, "metadata": {"vulnerabilities": dict.fromkeys(SEVERITIES, 0)}}
    known = copy.deepcopy(clean)
    known["metadata"]["vulnerabilities"]["high"] = 1
    known["advisories"]["fixture"] = {
        "github_advisory_id": ADVISORY, "module_name": "picomatch", "severity": "high",
        "findings": [{"version": "4.0.7", "dev": True, "optional": False,
                      "bundled": False, "paths": [".>vite>picomatch"]}]}
    manifest = {"devDependencies": {"vite": "6.4.5"}, "dependencies": {"vue": "3"}}
    before = date(2026, 11, 18)
    assert not validate(clean, clean, manifest, 0, 0, before)["known_unfixed_dev_exceptions"]
    assert len(validate(known, clean, manifest, 1, 0, before)["known_unfixed_dev_exceptions"]) == 1
    validate(known, clean, manifest, 1, 0, date(2026, 12, 1))

    def reject(label, full=known, prod=clean, package=manifest, code=1, prod_code=0, day=before):
        try:
            validate(full, prod, package, code, prod_code, day)
        except ValueError:
            return label
        raise AssertionError(f"unexpected acceptance: {label}")

    cases = [reject("expiry", day=EXPIRES_ON), reject("production report", prod=known, prod_code=1),
             reject("audit command failure", code=2), reject("production command failure", prod_code=1),
             reject("missing schema", full={}), reject("error response", full={"error": "registry unavailable"})]
    for label, field, value in [("unknown GHSA", "github_advisory_id", "GHSA-unknown"),
                                 ("different package", "module_name", "other"),
                                 ("severity changed", "severity", "critical")]:
        changed = copy.deepcopy(known)
        changed["advisories"]["fixture"][field] = value
        cases.append(reject(label, full=changed))
    for label, field, value in [("production finding", "dev", False), ("ambiguous scope", "dev", None),
                                 ("production path", "paths", [".>vue>picomatch"]),
                                 ("missing paths", "paths", []), ("unreviewed version", "version", "4.0.6")]:
        changed = copy.deepcopy(known)
        changed["advisories"]["fixture"]["findings"][0][field] = value
        cases.append(reject(label, full=changed))
    changed_manifest = copy.deepcopy(manifest)
    changed_manifest["dependencies"]["vite"] = "6.4.5"
    cases.append(reject("root also in production", package=changed_manifest))
    additional = copy.deepcopy(known)
    additional["advisories"]["new"] = {"github_advisory_id": "GHSA-new", "severity": "low"}
    additional["metadata"]["vulnerabilities"]["low"] = 1
    cases.append(reject("additional low-severity advisory", full=additional))
    inconsistent = copy.deepcopy(known)
    inconsistent["metadata"]["vulnerabilities"]["high"] = 0
    cases.append(reject("counter mismatch", full=inconsistent))
    print(json.dumps({"self_test": "passed", "positive_cases": 3, "negative_cases": cases}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--audit", type=Path)
    parser.add_argument("--production-audit", type=Path)
    parser.add_argument("--audit-exit-code", type=int)
    parser.add_argument("--production-exit-code", type=int)
    parser.add_argument("--manifest", type=Path, default=Path(__file__).resolve().parents[1] / "frontend/package.json")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if any(value is None for value in (args.audit, args.production_audit, args.audit_exit_code, args.production_exit_code)):
        parser.error("both audit reports and their command exit codes are required")
    try:
        read = lambda path: json.loads(path.read_text(encoding="utf-8-sig"))
        result = validate(read(args.audit), read(args.production_audit), read(args.manifest),
                          args.audit_exit_code, args.production_exit_code, datetime.now(timezone.utc).date())
    except (OSError, ValueError, TypeError) as error:
        print(json.dumps({"status": "failed", "reason": str(error)}))
        return 1
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
