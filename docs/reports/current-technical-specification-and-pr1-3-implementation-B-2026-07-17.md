# B. 現行技術仕様・PR #1〜3実装全体レポート

- 生成日時: **2026-07-17 09:04 JST（UTC+09:00）**
- 実装基準: `origin/main` `95996e4af484634a786168aa2f67a6959dfed664`
- 比較起点: `cf1f0023ab3a218b5fd9dd680623dc992f30d9c3`（PR #1直前）
- 現在checkout: `d22d49fc6289c05b0d65b3be6e119ab85c58de7f`。`origin/main`とtree同一
- 関連: [A. 現行サービス仕様](current-service-specification-A-2026-07-17.md) / [C. 修正すべき点・残課題](fixes-and-remaining-tasks-C-2026-07-17.md)

> 本書は現在のコード、migration、テスト、運用wrapper、PR #1〜3のGitHub metadataを統合した技術スナップショットである。PR本文の検証記録と、2026-07-17の今回レビューで独立実行・静的確認した項目を分ける。

---

## 1. 実装全体の到達点

PR #1直前の`cf1f002`からPR #3 merge後の`origin/main`まで、36ファイル、`+3,073 / -967`の変更が統合された。

この区間で変更された中心はUI、CSS、E2E、正本文書である。DB schema、migration、Server Actionの公開集合、`event-state.ts`、`event-types.ts`、依存、lockfile、接続先configにはPR #1〜3由来の変更がない。

現在のアーキテクチャは、Next.js App Routerのserver pageで完全EventStateを読み、client `EventApp`でUI stateを管理し、Server Actions経由でSupabaseへmutationし、成功後に完全EventStateを再取得する構成である。

---

## 2. 技術スタック

| 領域 | 現行値 |
|---|---|
| Framework | Next.js App Router `16.2.10` |
| UI | React / React DOM `19.2.7` |
| Language | TypeScript `6.0.3`、strict、target ES2022、noEmit |
| Database/API | Supabase Postgres / PostgREST、`@supabase/supabase-js 2.110.1` |
| Auth | Supabase Auth不使用 |
| Local CLI | Supabase CLI `2.109.1` |
| E2E | Playwright `1.61.1`、Chromium project 1件 |
| Hosting | Vercel Pro、production domain `kimenosuke.com` |

依存はすべてexact pinで、`latest`指定はない。`next.config.mjs`は開発時の`allowedDevOrigins: ["127.0.0.1"]`だけを設定する。

---

## 3. route・rendering構成

| route | rendering・処理 |
|---|---|
| `/` | `force-dynamic`。Supabase設定を確認し、Client ComponentのEvent作成formを表示 |
| `/e/[shareToken]` | serverでEventStateとowner Cookieを取得し、`EventApp`へ渡す |
| `/e/[shareToken]/c/[candidateId]` | serverでEventStateを取得し、Candidate存在確認後にdetail modeで`EventApp`を表示 |
| `/o/[ownerToken]` | serverでowner tokenを検証。clientでowner-session APIを呼び、Cookie確立後に操作を有効化 |
| `POST /api/owner-session/[ownerToken]` | owner tokenを検証し、share path限定owner Cookieを設定 |
| `/robots.txt` | `Disallow: /` |

初期EventStateはserverで取得するが、Event UI本体は`"use client"`の`EventApp.tsx`が担う。現行`EventApp.tsx`は約1,324行で、5 view mode、owner setup、dashboard、candidate detail、modal、mutation coordinatorを一つのclient境界に持つ。

---

## 4. UI・component構成

### 4.1 ブランドヘッダー

`BrandHeader`は次の共通DOMを提供する。

```text
header.brand-header
  span.brand-tagline
  a.brand[href="/"]
  div.brand-header-navigation
```

- topだけブランドリンクへ`aria-current="page"`。
- Eventでは`EventViewMode`により右slotのanchorだけを切り替える。
- dashboard/topでも空slot自体は残す。
- CSS gridで上段左・上段右・下段中央を構成する。

### 4.2 Event view mode

```ts
type EventViewMode =
  | "loading"
  | "guest-selection"
  | "owner-setup"
  | "dashboard"
  | "candidate-detail";
```

優先順位は、selection未初期化、未選択guest、作成直後owner、Candidate指定、dashboardの順で一度だけ導出する。

### 4.3 dashboard

- `DashboardSummaryTable`をCandidate一覧の唯一の表示にする。
- desktopはsemantic tableの5領域、mobileは同じtable DOMをCSS gridで再配置する。
- Candidate名はdetail route、URLは外部tab、評価と反応は同一画面mutation。
- Candidate row自体へlink role、tabIndex、click navigationを付けない。

### 4.4 candidate detail

- Candidate情報、選択Participantの評価・反応・コメント、全回答者read-only一覧を表示。
- Candidate情報editor、Criterion editor、Participant editorを提供する。
- 候補削除、Criterion削除、Participant削除は確認UIを通る。

### 4.5 PR #3のmutation coordinator

- Candidate formでpointer intentをcaptureする。
- respondent selectorのouter blurは`relatedTarget`を呼び出し元へ渡す。
- owner setupでfocus先がCandidate formなら通常blur commitを抑止する。
- 名前draftを必要とする明示操作はParticipant解決後に1回だけ再開する。
- Candidate formの入力値はCandidate作成成功時だけclearする。

---

## 5. domain typeと完全読取モデル

### 5.1 主要type

```ts
type VoteValue = "positive" | "neutral" | "veto";
type EvaluationState = "unrated" | VoteValue;
type DecisionState = "clear" | "discussion" | "fallback" | "none";
```

`CandidateSummary`は次を保持する。

- `candidate: CandidateRecord`
- `proposerName`
- `positiveCount / neutralCount / vetoCount`
- `heartCount / concernCount`
- `decisionState`
- `relativeCreatedAt`
- `respondents: RespondentCandidateView[]`

`RespondentCandidateView`はParticipant record、評価状態、Reaction/ConcernのCriterion ID配列、現在Commentを持つ。

### 5.2 正規化

`buildEventState`がraw rowをcomponentへ渡す前に次を行う。

1. Participant、Criterion、Candidateを`created_at ASC, id ASC`で安定sort。
2. CandidateごとにVote、Reaction、Concern、Commentを結合。
3. Vote行なしを`unrated`へ正規化。
4. 件数と相対追加時刻を算出。
5. Event全Candidateから`decisionState`を一意に導出。

### 5.3 候補状態

- max positiveかつveto 0: `clear`。
- max positiveかつvetoあり: `discussion`。
- `clear`がない場合だけ、max未満かつveto 0の安全候補群からpositive最多を`fallback`。
- positive最大値0: 全件`none`。

Reaction、Concern、Comment、neutralは判定へ渡さない。

---

## 6. Server Action・data access

`src/app/actions.ts`は次のserver mutationを公開する。

- Event: create、refresh、update。
- Participant: resolve/create、rename、delete。
- Candidate: create、update、delete。
- Criterion: create、update、delete。
- Vote: set。
- Reaction / Concern: insert/deleteによるtoggle。
- Comment: create/update、空保存時delete。

data accessは`src/lib/events.ts`へ集約する。mutation成功後は`finish()`からEventと全関連rowを再読込し、`buildEventState`で完全stateへ戻す。

EventState読込は、Participant、Candidate、Criterionを並列取得し、CandidateがあればVote、Reaction、Concern、Commentをさらに並列取得する。paginationや増分patchは使用しない。

---

## 7. token・Cookie・権限

### 7.1 token

- share/owner tokenは`randomBytes(32).toString("base64url")`。
- Supabase anon clientへ`x-share-token` / `x-owner-token` request headerとして渡す。
- Supabase Auth session、service role、browser永続Supabase sessionは使わない。

### 7.2 owner Cookie

- 名称: `kimenosuke_owner_token`。
- `HttpOnly`、`SameSite=Lax`。
- Productionだけ`Secure`。
- pathは`/e/[shareToken]`限定。
- max ageは5年。

### 7.3 selected participant

- key: `kimenosuke:selected-participant:[event_id]`。
- value: Participant IDだけ。
- share/owner routeで共用。
- DB rowがなくなれば削除。
- 権限判定へ使わない。

---

## 8. Database・RLS

### 8.1 最終public table

| table | 役割 | 主要制約 |
|---|---|---|
| `events` | title、memo、share/owner token | token unique、title 1〜80 |
| `participants` | Event内回答者行 | Event内display_name unique、1〜60 |
| `candidates` | 候補 | title/urlの少なくとも一方、created_by同一Event |
| `criteria` | 判断基準 | source=`default/preset/custom`、label 1〜60 |
| `votes` | ○/−/× | Candidate×Participant unique、同一Event |
| `reactions` | Criterion別❤️ | Candidate×Participant×Criterion unique |
| `concerns` | Criterion別🌀 | Candidate×Participant×Criterion unique |
| `comments` | 現在コメント | Candidate×Participant unique、1〜500 |

全tableでRLSを有効化し、anonへ必要なcolumn/operationだけをGRANTする。

### 8.2 権限

- SELECT: 対象Eventのshare tokenまたはowner token。
- Event title/memo update: owner token。
- Participant/Candidate/Criterion/Vote/Reaction/Concern/Comment mutation: share token。
- owner画面の共同編集mutationもshare tokenを使う。

### 8.3 DB guard

- triggerでtrim、immutable column、cross-event参照を検査。
- FK deleteはcascadeまたはcreated_byのset null。
- security helperはprivate schemaへ移し、固定`search_path=pg_catalog`。
- PUBLIC等からEXECUTEをrevokeし、anonへ必要helperだけ明示GRANT。

### 8.4 migration baseline

1. `20260708000000_slice_1_events_participants.sql`
2. `20260710000000_slice_2_candidates.sql`
3. `20260710010000_drop_attribute.sql`
4. `20260710020000_slice_5_criteria_reactions_concerns_comments.sql`
5. `20260710021000_fix_slice_5_feedback_event_guard.sql`
6. `20260712032345_fix_request_header_search_path.sql`
7. `20260712032527_collaborative_response_row_model.sql`
8. `20260712144228_move_rls_helpers_to_private_schema.sql`

今回SHA-256を再計算し、B-3 QAに記録された8件のbaselineと一致した。

---

## 9. local / remote Supabase運用

### 9.1 target契約

- local: `http://127.0.0.1:54321`。
- remote: tracked HTTPS hostname / port 443。
- `.env.supabase.local` / `.env.supabase.remote`はGit非追跡。
- profileは`SUPABASE_URL`と`SUPABASE_ANON_KEY`の2キーだけを許可する。

### 9.2 fail-closed gate

- target URLを`config/supabase-targets.json`と完全一致させる。
- localはDocker公開portがすべて`127.0.0.1`であることを確認する。
- 想定外container、port、host bind、profile key、URLなら子processを起動しない。
- `dev:local/remote`と`test:e2e:local/remote`で接続先を分離する。

### 9.3 migration・remote

- migrationはlocal増分、clean-chain、DB test、advisor、E2Eを先に行う。
- remote適用は承認後に人間がSupabase SQL Editorへ全文を一度だけ適用する。
- `db push`、linked project、remote DB URL、history repairを現行手順へ混在させない。
- cleanupはdiscovery、ROLLBACK、COMMITを分離し、別承認とする。

---

## 10. PR #1〜3の技術実績

### 10.1 PR #1 — dashboard / candidate editing

- PR: [#1](https://github.com/kcyth39/Where-to-Visit/pull/1)
- head: `6546deb`
- merge: `bc53f711f52c388489a2c0809250350d93d4d978`
- 5 commits、27 files、`+2,182 / -884`
- 通常merge、squash/rebaseなし。

主なコード:

- `EventViewMode`とtopbar分岐。
- 操作可能なsemantic summary table。
- candidate detailと管理UI。
- CSSの大幅な情報階層・responsive調整。
- 新規B-1/B-2 E2EとSlice回帰更新。

記録されたgate:

- local E2E: 12 total / 11 PASS / 0 FAIL / 1 expected SKIP。
- `npm run check` / `npm run build` / `git diff --check`: PASS。
- 後続closeout文書でProduction browser QA、物理mobile、Production cleanup完了を記録。

### 10.2 PR #2 — brand header

- PR: [#2](https://github.com/kcyth39/Where-to-Visit/pull/2)
- head: `b738abb`
- merge: `b85c853a3b6de872d6220a5169342963d2204602`
- 3 commits、19 files、`+894 / -128`

主なコード:

- 新規`BrandHeader.tsx`。
- top/Eventの共通header化。
- site-wide metadata title。
- 1366、375、320 CSS px対応。
- 新規B-3 E2E。

記録されたgate:

- local E2E: 14 total / 13 PASS / 1 expected SKIP。
- B-3専用: 2 PASS。
- `check` / `build` / `diff --check`: PASS。
- Track Aで200% resizeと`95996e4`対象のProduction確認を完了した。

### 10.3 PR #3 — owner setup draft

- PR: [#3](https://github.com/kcyth39/Where-to-Visit/pull/3)
- head: `d22d49f`
- merge: `95996e4af484634a786168aa2f67a6959dfed664`
- 1 commit、6 files、`+49 / -7`

根本原因:

- Participant入力からCandidate formへ移るblurで回答者確定が始まった。
- 共通pendingにより同じfocus遷移中にCandidate formがdisabledとなった。
- 入力中Candidate draftが失われた。

修正:

- focus遷移と明示操作intentを区別。
- Candidate formへの移動だけではblur commitしない。
- Participant解決後にCandidate追加を一度だけ再開。
- 成功時だけdraft clear。

記録されたgate:

- local E2E: 15 total / 14 PASS / 0 FAIL / 1 expected SKIP。
- 既知SKIP: Supabase設定済み環境ではsetup warningを表示しないケース。
- `check` / `build` / `diff --check`: PASS。
- Track AのProduction recheckでCandidate draft保持、Participant／Candidate作成、dashboard／candidate-detail、owner/share境界を確認してPASS。

---

## 11. 現行QA構成

### 11.1 Playwright

| spec | test数 | 主対象 |
|---|---:|---|
| `brand-header-refresh.spec.ts` | 2 | top、Event 5 modes、metadata、中央・responsive |
| `dashboard-summary-and-back-nav.spec.ts` | 5 | view mode、summary、外部URL、pending vote、両幅mutation |
| `event-state.spec.ts` | 3 | decision、相対時刻、完全読取モデル |
| `slice-1.spec.ts` | 2 | 設定error/no fallback、Event作成・owner shell |
| `slice-2.spec.ts` | 2 | PR #3 draft保持、Candidate/Participant/権限回帰 |
| `slice-5.spec.ts` | 1 | Vote、Criterion feedback、Comment、名前、cascade |

PlaywrightはChromiumのみ、timeout 30秒、expect 5秒、traceはfirst retry、`reuseExistingServer: false`で毎回新規`next dev`を起動する。

### 11.2 DB・wrapper

- pgTAPの主要2ファイルは合計28 test。
- migration fixture用の追加testも存在する。
- wrapper unit testは今回26/26 PASS。

### 11.3 2026-07-17の今回レビューで実行

- `npx tsc --noEmit --incremental false`: PASS。
- `npm run test:supabase:wrappers`: 26/26 PASS。
- `npx playwright test --list`: 15 tests / 6 filesを収集。
- migration SHA 8件: baseline一致。
- `git diff --check`: PASS。
- A/B/C初回レビュー時点ではDB、server、Docker、Playwright本実行、Production操作を行っていない。後続のTrack A正式closeout結果は§11.4を正とする。

### 11.4 Track A正式closeoutで実行

- `95996e4`と同一treeで`npm run test:e2e:local`: 15 total / 14 PASS / 0 FAIL / 1既知SKIP。PR #3回帰testはPASS。
- `npm run check` / `npm run build` / `git diff --check`: PASS。
- B-3の100% / 125% / 150% / 175% / 200% browser resize: PASS。
- Vercel Production `main` / `95996e4` / `Ready`でB-3とPR #3のsmoke: PASS。
- local／Productionの`[E2E]` cleanupとpostcheck: PASS。schema、RLS、policy、migration baselineを維持。

---

## 12. 依存・安全性の現在値

2026-07-17に`npm audit --json`を読み取り実行した。

- critical: 0
- high: 0
- moderate: 2 package表示（`next`経由の`postcss` 1 advisory）
- advisory: `GHSA-qx2v-qp2m-jg93`
- installed: `next 16.2.10` → `postcss 8.4.31`

既存監査メモは、`npm audit fix --force`が破壊的なNext downgradeを提示するため実行せず、stable Nextが修正版PostCSSを取り込むまで監視する決定を記録している。今回も依存変更、override、audit fixは行っていない。

Supabaseの2026-07-17時点changelogも確認した。現在の`supabase-js`は将来TypeScript 5以上を要求する予定だが、本repoはTypeScript 6.0.3であり、この点の即時対応は不要である。

---

## 13. QA観点レビュー

### 13.1 強み

- capability tokenとRLS/GRANT/triggerを重ねたDB境界。
- local/remote targetのfail-closed分離。
- pure decision cases、DB負系、主要E2E、responsiveを保持。
- 既知SKIPの名称と理由を記録。
- PR #3の再現ケースをE2Eへ追加。

### 13.2 不足

- GitHub Actions workflowがなく、PR検証はローカル記録とVercel checkに依存。
- lint、coverage、coverage thresholdがない。
- browser projectはChromiumだけ。
- 200% browser zoomは手動PASSだが、focus trap/escape、axe等を含む自動a11y gateはない。
- E2Eデータcleanupは安全のため手動承認だが、残件数が自動で閉じない。

---

## 14. ドキュメント観点レビュー

実装とよく一致する領域:

- `03_requirements`のPR #3 owner setup契約。
- B-1/B-2のdashboard、candidate detail、neutral/unrated、B-1 refinement。
- B-3の共通DOM、mode別ナビ、metadata、responsive契約。
- DB table、RLS、local-first運用の大方針。

Track Aで解消した領域と継続課題:

- `04_data-model.md` §6の型例が現行`event-types.ts`とfield単位で不一致。
- `ui-copy-decisions.md`に旧dashboard card構造が残る。
- B-3 DoD、2026-07-16現在地レポート、DESIGN status、PR #3後のQA総数はTrack A closeoutで同期した。
- ADR-0007のdashboard nav refinement、ADR-0002のRealtime現行境界はP2文書整備として残る。

---

## 15. 自己レビュー記録

- stack versionを`package.json`とlock済みdependency treeで照合。
- route、component、Server Action、type、RLS、migration、scriptを実ファイルで照合。
- PR metadataをGitHubとlocal merge historyで二重確認。
- PR本文のテスト結果を「今回の再実行」と誤記していない。
- B-1/B-2 Production結果をPR #2/#3へ引き継いでいない。
- security上の未確定事項は現行仕様と分離しCへ移した。

技術判定は、**最新mainのtreeにPR #1〜3は正しく統合され、正式local gate・Production受入・cleanupまで完了した。Candidate URL契約とEvent作成原子性はTrack Bの安全性修正として残る**である。
