# Gate report templates

## Contents

1. Migration preflight
2. Local migration and clean-chain
3. Remote migration application and postflight
4. Correction migration
5. Local / remote E2E
6. Commit gate
7. Push gate
8. Cleanup phase

Use only the sections relevant to the current phase. Replace every placeholder; do not report an unverified item as passed.

## Migration preflight

```text
Repository / branch / HEAD:
Working tree and upstream:
Phase and next approval boundary:
CLI version and verified --help commands:
Profile and non-secret target metadata:
Local HostIp / port evidence:
Migration file:
Existing migration hashes:
Local migration list before:
Remote application evidence checked:
Objects and DML:
Destructive statement audit:
Backfill target UUID and identifying fields:
Expected postflight:
Stop reason or approval requested:
```

## Local migration and clean-chain

```text
Incremental application result:
Local migration list after:
Schema / RLS / policy / GRANT:
Functions / triggers / FK / indexes:
Negative and invariant checks:
Advisor result:
Clean-chain disposal approval:
db reset result:
Repeated postflight and advisor result:
Local E2E readiness decision:
```

## Remote migration application and postflight

```text
Confirmed project / database / role / PostgreSQL major:
Application result:
Backfill result:
Tables / columns / constraints:
RLS:
Policies:
GRANT / REVOKE:
Functions / triggers:
FK delete rules:
Negative or invariant checks:
CLI migration-history caveat recorded:
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
Local focused postflight / advisor / clean-chain:
Remote focused postflight:
Remote application approval requested:
```

## Local / remote E2E

```text
Phase: local | remote
Profile / explicit command / non-secret target:
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

Report local and remote runs in separate instances of this section. Do not merge their counts or use one as evidence for the other.

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
Split query file / SHA-256 / exact editor match:
Single result set saved / ROLLBACK completed:
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
Zero-target cleanup skip decision:
Errors or stop condition:
Next approval boundary:
```
