# きめのすけ — AI共通コンテキスト（AGENTS.md / CLAUDE.md 同期）

> このファイルは `AGENTS.md` と `CLAUDE.md` で**同一内容**を保つ。片方を更新したら必ずもう片方も同期する。
> このファイルは**大原則・大方針**に特化する。詳細仕様・運用手順は各正本を見る（下記「詳細仕様の正本」）。

## サービス概要

きめのすけ: グループ意思決定支援サービス。候補カードごとに○/−/×・❤️・🌀・コメントを共同編集し、みんなの意見を見える化する。サービス自身は確定せず、3種類の最終候補状態を自動ハイライトする。登録不要・URL共有。

## 表示用語とEventデータ

- ユーザー向けUIでは「お題」「メモ」を入力ラベルとして使わず、次の用語へ統一する。
- **きめること**: 候補を出し合い、みんなで決めたい対象。`Event.title`へ保存する。
- **つたえておきたいこと**: 決めるときに共有したい背景・希望・条件など。任意入力で`Event.memo`へ保存する。
- 内部のDB列名・型・Server Action入出力・フォームフィールド名は`title` / `memo`のまま維持する。

## 技術スタック（ADR-0002）

Next.js（App Router）+ Supabase（Postgres/Realtime、**Authは使わない**）+ Vercel Pro。ドメイン: kimenosuke.com。

## MVP境界

- In: きめること作成（自由テキスト・属性なし）・候補管理・4状態総合評価・最終候補3状態・判断基準(Criterion)別❤️/🌀・1回答者1コメント・URLコピー・マイイベント一覧(Cookie)・広告実装・オーナー編集URL・noindex・無期限保存・モバイル/デスクトップ同格。
- Out: ログイン/会員登録/端末横断一覧・プレミアム(AI解説)・通知・複数Eventグルーピング・外部AI相談プロンプト・イベント削除・×解消履歴。

## 詳細仕様の正本（一行要約＋ポインタ）

各領域の**大方針は一行要約**で示す。厳密な場合分け・数値・手順は必ず**正本**を見る。

| 仕様領域 | 一行要約（大方針） | 正本 |
|---|---|---|
| 表示用語 | 「きめること／つたえておきたいこと」を使い、内部は`title` / `memo` | `03_requirements` §1.1 ＋ `reports/ui-copy-decisions` |
| 確定ロジック | 回答者×候補は`unrated/positive/neutral/veto`の4状態。○数と×有無から`clear/discussion/fallback/none`を算出し、確定・ロックはせず全候補を常時可視化。❤️・🌀・コメントは判定に入れない | `adr/0003` ＋ `04_data-model` |
| 判断基準・❤️・🌀 | Eventごとの共有Criterion（共有URL保持者が共同編集、削除は2重確認）。❤️・🌀はCandidate×Criterionごとに独立し、確定に影響しない意見可視化。操作はサーバー成功後に即時反映（Realtime自動同期はMVP外） | `adr/0007` ＋ `03_requirements` |
| 回答者行モデル | オーナーは`owner_token`のcapabilityでParticipantと分離。Participantは本人でなくEvent内の名前付き回答行で、共有URL保持者が選んで共同編集する。画面は初期セットアップ/名前選択/候補一覧/候補編集に分離 | `adr/0006` ＋ `adr/0007` |
| 識別方式（ログイン不要） | share_token（共有）とowner_token（編集・権限回復）は推測困難token。owner tokenはshare path限定HttpOnly Cookie、選択中回答者はevent単位localStorageにParticipant IDのみ保持（権限判定に使わない） | `adr/0004` ＋ `adr/0006` |
| 属性撤廃 | きめることは種別に縛られない自由テキスト（作成時に属性選択なし） | `adr/0005` |
| 技術スタック | 上記「技術スタック」節のとおり。詳細判断はADRを正とする | `adr/0002` |
| ローカル/remote Supabase運用 | local-first検証、target分離、localhost bind強制、npm wrapper経由のDB操作、remoteはSQL Editor人間実行（承認ゲート） | `adr/0008` ＋ `.agents/skills/operate-supabase-live-db/` |
| 画面文言 | 確定コピーと文言連動挙動の正本 | `reports/ui-copy-decisions` |
| MVP境界 | 上記「MVP境界」節のとおり | `03_requirements` |

※ 実装済み範囲・検証状態は `03_requirements` の実装状態注記を正とし、実装経緯は `reports/db-implementation-and-development-status-2026-07-13` を参照する。

## docs/参照先

docs/03_requirements.md / 04_data-model.md / 05_dod.md / 06_qa-flow.md / adr/0006-collaborative-response-row-model.md / adr/0007-event-views-and-criterion-feedback.md / adr/0008-local-supabase-development-workflow.md / reports/supabase-cli-docker-development-reference-2026-07-12.md / reports/db-implementation-and-development-status-2026-07-13.md。
（docs/07_launch-checklist.md はPhase 4で作成予定）

## メモ・調査置き場（docs/memos/）

- おしげさんの自由なメモ・調査・下書きの置き場。**Git非追跡（ローカルのみ）で、正本ではない**。
- 実装や仕様判断の根拠にしない。必要な内容は正本（docs/・docs/adr/・docs/reports/）へ昇格して初めて有効。

## 実装の規約と制約

- 実装ツール: Codex。コンテキストファイルはAGENTS.md/CLAUDE.md（両方同期・同一内容）。
- 仕様を勝手に変えない。矛盾・曖昧さを見つけたら実装せず質問して停止。
- 指示書外の実装（例: local JSON fallback）を追加しない。Supabase前提。
- 依存はバージョン固定（latest禁止）。
- スコープ厳守: 今回のスライス以外の機能に触れない。

## 着手前チェック（必須）

- 着手前に `git status` で作業フォルダとrepo状態を確認する。
- 作業フォルダが指示と異なる、またはGit未初期化の場合は、実装せず停止して報告する。
- Supabaseを伴う作業ではlocal / remoteのどちらのphaseか、使用profile、接続先検証結果、次の承認境界を明示する。target不明時はDB操作を行わない。
- 指示書のスコープ・停止条件を最優先する。
- 正本（docs/・docs/adr/）を変更したら、AGENTS.md / CLAUDE.md の「詳細仕様の正本」表の一行要約・ポインタと齟齬がないか確認し、必要なら両ファイルを同期更新する。
