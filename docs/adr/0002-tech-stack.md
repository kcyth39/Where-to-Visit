# ADR-0002: 技術スタック

- **ステータス:** Accepted
- **日付:** 2026-07-08
- **決定者:** おしげさん
- **関連:** [ADR-0008](0008-local-supabase-development-workflow.md)（Supabase CLI / Docker local-first検証とremote適用境界）

## コンテキスト

きめのすけ MVP の技術スタックを決定する。要件:

- 認証不要（ログインは MVP 外・トークン識別）
- リレーショナルDB（一意制約・カスケード削除）
- リアルタイム同期
- 広告実装（商用）対応
- 低コスト開始・独自ドメイン
- Codex との相性

## 検討した選択肢

| 案 | 構成 | 特徴 |
|---|---|---|
| A1 | Supabase + Netlify/Cloudflare | 無料・リアルタイムあり |
| A2 | Supabase + Vercel Pro | $20・最高DX |
| B | Neon + 軽量構成 | 無料・リアルタイムなし |

## 決定

**A2: Next.js + Supabase（DB/Realtime）+ Vercel Pro。**

- フレームワーク: Next.js
- DB/リアルタイム: Supabase（Postgres + Realtime、**Auth は不使用**）
- ホスティング: Vercel Pro（$20/月・商用OK）
- ドメイン: `kimenosuke.com` を Vercel 接続

## 影響

- 広告実装が商用OK（Vercel Hobby の商用制限を回避）。
- Supabase Realtime でリアルタイム同期を提供。
- **Slice 5境界（2026-07-10）**: 別ブラウザ・別端末・別タブへのRealtime自動同期はSlice 5対象外。Slice 5の即時反映は操作画面内のサーバー成功後反映を指す。この区切りはサービス全体のRealtime採用決定を撤回するものではない。
- Supabase 無料枠の7日一時停止は実トラフィック/定期 ping で回避、必要なら Supabase Pro（$25/月）で解消。
- 月額 $20（Vercel Pro）、広告収益で回収を目指す。
- Supabase Auth は不要（ログイン MVP 外）。将来ログイン導入時に認証方式を再検討。
- 開発時のSupabaseはADR-0008に従い、localhost限定Docker stackでmigrationを再現・検証する。remote適用方式は別の承認境界として扱う。
