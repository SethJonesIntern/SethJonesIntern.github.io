#!/usr/bin/env python3
"""PreToolUse gate enforcing spec-harness information barriers.

Reads the hook payload on stdin, resolves the acting agent from `agent_type`,
and denies tool calls that would cross a role boundary. Exit 2 blocks.

Language-agnostic: path classification comes from `.spec-harness.json` at the
project root, falling back to the defaults below.
"""

import functools
import json
import os
import re
import sys

DEFAULT_CONFIG = {
    "spec_globs": ["specs/**"],
    "source_globs": ["src/**", "app/**", "lib/**", "pkg/**"],
    "test_globs": [
        "tests/**",
        "test/**",
        "**/__tests__/**",
        "**/test_*.py",
        "**/*_test.py",
        "**/conftest.py",
        "**/*.test.[jt]s",
        "**/*.test.[jt]sx",
        "**/*.spec.[jt]s",
        "**/*.spec.[jt]sx",
        "**/*_test.go",
    ],
    # Readable by everyone: config, docs, lockfiles. Never source or tests.
    "shared_globs": [
        "pyproject.toml",
        "setup.cfg",
        "package.json",
        "tsconfig.json",
        "README.md",
        "CLAUDE.md",
        ".spec-harness.json",
        "docs/**",
    ],
    "strict_read_isolation": True,
}

# role -> (writable categories, readable categories)
# Categories: spec, source, test, shared, other
POLICY = {
    "planner": {"write": {"spec"}, "read": {"spec", "source", "shared", "other"}},
    "coder": {"write": {"source", "other"}, "read": {"spec", "source", "shared", "other"}},
    "tester": {"write": {"test"}, "read": {"spec", "test", "shared"}},
    "adjudicator": {"write": set(), "read": {"spec", "source", "test", "shared", "other"}},
}

WRITE_TOOLS = {"Write", "Edit", "NotebookEdit"}
READ_TOOLS = {"Read", "Grep", "Glob"}


@functools.lru_cache(maxsize=256)
def glob_to_regex(pattern: str) -> "re.Pattern[str]":
    """Translate a git-style glob to a regex. fnmatch mishandles `**`."""
    out, i, n = [], 0, len(pattern)
    while i < n:
        if pattern.startswith("**/", i):
            out.append("(?:.*/)?")
            i += 3
        elif pattern.startswith("**", i):
            out.append(".*")
            i += 2
        elif pattern[i] == "*":
            out.append("[^/]*")
            i += 1
        elif pattern[i] == "?":
            out.append("[^/]")
            i += 1
        elif pattern[i] == "[":
            close = pattern.find("]", i + 1)
            if close == -1:  # unterminated: treat as a literal bracket
                out.append(re.escape("["))
                i += 1
            else:
                body = pattern[i + 1 : close]
                negated = body.startswith("!")
                if negated:
                    body = body[1:]
                out.append("[" + ("^" if negated else "") + body.replace("\\", "\\\\") + "]")
                i = close + 1
        else:
            out.append(re.escape(pattern[i]))
            i += 1
    return re.compile("^" + "".join(out) + "$")


def matches(path: str, pattern: str) -> bool:
    """`dir/**` matches the directory itself too, so a search scoped to `tests`
    is classified the same as one scoped to `tests/`."""
    if glob_to_regex(pattern).match(path):
        return True
    return pattern.endswith("/**") and glob_to_regex(pattern[:-3]).match(path) is not None


def load_config(cwd: str) -> dict:
    path = os.path.join(cwd, ".spec-harness.json")
    if not os.path.isfile(path):
        return DEFAULT_CONFIG
    try:
        with open(path, encoding="utf-8") as fh:
            return {**DEFAULT_CONFIG, **json.load(fh)}
    except (OSError, ValueError):
        # A malformed config must not silently disable the barrier.
        return DEFAULT_CONFIG


def relativize(path: str, cwd: str) -> str:
    if not path:
        return ""
    # Resolve against the payload's cwd, never the process cwd: the hook
    # subprocess may be launched from anywhere, and a path that fails to resolve
    # falls outside every glob, which classifies as unrestricted.
    absolute = path if os.path.isabs(path) else os.path.join(cwd, path)
    try:
        rel = os.path.relpath(os.path.normpath(absolute), cwd)
    except ValueError:  # different drive on Windows
        rel = path
    return rel.replace(os.sep, "/")


def classify(path: str, config: dict) -> str:
    """Order matters. Specs win over tests so `specs/x.spec.md` is not read as a
    test file; tests win over source so `src/x.test.ts` is not read as source."""
    # Anything resolving outside the project belongs to no category, and no role
    # grants "external" — so a traversal fails closed instead of landing in the
    # unclassified bucket.
    if path.startswith("../"):
        return "external"
    for category, key in (
        ("spec", "spec_globs"),
        ("test", "test_globs"),
        ("shared", "shared_globs"),
        ("source", "source_globs"),
    ):
        for pattern in config.get(key, []):
            if matches(path, pattern):
                return category
    return "other"


def deny(reason: str) -> None:
    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason,
            }
        },
        sys.stdout,
    )
    sys.exit(2)


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        sys.exit(0)  # never block on a malformed payload

    role = payload.get("agent_type")
    policy = POLICY.get(role)
    if policy is None:
        sys.exit(0)  # main thread and non-harness agents are unrestricted

    tool = payload.get("tool_name", "")
    tool_input = payload.get("tool_input") or {}
    cwd = payload.get("cwd") or os.getcwd()
    config = load_config(cwd)

    if tool == "Bash" and role in ("coder", "tester", "planner"):
        deny(
            f"The {role} agent has no execution access. Writers cannot run the suite; "
            "only the adjudicator executes. Report blockers instead of verifying them."
        )

    if tool in WRITE_TOOLS:
        target = relativize(tool_input.get("file_path") or tool_input.get("notebook_path", ""), cwd)
        if not target:
            sys.exit(0)
        category = classify(target, config)
        if category not in policy["write"]:
            allowed = ", ".join(sorted(policy["write"])) or "nothing"
            deny(
                f"The {role} agent may not write {category} files ({target}). "
                f"Writable: {allowed}. Report the needed change instead of making it."
            )

    if tool in READ_TOOLS and config.get("strict_read_isolation", True):
        raw = tool_input.get("file_path") or tool_input.get("path") or ""
        if not raw:
            # An unscoped Grep/Glob sweeps the tree and leaks whatever the role
            # is barred from. Require an explicit, permitted path instead.
            if tool in ("Grep", "Glob") and policy["read"] != {
                "spec",
                "source",
                "test",
                "shared",
                "other",
            }:
                deny(
                    f"The {role} agent must scope {tool} to an explicit path; an "
                    "unscoped search would cross its read barrier."
                )
            sys.exit(0)
        target = relativize(raw, cwd)
        category = classify(target, config)
        if category not in policy["read"]:
            deny(
                f"The {role} agent may not read {category} files ({target}). "
                "Derive behavior from the spec, not from the other agent's output."
            )

    sys.exit(0)


if __name__ == "__main__":
    main()
