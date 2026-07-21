# 意思決定支援サービス 立ち上げ手順書

対象: Claude、Tech Lead、Fullstack Engineer、DevOps、Reviewer、PKA、Humanの7 roleで、構想 → 要件定義 → DoD → QA → 開発 → 事業開始まで到達するための手順。
原則: **Humanが重要判断を行い、各domainの内容責任者が意味を維持し、承認済みExecution Contractの実装担当が成果物を作り、Reviewerが独立に確認する。PKAはprocessとKnowledgeの構造・lifecycleを横断管理する。**

> **現行仕様（2026-07-12）:** 本書のPhase 0〜初期スライス記述は計画履歴を含む。属性、任意ログイン、guest_token本人モデル、Vote行なし＝−、×あり候補の一律除外、Candidate単位の常設🌀、Event詳細1画面構造は[ADR-0005](adr/0005-drop-attribute-dynamic-criteria.md)、[ADR-0006](adr/0006-collaborative-response-row-model.md)、[ADR-0007](adr/0007-event-views-and-criterion-feedback.md)で置換済み。実装判断は`03_requirements.md`〜`06_qa-flow.md`とADRを優先する。

---

## 0. 前提: 役割分担と運用ルール

### 0-1. Role Definition

| Role | 役割目的 | 主責任 | 内容責任（該当時） | 主な成果物 |
|---|---|---|---|---|
| Claude | 事業Knowledgeを、開発で利用できる意味として維持する | 事業目的、背景、価値、方針、product要件の意味を整理する | 事業文書とproduct要件の意味 | 事業方針、product要件、意味変更の判断材料 |
| Tech Lead | 個別開発taskを技術的に実行可能な契約へ変換する | Execution Contract、技術方針、architecture、裁量範囲、停止条件、技術的成立性を整理する | 個別taskの技術方針とarchitecture | Execution Contract、技術判断記録、技術review |
| Fullstack Engineer | 承認済み契約の機能と検証を実現する | code実装、必要な文書変更、test、検証証跡、実装中の摩擦報告 | 承認scope内の実装成果 | code、test、実装関連文書、検証証跡 |
| DevOps | deliveryと運用基盤を技術的に成立させる | CI/CD、環境、deploy、運用toolingの設計・実装・検証 | CI/CD・環境・運用実装の技術内容 | workflow、環境設定、deploy・運用tooling、検証証跡 |
| Reviewer | 個別成果物のqualityを独立に確認する | Execution Contract、正本、DoD、証拠に基づくreviewと指摘の記録 | review判定の根拠 | 自身が新規作成したreview report、comment、判定記録 |
| PKA | 開発processと運用Knowledgeを横断的に改善可能な状態へ整える | 複数contract・開発結果の横断分析、Knowledge Map、反復pattern、template・process改善候補、評価指標、lifecycleを整理する | 開発・運用Knowledgeの構造、参照、整合性、lifecycle | 監査、Knowledge Map、改善候補、process・template提案、効果評価 |
| Human | agentへ委ねない事業判断・risk判断・重要承認を担う | おしげさんとして、事業判断、risk許容度、権限、重要gate、必要な人間操作を判断する | 事業目的、事業方針、risk許容度 | 承認・却下・保留の記録、必要な人間操作の証跡 |

#### Role用語と最低限制約

本書の`Human`は**おしげさん**を指す。サービスを利用する人は「サービス利用者」と表記し、repositoryの重要判断を行うHumanと区別する。

このrole定義はpermission付与ではない。Tech LeadとPKAはcode実装を行わない。Reviewerは、自身が新規作成したreview成果物以外の既存fileを更新せず、必要な修正を実装担当へ返す。Git publicationとtask closeoutの詳細は[06_qa-flow.md §1.1](06_qa-flow.md)を正とする。

### 0-2. Roleとtool利用の分離

- Roleは責任と内容責任を表し、使用するtoolや画面を表さない。特定toolの利用からpermission、承認権限、必須handoff経路を導出しない。
- Claude Chat、Claude Cowork、Codex等は選択可能な実行surfaceの例であり、roleそのものではない。利用するsurfaceは、承認済みExecution Contract、利用可能な機能、安全条件、現在の契約・使用量制限に基づいて選ぶ。
- toolの契約、上限、機能は変更され得るため、必要時に提供元の現行情報を確認する。tool運用上の都合でdomain ownerやReviewerの独立性を変更しない。

### 0-3. 成果物の置き場

```
decision-service/
├── CLAUDE.md              # 全AI共通のコンテキスト
├── docs/
│   ├── 01_lean-canvas.md
│   ├── 02_competitive.md
│   ├── 03_requirements.md
│   ├── 04_data-model.md
│   ├── 05_dod.md
│   ├── 06_qa-flow.md
│   ├── 07_launch-checklist.md
│   └── adr/               # 技術・仕様の決定記録(ADR)
└── src/                   # 実装領域
```

- docs/ 配下を正本とし、PKAは配置、参照、status、owner、更新経路、lifecycleを管理する。文書の意味は§0-1のdomain ownerが持つ。
- 承認された決定は、対象taskで変更を許可された実装担当が該当正本へ反映する。特定toolを必須の中継経路にしない。
- 実装担当は同じrepositoryを開き、AGENTS.md／CLAUDE.mdと該当正本、Execution Contractから文脈と停止条件を得る。

---

## 1. フェーズ全体マップ

| Phase | 成果物 | 主な責任role | 完了条件(Phase DoD) |
|---|---|---|---|
| 0 構想 | リーンキャンバス / 競合分析 / 収益モデル / サービス名 | Claude（内容整理）/ Human（判断） | おしげさんが「この事業をやる」と判断できる材料が揃う |
| 1 要件定義 | 要件定義書 / データモデル / 画面一覧 / MVP境界 | Claude（product要件）/ Tech Lead（技術設計）/ Human（承認） | 全機能に受け入れ条件が付き、MVP外が明記されている |
| 2 品質定義 | DoD / QAフロー / テストシナリオ | Tech Lead（定義）/ Reviewer（独立判定）/ Human（重要gate） | 各スライスの「完成」を機械的に判定できる |
| 3 開発 | 動くMVP(スライス1〜6) | Tech Lead / Fullstack Engineer / DevOps / Reviewer / Human | 全スライスがDoDを満たしQAシナリオに合格 |
| 4 開始準備 | 規約類 / ドメイン / 計測 / ローンチ発信 | Claude（事業・product）/ DevOps（delivery・運用）/ Human（判断） | チェックリスト全項目が Done |
| 5 運用 | 週次改善サイクル | Claude / Tech Lead / Fullstack Engineer / DevOps / Reviewer / PKA / Human | 継続運用体制が回っている |

各 Phase は前 Phase の成果物承認をもって開始する(承認者: おしげさん)。

---

## 2. Phase 0: 事業構想（Claudeが内容整理、Humanが判断）

### やること

1. **リーンキャンバス作成**（Claudeが壁打ちと内容整理を行い、承認された変更担当が`01_lean-canvas.md`へ反映）
   - 課題: 複数人での「決め」が投票だけでは終わらない(拒否権・懸念の扱いがない)
   - 独自価値: ○/−/× + ×解消フローによる「全員が許容できる決定」/ 登録不要
   - 収益: 無料+広告 → 将来オーナー向けプレミアム(広告なし+AI解説)
2. **競合分析**（Claudeが一次情報と事業上の意味を整理し、承認された変更担当が`02_competitive.md`へ反映）
   - 対象: 調整さん、伝助、LINEの投票/日程調整、Doodle 等
   - 観点: 登録不要か / 拒否権の扱い / 複数判断基準の有無 / 収益モデル / 弱点
3. **サービス名候補**: 5〜10案 + ドメイン空き状況の確認方針を添える
4. **判断**: おしげさんが Go / No-Go / ピボットを決定 → 結論と理由を `adr/0001-go-decision.md` に記録

### Claudeへの入力契約例

```
あなたはClaude roleを担当する。決定権はHumanにある。選択肢とトレードオフを提示せよ。
題材: 複数人の意思決定支援サービス(仕様概要は添付)。
タスク: リーンキャンバスの9項目を埋める案を2パターン
(広告先行型 / プレミアム先行型)で提示し、各項目に根拠を1行で付けよ。
出力: Markdown表のみ。freeform散文は不要。
```

---

## 3. Phase 1: 要件定義（Claudeがproduct要件の意味、Tech Leadが技術設計を担当）

現時点で仕様はかなり固まっているため、このPhaseの主目的は **構造化・穴埋め・MVP境界の確定** の3つ。

### 3-1. 要件定義書 `03_requirements.md` の章立て

1. **サービス利用者種別**: オーナー(お題作成者)/ ゲスト(URL参加、登録不要)/ ログイン利用者(任意)
2. **機能要件**(それぞれに受け入れ条件を付ける)
   - お題作成: 自由テキストのお題・メモ、共有URL＋owner URL発行（属性・お名前なし）
   - 候補管理: タイトル+URLのみ。オーナー・ゲスト双方が追加可
   - 総合評価: 未評価を含む4状態`unrated / positive / neutral / veto`
   - 最終候補表示: `clear / discussion / fallback / none`を○数と×有無から導出。確定行為・ロックなし
   - ❤️/🌀: CriterionごとのReaction / Concernを独立して保持し、補助情報として単純集計
   - コメント: Candidate×Participantにつき現在値1件
   - 回答者: Event内の名前付き共同編集行。オーナー・ブラウザ本人性と分離
3. **非機能要件**: モバイル・デスクトップ同格 / 共有URLを知る人のみアクセス可 / 応答速度 / 同時編集の整合性
4. **MVP境界(スコープ外を明記)**: プレミアムプラン(広告なし・AI解説)、通知、複数お題のグルーピング（※広告実装は MVP 内）
5. **未決事項リスト**: 例)×→−変更の履歴表示、候補の削除権限、イベント有効期限、1人が複数票を持てるか 等 → Claudeが事業・product上の選択肢を整理し、おしげさんが1件ずつ決定し ADR 化

### 3-2. データモデル `04_data-model.md`

Claudeがproduct要件の意味を整理し、Tech Leadが技術設計としてドラフトする(Event / Candidate / Participant / Criterion / Vote / Reaction / Concern / Comment)。
識別方式はADR-0006 / ADR-0007を正とし、share / owner token、Event内回答者行、event単位localStorage選択を分離する。

### 3-3. 画面一覧

お題作成 / オーナー初期セットアップ / ゲスト名前選択 / 候補一覧ダッシュボード / 候補編集 / 確認ダイアログ。トップ下部のイベント一覧は将来スライス。ワイヤーはコードベースで375px / 1366pxを確認する。

### 要件文書更新のExecution Contract例

> **非正本の簡略例:** 以下は立ち上げ時の表現を保存した例であり、現在のExecution Contract形式、承認gate、permission判断には使用しない。現行形式は[`draft-execution-contract`](../.agents/skills/draft-execution-contract/SKILL.md)、実行・publication・reviewは[`06_qa-flow.md`](06_qa-flow.md)を参照する。

```
承認された変更担当として docs/03_requirements.md を新規作成せよ。
入力: このタスクに添付する仕様メモと、Claudeが整理してHumanが承認した決定事項。
制約: 全機能に「受け入れ条件」を Given/When/Then 形式で付与。
散文禁止、表と箇条書きのみ。スコープ外セクションを必ず設ける。
未決事項は本文に書かず docs/adr/open-questions.md に分離せよ。
```

---

## 4. Phase 2: DoDとQAフロー（Tech Leadが定義、Reviewerが独立判定）

### 4-1. DoD `05_dod.md` — 2階層で定義

**スライスDoD(機能単位・全スライス共通)**
- [ ] 受け入れ条件(Given/When/Then)を全て満たす
- [ ] スマホ実機幅(375px)で表示崩れなし
- [ ] 主要操作のE2Eテストが自動化されグリーン
- [ ] エラー時にサービス利用者向けメッセージが表示される(白画面禁止)
- [ ] CLAUDE.md / 要件定義書との差分ゼロ(実装が仕様を勝手に変えていない)

**リリースDoD(MVP全体)**
- [ ] 全スライスDoD達成
- [ ] QAシナリオ(4-2)全件合格
- [ ] 本番環境でオーナー1名+ゲスト2名の実データテスト完了(家族で実施可)
- [ ] 利用規約・プライバシーポリシー掲出
- [ ] 計測(アクセス解析)が動作

### 4-2. QAフロー `06_qa-flow.md`

1. **実装完了ごと**: Fullstack Engineerがユニット+E2Eを実行する(スライスDoDの一部)
2. **スライス受け入れ**: おしげさんが受け入れシナリオを手動実施。代表シナリオ:
   - S1: お題・メモ作成 → URL共有 → Participant 0件のままゲストが未登録で閲覧できる
   - S2: 回答者名だけを確定し、評価なしでもParticipant行が表示される
   - S3: Candidateカード内で未評価・○・−・×が回答者行ごとに見える
   - S4: ○最多×なしはclear、○最多×ありはdiscussion、clear不在時の安全候補はfallbackになる
   - S5: 判断基準別❤️・🌀件数と1回答者1コメントが補助情報として見え、候補状態へ影響しない
   - S6: Candidate作成時刻が表示され、後から追加された候補の評価数バイアスを判断できる
   - S7: 別ブラウザでも既存回答者行を選んで共同編集できる
3. **回帰チェック**: スライス追加のたびに S1〜前スライスまでのE2Eを自動再実行
4. **バグ処理**: Blocker(確定ロジック・データ消失系)は即修正、Should は backlog 化しおしげさんが優先度判断

---

## 5. Phase 3: 開発（承認済みExecution Contractに基づく分担）

### 5-1. 技術スタック決定（Tech Lead → ADR）

**決定済み（[adr/0002-tech-stack.md](adr/0002-tech-stack.md)）**: **Next.js + Supabase(Postgres、Auth不使用) + Vercel Pro**、ドメインは `kimenosuke.com`。トークン識別で認証不要（ログインMVP外）。Realtime自動同期は共同編集型モデルのMVP外。

### 5-2. AGENTS.md／CLAUDE.md（PKAが構造・lifecycleを管理）

各domain ownerが内容の意味を持ち、承認された変更担当が両fileを同一内容で更新する。PKAは配置、参照、整合性、更新経路、lifecycleを管理する。

含める内容: サービス一言説明 / 4状態評価と最終候補3状態 / 共同編集型回答者行 / スタックと規約 / docs/ の参照先 / 「仕様変更を勝手にしない。矛盾を見つけたら実装せず質問すること」という指示。

### 5-3. 垂直スライス計画（1スライス = 1 Execution Contract）

| # | スライス | 含む機能 | 受け入れの軸 |
|---|---|---|---|
| 1 | お題作成と共有 | 自由テキスト、共有URL、owner URL、ゲスト閲覧 | S1 |
| 2 | 候補管理 | Candidate CRUD、提案者、タイトル/URL | S2 |
| 3 | 総合評価 | 未評価を含む4状態、回答者行、集計 | S3 |
| 4 | 最終候補表示 | clear / discussion / fallback / none | S4 |
| 5 | Criterion・❤️・🌀・コメント | 動的判断基準、判断基準別補助情報、1回答者1コメント | S5 |
| 6 | 共同編集型基盤再編 | owner分離、回答者行、完全読取モデル、画面分離 | ADR-0006 / ADR-0007 |

### 5-4. 1スライスの回し方(定型サイクル)

1. Tech Lead: 該当要件、受け入れ条件、技術DoD、裁量範囲、停止条件をExecution Contractへまとめる
2. Fullstack Engineer: 承認済みscopeを実装し、必要なtest、自己review、検証を行う。delivery変更がある場合はDevOpsが担当する
3. Reviewer: Execution Contract、正本、DoD、QA証跡、差分に基づいて独立reviewを行う。修正が必要なら実装担当へ返す
4. おしげさん（Human）: 必要な受入シナリオとReviewerの判定を確認し、重要gateとmergeを判断する
5. 仕様・技術判断・実装・delivery・Knowledge構造に更新がある場合は、該当domain ownerの意味を維持し、承認された変更担当が正本へ反映する。PKAは複数taskを横断するprocessとKnowledgeの改善候補を扱う

### 標準実装担当へのExecution Contract例

> **非正本の簡略例:** 以下は立ち上げ時の表現を保存した例であり、現在のExecution Contract形式、承認gate、permission判断には使用しない。現行形式は[`draft-execution-contract`](../.agents/skills/draft-execution-contract/SKILL.md)、実行・publication・reviewは[`06_qa-flow.md`](06_qa-flow.md)を参照する。

```
AGENTS.md／CLAUDE.mdとdocs/03_requirements.mdを読んでから着手せよ。
役割: 承認済みscopeの標準実装担当。
今回のスコープ: スライス4(確定ロジック)のみ。他スライスに触れるな。
受け入れ条件: docs/06_qa-flow.md の S4・S5。
完了時: E2Eテストを追加・実行し、結果と変更ファイル一覧を報告。
仕様に曖昧さがあれば実装せず、質問リストを出して停止せよ。
```

---

## 6. Phase 4: 事業開始チェックリスト `07_launch-checklist.md`

### 法務・規約（Claudeが事業・product上の意味を整理し、Humanが最終判断。専門家確認を推奨）

- [ ] 利用規約(投稿コンテンツの扱い、禁止事項、免責)
- [ ] プライバシーポリシー(Cookie/ゲストトークン、ログイン情報、解析ツールの明記)
- [ ] 外部URLを扱うサービスとしての免責(候補URLの内容に責任を負わない旨)
- [ ] ※特定商取引法表記は**課金(プレミアム)開始時に必須**。MVP時点は不要だが ADR に予定として記録

### インフラ・運用（DevOpsが技術内容を担当し、Humanが重要gateを判断）

- [ ] ドメイン取得・SSL
- [ ] 本番デプロイ(Vercel等)+独自ドメイン接続
- [ ] アクセス解析導入(プライバシーポリシーと整合させる)
- [ ] エラー監視(Sentry等の無料枠)
- [ ] 問い合わせ窓口(フォームまたは専用メール)
- [ ] バックアップ方針(DBの自動バックアップ設定確認)

### ローンチ発信（Claudeが事業上の内容を整理し、Humanが判断）

- [ ] note: 開発過程そのものを一次情報として記事化(当時の「AI3役体制で個人開発した」という履歴は note の一次情報重視と相性が良い)
- [ ] X: ローンチ告知+利用シーン別の短い投稿(家族旅行の宿決め、友人との食事決め)
- [ ] 初期サービス利用者テスト: 家族・友人グループで実イベント3件以上を回す

### 開始判定

- [ ] リリースDoD全達成 + 上記全チェック → おしげさんが開始を宣言し `adr/000X-launch.md` に記録

---

## 7. Phase 5: 運用の週次サイクル

| 曜日目安 | 主な責任role | 内容 |
|---|---|---|
| 週初 | Claude / Human | Claudeが利用状況・feedbackの意味を整理し、Humanが今週のBlocker／Shouldと優先順位を判断 |
| 週中 | Tech Lead / Fullstack Engineer / DevOps | Tech Leadが個別Execution Contractを整え、Fullstack Engineerが改善スライスを実装。delivery／運用変更はDevOpsが担当 |
| 週末 | Reviewer / PKA / Claude | Reviewerが成果物を独立判定し、PKAが横断的なprocess・Knowledge改善候補を整理。Claudeが事業発信用の内容を整理 |

プレミアムプラン(広告なし+AI解説)は、無料版で「×解消フローが実際に使われているか」を確認してから着手判断する。AI解説機能は Anthropic API(Pro とは別契約・従量課金)が必要になる点を予算計画に含めておく。

---

## 付録: 最初の一歩(今日やること)

1. ローカルに`decision-service/`フォルダを作成し、承認された変更担当が利用できる状態にする
2. この手順書を `docs/00_master-plan.md` として配置
3. ClaudeがPhase 0のリーンキャンバス壁打ちと内容整理を開始（入力契約例は§2）
4. 週内目標: Phase 0完了とHumanによるGo判断
