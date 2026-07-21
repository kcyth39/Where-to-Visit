> **Status: SUPERSEDED / DO NOT EXECUTE**
>
> 本文は2026-07-18時点の旧共同作業protocolを履歴として保持する。現在のworktree coordinationは[`coordinate-claude-codex-worktree`](../../../.agents/skills/coordinate-claude-codex-worktree/SKILL.md)を使用する。本書の手順を再実行しない。

# Claude + Codex 共同作業プロトコル（運用ドキュメント）

> 作成: 2026-07-18 / 種別: 運用リファレンス（正本ではない）
> 位置づけ: 本ドキュメントは `docs/reports/` 配下の**運用ガイド**であり、仕様の正本（`docs/` `docs/adr/` `DESIGN.md`）ではない。プロトコルを大原則へ昇格する場合は AGENTS.md / CLAUDE.md の「詳細仕様の正本」表へポインタを追加し、両ファイルを同期する。
> 対象: この repo を **Claude（Cowork の Linux VM 内で動作・フォルダをマウント）** と **Codex（macOS ホスト上で動作）** の2エージェントで共同編集する運用。

## 1. 背景と問題

Claude は Cowork のサンドボックス（Linux VM）内で動作し、作業フォルダを virtiofs 経由でマウントして読み書きする。Codex は macOS ホスト側で直接動作する。この構成に起因して、Codex の「着手前チェック」で**Claude 側の痕跡が停止条件として検出される**ことがある。代表例が本ドキュメントの対象である `.git/index.lock` の偽陽性と、未コミット docs 差分の所有権未確定である。

## 2. `.git/index.lock` の偽陽性ルール（最重要）

### 2.1 症状
Codex の着手前チェックで、次のように報告され停止する:

- `.git/index.lock` が存在する（多くの場合 0 バイト）
- そのファイルを `com.apple.Virtualization.Virtua...`（例: PID 6504）が参照中

### 2.2 正しい解釈
`com.apple.Virtualization` が参照しているのは、**この repo フォルダ全体が Cowork の VM にマウントされているため**であり、マウント層がファイルハンドルを保持しているだけである。**git が使用中なのではない。** したがって「Virtualization プロセスが index.lock を参照している」ことだけを根拠に、稼働中の git 操作があると判断してはならない（偽陽性）。

### 2.3 stale（中断痕跡）判定基準
次をすべて満たすとき、その index.lock は stale（安全に除去可能）と判定する:

- ファイルサイズが 0 バイト、または mtime が明らかに古い（直近の作業時刻より前）
- VM 内・ホスト側の双方で、稼働中の git プロセスがない（`ps aux | grep '[g]it'`）
- 実ロック保持者がいない（`lsof .git/index.lock` が空）
- `git status` が正常に読める（読み取りは lock の影響を受けない）

### 2.4 削除の実行者
Claude（VM 内）からは virtiofs 越しに `rm` が **`Operation not permitted`（EPERM）で拒否される**ため、**Claude は index.lock を削除できない**。削除はホスト側＝**おしげさん または Codex** が実行する。

### 2.5 復旧手順（ホスト側 = macOS ターミナル、当該 repo で実行）
```bash
# 1. stale であることを確認
ls -la .git/index.lock                 # サイズ・日時
ps aux | grep '[g]it'                  # 稼働中 git がないこと
lsof .git/index.lock 2>/dev/null       # Virtualization 以外の保持者がないこと

# 2. stale と確認できたら削除
rm -f .git/index.lock

# 3. 復旧確認
git status
```
`lsof` に `com.apple.Virtualization` **のみ**が出る場合は、2.2 の通りマウント由来であり削除を妨げない。

### 2.6 なぜ発生するか / 予防
- 発生源: VM の suspend/resume 等で Claude 側の in-flight な git 操作が中断されると、0 バイトの index.lock が残る。
- Claude 側の予防:
  - git 書き込み操作（add/commit 等）は原子的に行い、途中で放置しない。
  - 本番 repo への git 書き込みが不要な作業では git 状態を変更しない（本ドキュメント作成のように、新規ファイル追加のみで stage/commit しない運用を既定とする）。
- Codex 側の運用:
  - index.lock の「Virtualization プロセス参照」だけを停止条件にせず、2.3 の stale 判定を経てから停止/続行を判断する。

## 3. 未コミット docs 差分の所有権・引継ぎ方針

### 3.1 原則
一方のエージェントが作成した未コミット差分の**所有権が未確定のとき、他方は stage / commit / discard を一切しない**。作業ツリーを共有しているため、無断のステージやコミットは相手の作業を破壊しうる。

### 3.2 引継ぎ時の明示事項
作業を引き継ぐ際、引き渡す側は次を明示する:

- どの差分が誰（Claude / Codex）由来か
- どの差分がどの作業スライス（例: S1-a 正本差分）に属するか
- コミット/破棄の判断は所有者、または人間（おしげさん）が行う

### 3.3 混在時の扱い
S1-a 正本差分とそれ以外の文書変更が同じ作業ツリーに混在する場合、切り分け・コミット単位の決定は**人間（おしげさん）の承認境界**とする。エージェントは独断で分割コミットしない。

## 4. 着手前チェックの解釈（共同作業版）

`CLAUDE.md` / `AGENTS.md` の「着手前チェック（必須）」に加え、共同作業では次を補足解釈とする:

- `.git/index.lock` の検出は即停止ではなく、§2.3 の stale 判定を先に行う。stale なら §2.5 で解消してから続行してよい（削除実行者は §2.4 の通りホスト側）。
- 未コミット差分の検出時は §3 の所有権原則に従い、他方の差分には触れない。
- 上記の判断・解消の記録は本ドキュメントを参照する。

## 5. 変更履歴
- 2026-07-18: 初版作成（index.lock 偽陽性ルール、復旧手順、docs 差分所有権方針、着手前チェック補足）。
