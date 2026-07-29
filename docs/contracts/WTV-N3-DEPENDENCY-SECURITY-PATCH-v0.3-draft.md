# WTV-N3-DEPENDENCY-SECURITY-PATCH v0.3-draft

Status: Focused re-review待ち  
Implementation authorization: None  
Predecessor: v0.2 SHA-256 `dc76efd4989e5a32f706d80827eddf8528424b25ffb37c89348c8c8686faa241`

## 1. Primary responsibility

到達可能なNext.js High advisoryを最小patchで解消する。PostCSS／sharpのtransitive Highは、期限付きrisk acceptanceまたは、別途exact採用された検証済みoverrideとして明示的に管理する。

## 2. Baseline

- Baseline: `e3a6d0bed953dd40b8c3e180b3ac645af78b51d1`
- Node: `24.14.0`
- npm: `11.9.0`
- Lockfile: v3
- Audit: Critical 0／High package count 3
- Repository／package／lockfile変更: 0

## 3. Package classification

| Package | Current | Candidate | Handling |
|---|---:|---:|---|
| `next` | 16.2.10 | 16.2.12 | Primary direct patch |
| `postcss` | 8.4.31 | 8.5.18 | Spike後のnested override候補 |
| `sharp` | 0.34.5 | 0.35.3 | Spike後のnested override候補 |

Next 16.2.12だけを採用した場合:

- Critical: 0
- Next direct High: 0
- npm audit上の残存High package count: **2**
  - PostCSS
  - sharp
- Risk acceptanceで管理するadvisory ID: **4件**
  - PostCSS 3件
  - sharp 1件

「High 2件」とは表現しない。

## 4. Execution modes

### Mode A — Direct patch

Humanが許可する内容:

- Next 16.2.12の実装候補作成
- Local QA
- Review後の別Git publication gate

必要条件:

- PostCSS／sharpについて期限付きrisk acceptance
- High 0とは報告しない

### Mode B — Direct patch plus local-only spike

Mode Bの選択で許可される内容は次だけ。

- Next 16.2.12のdirect patch
- S1〜S4のlocal-only compatibility spike
- Spike evidenceの作成

Mode Bからは次を導出しない。

- Override採用
- Overrideを含むpublication candidate
- High 0の主張
- Preview deployment
- Local Supabase／DB-dependent E2E

Spike結果だけではoverrideをpublication candidateへ含めない。

Overrideが別途exact採用されない限り、publication candidateはMode Aと同じNext-only candidateであり、同じrisk acceptanceを必要とする。

### Exact override candidate

Spike後、Humanがexact overrideを別途採用した場合だけ成立する。

採用記録へ固定するもの:

- Exact PostCSS／sharp version
- Exact nested override記法
- 対応するspike evidence identity
- Tech Lead review identity
- Publication candidateへoverrideを含める明示判断

このcandidateだけが次を主張できる。

- Audit High 0
- Override込みdependency closure
- Preview上のsharp／Image Optimization初期化確認

これは既存の「別実装判断」を明確化するものであり、新しいauthorityを作らない。

### Mode C — Upstream待ち

- Dependency変更0
- Nextの到達可能riskが残る
- N3 implementationはBLOCKED

## 5. Exact changed paths

Direct patchおよびexact override candidate:

- `package.json`
- `package-lock.json`

変更禁止:

- Source
- Next config
- Test
- Migration
- Supabase schema
- N4 docs／design

## 6. Spike boundary

- 専用local worktree
- Commit／push／PR: 0
- Preview／Production操作: 0
- Source／config／test変更: 0
- Scenarioごとに同一baselineから隔離
- 前scenarioのpackage／lock／node_modules状態を継承しない

| Scenario | Dependency state |
|---|---|
| S1 | Next 16.2.12のみ |
| S2 | Next＋PostCSS 8.5.18 |
| S3 | Next＋sharp 0.35.3 |
| S4 | Next＋両override |

## 7. Override boundary

- Next 16.2.12配下だけを対象
- 他consumerへの波及0
- Global override禁止
- Root direct dependency化禁止
- Lockfile手修正禁止
- Exact記法はspikeのnpm解決結果から固定
- `npm ls next postcss sharp --all`でconsumerを確認
- Invalid／extraneous 0
- Dependency closure外のlockfile変更0

## 8. DB-independent QA

DB操作を伴わず実行可能:

```text
npx playwright test tests/security-headers.spec.ts
```

加えて全scenario共通:

- `npm ci`
- `npm ls --all`
- `npm ls next postcss sharp --all`
- `npm audit --json`
- `npm run check`
- `npm run build`
- `git diff --check`

Security-header testはDB-dependent E2Eの代替とは扱わない。

## 9. DB-dependent QA authority

S1〜S4を問わず、local DB-dependent focused／full E2Eは、Humanがlocal Supabase／DB操作を明示承認した場合だけ実行する。

Mode、spike、dependency変更、Skill利用からDB permissionを導出しない。

Focused Server Actions E2E:

```text
npm run test:e2e:local -- tests/slice-1.spec.ts
```

Full local E2E:

```text
npm run test:e2e:local
```

分類:

- `tests/slice-1.spec.ts`: Server ActionsとEvent作成を含むDB-dependent QA
- Full suite: DB-dependent QA

実行条件:

- Local Supabase target／owner guard PASS
- Human local DB approval
- Fixture cleanup手順確定
- Production／remote profileではないこと
- Retryや自動recoveryなし

Human approvalがない場合:

- `NOT RUN`と正確に記録
- Server Actions DB regression PASSを主張しない
- Local DB操作0を維持

Full E2Eはfinal candidateだけで実行する。S1〜S4すべてへ重複実行しない。

## 10. Scenario-specific QA

- S1:
  - Security-header test
  - DB承認がある場合だけfocused Server Actions E2E
- S2:
  - CSS build
  - Source map error 0
  - 既存desktop／mobile layout
- S3:
  - Sharp module load
  - Version／native binary確認
  - In-memory bufferの最小transform
- S4:
  - S1〜S3のDB非依存項目
  - Human DB承認がある場合だけfocused／full E2E

追加禁止:

- Image fixture
- `next/image` route
- Remote image
- Upload
- Probe用source／test file

## 11. Spike evidence

Scenarioごとに記録:

- Baseline SHA
- Node／npm
- Scenario
- Package／lock SHA
- Dependency tree
- Audit JSON
- Changed lock nodes
- QA結果
- DB-dependent QAの承認状態
- Exit codes
- Retry count

Repositoryへ追加しない。

## 12. Risk acceptance identity

Risk owner:

- Human project decision owner
- Adoption時にHumanのexact identityを記録する
- DevOps／Tech Lead／PKAへ暗黙委任しない

Acceptance evidenceは新規artifactではなく、Humanのexact採用メッセージとする。

識別情報:

- Codex task identityまたはconversation URL
- Human message timestamp
- Contract version
- Contract artifact SHA-256
- Selected mode
- Risk owner identity

同一採用メッセージへ次を固定する。

- PostCSS／sharp package identity
- Advisory ID 4件
- Current／fixed version
- Reachability classification
- Residual risk
- `acceptedAt`
- `expiresAt`
- Invalidation conditions

Adoption messageに上記が不足する場合、risk acceptanceは成立しない。

## 13. Risk acceptance期限と失効

Proposed expiry:

`2026-08-28 23:59 JST`

Humanは短縮できる。延長にはfresh reviewが必要。

即時失効条件:

- Advisory内容／severity／range変更
- NextのPostCSS／sharp dependency declaration変更
- User-controlled／external CSS追加
- Upload、`next/image`、remote image追加
- Self-hosted server、middleware、proxy、rewrite追加
- Expiryまたはrecheck日到来

失効後はPreview／Production受け入れを継続しない。

## 14. Implementation procedure

1. HumanがMode AまたはMode Bを採用
2. Fresh dedicated worktree／branch
3. N4 path ownership確認
4. Next 16.2.12 direct patch
5. Mode Bの場合だけlocal-only spike
6. `npm install --package-lock-only --ignore-scripts`
7. Lockfile allowlist監査
8. `npm ci`
9. DB非依存QA
10. Human DB承認がある場合だけDB-dependent QA
11. Fresh audit
12. Focused review

Mode Bでexact override adoptionがない場合、publication candidateはNext-onlyとする。

## 15. Local DoD

全candidate:

- Next 16.2.12
- Next direct High 0
- Critical 0
- Unknown reachability 0
- Unrelated dependency update 0
- Lockfile v3／再現性PASS
- Check／build／security-header regression PASS
- Source／config／test／migration変更0

Next-only candidate:

- npm audit上のHigh package count 2を明記
- Advisory ID 4件のvalid risk acceptance
- High 0を主張しない

Human-adopted exact override candidate:

- Audit High 0
- Exact nested override一致
- Other consumer波及0
- Spike evidenceとpublication candidate一致

DB-dependent regression:

- Human承認後にPASS、または未承認なら`NOT RUN`
- `NOT RUN`をPASSへ読み替えない

## 16. Preview gate

Git publication後だけ実施する。

全candidate:

- Exact PR Head deployment READY
- Build
- Security headers／CSP
- App Router
- Server Actions
- POST Route Handler
- Event／share／owner flows
- Console／CSP／failed request 0

Human-adopted exact override candidateだけ:

- Platform上のsharp初期化エラー0
- Image Optimization runtime初期化の互換性確認

Mode B選択だけではこのsharp確認を要求しない。

## 17. Production／cleanup gate

Preview PASS後の別Human approval。

- Exact merge commit
- Manual redeployなし
- Vercel設定変更なし
- Existing fixture優先
- 新規fixtureは別Human approval
- Cleanupは既存のdiscovery／ROLLBACK／COMMIT／postcheck境界
- Token／Cookie記録0

## 18. STOP conditions

- Mode／risk owner／acceptance evidence identity／expiry不足
- Mode Bからoverride採用を推定する必要がある
- Local DB permissionが不明
- Global override
- Other consumer波及
- Lockfile closure外変更
- Invalid／extraneous
- Source／config／test変更が必要
- DB-dependent QAを無承認で要求
- Build／audit／QA失敗
- N4 ownership競合
- Risk acceptance失効

## 19. Human adoption fields

Human adoption時に固定する。

1. Mode A／B／C
2. Risk owner exact identity
3. `acceptedAt`
4. `expiresAt`
5. Advisory ID 4件のacceptance
6. Mode Bの場合もoverride未採用であること
7. Local DB-dependent QA authorizationの有無

Exact overrideの採用は、spike後の既存「別実装判断」で明示する。Mode B adoptionだけでは成立しない。

## Focused self-review

`check-execution-contract`の検査結果:

- Mode B permission一意化: PASS
- Override publicationの暗黙許可: 0
- DB permissionの暗黙導出: 0
- DB-independent／dependent command分離: PASS
- Risk owner: Human project decision owner
- Acceptance evidence identity: Human exact adoption message
- High package count／advisory count分離: PASS
- 新authority／permission: 0
- Implementation／spike／test実行: 0

Status:

`N3_EXECUTION_CONTRACT_V0_3_READY_FOR_FOCUSED_REREVIEW`

Human adoptionへはまだ進まず、blocking修正のfocused re-reviewへ戻します。Repository変更、install、spike、test、Git publication、Preview／Production操作は0です。