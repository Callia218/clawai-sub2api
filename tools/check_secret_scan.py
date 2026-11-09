"""Fail on any secret finding not matching an exact reviewed source span."""
import hashlib, json, pathlib, sys
root = pathlib.Path(__file__).resolve().parents[1]
findings = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
reviewed = json.loads((root / ".github/reviewed-secret-findings.json").read_text())
allowed = {(x["path"], x["rule"], x["sha256"]) for x in reviewed}
unexpected = []
for item in findings:
    rel = item["File"].replace("\\", "/")
    path = (root / rel).resolve()
    if not path.is_relative_to(root):
        unexpected.append({"path": rel, "rule": item["RuleID"]}); continue
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    sample = "\n".join(lines[item["StartLine"] - 1:item["EndLine"]])
    key = (rel, item["RuleID"], hashlib.sha256(sample.encode()).hexdigest())
    if key not in allowed: unexpected.append({"path": rel, "rule": item["RuleID"]})
print(json.dumps({"reviewed_findings": len(findings)-len(unexpected), "unreviewed": unexpected}))
sys.exit(1 if unexpected else 0)
