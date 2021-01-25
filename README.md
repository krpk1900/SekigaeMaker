# 席替えメーカー

## サービス概要
席替えの際、生徒の席の配置を考える時間を短縮したい教師の方に  
入力された条件を満たす原案を提供する  
席替え原案作成サービスです。

## 登場人物
席の配置を考える必要のある教師の方

## ユーザが抱える問題
年に複数回行われる席替えにおいて、クラスが編成された直後だったり、人間関係のトラブルが懸念される場合は、教師がさまざまな条件を考慮して席の配置を決定します。  
その際、ゼロから席の配置を決めていくと、本来時間をかけたい調整ではない部分に時間がかかってしまいます。

## 解決方法
入力で受け付けた条件を満たす席の配置を出力します。これを原案として、教師はより細かい調整を行い、最終的な席の配置を決定します。
受け付ける条件は、
- 特定の生徒を班に少なくとも一人配置する。（すべての班にリーダーを分配するため）
- 特定の生徒同士を近くに配置しない。（トラブルとなる生徒同士を離すため）
- 特定の生徒同士を近くに配置する。(困難を抱えた生徒の隣にサポーターを配置するため)
- 特定の生徒を前/後ろに固定する。(視力の悪い生徒や聴覚過敏な生徒に対応するため)  

です。

## プロダクト
席替えの原案を作成するWebアプリケーション

## マーケット
教師

## 実装したい機能
- 特定の生徒群を各班に均等に分配する機能(must)
- 特定の生徒群の席を近づける/離す機能(must)
  - 生徒群に対して、引力or斥力を設定し、その評価値に従って席を決定(must)
- 特定の生徒群の席を前/後ろに固定する機能(must)
- 席の型を指定する機能(must)
  - チェックボックスによる指定(must)
  - JSによる指定(will)
- 個人情報漏洩対策のため生徒の名前を自動で編集する機能(must)
  - 例えば、全てひらがなにするとか、下の名前を削除するとか、ランダムな下の名前をくっつけるなど(must)
- 手動で席を交換する機能(will)
- エクセルからのコピー&ペースト対応機能(will)
- PDF出力機能(will)
- 過去の入力条件を記憶する機能(will)
- 座席の男女指定機能(must)

## このサービスを作る価値
席の配置は、
- リーダーを班に少なくとも一人配置する
- 目の悪い人を前二行に配置する
- クラスに入りにくい生徒を後ろのドア前に固定する  

などの条件に加えて、生徒同士の繊細な人間関係まで考慮する必要があります。  

そのため、プログラムやAIですべてを自動化というのはなかなか難しいと思っています。
最後には、生徒一人ひとりのことを理解している教師が、自分の目で見て、自分の頭で考えて調整する必要があると感じています。  

しかし、調整する前の原案はプログラムに作らせることができると思います。原案は、人がゼロから作るには時間がかかる一方で、修正されるのが前提となっています。
プログラムによって複数の原案を高速で作ることで、時間短縮が可能になります。
それだけではなく、より適する原案を選択し調整を始めることができるので、席の配置の質を向上させることも可能になります。

## 類似したサービス
席替えアプリはたくさんありますが、それらのほとんどは完全にランダムな席の配置を出力するサービスであり、本サービスとは別物です。  

また、本サービスと似た機能を持つサービスはパッケージソフトウェアとして有料で販売されていますが、お金のある一部の学校にしか導入されていません。
誰でも無料で気軽に使用できる本サービスによって、すべての教師の方を支援したいと考えています。
