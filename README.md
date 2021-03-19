# サービス概要
[https://sekigae.jp/](https://sekigae.jp/)

![席替えメーカー16](https://user-images.githubusercontent.com/72296262/111739284-26282780-88c6-11eb-8442-3c212e3eea27.gif)

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

![席替えメーカー17](https://user-images.githubusercontent.com/72296262/111791847-fb11f800-8906-11eb-9786-452005da2dcc.gif)

### 2. 今の座席に生徒名を入力する
次に、現在の座席に生徒名を入力していきます。クリックで生徒の性別を切り替えることができます。

![席替えメーカー18](https://user-images.githubusercontent.com/72296262/111792357-83909880-8907-11eb-9ca7-c419e5525051.gif)

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

![席替えメーカー19](https://user-images.githubusercontent.com/72296262/111792836-fdc11d00-8907-11eb-8970-30a86b23596f.gif)

### 4. 席替えボタンを押す
席替えボタンを押して座席を移動させます。良さそうな座席の配置が見つかるまで、席替えは何度でもできます。
サイドバーを開いて条件を修正することもできます。

![席替えメーカー20](https://user-images.githubusercontent.com/72296262/111793244-6ad4b280-8908-11eb-9d92-140a6f027d83.gif)

### 5. ドラッグで最終調整する
ドラッグで座席を入れ換えることができるので、良さそうな座席の配置を元にして最終調整を行います。

![席替えメーカー21](https://user-images.githubusercontent.com/72296262/111793418-9a83ba80-8908-11eb-8bc7-8275a83524a6.gif)

# 使用技術
- Vue.js 2.6.12
- Vuetify 2.4
- sortable.js 1.13.0
- Netlify

# 記事
Qiita記事 https://qiita.com/krpk1900/items/22963432b62a9004717c
Note記事 https://note.com/krpk1900/n/n4453088b89dd

