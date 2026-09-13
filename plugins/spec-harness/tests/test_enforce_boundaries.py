"""Regression suite for the spec-harness PreToolUse gate.

Runs under pytest, or standalone: `python tests/test_enforce_boundaries.py`.
"""

import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN_ROOT = os.path.dirname(HERE)
SCRIPT = os.path.join(PLUGIN_ROOT, "scripts", "enforce_boundaries.py")
# The repo root, so the gate loads the real .spec-harness.json rather than its
# built-in defaults. Derived, not hardcoded: CI runs this on Linux.
CWD = os.path.dirname(os.path.dirname(PLUGIN_ROOT))

ALLOW, DENY = "allow", "deny"

CASES = [
    # (label, expected, agent_type, tool_name, tool_input)
    ("planner writes a spec", ALLOW, "planner", "Write", {"file_path": "specs/a.spec.md"}),
    ("planner writes source", DENY, "planner", "Write", {"file_path": "src/foo.py"}),
    ("planner writes a test", DENY, "planner", "Write", {"file_path": "tests/test_x.py"}),
    ("planner runs bash", DENY, "planner", "Bash", {"command": "pytest"}),
    ("coder writes source", ALLOW, "coder", "Write", {"file_path": "src/x.ts"}),
    ("coder writes a test", DENY, "coder", "Write", {"file_path": "tests/test_x.py"}),
    ("coder writes colocated .test.ts", DENY, "coder", "Write", {"file_path": "src/x.test.ts"}),
    ("coder writes colocated .spec.tsx", DENY, "coder", "Write", {"file_path": "src/x.spec.tsx"}),
    ("coder reads a test", DENY, "coder", "Read", {"file_path": "tests/test_x.py"}),
    ("coder reads the spec", ALLOW, "coder", "Read", {"file_path": "specs/a.spec.md"}),
    ("coder runs bash", DENY, "coder", "Bash", {"command": "pytest"}),
    (
        "coder writes test via absolute path",
        DENY,
        "coder",
        "Write",
        {"file_path": os.path.join(CWD, "tests", "test_x.py")},
    ),
    ("tester writes a test", ALLOW, "tester", "Write", {"file_path": "tests/test_x.py"}),
    ("tester writes source", DENY, "tester", "Write", {"file_path": "src/foo.py"}),
    ("tester reads source", DENY, "tester", "Read", {"file_path": "src/foo.py"}),
    ("tester reads the spec", ALLOW, "tester", "Read", {"file_path": "specs/a.spec.md"}),
    ("tester reads shared config", ALLOW, "tester", "Read", {"file_path": "pyproject.toml"}),
    ("tester greps unscoped", DENY, "tester", "Grep", {"pattern": "def parse"}),
    ("tester greps scoped to tests", ALLOW, "tester", "Grep", {"pattern": "x", "path": "tests"}),
    ("tester greps scoped to source", DENY, "tester", "Grep", {"pattern": "x", "path": "src"}),
    ("tester runs bash", DENY, "tester", "Bash", {"command": "pytest"}),
    ("adjudicator runs bash", ALLOW, "adjudicator", "Bash", {"command": "pytest"}),
    ("adjudicator reads source", ALLOW, "adjudicator", "Read", {"file_path": "src/foo.py"}),
    ("adjudicator reads tests", ALLOW, "adjudicator", "Read", {"file_path": "tests/test_x.py"}),
    ("adjudicator writes source", DENY, "adjudicator", "Write", {"file_path": "src/foo.py"}),
    ("adjudicator edits a test", DENY, "adjudicator", "Edit", {"file_path": "tests/test_x.py"}),
    ("main thread is unrestricted", ALLOW, None, "Write", {"file_path": "tests/test_x.py"}),
    ("foreign agent is unrestricted", ALLOW, "Explore", "Read", {"file_path": "src/foo.py"}),
    # A traversal must fail closed rather than land in the unclassified bucket.
    ("coder escapes the project", DENY, "coder", "Write", {"file_path": "../../elsewhere/x.py"}),
    ("tester escapes the project", DENY, "tester", "Read", {"file_path": "../../elsewhere/x.py"}),
]


def invoke(agent_type, tool_name, tool_input):
    """Return 'deny' or 'allow' for one hook payload."""
    payload = {"tool_name": tool_name, "tool_input": tool_input, "cwd": CWD}
    if agent_type is not None:
        payload["agent_type"] = agent_type
    proc = subprocess.run(
        [sys.executable, SCRIPT],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
    )
    if proc.returncode == 2:
        # A block must also emit a well-formed decision, not just the exit code.
        decision = json.loads(proc.stdout)["hookSpecificOutput"]
        assert decision["permissionDecision"] == "deny"
        assert decision["permissionDecisionReason"].strip()
        return DENY
    assert proc.returncode == 0, f"unexpected exit {proc.returncode}: {proc.stderr}"
    return ALLOW


def test_boundaries():
    failures = []
    for label, expected, agent_type, tool_name, tool_input in CASES:
        actual = invoke(agent_type, tool_name, tool_input)
        if actual != expected:
            failures.append(f"{label}: want {expected}, got {actual}")
    assert not failures, "\n".join(failures)


def test_malformed_payload_does_not_block():
    proc = subprocess.run(
        [sys.executable, SCRIPT], input="not json", capture_output=True, text=True
    )
    assert proc.returncode == 0


if __name__ == "__main__":
    failed = 0
    for label, expected, agent_type, tool_name, tool_input in CASES:
        actual = invoke(agent_type, tool_name, tool_input)
        ok = actual == expected
        failed += not ok
        print(f"{'ok  ' if ok else 'FAIL'} {label:<38} want={expected:<5} got={actual}")
    test_malformed_payload_does_not_block()
    print(f"\n{len(CASES) - failed}/{len(CASES)} passed")
    sys.exit(1 if failed else 0)
