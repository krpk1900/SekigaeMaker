# 席替えメーカー
[![Vue](https://img.shields.io/badge/Vue-v2.6.12-%2342b77c)](https://www.npmjs.com/package/vue/v/2.6.12)
[![Netlify Status](https://api.netlify.com/api/v1/badges/1789b738-3cc0-4887-b1ad-2790e8b91721/deploy-status)](https://app.netlify.com/sites/sekigae/deploys)

[https://sekigae.jp/](https://sekigae.jp/)

# サービス概要

<a href="https://sekigae.jp/">
  <img src="https://user-images.githubusercontent.com/72296262/115614380-9f34f780-a328-11eb-93eb-a8b020c04b2f.gif" />
</a>

入力された条件を満たす**席替えの原案を提供する**サービスです。教師だった経験をもとに、現場で働く教師の業務改善に貢献したいと思って開発しました。

# これまでの席替えアプリと違う点

既存の席替えアプリはランダムなシャッフル機能だけのものが多く、例えば以下のような条件を考慮できる席替えアプリは存在しませんでした。

- 目の悪い生徒を最前列に配置したい
- 教室に入りにくい生徒をドアの横に配置したい
- 相性の悪い生徒を離して配置したい
- 勉強が苦手な生徒の横にはサポート好きな生徒を配置したい

# 使い方
### 1. 全体の形と班の形を入力する
まず、全体の座席の形を選択します。班の形も変えることができます。

<a href="https://sekigae.jp/">
  <img src="https://user-images.githubusercontent.com/72296262/115615369-d657d880-a329-11eb-9eb0-c6b71f06df47.gif" />
</a>

### 2. 今の座席に生徒名を入力する
次に、現在の座席に生徒名を入力していきます。クリックで生徒の性別を切り替えることができます。

<a href="https://sekigae.jp/">
  <img src="https://user-images.githubusercontent.com/72296262/115616619-5d598080-a32b-11eb-9031-9514965164ac.gif" />
</a>

### 3. 条件を入力する
席替えの際に検討する条件を入力していきます。現在入力できる条件は以下の6通りです。

- 前後で指定する
    - 最前列
    - 前2列
    - 後ろ2列
    - 最後列
- 特定の座席に固定する
- 生徒同士を近づける
- 生徒同士を離す
- 今の座席から全員移動させる
- 男女の座席を固定する

<a href="https://sekigae.jp/">
  <img src="https://user-images.githubusercontent.com/72296262/115618068-24221000-a32d-11eb-84aa-ca5b2f926b74.gif" />
</a>

### 4. 席替えボタンを押す
席替えボタンを押して座席を移動させます。良さそうな座席の配置が見つかるまで、席替えは何度でもできます。
サイドバーを開いて条件を修正することもできます。

<a href="https://sekigae.jp/">
  <img src="https://user-images.githubusercontent.com/72296262/115619290-a6f79a80-a32e-11eb-9d2d-f25f8ddb022e.gif" />
</a>

### 5. ドラッグで最終調整する
ドラッグで座席を入れ換えることができるので、良さそうな座席の配置を元にして最終調整を行います。

<a href="https://sekigae.jp/">
  <img src="https://user-images.githubusercontent.com/72296262/115620294-f5596900-a32f-11eb-972f-ca85d98278a3.gif" />
</a>

# 使用技術
- Vue.js 2.6.12
- Vuetify 2.4
- sortable.js 1.13.0
- intro.js 3.3.1
- Netlify

# 関連記事
- [【個人開発】これまでになかった席替えアプリ「席替えメーカー」を作りました \- Qiita](https://qiita.com/krpk1900/items/22963432b62a9004717c)
- [現場で働く教師の業務改善のために、席替えアプリを作りました \- Note](https://note.com/krpk1900/n/n4453088b89dd)
- [元教師が作成した「席替え」専用アプリが便利と話題に \- やじうまWatch](https://internet.watch.impress.co.jp/docs/yajiuma/1312508.html)
- [こんなの欲しかった! 　先生が開発した便利アプリ2選 \- 小学館 みんなの教育技術](https://kyoiku.sho.jp/103325/)
- [テクノロジーを活用した学校教育のアップデートを考えよう \- 企業教育研究会](https://ace-npo.org/wp/archives/study/cjk146)
- [小学校での席替え、先生の決め方・やり方とその方法「どうやって決めてるの？」 \- あおせんらぼ](https://ao-labo.com/sekigae/)
- [【知らなきゃ損する】小学校の席替えの秘密を教えます \- 教員のための精神と時の教室](https://syutoshi-blog.com/syougakkou-sekigae/)
- [無料で使えるおすすめの席替え・グループ分けツール！～どれくらいの頻度で席替えすべき？～ \- やっちゃえ先生探求記](https://www.yacchaesensei.com/entry/2021/05/04/211150)
- [「席替えアプリ」頭を悩ます席替えが一瞬で！！ \- のびルブ](https://nobirub.com/345/)
- [【ICT活用】授業で使えるおすすめアプリ５選
 \- がっくんのWebハイスクール](
https://gakkun-web-highschool.com/%e3%80%90ict%e6%b4%bb%e7%94%a8%e3%80%91%e6%8e%88%e6%a5%ad%e3%81%a7%e4%bd%bf%e3%81%88%e3%82%8b%e3%81%8a%e3%81%99%e3%81%99%e3%82%81%e3%82%a2%e3%83%97%e3%83%aa%ef%bc%95%e9%81%b8/)
- [【Teacher Aide 3周年】今「先生の幸せ」に向けて学生ができること \- Jimpei Hitsuwari　Official Site](https://hitsuwari-jimpei.com/posts/211201)
- [【ホームルームで活用】超便利アプリ「席替えメーカー」 \- 木村耀人](https://note.com/yohitokimuradesu/n/na5c627444c07)
