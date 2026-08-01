# N6 Handoff and Entry

Status: `N6 HANDOFF READY / NOT IMPLEMENTATION AUTHORIZED`

この文書は、N5のaccepted HeadからN6 Browser History Implementationへ引き渡すためのdocs-only handoffである。N6の実装、migration、環境設定、deployment、Production操作またはmerge permissionを生成しない。

## 1. Source identity

- Repository: `kcyth39/Where-to-Visit`
- N5 PR: [#39](https://github.com/kcyth39/Where-to-Visit/pull/39)
- N5 branch: `codex/n5-ownerless-transition`
- N5 H5 accepted Head: `022b85776109bae62ef21380539523bafc3e147b`
- Current main: `87295a19f80192ffbe91c56dded86748d3a51bbd`
- N5 merge status: `NOT MERGED`
- N5 Production status: `NOT DEPLOYED / 0 Production operation`
- N6 branch: `codex/n6-handoff-and-entry`
- N6 branch base: N5 H5 accepted Head above
- N6 PR base: `codex/n5-ownerless-transition`（N5 PR #39が未mergeのためstacked PRとする）

N5 accepted Headは変更せず、PR #39へ追加commitを積まない。mainへ無条件に切り替えない。

## 2. N5 completed state

- Owner URL／owner token／owner Cookie／owner-sessionを生成しないownerless candidateをN5で受入済み。
- M01〜M11: immutable、exact 11件
- M12: absent
- Hosted Event creator credential: `PRESENT / VERIFIED`
- Minimum-privilege probe: `PASS`
- Preview REST target binding: `PASS`
- Preview basic-function QA: `PASS`
- Preview fixture cleanup: `COMPLETE`
- QA business rows: `0`
- Production operation: `0`
- H5 same-SHA acceptance: `PASS`

Preview QAでfull CRUD coverageは主張しない。Vercel Runtime Logs単独でoutbound REST hostを直接観測できない制約、branch override・deployment identity・QA-only Event・QA DB postflightによる複合evidence、DB error／not-found UI統合のP3、anon votes DELETE hardening候補、通信結果不明後のEvent重複riskはHuman受容済みの非blocking事項として維持する。

## 3. N6 purpose and authorized scope

N6は、権限・ownership・認証ではない同一ブラウザ向けの戻り道として、Browser-local historyを実装・検証する。

- トップの「きめごと」は最新2件、「きめごと一覧」は最大30件
- `localStorage`へ、同一originのcanonical relative pathname `^/e/[A-Za-z0-9_-]{43}$`、title、`lastVisitedAt`、`expiresAt`だけを保存する。pathnameはEvent access capabilityを含むlocatorであり、raw share token単体を別fieldへ保存する意味ではない
- 180日のsliding expiration
- Event作成成功または有効な共有URL再訪で履歴を更新
- 個別削除／全削除は一覧だけを削除し、Event本体を削除しない
- trusted application routeからcanonical pathnameを構築し、tokenの抽出・複製・hash／digest／prefix等の派生識別子化、arbitrary inputの直接保存を行わない。full URL、origin、protocol、host、query、fragment、owner URL／token、Event／Participant等のID、business dataは保存しない
- capability-bearing pathnameはcredential同等に扱い、localStorage外のconsole／server log／analytics／telemetry／error report／evidence／screenshot／artifact／Git／test snapshot／fixture名へ転記しない
- 同一browser profileの共有利用者にtitleと再訪locatorが見える可能性があり、login／logoutによる分離はない。履歴削除UIはlocalStorage entryだけを削除する
- storage unavailable、破損、期限切れ、JSON parse／SecurityError／quota／read・write・remove failure、private browsing差異でもEvent作成・閲覧・編集を阻害しない。localStorage全体を無条件clearせず、履歴UIだけを安全に無効化または空表示する
- selected participantのS16保存とは別責務・別localStorage key

localStorageはclient component／client-side effect内だけで読み書きし、server component、route handler、server action、SSR render中に参照しない。初期server HTMLはstorage内容に依存せず、read前は固定neutral stateを表示してhydration mismatchを起こさない。invalid pathname／date、expired entry、duplicate entry、31件目以降はreadまたはupdate時にpurgeする。同一pathnameはupsertし、title、`lastVisitedAt`、`expiresAt`を更新して先頭へ移動し、`lastVisitedAt`降順とstable tie-breakで最大30件にする。future clock-skewの許容上限はN6 Execution Contractで固定し、未確定のまま実装を開始しない。

N6は、既存のownerless share URL境界を利用するだけで、share capabilityの設計や認可を変更しない。

## 4. Out of scope

- PR #39への追加commit、PR #39のmerge、mainへの直接変更
- N5 ownerless core、migration、RLS、GRANT、server routeの変更
- N7 Event作成rate limit／WAF／abuse protection
- N8既存Event cleanup、Data API停止・再開、Production release
- N9以降のProduction、Vercel Authentication、広告、検索、Privacy操作
- ログイン、Supabase Auth、端末間同期、server-side history
- share token方式、ownerless permission、Participant／selected participant仕様の変更
- credential生成・rotation、Vercel env、Supabase、DB、SQL操作

## 5. N6 entry conditions

1. このhandoffとN6専用Execution Contractのscope、DoD、QAをHumanが採用する。
2. N6実装開始を別Human gateで承認する。
3. N5 H5 accepted Head `022b85776109bae62ef21380539523bafc3e147b`をentry evidenceとして固定し、N5 PR #39へ変更を加えない。
4. N6専用branch／worktree／PRを使用し、N5 branchを上書きしない。
5. N5 accepted factsを再調査で無断変更しない。driftが見つかった場合は実装せずHumanへ戻す。
6. N6はN5〜N7 stacked release lineの次のsliceとして扱い、N5単独mergeやProduction操作を行わない。

## 6. N6 DoD and QA direction

N6の実装時DoDは、少なくとも次を判定可能にする。

- 最新2件／最大30件の表示と登録
- canonical capability-bearing relative pathname `^/e/[A-Za-z0-9_-]{43}$`と許可フィールドだけの保存。raw token単体／派生識別子／full URL／query／fragmentの保存・外部転記0
- 180日sliding expirationと有効Event再訪更新
- 同一pathnameの重複0、expired／malformed／invalid／overflow entryのpurge、最大30件、latest 2件表示
- 個別／全削除がEvent本体へ影響しない
- storage failure、破損、期限切れの非阻害、localStorage全体の無条件clear 0
- server render中のlocalStorage access 0、初期HTMLのstorage依存0、hydration mismatch 0、read前neutral state
- selected participant keyとの分離
- Event business data、Event ID、owner情報、secret、raw token別field／派生識別子の保存0
- capability-bearing pathnameのconsole／log／analytics／telemetry／error／evidence／artifact／Git／snapshot転記0、shared browser privacy境界の説明
- Event権限、ownership、既存共同編集仕様への変更0

QAはcanonical pathname、query／fragment／full URL拒否または除去、raw token別field 0、同一pathname upsert、latest 2／max 30／31件目purge、180日sliding、malformed JSON／invalid date／expired entry、localStorage unavailable／SecurityError／quota／write failure、client-only／SSR／hydration mismatch 0、shared browser privacy説明、履歴削除後のEvent本体存続、selected participant回帰を対象とする。実装開始前にN6 Execution Contractでfixture、test、browser QA、cleanup、evidenceの具体的境界をHuman採用する。

## 7. Human gates and permission boundary

- N6 handoff adoption: Human
- N6 Execution Contract adoption: Human
- N6 implementation start: Human
- Git publication／Ready／merge: 個別Human gate
- Production、Supabase、Vercel、DB、migration、credential: 個別Human gate

このhandoffから、N6実装、依存追加、repository変更、Production操作、N5 mergeまたはN6 mergeのpermissionを導出しない。

## 8. Evidence references

Git外evidence本体はcommitしない。Git上には結果とSHAだけを参照する。

- Cleanup manifest SHA-256: `84e1f7ab3be2fd4ccf747a0552bdce5b192493bbee66f153fe8eaf6f681da709`
- Cleanup COMPLETE SHA-256: `a3ce8655b1d9b9d17d5887c786644a10b2c5244765cd21145ba627c85b6c459d`
- Cleanup SQL SHA-256: `220d5c0d6e4cec9096e4141714379d4b93603f8b23b72d5dc58c072d2f7bac90`
- Preview deployment: `dpl_4Vk3cAGk5y7GrT2mtFuKj2of7m4q`

API key、DB URL、password、CA PEM、credential profile、raw share token別field／派生識別子、runtime log payload、fixture本文は保存しない。

## 9. Follow-up items

DB error／not-found分類、anon votes DELETE hardening、unknown outcome後のEvent重複対策は、N6へ自動的に含めない。Roadmapまたは個別Execution Contractで別途位置づける。

## 10. Lifecycle and entry instruction

- N5: `H5 ACCEPTED / NOT MAIN-INTEGRATED`
- N6: `HANDOFF READY / NOT IMPLEMENTATION AUTHORIZED`
- N7以降: `PLANNED / NOT IMPLEMENTATION AUTHORIZED`
- N5 standalone merge: `NOT AUTHORIZED`
- N6 next action: N6専用Execution Contractを作成し、focused reviewとHuman adoptionへ進む

次の実行担当は、N6専用Execution Contractの採用前に実装・test・migration・外部操作を開始しない。
