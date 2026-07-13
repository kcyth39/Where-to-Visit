# DB実装経緯・結果・開発ステータスレポート（2026-07-13）

## 1. 目的

ADR-0005からADR-0008までのDB変更、共同編集型・回答者行モデルの実装、local-first検証基盤、remote適用、Production確認、cleanup運用整備の経緯と結果を整理し、次の開発方針を判断できる状態にする。

本書は2026-07-13時点の実装・検証状況を示すレポートであり、ADRや`docs/03`〜`06`を置き換える正本ではない。

## 2. エグゼクティブサマリー

- ADR-0006 / ADR-0007の共同編集型・回答者行モデルは、コード・DB・UI・E2Eまで実装済みである。
- `guest_token`と`events.owner_participant_id`は撤去され、ParticipantはEvent内の共同編集可能な回答者行へ移行した。
- `votes`を追加し、Vote行なしを未評価、`neutral`を能動的な「−」として区別する4状態読取モデルへ移行した。
- ConcernはCandidate単位の常設1件からCriterion別へ移行し、Reactionと独立して付与できる。
- remote dev DBには、advisor訂正、本筋migration、RLS helper非公開化migrationの3本が適用済みである。
- remote postflight、Security Advisor、Performance Advisor、Data API負系、remote E2E、Production smokeはいずれも合格した。
- Supabase CLI 2.109.1とDockerによるlocal-first検証、local/remote target分離、localhost bind強制、safe reset、hash固定cleanup wrapperが実装済みである。
- cleanup wrapperは新版generatorでlocal ROLLBACK／COMMIT統合検証まで完了し、commit `34f13a6`として`origin/main`へpush済みである。
- 本レポート作成着手前のGit状態は`main`、HEAD=`34f13a6`、`origin/main`と一致、working tree cleanであった。本レポート作成後は本ファイル1件だけが未追跡である。
- 正本の古い「未移行」注記は2026-07-13に実装状態へ同期済み。次の優先課題は、remote／Productionの残存`[E2E]`データ再discoveryとcleanup判断、次機能の優先順位決定である。

## 3. DB実装の経緯

### 3.1 属性撤廃とSlice 5

1. `events.attribute`と`event_attribute` enumを撤去した。
2. Criterion、Reaction、Concern、Commentを導入した。
3. `feedback_references_match_event()`がConcern／Commentに存在しない`criterion_id`を参照する問題を、適用済みmigrationを変更せず補正migrationで修正した。
4. CriterionごとのReaction、Candidate単位Concern、複数Commentという初期Slice 5モデルを実装・検証した。

### 3.2 ADR-0006 / ADR-0007への再設計

調整さん型の「回答者行を共同編集する」モデルへ見直し、以下を確定した。

- Owner capabilityとParticipantを分離する。
- Event作成時にParticipantを作らない。
- Participantをブラウザ本人ではなく、Event内の名前付き回答者行として扱う。
- 同名は自動統合せず、本人確認または別名再入力とする。
- Candidate×ParticipantのVoteを`positive / neutral / veto`で保持し、行なしを`unrated`とする。
- CommentはCandidate×Participantにつき現在値1件とする。
- Reaction／ConcernはCandidate×Criterion×Participantで独立させる。
- Event画面を初期セットアップ、名前選択、候補一覧、候補編集へ分離する。
- `clear / discussion / fallback / none`を○数と×有無だけから算出する。

### 3.3 Local-first開発基盤

remoteへ先に適用して検証する運用から、localでmigration chainとDB依存実装を再現してからremoteへ進む方式へ移行した。

- Supabase CLIをdevDependency `2.109.1`へ固定。
- Local PostgreSQL 17、Auth無効、seed無効。
- local / remote profileとtarget allowlistを分離。
- `dev:local / dev:remote`、`test:e2e:local / test:e2e:remote`を実装。
- Docker公開portを`127.0.0.1`へ限定。
- reset時のDB container再作成もDocker proxyでfail-before-create化。
- local DB commandをrepository npm wrapperへ統一。
- SQL Editorの複数result set制限に合わせ、remote証跡SQLを1 result set単位へ分割する運用をSkillへ反映。

### 3.4 データ保持型migrationへの変更

当初の本筋migrationは`events = 0件`を要求する破壊的guardだったが、remoteに保持対象の通常Event 12件が存在したため適用を停止した。

その後、通常データを保持するmigrationへ再設計した。

- Event 12件、Participant 12件、Criterion 12件のIDとデータを維持。
- Participant名、trim後重複、NULL、cross-event参照、Comment重複、Concern mappingをDDL前guardで検査。
- `events.owner_participant_id`と`participants.guest_token`を撤去。
- `votes`を追加。
- Concernへ`criterion_id`を追加。
- CommentをCandidate×Participant一意、Participant必須へ変更。
- policy、GRANT、function、trigger、FK、indexを新モデルへ再構成。
- migration全体をtransactionで保護し、負系fixtureでDDL前停止とrollbackを検証。

### 3.5 Security Advisor補正

remote Advisorで、Data APIへ公開された`public` schema上の`SECURITY DEFINER` helper 5関数がanonから直接RPC実行可能という警告を検出した。

補正migrationでは以下を行った。

- 5 helperをData API非公開の`private` schemaへ移動。
- function OIDを維持。
- 29 policyの意味と27 helper依存を維持。
- `public`側の旧RPCを撤去。
- anon Data APIから旧RPC 5本がすべてHTTP 404／`PGRST202`になることを確認。
- private schemaをExposed schemasへ追加しない。

### 3.6 Cleanup運用の堅牢化

共同編集型8テーブルに合わせてcleanup profileを更新した。途中で以下の問題を検出し、remote cleanupへ進まずlocalで修正・再検証した。

- pgTAP fixtureを通常testとして収集する選別問題。
- 固定CLIのlocal queryが複数statementを扱えない問題。
- FK profile CTEの予約語`deferrable`による構文エラー。
- FK MATCH SIMPLEを`NONE`と誤表示するcatalog変換。
- `runCommandAsync`がchild `exit`時点で末尾stdout／stderrを欠落し得る問題。
- SQL validatorが行途中のpsql meta-commandを見逃す問題。

最終実装では以下を保証する。

- `/private/tmp`配下の通常・非symlink・owner-only・1 MiB以下のSQLだけを許可。
- SHA-256完全一致とmode別transaction終端を必須化。
- SQLは一意なlocalhost-bound local DB containerへstdinだけで渡す。
- SQL状態機械でcomment、quote、dollar body、トップレベルstatementを区別。
- 中間transaction controlと未引用psql meta-commandを拒否。
- FK 15本、Trigger 12件、Nullability 15件、Invariant 6件、boundary FKを実行前guardで検証。
- 固定UUIDと`[E2E]` prefixの二重条件、件数、PK snapshot、削除順を固定。

## 4. Migration一覧と適用結果

| Migration | 役割 | Remote dev |
|---|---|---|
| `20260708000000_slice_1_events_participants.sql` | Event／Participant基盤 | 適用済み |
| `20260710000000_slice_2_candidates.sql` | Candidate | 適用済み |
| `20260710010000_drop_attribute.sql` | 属性列・enum撤去 | 適用済み |
| `20260710020000_slice_5_criteria_reactions_concerns_comments.sql` | Slice 5初期テーブル | 適用済み |
| `20260710021000_fix_slice_5_feedback_event_guard.sql` | feedback event guard補正 | 適用済み |
| `20260712032345_fix_request_header_search_path.sql` | `request_header` search_path固定 | 適用済み |
| `20260712032527_collaborative_response_row_model.sql` | 回答者行・Vote・RLS再構成 | 適用済み |
| `20260712144228_move_rls_helpers_to_private_schema.sql` | RLS helper非公開化 | 適用済み |

直近3本のSHA-256は以下で固定されている。

- `de17038e171f652a672c2744d4148e5a6d57531995f1627855181981d8cb91ea`
- `d7f97ae68322601e6a3fe146707f1c528768b85083e32c298f4a8cf56cb638a3`
- `f4b0a745ea7a6d16eb904028732da28b0bec65ff95fcb12231088caa8447f607`

remote適用はSQL Editorで人間実行しており、CLI migration historyへ自動記録されない。将来`db push`運用へ移行する場合は履歴調停が別タスクとして必要である。

## 5. 検証結果

### 5.1 Local DB

- 増分migration適用: PASS。
- clean-chain reset、8 migration再現: PASS。
- データ保持fixture: PASS。
- NULL、trim重複、cross-event、Concern曖昧mapping、Comment重複の負系guard: PASS。
- pgTAP標準セット: 2 files / 28 tests / PASS。
- local Security Advisor: warning 0。
- local E2E: 7 total / 6 PASS / 0 FAIL / 1既知SKIP。
- `npm run check`、`npm run build`、`git diff --check`: PASS。

既知SKIPは、Supabase設定済み環境ではconfiguration errorを表示しないことによるSlice 1 setup-state test 1件のみ。

### 5.2 Remote DB

- Advisor訂正migration: 1回適用、focused postflight PASS。
- 本筋migration: 1回適用、Postflight #1〜#8 PASS。
- 保持対象Event／Participant／Criterionのmanifest維持: PASS。
- RLS 8テーブル、Policy 29件、function／trigger／FK／index manifest: PASS。
- Helper非公開化migration: 1回適用、Postflight #1〜#7 PASS。
- Function OID 5件維持、Policy 29件、helper依存27件維持。
- Data API旧public RPC 5本: 全件HTTP 404／`PGRST202`。
- Security Advisor: Error 0 / Warning 0 / Info 0。
- Performance Advisor: Error 0 / Warning 0 / Info 5。

Performance Infoは既知のunused index 5件で、今回削除していない。

### 5.3 Remote E2E／Production

- Remote E2E: 7 total / 6 PASS / 0 FAIL / 1既知SKIP。
- `check`、`build`、`diff-check`: PASS。
- Vercel Production deployment: Ready。
- `https://kimenosuke.com`: HTTPS、独自ドメイン、主要UI smoke PASS。
- Production UI経由でEvent、Owner編集、Participant、Candidate、共有側権限境界、reload保持を確認。
- 375×812、1366×768のVisual QA: PASS。

Production smokeはapp実装commit `8f9f560`に対して確認済みである。cleanup tooling commit `34f13a6`のpush後はVercel画面確認を行っていないが、このcommitは開発・運用toolingのみでapp runtime変更を含まない。

### 5.4 Cleanup wrapper

- Wrapper tests: 26 PASS / 0 FAIL。
- Generator self-test: 26 PASS / 0 FAIL。
- 新版local ROLLBACK統合: PASS。
- 新版local COMMIT統合: PASS。
- ROLLBACK前後baseline完全復元: PASS。
- COMMIT後Target UUID 0、残存`[E2E]` 0、全8テーブル0件: PASS。
- FK 15本`MATCH SIMPLE`、Trigger 12件、Nullability 15件、RLS 8、Policy 29、Invariant違反0を維持。

## 6. 現在の開発ステータス

### 6.1 Git

- 以下のbranch／HEAD／upstreamはPhase 1着手前から不変である。
- Branch: `main`
- HEAD: `34f13a6377017b7cf44b8aac1bbdae4e3eedb0b8`
- `origin/main`: 同一commit
- Ahead / Behind: `0 / 0`
- Phase 1着手前のWorking tree: clean
- Phase 1完了時点のworking treeには、正本9ファイルの同期差分と本レポート1ファイル、今回の詳細文書3ファイルの訂正差分がある。すべてdocs-onlyで、未commitである。

主要commit:

- `8f9f560 feat: implement collaborative response row model`
- `34f13a6 chore: harden Supabase E2E cleanup workflow`

### 6.2 実装済み

- ADR-0006 / ADR-0007のDBモデルとUI。
- Owner capabilityとParticipant分離。
- 回答者selector、同名確認、rename／delete、pending operation。
- Vote 4状態読取、3種semantic highlight。
- Criterion別Reaction／Concern、1回答者1Comment。
- 候補一覧dashboardとCandidate編集route。
- owner cookie回復とshare側権限境界。
- local／remote profile分離、Playwright接続先固定。
- localhost bind、safe reset、local DB command wrapper。
- remote migration／E2E／cleanup承認ゲートを持つrepo Skill。
- 共同編集型8テーブル向けcleanup generatorとlocal transaction wrapper。

### 6.3 未完了・未確認

1. **Remote／Production E2Eデータcleanup**
   - remote E2E証跡はcleanup未実行を記録している。
   - Production smoke Event `[E2E] Vercel smoke 20260713-090830-JST`もcleanup対象として記録されている。
   - その後のfresh remote discoveryを行っていないため、現在の正確な残存件数・UUIDは未確認。過去の件数やUUIDを再利用せず、新profileでSELECT-only discoveryから再開する必要がある。

2. **Performance Info**
   - unused index 5件はInfoとして残している。
   - 実利用トラフィックが少ない段階ではunused判定の根拠が弱いため、現時点で削除しない方針を維持する。

3. **将来MVP項目**
   - トップ下部のブラウザ内イベント一覧。
   - 広告実装。
   - launch checklistと本公開判断。
   - これらは共同編集モデル移行とは別sliceで扱う。

4. **一時証跡の耐久性**
   - 詳細な実行証跡の多くは`/private/tmp`にあり、Git管理外で永続性を保証しない。
   - 今後も必要な監査要約は、本書または承認済みの永続reportへ要点を転記する。

## 7. 推奨する次の進行順

1. **docs-only実装状態同期（2026-07-13完了）**
   - 古い「未移行／未実装」注記、DoDチェック状態、QA完了状態を実装結果へ同期した。
   - 実装時に変更された判断も照合し、delete-first前提を通常データ保持型migrationと`[E2E]`後処理cleanupへ訂正した。
   - 今後の同期では状態語だけでなく、実装中に変更された決定が正本・詳細仕様・DoD・QAへ伝播していることも確認する。

2. **Remote cleanup discovery**
   - 現在のremote DBをSELECT-onlyで再inventoryする。
   - `[E2E]`対象UUID、8 entity件数、FK／Trigger／Invariant、scope digestをfresh取得する。
   - ROLLBACKとCOMMITは引き続き別承認にする。

3. **公開状態の区切り確認**
   - cleanup完了後、Productionの通常導線をread-only smokeする。
   - latest `origin/main`、Vercel deployment、clean DBの状態を区切りとして記録する。

4. **次機能の優先順位決定**
   - ブラウザ内イベント一覧、広告、launch準備のどれを次sliceとするか決定する。
   - 機能実装前に、現行UIでの実利用フィードバック収集を挟む選択肢もある。

## 8. 判断用まとめ

DBと共同編集モデルの技術移行は完了している。local／remote／Productionの主要機能・安全性検証も合格しており、現時点の主な問題は実装そのものではなく、正本の状態注記、残存E2Eデータの最終cleanup、次sliceの優先順位である。

したがって、次の開発へ直ちに進むより、まずdocs-only同期とremote cleanupで現行フェーズを閉じ、その後にプロダクト機能の次優先順位を決定するのが最も追跡しやすい。

## 9. 参照

- `AGENTS.md` / `CLAUDE.md`
- `docs/03_requirements.md`
- `docs/04_data-model.md`
- `docs/05_dod.md`
- `docs/06_qa-flow.md`
- `docs/adr/0006-collaborative-response-row-model.md`
- `docs/adr/0007-event-views-and-criterion-feedback.md`
- `docs/adr/0008-local-supabase-development-workflow.md`
- `docs/reports/collaborative-response-row-*.md`
- `docs/reports/supabase-cli-docker-development-reference-2026-07-12.md`
- `supabase/migrations/`
- `.agents/skills/operate-supabase-live-db/`
- commits `8f9f560`、`34f13a6`
