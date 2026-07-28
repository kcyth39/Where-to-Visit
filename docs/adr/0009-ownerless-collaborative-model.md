# ADR-0009: Ownerless Collaborative Model Decision

- **ステータス:** Accepted
- **日付:** 2026-07-28
- **Decision owner:** Human
- **Lifecycle owner:** PKA
- **Implementation authorization:** None
- **採用baseline:** `main@9cbc0cf2238703665155b4158d82f243ddd82407`
- **次工程:** `N2 Launch Roadmap Rebaseline`
- **関連:** [ADR-0004](0004-permission-model.md) / [ADR-0006](0006-collaborative-response-row-model.md) / [ADR-0007](0007-event-views-and-criterion-feedback.md) / [03_requirements](../03_requirements.md) / [04_data-model](../04_data-model.md)

> 本ADRの採用は、コード変更、migration、DB cleanup、Git publication、Production操作その他の実装許可を意味しない。現行application／DBはowner modelのままであり、本ADRのownerless modelは未実装である。

## 背景と問題

現行モデルは、共有利用者による共同編集とは別に、Event作成者へowner URL／owner token／Cookieによるtitle・memo編集権限を付与している。

しかし、きめのすけはログイン不要の共有共同編集サービスであり、作成者だけが永続的に強い権限を持つモデルは、共同編集の意味、秘密URLの管理、owner-session、Cookie、復旧導線を複雑にする。

ローンチ前で互換性維持も不要なため、作成者と共有利用者の権限差を撤廃する。

## 決定

1. Event作成者は、Event作成後、有効な共有URLを用いる他の共有利用者と同じ権限を持ち、作成者固有の強い権限を持たない。
2. Event作成成功後、作成者には共有URLだけを提示し、owner固有のtoken、Cookie、session、権限状態を作成しない。作成者は以後、他の共有利用者と同じ共有URLからEventへアクセスする。
3. Eventアクセスは共有URLへ一本化する。
4. owner URL、owner token、owner Cookie、owner-sessionを廃止する。
5. 移行後、owner token、旧owner URLおよび旧owner Cookieは、Event閲覧またはいかなるmutationの認証・認可根拠としても使用しない。
6. `share_token`はEventへのaccess capabilityとして維持する。share URL方式そのものの変更はN1で決定しない。
7. 「きめること」＝`Event.title`は、Event作成後は誰も変更できない。
8. 「きめること」を誤った場合は、既存Eventを修正せず、新しいEventを作成する。
9. Event作成mutationの前に、次の確認を表示する。

   > この内容で作成してもよろしいですか？<br>
   > 作成後に「きめること」は変更できません。

10. 「つたえておきたいこと」を「つたえたいこと」へ変更する。内部列名`memo`の変更要否はN2以降の実装判断とする。
11. 「つたえたいこと」は、有効な共有URLを持つ共有利用者が共同編集できる。
12. Participant、Candidate、Criterion、Vote、Reaction、Concern、Commentの現在の共同編集権限を変更しない。
13. Participant削除の2段階確認、関連行cascade、`created_by`のNULL化を変更しない。
14. Event削除、終了、確定、ロック、共有URL再発行、banはMVP外のままとする。
15. ローンチ前であるため、既存Event、旧owner URL、owner tokenとの後方互換性を維持しない。
16. 旧owner URLからshare画面への互換redirectを設けない。
17. 既存Eventは、別途承認されるcleanup gateで全削除してよい。この決定は削除実行を許可しない。
18. 「参加中イベント一覧」は「参加中のきめたいこと」へ再定義する。
19. 「参加中のきめたいこと」は、権限またはEvent ownershipを表さず、同一ブラウザからEventへ戻るための履歴導線とする。
20. 端末間同期およびログイン同期はMVP外とする。
21. 一覧から項目を削除しても、Event本体および共有利用者のアクセスには影響させない。
22. 保存方式、保存データの消失条件、保持期間、件数上限、share capabilityの保管方法はN1では決定せず、N2以降で決定する。localStorageは第一候補に留める。

## ADR-0004との関係

本ADRはADR-0004を全面廃止しない。

次を置換する。

- owner capability
- owner token
- owner URL
- owner Cookie／owner-session
- owner tokenによるEvent閲覧
- owner-only title／memo編集
- owner権限回復

次は維持する。

- share tokenを持つ利用者による共同編集
- Participantは本人所有データではない
- Participant等の同一Event境界
- 現行の削除確認
- RLS／GRANT／functionによるDB安全境界
- 操作者・変更履歴を保存しないMVP境界
- Supabase Authを現時点では導入しない方針

ADR-0006／ADR-0007のowner固有部分も本ADRで置換する。回答者行、selected participant、候補一覧・候補編集、評価モデルは維持する。

## 採用しない案

| 案 | 採用しない理由 |
|---|---|
| owner URLを維持 | 作成者だけの永続的な強権限とowner token管理が残る |
| 作成ブラウザ限定owner | browser stateが権限となり、消失・移行・共有端末の扱いが複雑になる |
| ログイン型owner | 登録不要方針を変更し、認証・アカウント回復・個人情報管理を新設する |
| Title共同編集 | 「きめること」が後から変わり、参加者が別の問いへ回答している状態を生む |
| 既存Eventだけ旧owner方式を維持 | ローンチ前に二つのpermission model、route、RLS、QAを維持する合理性がない |
| owner URLからshare画面への互換redirect | 旧owner capabilityの受理・token処理・漏えい面を残し、互換性を維持しない決定とも矛盾する |

## 受容する残余risk

- 有効な共有URLを取得した利用者は、「つたえたいこと」と現行共同編集対象を変更できる。
- 共有URLが漏えいしても、MVPでは再発行、失効、ban、認証による回復を提供しない。
- 作成者も誤った「きめること」を修正できず、新Eventを作成して共有し直す必要がある。
- 操作者、変更履歴、監査履歴を保存しないため、誰が変更したか判別できない。
- Participant削除を含む現行共同編集上の誤操作riskは維持される。
- 「参加中のきめたいこと」は同一ブラウザ向けの戻り道であり、端末間同期およびログイン同期を提供しない。
- 保存データの消失条件、保持期間、件数上限、share capabilityの保管方法に伴うriskは、保存方式とともにN2以降で判断する。
- 既存Eventのcleanupが完了するまでは、DBに旧owner modelのデータが残る可能性がある。ただし移行後の認証・認可根拠として使用しない。

## 状態

- S1-c2a: `Production accepted`
- 旧S1-c2b／S1-c3a／S1-c3b／S2-a／S2-b: N2で再編するため、現行構造では開始しない
- N3以降: 未確定
- 次工程: `N2 Launch Roadmap Rebaseline`

## 対象外

- 実装sliceの最終構成
- 実装順序
- migration分割
- owner token列の削除時期
- 既存Event cleanupの実行時期
- 「参加中のきめたいこと」の保存方式
- 保存データの消失条件、保持期間、件数上限
- share capabilityの保管方法
- share token URL方式の変更
- rate limit方式
- analytics／monitoring方式
- Production操作

## N2への確定入力

| 影響領域 | 確定入力 |
|---|---|
| UI | owner表示・専用リンク・owner編集導線を撤去。「つたえたいこと」は共同編集。「きめること」作成前確認を追加 |
| Routing | share URLへ一本化。owner routeの互換維持なし |
| Server action | titleは作成後更新不可。memoだけshare capabilityで更新可能 |
| Cookie | owner Cookie／owner-sessionを撤去。参加履歴用storageは未決定 |
| Token生成 | owner token生成を廃止。share tokenは維持 |
| DB列 | `owner_token`は撤去対象。削除時期とmigration分割は未決定 |
| RLS／GRANT／function | owner access／update境界を撤去。share accessと共同編集の既存安全境界は維持 |
| Title更新 | UI、server、DBの全境界で作成後不可 |
| Memo更新 | 「つたえたいこと」としてshare利用者の共同編集対象 |
| Test | owner回帰を撤去し、title不変、memo共同編集、share-only access、作成確認を検証 |
| Production既存Event | 将来の別承認cleanup gateで全削除可能。N1では実行しない |
| Browser participation history | 同一ブラウザ向けの戻り道。権限・ownershipには使わない |
| Share token非記録 | browser保管、URL、log、test artifactをN2以降で評価 |
| Abuse対策 | owner廃止後のshare共同編集riskを前提に再編する |
| Legal／privacy | owner Cookie廃止を反映。share capabilityと参加履歴storageの説明要否を後続判断 |
