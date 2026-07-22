# PKA Slice 5A1 Platform Metadata Inventory — Publication Record

- **status:** `DRAFT / PUBLICATION RECORD / NO OPERATIONAL METADATA`
- **調査日:** 2026-07-22（JST）
- **repository baseline:** `26c55c2ea54468037a687dbcddc8bb386ce00dcc`（PR #16 merge後の`main`）
- **作業branch:** `codex/pka-slice5a-platform-inventory`
- **publication:** [PR #17](https://github.com/kcyth39/Where-to-Visit/pull/17)（Draft。current Head／review状態はGitHubを正とする）
- **Governing Input:** [`pka-slice-5-supabase-governance-mission-and-dod-2026-07-20.md`](pka-slice-5-supabase-governance-mission-and-dod-2026-07-20.md)
- **private packet identity:** SHA-256 `55a2731833dcefe3824db2b758c5c82862382c15aaa2c6509da8eb15e310788a`、15,799 bytes、2026-07-22（JST）確認

## 1. 位置付け

本書はSlice 5 A1の実施とレビュー境界だけを追跡する公開用記録である。platformの識別子、構成値、member／role、認証状態、network、backup、secret／credential、integration、保護設定、個別risk判定は記録しない。

詳細な調査証拠は、Humanが承認したlocal-only review packet `docs/memos/pka-slice-5a-platform-metadata-inventory-private-2026-07-22.md`へ分離した。同packetはGit非追跡・非正本であり、owner-only mode `0600`で保持し、stage、commit、push、PR添付を行わない。公開記録にはpacketの内容、結論、分類、operational metadataを記載せず、identity、保護状態、review実施記録、判定、lifecycleだけを記録する。

## 2. A1で実施した範囲

- repository／Gitのbaselineと関連資産のread-only確認
- Supabase organization／project metadataのread-only確認
- GitHub repository／publication／automation metadataのread-only確認
- Vercel project／delivery metadataのread-only確認
- local credential保管境界の値非表示確認
- Human承認済みA1 scopeに基づくprivate review packetの作成

private packetの内容、結論、分類は公開しない。

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

## 5. Private Packet Evidence Manifest

| 項目 | 公開記録 |
|---|---|
| exact identity | 本書冒頭のSHA-256とbyte数 |
| file type | regular file／non-symlink確認済み |
| local protection | mode `0600`確認済み |
| Git boundary | `docs/memos/`のignore対象、未追跡、未stage |
| 内容公開 | なし。packetの内容、結論、分類をGit／PRへ転載しない |
| review versioning | packet変更時はSHA-256とbyte数を更新し、旧版reviewを自動継承しない |

## 6. Private Packet Lifecycle

- 内容ownerはHumanとし、Tech Lead／DevOpsが各domainを確認し、PKAがlocal custodyとlifecycleを管理する
- A1の4 role reviewとA2 Execution Contractの採否判断までは、上記exact版または後続のhash-pinned版をowner-onlyで保持する
- A2へはHumanが採用した判断、必要な事実、未解決事項だけを引き継ぎ、packet本文をPRやExecution Contractへ複製しない
- task closeout前にHumanが、削除、承認済みowner-only保管先への移管、または理由と新期限を伴う一時保持のいずれかを判断する
- Human判断なしに削除、移動、Git追跡化しない。判断未了ならpacketを保持してcloseoutを停止する

## 7. Review Handoff

必須4 roleはMissionどおりTech Lead、DevOps、Reviewer、Humanとする。Fullstack Engineerは追加の実行可能性／引渡しadvisoryであり、必須4 roleには算入せず、Humanを置換しない。各roleは公開記録とhash-pinned local-only packetを責任範囲に応じて確認する。公開するreview証跡は、role、exact PR Head、packet SHA-256、確認日、判定だけに限定し、確認内容や根拠の詳細をGit／PRへ転載しない。

reviewerはprivate packetの具体的内容をPR commentへ転載しない。Reviewerは、hash-pinnedなdomain review記録、公開scope、authority、A2停止状態を独立確認し、private packetだけを唯一のreview証拠にしない。

| role | reviewed PR Head | reviewed packet SHA-256 | 確認日 | 判定／状態 |
|---|---|---|---|---|
| Tech Lead | `cd3276463709924a65f3d8433c9a1f4c88569852` | `4f31cfb57a0b3de3efe6b348bda22559276d8166ec50d50a0150431c11f89fe9` | 2026-07-22 | `CHANGES REQUESTED` |
| DevOps | `cd3276463709924a65f3d8433c9a1f4c88569852` | `4f31cfb57a0b3de3efe6b348bda22559276d8166ec50d50a0150431c11f89fe9` | 2026-07-22 | `PASS`。後続版へ自動継承しない |
| DevOps | `7743d044b2978eaaafda7db411d3d41a855665c8` | `f53df6293ea8614d7b18812dd84333e2c8f91d71afe60a5b431d4f125d239cb4` | 2026-07-22 | `PASS`。後続版へ自動継承しない |
| Tech Lead | `7743d044b2978eaaafda7db411d3d41a855665c8` | `f53df6293ea8614d7b18812dd84333e2c8f91d71afe60a5b431d4f125d239cb4` | 2026-07-22 | `CHANGES REQUESTED`。後続版へ自動継承しない |
| Fullstack Engineer（追加advisory） | `7743d044b2978eaaafda7db411d3d41a855665c8` | `f53df6293ea8614d7b18812dd84333e2c8f91d71afe60a5b431d4f125d239cb4` | 2026-07-22 | `CHANGES REQUESTED`。必須4 roleには算入しない |
| Tech Lead | PR Head更新後に固定 | `55a2731833dcefe3824db2b758c5c82862382c15aaa2c6509da8eb15e310788a` | 未実施 | 必須domain再review待ち |
| DevOps | PR Head更新後に固定 | `55a2731833dcefe3824db2b758c5c82862382c15aaa2c6509da8eb15e310788a` | 未実施 | 必須domain再review待ち |
| Fullstack Engineer（追加advisory） | PR Head更新後に固定 | `55a2731833dcefe3824db2b758c5c82862382c15aaa2c6509da8eb15e310788a` | 未実施 | 任意の再確認待ち。必須4 roleには算入しない |
| Reviewer | PR Head更新後に固定 | `55a2731833dcefe3824db2b758c5c82862382c15aaa2c6509da8eb15e310788a` | 未実施 | domain review後の必須独立判定待ち |
| Human | PR Head更新後に固定 | `55a2731833dcefe3824db2b758c5c82862382c15aaa2c6509da8eb15e310788a` | 未実施 | Reviewer判定後のA1受入・必要な判断・A2採否待ち |

## 8. A2 Gate

A2は未承認であり、必須開始条件が未完了のため停止中である。A1の4 role review、必要なHuman判断、Tech Lead／DevOpsが確認したA2 Execution Contract、Humanの実装開始承認が揃うまで開始しない。未完了条件の具体的内容は公開しない。

A2でも、Production DBのbusiness row、secret、認証data、Storage object metadata、logを取得しない。target、read-only制約、取得項目、保存粒度を一意にできない場合は停止する。
