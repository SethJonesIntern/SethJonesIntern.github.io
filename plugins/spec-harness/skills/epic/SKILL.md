---
name: epic
description: Decompose a broad task into GitHub issues, then execute them one at a time through the spec harness. Use when given a feature area or milestone rather than a single change.
---

# Epic

Task: $ARGUMENTS

Requires `gh` authenticated and an `origin` remote. Verify with `gh auth status` and `git remote -v` first; if either is missing, stop and say what is needed.

## 1. Clarify

Ask only what changes the decomposition — scope edges, hard requirements, what is explicitly out. Read the repo for anything discoverable rather than asking.

## 2. Decompose

Each issue must be:

- a vertical slice that is independently deliverable
- one concern
- completable in a single harness run
- carrying acceptance criteria a reviewer can check without reading the diff

Do not split implementation and its tests into separate issues. Do not create issues for work not yet needed, or for refactors nobody has asked for. Prefer fewer, larger issues over many trivial ones.

Order by dependency. An issue that cannot start until another lands is blocked, not parallel.

## 3. Approve before creating

Present the proposed set as a table — number, title, one-line scope, depends-on — and wait for explicit approval. Issues are outward-facing; do not create them on your own judgment.

## 4. Create

```
gh issue create --title "<title>" --body "<body>"
```

Body sections: **Context** (why, one paragraph), **Acceptance criteria** (checklist), **Blocked by** (issue numbers, omit if none).

Record the returned numbers and report them.

## 5. Execute, one at a time

In dependency order, for each issue:

1. Run the `blind-tdd` flow with the issue title and acceptance criteria as the task.
2. On pass — commit referencing the issue, then close it with a comment carrying the adjudicator's verdict and any SPEC rulings.
3. On fail after three rounds — stop, leave the issue open, report what blocked it.

Report after each issue and wait before starting the next. Never open the next issue's work while the current one is unresolved.

If execution reveals the decomposition was wrong, stop and revise the remaining issues with the user rather than silently working outside them.
