---
name: blind-tdd
description: Build a feature through the spec harness — spec, implementation, and adjudication, with an optional blind test author for logic that can break. Use for any non-trivial change.
---

# Spec harness

Task: $ARGUMENTS

Default flow is **planner → coder → adjudicator**. The `tester` is optional, added per task. Use it sparingly.

## 1. Spec

Launch `planner`. It writes `specs/<feature>.spec.md`.

Read it. Send it back if the Public API lacks exact signatures. Resolve Open Questions with the user before continuing.

## 2. Decide whether to add the tester

Add it when the change involves:

- branching logic, parsing, validation, transformation
- arithmetic, dates, sorting, pagination
- mutable or persisted state
- boundaries: empty, zero, negative, max, unicode, duplicate
- a shared utility other code depends on

Skip it for static markup, layout, styling, copy, config, constants, thin wrappers, and one-call glue.

For a mixed change, add the tester for the logic only.

## 3. Implement

**Without tester:** launch `coder` with the spec path.

**With tester:** launch `coder` and `tester` in the same message. Give each only the spec path. Do not paste the spec body into either prompt, and do not relay one's report to the other.

## 4. Adjudicate

Launch `adjudicator`.

With a suite, it returns a verdict and a ruling per failure: **CODE**, **TEST**, or **SPEC**. Without one, it reviews against the spec and runs the project's existing checks.

## 5. Act on rulings

- **CODE** — relaunch `coder`, describing the failure from the spec. Never paste the test.
- **TEST** — relaunch `tester` with the spec row it misread. Never paste the implementation.
- **SPEC** — relaunch `planner` to fix the line, then rerun the affected agents.

Loop to stage 4 until it passes. If the same failure survives three rounds, stop and bring it to the user.

## Rules

Never repair a failure yourself in the main thread.

Never give the tester implementation details or the coder test details, at any stage.

If a hook blocks an agent, restate the task within the boundary rather than loosening it.
