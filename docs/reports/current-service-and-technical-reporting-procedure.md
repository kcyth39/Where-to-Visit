# 現行サービス・技術仕様レポート作成手順

- 作成日時: **2026-07-17 09:42 JST（UTC+09:00）**
- status: **運用手順ドラフト v0.1（試行中・未スキル化）**
- 対象: 複数PRの実装結果から、現行サービス仕様・現行技術仕様・修正点と残課題を再構成する作業
- 参考実績: 2026-07-17作成のA/B/Cレポート

> 本書はレポート作成の再現手順であり、サービス要件、ADR、DoD、QA、DESIGNを置き換える正本ではない。数回の実運用で手順を調整した後にスキル化を判断する。現時点ではSkillファイルや自動化scriptを作らない。

---

## 1. 目的と成果物

一度の調査から、次の3レポートを同じ日時・同じbaselineで作成する。

| 成果物 | 役割 | 推奨ファイル名 |
|---|---|---|
| A. 現行サービス仕様 | 利用者から見える仕様、実装済み範囲、未実装範囲、PRの利用者影響 | `current-service-specification-A-YYYY-MM-DD.md` |
| B. 現行技術仕様・実装全体 | stack、architecture、data、security、QA、PRごとの技術実績 | `current-technical-specification-and-implementation-B-YYYY-MM-DD.md` |
| C. 修正すべき点・残課題 | A/Bのレビューで見つけた問題を優先度・根拠・完了条件へ変換 | `fixes-and-remaining-tasks-C-YYYY-MM-DD.md` |

PR範囲が明確な場合、Bのファイル名へ`pr1-3`等を含めてもよい。3ファイルは相互リンクする。

成果物の完成条件は、単なる要約ではなく次を満たすことである。

- 正本、実コード、Git/PR履歴、QA証跡を区別して照合している。
- 「コード上実装済み」と「local検証済み」と「Production受入済み」を混同していない。
- QA観点とドキュメント観点のレビュー結果をA/Bへ反映している。
- 問題はCへ集約し、現行仕様へ未承認案を混ぜていない。
- 作業前から存在するユーザー所有ファイルを変更していない。

---

## 2. 基本原則

### 2.1 baselineを最初に固定する

レポート冒頭へ、少なくとも次を記録する。

- 生成日時とtimezone。
- 対象repository。
- 対象branch、HEAD、`origin/main`。
- 比較起点と対象終点。
- checkoutと対象commitのtreeが同一か。
- 作業前から存在する変更・未追跡ファイル。

日時、commit、file数、test数は変動値である。過去レポートから転記せず、毎回取得する。

### 2.2 authorityは領域別に扱う

全領域へ一律の優先順位を付けない。`AGENTS.md` / `CLAUDE.md`の「詳細仕様の正本」表に従い、領域ごとに確認する。

| 領域 | 主な確認先 |
|---|---|
| MVP境界・実装状態 | `docs/03_requirements.md` |
| DB・RLS・読取モデル | `docs/04_data-model.md` |
| 完了基準 | `docs/05_dod.md` |
| QA | `docs/06_qa-flow.md` |
| 設計判断 | `docs/adr/` |
| UI文言 | `docs/reports/ui-copy-decisions.md` |
| デザイン | `DESIGN.md` |
| 現行動作 | 実コードとtest。正本との差は自動的な仕様変更とみなさない |
| 実装経緯 | `docs/reports/`。現行正本より優先しない |

### 2.3 証拠の種類を混ぜない

各主張を次の4種類へ分ける。

1. **現行treeで直接確認**: code、migration、設定、test定義、Git差分。
2. **今回実行して確認**: type check、wrapper test、E2E等の実行結果。
3. **PR・追跡文書に記録**: 過去のlocal/Production結果。今回の再実行とは書かない。
4. **未確認・未実施**: Production、実機、DB依存E2E等。完了へ読み替えない。

### 2.4 調査と変更を分離する

レポート作成中は原則として読み取り専用で調査する。ユーザーが許可したレポート以外を編集しない。

- 既存のdirty treeはユーザー所有として保護する。
- staging、commit、push、PR、mergeは別の明示承認まで行わない。
- DB、Docker、server、Production、cleanupはレポート作成承認だけでは実行しない。
- `docs/memos/`と未追跡資料は、ユーザーが正本化を明示しない限り根拠にしない。

---

## 3. 着手前のスコープ確認

### 3.1 governing instructionsを読む

1. `pwd`でrepositoryを確認する。
2. 適用される`AGENTS.md`を読む。
3. `AGENTS.md`と`CLAUDE.md`の同期規則を確認する。
4. ユーザーが許可した作成・変更ファイルを列挙する。
5. 禁止されたGit、DB、Production操作を明文化する。

### 3.2 Git現在地を採取する

```bash
git status --short --branch
git rev-parse HEAD origin/main
git rev-list --left-right --count origin/main...HEAD
git log --oneline --decorate -10
```

比較対象が決まったら次も採取する。

```bash
git diff --quiet TARGET_SHA origin/main
git diff --shortstat BASE_SHA TARGET_SHA
git diff --name-only BASE_SHA TARGET_SHA
```

`git diff --quiet`は終了codeも記録する。treeが異なる場合、どちらを現行仕様のbaselineにするか決めるまで本文を書き始めない。

### 3.3 開始時snapshotを残す

最低限、作業メモへ次を保持する。

- tracked変更。
- staged変更。
- untracked/ignoredファイル。
- current branchとupstream。
- ahead/behind。
- ユーザー所有として除外するpath。

このsnapshotを最終の変更範囲検証に使う。

### 3.4 停止条件

次の場合は、推測で続行せず確認または「未確認」とする。

- 指示されたrepositoryと`cwd`が違う。
- 正本同士が競合し、明示的なsupersedeがない。
- checkoutと対象commitのtreeが異なり、対象baselineが決められない。
- Productionやremote DBの実施結果が、追跡証拠から確認できない。
- user-owned変更と許可されたレポート変更を分離できない。

---

## 4. 証拠収集

本文を書く前に、簡易的な証拠台帳を作る。台帳は一時的な作業メモでよく、許可されていないrepoファイルとして追加しない。

| 主張 | 根拠 | baseline | 証拠種別 | 判定 |
|---|---|---|---|---|
| 例: PR #Nはmainへ統合済み | GitHub PR metadata＋local log | merge SHA | 直接確認 | 確認済み |
| 例: Production smoke PASS | 追跡QA記録 | deployment SHA | 過去記録 | 今回未実行 |

根拠にはfile/section、code line、command結果、PR URL等を記録する。本文へ全根拠を転載する必要はないが、断定を再検証できる状態を保つ。

### 4.1 PR・Git履歴

対象PRごとに次を表へ集める。

| 項目 | 内容 |
|---|---|
| 識別 | PR番号、URL、title |
| 時点 | merged日時、head SHA、merge SHA |
| 規模 | commit数、changed files、additions/deletions |
| 変更内容 | 利用者影響、主要code/docs/test |
| 非変更範囲 | DB、migration、dependency等、重要なものだけ |
| 記録済みQA | total/pass/fail/skip、check、build、Production |
| 未完了 | zoom、実機、Production、cleanup、正本同期等 |

PR本文の数値は「PR本文に記録された結果」と書く。再実行していないものを「今回PASS」と書かない。

複数PRを集約するときは、古いPRのProduction結果を後続PRへ拡大適用しない。Production証拠は対象deployment commitと結び付ける。

### 4.2 実コード

現行treeから次を調べる。

- routeとrendering境界。
- 利用者flowとview mode。
- component構造とresponsive契約。
- domain type、集計、判定ロジック。
- Server Actionとdata access。
- token、Cookie、localStorage、権限判定。
- DB table、RLS、GRANT、trigger、migration。
- 同期方式、mutation成功・失敗時の挙動。
- 入力validation、外部URL、origin生成等の安全境界。
- test suiteの構成と対象browser。
- dependencyと運用wrapper。

既存型や集計値を再計算しているか、UIだけの派生かも確認する。仕様書のfield名と実typeが違う場合は、現行実装と文書残差を分けて記録する。

### 4.3 正本・履歴文書

次を確認する。

- 正本が指すpathの実在。
- 実装状態、status、最終更新日の残差。
- 要件、DoD、QA、DESIGN、UI copy間の用語一致。
- 履歴レポートが現在地として誤案内されていないか。
- 未追跡ファイルへtracked文書からリンクしていないか。
- `AGENTS.md`と`CLAUDE.md`がbyte-for-byte一致するか。

### 4.4 QA・依存監査

報告専用・非DB環境で安全に実行できる候補:

```bash
npx tsc --noEmit --incremental false
npm run test:supabase:wrappers
npx playwright test --list
npm audit --json
git diff --check
```

実行したcommand、対象commit、日時、結果を記録する。`npm audit`はpackage件数、advisory実体、fix案を分ける。破壊的な`audit fix --force`は実行しない。

DB依存E2Eを行う場合は、repoの`operate-supabase-live-db`手順に従い、local profile、tracked target、localhost bindを先に確認する。

```bash
npm run test:e2e:local
npm run check
npm run build
git diff --check
```

環境がない、許可がない、server/DB操作が禁止されている場合は実行せず、PR記録と今回の静的確認を分離する。Production smoke、fixture作成、cleanupは必ず別承認とする。

### 4.5 独立レビューの並列化（任意）

複数担当を使える場合、初期調査を次のように分けると見落としを減らせる。

1. PR・Git実績監査: merge、差分統計、変更/非変更範囲、PR記録。
2. サービス・文書監査: 現行仕様、authority、status、link、用語残差。
3. 技術・QA監査: architecture、type、DB/RLS、test、security、未実施gate。

各担当は読み取り専用とし、ファイルを編集しない。対象baseline、禁止操作、報告形式を最初に渡し、file/lineまたはcommand evidence付きで返してもらう。本文の作成・修正は主担当だけが行い、受け取った所見を実コードや正本で再確認してから採用する。

---

## 5. A「現行サービス仕様」の作り方

Aは利用者・事業側が現在できることを理解できる粒度にする。実装ファイルの羅列はBへ置く。

推奨構成:

1. metadataとbaseline。
2. 一文の総合結論。
3. 正本と本書の位置付け。
4. サービスの役割。
5. 実装済み、MVP内未実装、ローンチ準備、MVP外。
6. 利用者、識別、権限。
7. routeと画面状態。
8. 主要利用flow。
9. Event、Participant、Candidate、Criterion、Vote等のサービス仕様。
10. 集計・候補状態。
11. ブランド、表示、検索、noindex。
12. 同期・失敗時挙動。
13. PRごとの利用者影響と検証状態。
14. QA観点レビュー。
15. ドキュメント観点レビュー。
16. 自己レビュー記録と最終判定。

記述上の注意:

- UI用語と内部type名を必要に応じて併記する。
- 「実装済み」と「受入済み」を分ける。
- MVP内機能とPhase 4ローンチ準備を同じ未実装一覧へ混ぜない。
- owner/shared/Participantの違いを明記する。
- URLコピー等、利用者から見える小さな確定挙動も漏らさない。
- 技術改善案はAへ混ぜずCへ送る。

---

## 6. B「現行技術仕様・実装全体」の作り方

Bは次の開発者が現行architectureと検証境界を再構築できる粒度にする。

推奨構成:

1. metadata、baseline、比較起点、差分規模。
2. 技術stackとversion。
3. route、server/client、rendering。
4. componentとview mode。
5. domain type、正規化、判定。
6. Server Actionとdata access。
7. token、Cookie、権限。
8. DB、RLS、GRANT、trigger、migration baseline。
9. local/remote運用とfail-closed gate。
10. PRごとの技術実績、変更規模、QA記録。
11. 現行test suiteと今回実行した検査。
12. dependency・securityの現在値。
13. QA観点レビュー。
14. ドキュメント観点レビュー。
15. 自己レビュー記録と技術判定。

記述上の注意:

- versionは`package.json`とlock済みtreeから取得する。
- migration件数やhashは毎回再計算する。
- PR範囲で変更されなかった重要領域も明示する。
- security上の懸念は、確認済み事実と想定影響を分ける。
- remote/Production操作を行っていない場合は明記する。

---

## 7. 作成後の自己レビュー

A/Bの初稿後、文章を増やす前に次を点検する。

### 7.1 事実性

- PR番号、merge SHA、日時、差分統計は正しいか。
- stack version、route、type、table、test数は現行treeと一致するか。
- owner route等、redirectの有無まで実挙動と一致するか。
- 「今回実行」と「過去記録」が分離されているか。
- 変動値を過去レポートから転記していないか。

### 7.2 一貫性

- A/B/Cのbaselineと生成日時が同じか。
- Aのサービス仕様とBの技術実装が矛盾しないか。
- 同じ用語が別の意味で使われていないか。
- PR #1の証拠をPR #2/#3へ広げていないか。
- 「中核機能実装済み」と「MVP/Production完了」を区別しているか。

### 7.3 authority

- 領域別正本を全体順位のように書いていないか。
- 実コード差分を未承認の新仕様として扱っていないか。
- 履歴レポートを現行正本より優先していないか。
- 改善案を確定仕様として書いていないか。

---

## 8. QA観点レビュー

QAレビューでは、testが存在することと、対象commitで実行済みであることを分ける。

確認軸:

- 正常系・負系・境界値。
- 権限、token、Cookie、RLS。
- Candidate/Participant/Criterion削除cascade。
- 集計、同率、`unrated`と`neutral`。
- focus、IME、Enter、blur、pending、draft保持。
- desktop/mobile、zoom、overflow。
- keyboard、focus、screen reader name、modal。
- Chromium以外のbrowser。
- local/Productionの対象commit。
- E2E fixtureとcleanup。
- CI、lint、coverageの有無。

レビュー結果は、Aでは利用者影響、Bでは技術的なcoverageと検証不足として記載する。

---

## 9. ドキュメント観点レビュー

確認軸:

- 正本の役割分担が守られているか。
- 要件、DoD、QA、DESIGN、UI copyのstatusが実装状態と一致するか。
- TypeScript例やDB modelが実コードと一致するか。
- supersedeされた仕様が現行記述として残っていないか。
- 日付、commit、test数、次アクションが古くないか。
- Markdown linkが実在するか。
- tracked文書がuntracked/ignored文書を根拠にしていないか。
- `AGENTS.md`と`CLAUDE.md`が一致するか。

件数を本文へ書く場合は、対象集合と実行日時を明記する。自己参照で変化しやすいMarkdown file/link件数は、必要がなければ「欠落0」だけを本文へ記載する。

---

## 10. C「修正すべき点・残課題」の作り方

Cはレビュー所見の羅列ではなく、実行可能なbacklogにする。ただし未承認の改善提案であり、正本を置き換えないことを冒頭へ明記する。

### 10.1 優先度

| 優先度 | 基準 |
|---|---|
| P0 | 即時停止、データ破壊、重大な権限逸脱等。緊急対応が必要 |
| P1 | 完了宣言または一般公開拡大前に解消・判断が必要 |
| P2 | MVPローンチ前後の品質、安全性、運用性として計画化 |
| P3 | 保守性、性能、将来拡張の技術負債 |

### 10.2 各項目の書式

各課題は可能な限り次を持つ。

1. IDと短いtitle。
2. 確認済み事実。
3. 影響。
4. 最小修正案。
5. 完了条件。
6. 承認・DB・Production等のgate。

推測だけの問題を確定bugと書かない。一般論の改善はP2/P3とし、P1へ上げる場合は公開判断やデータ安全性との関係を示す。

### 10.3 実行順

次を別trackにする。

- **baseline closeout**: 対象commitのlocal gate、手動QA、Production smoke、cleanup、証跡同期。
- **新規修正**: 仕様承認、正本化、実装、migration/test、新commitのProduction回帰、完了同期。

baselineのProduction確認は、新しい安全性修正の実装完了や一般公開拡大の承認を意味しない。

---

## 11. 最終機械検証

### 11.1 内容

- A/B/Cの相互リンクが解決する。
- A/B/C以外のlinkも、確認対象内で欠落0。
- code fence、table、headingが閉じている。
- trailing whitespace、競合markerがない。
- P0〜P3の記載件数と見出し数が一致する。
- timestamp、baseline、PR SHAが3ファイルで一致する。

### 11.2 repo状態

```bash
git status --short --branch
git diff --name-only
git diff --cached --name-only
git diff --check
cmp -s AGENTS.md CLAUDE.md
```

開始時snapshotと比較し、次を確認する。

- 新規・変更は許可されたレポートだけ。
- stagingは空。
- 既存のuser-owned変更はそのまま。
- code、migration、config、testを変更していない。
- commit、push、DB、server、Production操作をしていない。

新規レポートは通常の`git diff --check`対象外なので、trailing whitespaceと競合markerを別途検査する。

### 11.3 索引の扱い

試行中の未追跡レポートへ、trackedの`docs/reports/README.md`からリンクしない。追跡化・恒久運用が承認された時点で、分類とstatusを決めて別途索引へ追加する。

---

## 12. 完了報告

最終応答は次を簡潔に示す。

- 作成したA/B/Cへのlink。
- 総合判定。
- P0〜P3件数と最重要課題。
- 実行した検証と、実行していない検証。
- 変更範囲。
- staging、commit、push、DB、Productionの有無。

「問題なし」だけで終えず、実装済み範囲と受入未完了範囲を分ける。

---

## 13. 数回運用した後の見直し

各回の終了後、本書へ直接場当たり的に追記するのではなく、まず次を作業メモへ残す。

- 実施日、対象PR範囲、所要時間。
- 手作業で時間がかかった証拠収集。
- 誤検知、見落とし、後から修正した表現。
- repository固有で固定できた手順。
- 毎回変わるためparameter化すべき値。
- 自動化したいlink/check/count処理。
- 不要だった手順。

3回程度運用した時点で比較し、次を満たす場合にスキル化候補とする。

- 入力、出力、停止条件が安定している。
- authority確認とGit scope gateが再現できる。
- A/B/Cの構成が大きく変わらない。
- 自動化する検査と人間判断の境界が明確。
- Supabase/Production承認gateを安全に外出しできる。

スキル化時は、本書の固定手順を`SKILL.md`へ、機械的なlink・scope・集計検査を補助scriptへ分ける。実運用で未検証の手順はスキルへ固定しない。

---

## 14. 実施チェックリスト

### 開始前

- [ ] `cwd`とgoverning `AGENTS.md`を確認した。
- [ ] HEAD、origin/main、ahead/behind、dirty treeを記録した。
- [ ] baselineと対象PR範囲を固定した。
- [ ] 許可ファイルと禁止操作を列挙した。

### 証拠

- [ ] PR metadataとGit差分を取得した。
- [ ] 正本、実コード、test、migrationを照合した。
- [ ] 過去記録と今回実行を分離した。
- [ ] 未実施のDB/Production項目を明示した。

### レポート

- [ ] Aに現行サービス仕様と利用者影響をまとめた。
- [ ] Bに現行技術仕様とPR実績をまとめた。
- [ ] 自己レビューを反映した。
- [ ] QA観点を反映した。
- [ ] ドキュメント観点を反映した。
- [ ] Cへ事実、影響、修正案、完了条件を整理した。

### 最終確認

- [ ] A/B/Cのbaseline、日時、相互リンクが一致する。
- [ ] リンク切れ、空白error、競合markerがない。
- [ ] P0〜P3の集計が一致する。
- [ ] 許可外ファイルの変更がない。
- [ ] staging、commit、push、DB、server、Production操作の有無を報告した。
