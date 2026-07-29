# 調整さん モバイルEventページ広告戦略・実装構造分析

- Date: 2026-07-29
- Status: Reference Report
- Purpose: きめのすけの広告収益設計、Event画面UI/UX、Privacy／Security設計、将来の広告実装判断に用いる参考資料

> **Repository上の位置づけ:** 事業・競合調査reference／`SNAPSHOT / HISTORICAL`。本レポートはcanonical requirement、ADR、実装入力または実行authorizationではない。広告provider採用、広告実装、Privacy方針、CSP変更、CMP導入、AdSense申請その他の作業は、別の正本更新とHuman承認を必要とする。

---

## 1. 結論

調整さんのモバイルEventページは、次の構造を採用している。

> **親Eventページに広告配信・計測scriptを直接読み込み、実際の広告creativeを広告provider生成のiframe内へ描画する。**

本レポートでは、この構造を **A1：標準広告script＋provider生成iframe** と呼ぶ。

これは、publisherが独自の広告専用documentや別originを設計し、security目的で広告をsandbox隔離する方式ではない。表示広告のiframeには、観測したDOM上ではpublisher指定の`sandbox`属性は確認できなかった。

調整さんはEvent識別子を第三者広告scriptから秘匿する設計ではなく、Eventページを主要広告在庫として積極的に収益化している。モバイルEventページでは、上部、本文中、footer、画面下部overlayに複数の広告枠が確認できた。

きめのすけにとって重要な示唆は次である。

- Event画面を主要広告面とする事業モデルは妥当
- 初期はA1を基本候補とする
- トップ・Event作成フォームは作成完了率を優先し、広告を抑える
- 調整さんのような多数provider・header bidding構成を初期から模倣しない
- 初期は1 provider、限定されたin-page広告枠から開始する
- share pathnameが広告providerから完全には秘匿されない前提を、Privacy／Security上の明示的な判断事項とする
- bottom overlay／sticky広告は収益性が高い一方、共同編集操作を妨げるため別段階で評価する

---

## 2. 調査対象

### 2.1 対象画面

調整さんのモバイルEventページ。

画面上では次が確認された。

- Event本文上部の矩形広告
- Event本文中の広告
- footer付近の複数広告
- 画面下部に固定表示される、閉じるボタン付きoverlay広告

### 2.2 使用した証拠

- モバイルEventページのスクリーンショット
- Safari Web Inspector等から取得した親documentのDOM／script
- 広告iframe、広告container、広告wrapper、header bidding関連script
- 既存の「調整さんの広告収入戦略・広告表示仕様分析」

本レポートでは、DOMで直接確認できた事実と、そこからの推論を区別する。

---

## 3. 確認できた広告配信構造

## 3.1 親ページで広告scriptを直接実行

親Eventページの`head`では、複数の広告・計測関連scriptが直接読み込まれていた。

確認例:

```html
<script async src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"></script>
<script async src="https://fam.adingo.jp/bid-strap/chouseisan/pb.js"></script>
<script async src="https://cpt.geniee.jp/hb/.../wrapper.min.js"></script>
<script async src="//c.amazon-adsystem.com/aax2/apstag.js"></script>
```

ほかにも、次の系統が確認された。

- Google Publisher Tag
- Google Ad Manager／DoubleClick
- BID STRAP
- Prebid
- Geniee
- Fluct／adingo
- Amazon Ads
- Yahoo広告系
- Adagio
- PubMatic
- Smart AdServer
- Google Funding Choices
- Google Tag Manager
- Google Analytics
- VWO
- GrowthBook
- Intercom
- AppsFlyer

したがって、広告配信基盤は親EventページのJavaScript contextで起動している。

---

## 3.2 広告creativeはprovider生成iframeへ描画

表示広告は、次のようなiframe内へ描画されていた。

```html
<iframe
  id="google_ads_iframe_..."
  title="サードパーティの広告コンテンツ"
  width="336"
  height="250"
  scrolling="no"
  frameborder="0"
  aria-label="広告">
</iframe>
```

同種のiframeは複数箇所で確認された。

- Event header広告
- Event本文中広告
- 中段広告
- footer広告
- footer第2広告
- bottom overlay広告

これは、広告creativeの描画や広告主コンテンツの分離にprovider生成iframeを利用する標準的な構造である。

---

## 3.3 publisher独自sandbox方式ではない

表示広告iframeには、取得したDOM上では次の属性は確認できなかった。

```html
sandbox="..."
```

`geniee_cpt_sandbox`という名称の非表示iframeは存在したが、サイズ0・非表示であり、表示広告creativeそのものではない。

```html
<iframe
  id="geniee_cpt_sandbox"
  width="0px"
  height="0px"
  style="display:none">
</iframe>
```

そのため、調整さんがpublisher独自のsecurity layerとして、広告全体をsandbox iframe内へ隔離している証拠はない。

本レポートでは、次のように分類する。

### A1：標準広告script＋provider生成iframe

- 親ページで広告scriptを実行
- providerが広告creative用iframeを生成
- provider互換性と広告収益化に優れる
- 親ページURLやpage contextの完全秘匿は目的ではない

### B1：publisher独自sandbox iframe

- publisherが広告専用document／originを設計
- 親アプリとのsecurity分離を主目的とする
- provider互換性、計測、responsive、consent同期が複雑
- 調整さんで採用されている証拠はない

調整さんはA1である。

---

## 4. 広告配置

## 4.1 Event header広告

Event本文より前に、モバイル向けの上部広告枠が配置されていた。

広告slot定義例:

```javascript
googletag.defineSlot(
  '/.../s_chouseisan.mixtend_300x250_event-SPheader-banner_21803',
  [
    [200, 200],
    [250, 250],
    [300, 250],
    [320, 50],
    [320, 100],
    [320, 180],
    [320, 250],
    [336, 180],
    [336, 250]
  ],
  'div-gpt-ad-1743150394364-0'
);
```

複数サイズを許容し、広告在庫とviewportに応じてcreativeを配信する構成である。

### 事業上の意味

Eventを開いた参加者へ、Event内容より先に広告接触を発生させられる。

### UX上の影響

- 広告が大きい場合、Event titleや候補へ到達するまでの距離が増える
- 初回表示で広告が強く見える
- mobileの限られたviewportを大きく占有する
- 広告読み込み失敗時の空白や描画異常が目立つ

---

## 4.2 Event本文中広告

Eventの主要操作・結果表示の後に、本文内広告が配置されていた。

Geniee wrapperとGoogle広告iframeを組み合わせたin-page広告が確認された。

### 事業上の意味

Event内容を閲覧・操作したユーザーへの追加接触を得られる。再訪時にもPVを収益化しやすい。

### UX上の意味

上部広告よりも本来のタスクを妨げにくい。きめのすけの初期広告枠として最も適合しやすい。

---

## 4.3 Footer広告

Event URLや履歴付近より後にも、複数のfooter広告が配置されていた。

確認サイズには以下が含まれる。

- 300×250
- 320×480
- fluid
- 300×600
- 240×400
- その他responsive size

### 事業上の意味

長いページを最後まで閲覧するユーザーから追加在庫を得られる。

### UX上の意味

主要操作を直接妨げにくいが、広告量が多いとページ全体の長さ・通信量・疲労感が増える。

---

## 4.4 Bottom overlay広告

画面下部には、閉じるボタン付きの固定overlay広告が確認された。

DOM例:

```html
<ins id="geniee_overlay_outer">
  <ins id="geniee_overlay_inner">
    <span id="geniee_overlay_close" role="button">...</span>
    <div>
      <iframe
        title="サードパーティの広告コンテンツ"
        width="320"
        height="50">
      </iframe>
    </div>
  </ins>
</ins>
```

### 事業上の意味

- viewabilityが高い
- scroll位置によらず広告を表示できる
- mobileで継続的な広告接触を得られる
- in-page広告より収益性が高い可能性がある

### UX上のリスク

- Event操作領域を覆う
- ボタン、入力欄、候補、コメントを隠す
- 誤タップを誘発する
- 閉じるボタンが小さい
- 広告creative不具合時にもoverlay領域が残る
- Safariの下部browser UIと競合しやすい

観測時には広告領域が黒く表示され、creativeの読み込み・描画に失敗した可能性があった。この場合でもoverlay自体は画面を占有していた。

---

## 5. Header biddingと複数provider

調整さんでは、単一AdSense枠より高度な収益最適化が確認された。

### 確認できた構成

- Google Publisher Tag
- `disableInitialLoad()`
- BID STRAPによるbid request
- fail-safe timeout 3000ms
- auction後の`googletag.pubads().refresh()`
- Geniee header bidding wrapper
- Prebid
- Amazon Ads
- 複数SSP・user sync

例:

```javascript
bsttag.failSafeTimeout = 3000;

bsttag.launchAuction = function (slots) {
  var hbm = {};
  bsttag.cmd.push(function(cmd) {
    hbm = cmd.requestBids({adUnits: slots});
  });

  setTimeout(function () {
    if (hbm.isRequestSent) return;
    hbm.isRequestSent = true;
    googletag.cmd.push(function() {
      googletag.pubads().refresh(slots);
    });
  }, bsttag.failSafeTimeout);
};
```

### 意味

複数の広告需要を競争させ、fill rateや単価を高めるpublisher構成と考えられる。

### きめのすけへの示唆

初期段階で同じ構成を採用する必要はない。

理由:

- CSP許可先が大幅に増える
- Privacy PolicyとCMPが複雑になる
- Event URLの送信先が増える
- performance負荷が高い
- 広告障害の切り分けが難しい
- 開発・QA・運用コストが大きい
- 十分なtrafficがなければ複雑性に見合わない

初期は1 provider・限定枠とし、trafficと収益性が確認できた後にheader biddingを検討する。

---

## 6. Event識別子とthird-party script

調整さんのEvent識別子`h`は親ページの複数箇所に展開されていた。

確認例:

- 現在URLのquery
- Event URL input
- form hidden input
- `window.Chouseisan.event.id`
- OG URL
- AppsFlyer OneLink
- deep link parameter
- JavaScript default value

例:

```javascript
window.Chouseisan = {
  event: {
    id: "..."
  }
};
```

```html
<input type="hidden" name="h" value="...">
```

さらに親documentでは多数のthird-party scriptが動いている。

したがって、調整さんはEvent識別子を広告・計測providerから技術的に秘匿する設計ではない。

---

## 7. Privacy／Security上の評価

## 7.1 A1の利点

- 広告providerの標準実装に沿える
- responsive広告を使いやすい
- fill rateや収益最適化を行いやすい
- 広告管理画面との互換性が高い
- 実装期間が短い
- provider生成iframeによりcreativeのDOM／CSS影響を一定程度分離できる

## 7.2 A1の限界

provider生成iframeは、親Event URLを広告事業者から秘匿するsecurity boundaryではない。

親documentで動く広告scriptは、技術的には次を取得し得る。

- current URL
- pathname／query
- referrer
- viewport
- browser／device情報
- consent情報
- page metadata
- 親document上に展開されたEvent識別子

したがって、creativeがiframe内にあることだけを根拠に、share capabilityが広告providerへ見えないとは評価できない。

## 7.3 きめのすけで必要な判断

きめのすけのshare pathnameはaccess capabilityである。

Event画面を主要広告面とする場合、次を明示的に判断する必要がある。

- 広告providerがshare pathnameを取得し得ることを許容するか
- providerのPrivacy・data processing条件
- URL全体を広告requestへ送るか
- application側からEvent title／memo／候補等を広告targeting parameterへ渡さないこと
- analytics、error monitoring、広告以外のthird-party scriptへraw pathnameを送る範囲
- Referrer Policy
- CSP
- CMP
- personalized／non-personalized ads
- shared URLに秘密情報を入力しない利用上の注意
- platform／ad-network compromiseを含むresidual risk

---

## 8. 事業戦略上の評価

調整さんの広告戦略は、入口より共有後のEventページを収益化する構造である。

```text
トップ／作成フォーム
  ↓ 作成完了率を優先
Event作成
  ↓ URL共有
複数参加者がEventページを閲覧
  ↓
上部／本文中／footer／overlay広告
  ↓
再訪により広告接触が累積
```

Event作成者1人の流入を、参加者複数人のEvent page viewへ増幅できる。

きめのすけも、次の特性を持つ。

- share URLで複数人が参加
- 候補、反応、懸念、コメントのため再訪する
- mobile利用が中心になりやすい
- login不要で流入摩擦が低い

したがって、Event画面広告を収益モデルの中心とする方針は合理的である。

---

## 9. きめのすけへの推奨初期方針

## 9.1 採用する基本方式

> **A1：標準広告script＋provider生成iframe**

ただし、調整さんと同じ多provider構成にはしない。

初期条件:

- 1 provider
- Event画面のみ
- 手動配置した限定枠
- Auto adsは初期不採用
- Event titleより前の大型広告は慎重に評価
- 第一候補は主要操作後のin-page広告1枠
- 広告枠の寸法を予約してCLSを抑制
- 広告未配信・block・timeoutでもEvent機能を維持
- 広告script障害でEvent表示・編集を阻害しない
- applicationからEvent内容を広告targeting parameterへ渡さない

## 9.2 初期採用しないもの

- bottom sticky／overlay広告
- 複数SSP
- header bidding
- user ID syncの拡大
- Auto adsによる無制御配置
- personalized targetingの無検討導入
- publisher独自sandbox layer
- Event作成フォームの広告
- トップページの強い外部広告

## 9.3 将来の評価順

1. in-page広告1枠のUX／performance／収益
2. 2枠目の追加
3. footer広告
4. Event上部広告
5. sticky／overlay広告
6. 複数provider
7. header bidding
8. 広告非表示の有料構想

---

## 10. UI／UX QA観点

### 必須確認

- 広告読込前後で主要操作が移動しない
- mobileでCandidate／Reaction／Comment操作を覆わない
- keyboard表示時に広告が入力欄を隠さない
- 広告clickとアプリ操作の誤タップ境界
- 広告未配信時に過大な空白が残らない
- ad blocker使用時もEvent機能が正常
- slow networkでもEvent本体を優先表示
- third-party timeout時に画面が固まらない
- creativeのサイズ超過をcontainerで制御
- accessibility上、広告であることが識別可能
- focus順がEvent操作を阻害しない
- 広告閉じるUIを採用する場合は十分なtap target
- CSP違反・console error・hydration errorがない
- Core Web Vitals、特にCLSとINPへの影響

---

## 11. 実装・運用上の未決事項

きめのすけで広告実装へ進む前に、別設計taskで次を確定する。

1. 初期広告provider
2. 申請・審査要件
3. Event画面の広告位置
4. PC／mobileの枠サイズ
5. publisher scriptの読み込み戦略
6. provider生成iframeの仕様
7. CSP許可先
8. Referrer Policy
9. Cookie／localStorage／広告識別子
10. CMP
11. personalized／non-personalized ads
12. Privacy Policy
13. ads.txt
14. feature flag／kill switch
15. 広告障害時fallback
16. performance budget
17. Event pathnameのprovider可視性に対するHuman risk acceptance
18. 広告公開前のProduction QA
19. 収益・離脱・操作完了率の観測指標
20. overlay広告を将来評価する条件

---

## 12. ロードマップへの反映

### Launch前

- Event広告を事業前提としてcanonical docsへ記載
- 広告枠の設計方針を確定
- Privacy／CSP／Referrer／CMPの設計
- Search Console所有権確認
- 利用規約・Privacy・問い合わせ先
- public contentとAdSense等の申請準備
- 広告を無効化した状態でもUIが完成していること

### Launch時

- 一般公開
- noindex解除対象はpublic pagesのみ
- Event pageはnoindexを維持
- sitemap送信
- Search Console確認

### Launch後

- 広告provider申請・審査
- 承認後にfeature flagでEvent広告を有効化
- 最初はin-page 1枠
- UX／performance／収益を評価
- 次の広告在庫を段階的に判断

広告申請・承認時期によっては、広告枠実装をLaunch前に準備し、実配信のみLaunch後に有効化する。

---

## 13. 最終評価

調整さんは、Eventページを主要広告在庫とする事業戦略を、複数広告枠、header bidding、複数provider、provider生成iframeで高度に実装している。

その実装は、Event識別子をthird-party広告scriptから秘匿する設計ではない。provider生成iframeはcreative分離には役立つが、親URL秘匿を保証しない。

きめのすけは調整さんの事業構造を参考にしつつ、初期段階では次のように縮小して採用するのが妥当である。

> Event画面を主要広告面とする。標準広告script＋provider生成iframeを基本方式とする。ただし初期は1 provider・in-page限定1枠とし、overlay、複数SSP、header biddingは導入しない。share pathnameのprovider可視性は未検討のまま隠さず、Privacy／Security上の明示的なHuman判断事項として扱う。

---

## 14. Evidence classification

### Directly observed

- 親Eventページで複数広告scriptを読込
- Google Publisher Tag
- BID STRAP
- Geniee wrapper
- Prebid
- Amazon Adsほか複数provider
- 複数の広告slot定義
- 表示creativeのGoogle広告iframe
- 上部、本文中、footer、overlay広告
- overlayのclose button
- Event識別子が親documentの複数箇所に存在
- user sync用の非表示iframe
- 表示広告iframeにpublisher指定`sandbox`属性がない

### Inference

- header biddingにより広告需要を競争させ、単価・fill rateを最適化している
- 黒いoverlay広告はcreative側の読み込み・描画異常だった可能性
- Eventページを主要収益面として運用している
- publisher独自sandbox方式は採用していない可能性が高い

推論は観測したDOMと既存広告戦略分析に基づくが、調整さん運営会社の内部設計資料や契約内容を確認したものではない。
