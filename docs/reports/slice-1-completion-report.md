# Where-to-Visit Slice 1 完了報告

作成: 実装担当（Codex） / 保管日: 2026-07-09 / ステータス: 完了（Coworkレビュー承認）

## 1. 概要

Slice 1 では、イベント（お題）を作成し、共有URLとオーナー編集URLを発行し、未ログインのゲストが閲覧でき、オーナーがイベント名・メモを編集できる基盤を実装した。

実装範囲は、お題作成、属性保存、共有URL、オーナー編集URL、`guest_token` Cookie、未ログイン閲覧、オーナー権限回復、URLコピー、noindex/robots.txt、Supabase RLS まで。

候補、評価、コメント、確定ロジック、❤️、🌀、広告、マイイベント一覧はスコープ外として未実装。

## 2. 正本情報

- ローカル作業場所: `/Users/shige/Projects/Where-to-Visit`
- GitHub remote: `https://github.com/kcyth39/Where-to-Visit.git`
- 最新commit: `3e89fcb2c8dc54ac5cf9aca57a37fe76825d7104`
- Vercel Production URL: `https://kimenosuke.com`
- 独自ドメイン: `kimenosuke.com`, `www.kimenosuke.com`
- Vercel project名: 未確認
- Supabase project: `.env.local` の `SUPABASE_URL` 接続先。値は記載しない。

## 3. 実装済み機能

お題作成 / 属性保存 / 共有URL発行 / オーナー編集URL発行 / `guest_token` Cookie / ゲスト未ログイン閲覧 / オーナーメニュー表示 / オーナー編集URLによる権限回復 / URLコピー / noindex・`robots.txt` / Supabase RLS。

## 4. DB / Supabase

- 作成済みテーブル: `public.events` と `public.participants`。
- Supabase migration は実DBに適用済み。両テーブルで RLS を有効化し、Slice 1 に必要な select / insert / update policy を定義済み。**delete policy は未作成**。
- Supabase Table Editor でテーブル作成確認済み。テストデータは削除済み。
- 後続スライスでは既存migrationを編集せず、新規migrationで進める。

## 5. 環境変数

- ローカル環境変数は `.env.local` に整理済み。`.env` は削除済み。
- 必要なキー名: `SUPABASE_URL` / `SUPABASE_ANON_KEY`。
- Vercelにも同名キーを設定済み。`.env` / `.env.local` はGit管理対象外。値は報告書に記載しない。

## 6. 検証結果

前回までの確認で pass 済み:

- `npm run check`
- `npm run build`
- `npm run test:e2e`
- Supabase実DB full flow

Vercel Production / 独自ドメインで人間確認済み:

- トップページ表示 / HTTPS / お題作成 / 共有URL発行 / オーナー編集URL発行 / 共有URLのシークレットウィンドウ閲覧 / オーナー編集URLによる権限回復 / Supabase Table Editorで保存確認

## 7. cleanup完了事項

- Supabaseテストデータ削除
- `.env` 削除 / `.env.local` 整理
- `kimenosuke.com` / `www.kimenosuke.com` Valid Configuration確認

## 8. 残課題

- `npm audit --omit=dev` の Next/PostCSS moderate 警告
- Production運用前の最終UI/文言確認
- テストデータ整理方針
- 次スライス以降のRLS設計
- 独自ドメインを使った本番相当E2Eを自動化するかどうか

## 9. 次スライス前の注意点

- 既存migrationを編集しない
- local JSON fallbackを復活させない
- Supabase Authを使わない方針を維持する
- tokenベースのアクセス設計とRLS policyを崩さない
- 候補・評価・コメント・確定ロジック等は次スライス以降で扱う
- 外部サービス設定変更がある場合は、実装前に人間確認を挟む

## 10. 最終ステータス

ローカルGit状態は clean。`HEAD` と `origin/main` は最新commit `3e89fcb2c8dc54ac5cf9aca57a37fe76825d7104` で一致。
Slice 1 は、実装・実DB migration・E2E・Vercel Production・独自ドメイン確認・cleanup まで完了扱いでよい状態。次に進む前の確認事項は、audit警告の扱い、UI/文言の最終判断、次スライスのRLS方針。

---

## 付記: Cowork レビュー記録（2026-07-09）

実リポジトリ（commit `3e89fcb`）と突き合わせて検証した結果、本報告書の記載は正確で、Slice 1 のスコープと [DoD](../05_dod.md) を満たすと判断（承認）。

検証できた事項:

| 項目 | 結果 |
|---|---|
| Git状態 | HEAD＝origin/main＝`3e89fcb`、`git status` clean、branch `main`、remote一致 |
| スコープ厳守 | `src/app` と migration は events/participants の2テーブルのみ。候補・評価・確定ロジック等は未実装 |
| 属性enum | `食事 / 宿泊 / アクティビティ / そのた`（`買い物`ではない）— 正本と一致 |
| RLS | 両テーブルRLS有効、select/insert/update policy定義、delete policyなし（Slice 1では正しい） |
| 認証方式 | Supabase Auth不使用、x-share/owner/guest-token ヘッダ＋RLSでトークン識別（ADR-0002準拠） |
| noindex | `robots.ts`＋`layout.tsx` robots metadata、E2Eでも検証 |
| DoD 375px | E2E `tests/slice-1.spec.ts`（"fits viewports" で `setViewportSize(375×812)`）でカバー |
| 白画面禁止 | `SetupMessage` / `not-found.tsx` でユーザー向けメッセージ表示 |
| env露出 | `SUPABASE_URL` / `SUPABASE_ANON_KEY` はサーバー側参照のみ（`NEXT_PUBLIC_`なし）でクライアント非露出 |

軽微な補足:

- 本報告書§6に「375pxモバイル表示確認」を明記すると完全（実装・E2Eはカバー済み）。
- §2「Vercel project名: 未確認」は後日補完可。
- §8のaudit警告は **moderate**（Next/PostCSS）で、Slice 2着手前の必須修正ではない。おしげさんの判断事項。

---

## 付記2: UI文言 仕上げの反映（2026-07-09）

Slice 1 着手前タスク②（UI/文言）の確定を受け、承認済み [ui-copy-decisions.md](ui-copy-decisions.md) を Codex が反映。Cowork が実リポジトリで検証し承認。

- コミット: docs `bc78349` / UI `96c7622`（`main` は origin より ahead 2・**未push**）。
- 変更: 表示層のみ（DB enum値・データモデル・既存migrationは不変）。トップ/フォーム文言・属性表示ラベル＆順序・属性連動placeholder、オーナーメニュー廃止→同一画面＋控えめ所有表示＋「なおす/ほぞん」、リンク文言（みんなにおくるリンク/あなた専用リンク）、コピー成功`✓`、状態表示の見出し出し分け、`.env.local`修正、E2E文言更新。
- 検証: `npm run check` / `build` / `test:e2e` すべて pass。「きめたいひと」UI残存ゼロを確認。
- 残: (a) `main` の push（=本番 `kimenosuke.com` デプロイ）はおしげさんの判断待ち。(b) E2E実行で Supabase 実DBにテストデータが増加（delete機能/policyなし）→ 必要なら Table Editor で手動削除。テストデータ整理方針は §8 の残課題。
