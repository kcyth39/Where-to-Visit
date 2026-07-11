# Gate report templates

## Contents

1. Migration pre-application
2. Migration postflight
3. Correction migration
4. Real-database E2E
5. Commit gate
6. Push gate
7. Cleanup phase

Use only the sections relevant to the current phase. Replace every placeholder; do not report an unverified item as passed.

## Migration pre-application

```text
Repository / branch / HEAD:
Working tree and upstream:
Migration file:
Applied migrations checked:
Objects and DML:
Destructive statement audit:
Backfill target UUID and identifying fields:
Expected postflight:
Local gates:
Supabase target requiring human confirmation:
Stop reason or approval requested:
```

## Migration postflight

```text
Application result:
Backfill result:
Tables / columns / constraints:
RLS:
Policies:
GRANT / REVOKE:
Functions / triggers:
FK delete rules:
Negative or invariant checks:
Postflight decision:
```

## Correction migration

```text
Observed failure:
Cause:
Applied migration preserved:
New correction migration:
Scope and idempotence:
Data changes or re-backfill:
Focused postflight:
Approval requested:
```

## Real-database E2E

```text
Database target:
Total / PASS / FAIL / SKIP:
Skipped test names and reasons:
Required Slice cases:
Prior-Slice regressions:
Investigated DB error recurrence:
npm run check:
npm run build:
git diff --check:
Decision:
```

## Commit gate

```text
Validated state:
Changed files:
Excluded areas confirmed unchanged:
Requested commit message:
Commit approval:
After commit: hash / message / status:
Push performed: no
```

## Push gate

```text
Branch / HEAD:
Upstream / remote:
Pre-push ahead and behind:
Push approval:
Push result:
Remote commit:
Post-push ahead and behind:
Working tree:
Deployment or smoke-test status:
```

## Cleanup phase

```text
Phase: discovery | rollback | commit | postcheck
Confirmed project / database / role:
Profile version:
Prefix:
Target UUID count:
Scope digest:
Expected counts by entity:
Expected total / remaining prefix events:
FK, trigger, and cross-event invariant check:
Column nullability profile check:
Operation counts:
Saved-primary-key remaining counts:
ROLLBACK restoration:
Expected remaining prefix events:
Errors or stop condition:
Next approval boundary:
```
