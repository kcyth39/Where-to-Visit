# PKA Slice 5A1 Platform Metadata Inventory — Publication Record

- **status:** `DRAFT / PUBLICATION RECORD / NO OPERATIONAL METADATA`
- **調査日:** 2026-07-22（JST）
- **repository baseline:** `26c55c2ea54468037a687dbcddc8bb386ce00dcc`（PR #16 merge後の`main`）
- **作業branch:** `codex/pka-slice5a-platform-inventory`
- **publication:** [PR #17](https://github.com/kcyth39/Where-to-Visit/pull/17)（Draft。current Head／review状態はGitHubを正とする）
- **Governing Input:** [`pka-slice-5-supabase-governance-mission-and-dod-2026-07-20.md`](pka-slice-5-supabase-governance-mission-and-dod-2026-07-20.md)

## 1. 位置付け

本書はSlice 5 A1の実施とレビュー境界だけを追跡する公開用記録である。platformの識別子、構成値、member／role、認証状態、network、backup、secret／credential、integration、保護設定、個別risk判定は記録しない。

詳細な調査証拠は、Humanが承認したlocal-only review packet `docs/memos/pka-slice-5a-platform-metadata-inventory-private-2026-07-22.md`へ分離した。同packetはGit非追跡・非正本であり、stage、commit、push、PR添付を行わない。

## 2. A1で実施した範囲

- repository／Gitのbaselineと関連資産のread-only確認
- Supabase organization／project metadataのread-only確認
- GitHub repository／publication／automation metadataのread-only確認
- Vercel project／delivery metadataのread-only確認
- local credential保管境界の値非表示確認
- Environment / Target Matrix、Access / Credential Route Matrix、Protection Inventory、Evidence Ledger、Confirmed／Unknown／Inaccessible、Gap / Risk Register、SD-01〜SD-10 readiness、A2提案の作成

上記成果物のうち、具体的な外部状態と判定はlocal-only packetにだけ保存した。

## 3. 実施していない操作

- Production DB query、SQL Editor実行、migration history／schema取得
- secret、password、PAT、API key、access token、connection stringの値取得
- Supabase／GitHub／Vercel設定変更、認証追加、integration接続、plan変更
- MCP／CLI認証、`db pull`、`db push`、`migration repair`
- A2開始、Ready化、merge、remote branch削除

## 4. Evidence Class

| evidence class | acquisition | public record |
|---|---|---|
| repository／Git | dedicated worktreeからread-only | baselineと調査実施のみ記録 |
| Supabase metadata | connectorと認証済みDashboardをread-only | 具体値・判定を非公開 |
| GitHub metadata | connector、API、認証済みSettingsをread-only | 具体値・判定を非公開 |
| Vercel metadata | 認証済みDashboardをread-only | 具体値・判定を非公開 |
| local credential boundary | 内容を読まず、存在・保管境界だけ確認 | path・状態を非公開 |
| current official guidance | 公式Docsを確認 | 下記linkだけを記録 |

- [Supabase Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)
- [Supabase Deployment](https://supabase.com/docs/guides/deployment)
- [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp)

## 5. Review Handoff

Tech Lead、DevOps、Reviewer、Humanは、同一worktree内のlocal-only packetを次の観点で確認する。

- Environment／targetの識別と意味が混同されていないか
- access、credential、MCP、CI、deliveryの事実と推測が分離されているか
- secret値、個人情報、非公開identifierを記録していないか
- Confirmed、Unknown、Inaccessibleの分類が証拠と一致するか
- SD-01〜SD-10 readinessとA2 STOP RULESが妥当か
- A2を開始せずに停止しているか

reviewerはprivate packetの具体的内容をPR commentへ転載しない。公開可能な結論だけを、Human承認後に適切な正本へ自立した文言で反映する。

## 6. A2 Gate

A2は未承認である。A1の4 role review、必要なHuman判断、Tech Lead／DevOpsが確認したA2 Execution Contract、Humanの実装開始承認が揃うまで開始しない。

A2でも、Production DBのbusiness row、secret、認証data、Storage object metadata、logを取得しない。target、read-only制約、取得項目、保存粒度を一意にできない場合は停止する。
