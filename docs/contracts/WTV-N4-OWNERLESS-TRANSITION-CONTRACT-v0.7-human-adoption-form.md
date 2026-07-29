# WTV-N4-OWNERLESS-TRANSITION-CONTRACT v0.7 — Review Identity and Human Adoption Form

## 1. Record identity

- Record ID: `WTV-N4-OWNERLESS-TRANSITION-CONTRACT-REVIEW-AND-ADOPTION`
- Record version: `v0.1`
- Lifecycle owner: PKA
- Decision owner: Human
- Current lifecycle status: `ADOPTED / NOT IMPLEMENTATION AUTHORIZED`
- Current verdict: `ADOPTED`

### Reviewed Contract artifact

- Contract ID: `WTV-N4-OWNERLESS-TRANSITION-CONTRACT`
- Version: `v0.7-rebaselined-draft`
- Path: `/private/tmp/wtv-n4-ownerless-transition-contract/WTV-N4-OWNERLESS-TRANSITION-CONTRACT-v0.7-rebaselined-draft.md`
- SHA algorithm: `SHA-256`
- Reviewed SHA-256: `3abf083fba34a0df1afbc4498eae9965803f35be583f9804494b7f41af9b813a`
- Size: `48,749 bytes`
- Lines: `733`
- Encoding: `UTF-8`
- Final newline: `present`
- Baseline: `main@e3a6d0bed953dd40b8c3e180b3ac645af78b51d1`
- Immutable reviewed body: `true`

Contract本文のembedded statusはartifact生成時点の記録として変更しない。現在のreview／adoption lifecycleは本recordで管理する。これにより、review対象のexact SHAを変更せずに、review済みとHuman未採用を分離する。

本recordの§3は、reviewed Contract §24冒頭の「Human adoption／N5 implementation authorization前に次を確定する」という時期区分だけを置き換える。reviewed Contractの技術要件、permission、DoD、QAおよびSTOP条件は変更しない。

## 2. Exact-SHA review identity

| Reviewer | Exact verdict | Reviewed SHA-256 | Findings |
|---|---|---|---|
| Tech Lead | `N4_TECH_LEAD_REVIEW_PASS_READY_FOR_HUMAN_DECISIONS` | `3abf083fba34a0df1afbc4498eae9965803f35be583f9804494b7f41af9b813a` | blocking 0／advisory 0 |
| DevOps | `N4_DEVOPS_REVIEW_PASS_READY_FOR_HUMAN_DECISIONS` | `3abf083fba34a0df1afbc4498eae9965803f35be583f9804494b7f41af9b813a` | blocking 0 |
| Independent Reviewer | `N4_FINAL_INDEPENDENT_REVIEW_PASS` | `3abf083fba34a0df1afbc4498eae9965803f35be583f9804494b7f41af9b813a` | blocking 0／advisory 0 |

3 reviewは同一のexact SHAを対象とする。superseded SHAまたはmetadata変更後の別artifactをreview済みとは扱わない。

## 3. Decision responsibility split

### 3.1 N4 Human decisions

Human adoption時に次の方式を確定する。方式の採用はproject作成、role作成、credential設定、dependency追加または実装開始を許可しない。

1. **Dedicated non-Production QA project方式**
   - Productionとは別のdedicated non-Production Supabase projectをLayer 2 proofに使用する方式を採用する。
   - Production project／credentialは使用しない。
   - Vercelはexact Preview environmentへmanual bindingし、automatic integrationを新規有効化しない。
   - actual project identity、binding、replay方法およびretirement実行はN5 entry／Contract decisionへ送る。
2. **Dedicated Postgres role方式**
   - server-side Event creationに、`service_role`ではなくreviewed Contract §11のcandidate `kimenosuke_event_creator`によるdedicated least-privilege Postgres role方式を採用する。
   - actual role／connection設定とcredential provisioningはN5 entry／Contract decisionへ送る。
3. **Memo maximum 1000**
   - normalized `memo`の最大長をUI／server／DBで共通の`1000文字`とする。
   - exact counting ruleと実装方法はN5 Contractで固定する。
   - 既存の共同編集、normalization、LWWおよびtitle immutable境界は変更しない。

### 3.2 N5 entry／Contract decisions

次はN4 Contract adoption後も未確定とし、別途採用された`N5_ENTRY_DECISION_RECORD`で実装開始前に固定する。

| N5 entry decision | Secret-free record内容 |
|---|---|
| actual QA project identity | display name、project ref、database、region、owner、availability、cost、retirement、exact Preview binding、既存integration状態 |
| replay wrapper／method | target profile／wrapperまたはHuman-only runbook identity、hosted migration historyの記録方法、operator |
| exact driver／version | package名、pinned version、N3／N5 ownership |
| environment variable名 | server-only variable名、Preview／Production scope分離 |
| SSL／timeout／prepared statement | exact connection設定。parameter binding、retry 0およびreviewed Contract §11の境界を維持 |
| local credential provisioning | local-only方式、operator、provisioning／rotation／revocation結果。credential値は記録しない |

N5 entry recordはsecret値を記録しない。actual identityまたは設定を確認するためのproject作成、binding、credential設定、package追加、DB接続その他の操作は、それぞれ別Human permissionが与えられるまで行わない。

## 4. Permission separation

| Action | Current permission |
|---|---|
| Contract adoption | `ADOPTED FOR EXACT REVIEWED CONTRACT` |
| N5 implementation | `NOT GRANTED` |
| QA project create／bind／retire | `NOT GRANTED` |
| Postgres role create／alter | `NOT GRANTED` |
| credential provision／rotation／revocation | `NOT GRANTED` |
| dependency／driver addition | `NOT GRANTED` |
| repository file change | `NOT GRANTED` |
| Git stage／commit／push／PR／merge | `NOT GRANTED` |
| DB／Supabase mutation | `NOT GRANTED` |
| Vercel environment／deployment operation | `NOT GRANTED` |
| Production migration／cleanup／Data API／WAF operation | `NOT GRANTED` |

Contract adoptionだけでは、上記の`NOT GRANTED`を変更しない。

## 5. Human adoption form

### 5.1 Review acknowledgement

- [x] Tech Lead、DevOps、Independent Reviewerの3 reviewがexact SHA `3abf083fba34a0df1afbc4498eae9965803f35be583f9804494b7f41af9b813a`を対象とし、blocking finding 0であることを確認した。

### 5.2 N4 decisions

- [x] Dedicated non-Production QA project方式を採用する。
- [x] Candidate `kimenosuke_event_creator`によるdedicated least-privilege Postgres role方式を採用する。
- [x] Normalized `memo`の共通最大長を`1000文字`として採用する。
- [x] §3.2の6項目はN5 entry／Contract decisionとして未確定のまま維持する。

### 5.3 Adoption decision

- Decision: `ADOPTED`
- Adopted Contract ID: `WTV-N4-OWNERLESS-TRANSITION-CONTRACT`
- Adopted version: `v0.7-rebaselined-draft`
- Adopted exact SHA-256: `3abf083fba34a0df1afbc4498eae9965803f35be583f9804494b7f41af9b813a`
- Human decision owner: `kcyth39`
- Decision date／timezone: `2026-07-29 18:05 JST`
- Adoption notes: `N4 Human decisionsを採用し、§3.2の6項目をN5 entry／Contract decisionへ維持する。`
- Body change from reviewed artifact: `0`
- N5 implementation authorization: `NONE`
- Additional permission generated: `0`

Contract lifecycleは`ADOPTED / NOT IMPLEMENTATION AUTHORIZED`である。N5 entry decisions、N5 implementation、Git publicationおよび外部操作は、それぞれ別Human gateを必要とする。

## 6. STOP／handoff

次の場合はadoptionを確定せず、PKAへ戻す。

- Humanが§3.1の方式またはmemo最大長を変更する。
- adoption対象SHAが`3abf083fba34a0df1afbc4498eae9965803f35be583f9804494b7f41af9b813a`と一致しない。
- blocking review findingが新たに発生する。
- N5 entry decisionをN4 adoption前提へ戻す必要がある。
- Contract adoptionと実装／external operation permissionを分離できない。

## 7. Form verdict

`N4_HUMAN_ADOPTION_RECORDED`

本formの作成はContract adoption、N5実装、QA project作成、credential設定、dependency追加、repository／Git変更、DB／Supabase／Vercel／Production操作を許可しない。
