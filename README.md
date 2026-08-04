# 姿勢分析アプリ（Phase 1 実装）

スマートフォンで撮影した正面・側面の写真から姿勢の傾き（左右・前後）を分析するWebアプリです。要件定義書の **Phase 1（PoC）** に対応する実装で、既存の姿勢推定モデル（MediaPipe Pose）をブラウザ上で実行し、要件書 3章で定義された全17項目の角度・位置ずれ指標を算出します。

## この実装のスコープ

要件定義書は AWS 上のフルスタック構成（SageMaker によるカスタムモデル学習、DynamoDB、Cognito など）と、複数フェーズにわたる開発計画を含む大規模なプロジェクトです。本セッションでは、要件書 9章が Phase 1 として定義している範囲——「既存モデルでの標準キーポイント検出＋近似推定→角度計算ロジックの検証」——を中心に、認証・履歴管理・結果表示を含む動作するフルスタックアプリとして実装しました。

含まれるもの:
- 撮影・アップロード〜キーポイント検出〜手動補正〜角度計算〜結果表示〜履歴・経過比較までの一連の機能（要件書 4章 4.1〜4.5）
- 会員登録・ログイン（要件書 4.6）
- 実寸換算（身長入力によるキャリブレーション、要件書 4.3）

含まれないもの（要件書 Phase 2 以降 / AWS 実インフラ）:
- 第七頚椎・大転子・上前/上後腸骨棘を検出する独自ファインチューニング済みモデル（要件書 4.2.1）や3D姿勢推定・メッシュ復元（4.2.2）— これらの学習には数千枚規模のアノテーション済みデータセットと監修者、GPU学習基盤が必要で、1回の開発セッションでは構築できません。代わりに、標準ランドマークからの幾何学的近似＋手動補正UIで代替しています（下記「特殊ランドマークの扱い」参照）。
- AWS実インフラ（SageMaker, DynamoDB, Cognito, CloudFront, API Gateway 等）へのデプロイ。ローカル/セルフホスト構成（SQLite, 自前JWT認証, ローカルファイルストレージ）で同等機能を実装し、AWS構成へのマッピングを下記に記載しました。

## 技術スタック

npm workspaces によるモノレポ構成です。

| ワークスペース | 役割 | 主要技術 |
|---|---|---|
| `shared` | キーポイント定義・MediaPipeマッピング・角度計算ロジック（要件書3章の実装） | TypeScript, Vitest |
| `backend` | 認証・画像アップロード・計測結果の保存API | Express, Prisma + SQLite, JWT |
| `frontend` | 撮影〜結果表示〜履歴のPWA | React, Vite, react-router, MediaPipe Tasks Vision |

## セットアップ・起動方法

```bash
npm install                     # ルートで一括インストール（workspaces）

# backend
cp backend/.env.example backend/.env
npm run prisma:migrate -w backend   # 初回のみ: SQLiteスキーマを作成
npm run dev:backend                 # http://localhost:4000

# frontend（別ターミナル）
npm run dev:frontend                # http://localhost:5173
```

`frontend/.env` に `VITE_API_BASE_URL`（既定値 `http://localhost:4000/api`）を設定してバックエンドの向き先を変更できます。

### テスト・ビルド

```bash
npm run test:shared    # 角度計算ロジックの単体テスト
npm run build          # shared -> backend -> frontend の順にビルド
```

## 要件書3章の実装（`shared/src`）

- `keypoints.ts`: 19点の解剖学的キーポイント定義（要件書3.1）
- `mediapipeMapping.ts`: MediaPipe Pose の33点ランドマークから19点へのマッピング。頭頂・大転子・第七頚椎・上前/上後腸骨棘は標準モデルに存在しないため、近傍ランドマークからの幾何学的近似で算出し `estimated: true` を付与（要件書 4.2 冒頭・8章のリスクに対応）
- `geometry.ts` / `metrics.ts`: 鉛直線・水平線に対する角度、位置ずれを `atan2` で算出（要件書 4.3）。左右17項目・前後8項目すべてを実装し、Vitestで代表ケースを検証済み
- `defaultKeypoints.ts`: 自動検出が使えない場合に全キーポイントを初期配置し、手動での全点補正を可能にするフォールバック

### 重心の定義（要件書8章で未確定とされていた点）

本実装では「頭部・体幹・両腕・両脚」の区分ごとの中点を、身体部位の質量比に近い簡易的な重みで加重平均する方式を採用しました（`computeCenterOfGravity`）。足首中点をそのまま重心とする案は「全身の左右/前後傾き（足首中点→重心）」の指標が定義上ゼロになってしまうため不採用としています。臨床的な妥当性の検証は行っていません。

### 正常範囲・参考値の扱い

結果画面のバー表示・色分けに使う `referenceBand`（許容範囲）はUIの見た目を成立させるための仮の値であり、医学的に検証された基準値ではありません。要件書8章「医療情報としての扱い」の方針に従い、アプリ内にも免責文言を常時表示しています。実運用前に専門家による妥当性確認が必要です。

## 特殊ランドマークの扱い（要件書 4.2 / 8章）

頭頂・大転子・第七頚椎・上前/上後腸骨棘は MediaPipe / OpenPose の標準出力に含まれないため、Phase 1 では次の方針としています。

1. 自動検出時: 近傍の標準ランドマーク（肩・耳・股関節など）から幾何学的に近似し、UIでは橙色の点・「参考値」バッジで区別して表示
2. 自動検出失敗時・服装等で精度が不十分な場合: 手動補正UIで全点をドラッグ配置可能（要件書8章の代替案「該当指標の参考値扱い」に対応）
3. 将来的な高精度化（要件書 4.2.1 のファインチューニング／4.2.2 の3D推定）は、`shared/src/mediapipeMapping.ts` の該当関数を差し替えるだけで既存の計算・表示ロジックがそのまま使える設計にしています

## AWS構成へのマッピング（要件書6章）

現在の実装（ローカル/セルフホスト）と、要件書6章のAWS構成の対応関係です。将来的な移行時の参考にしてください。

| 要件書6章のコンポーネント | 本実装での代替 | 移行時の変更点 |
|---|---|---|
| CloudFront + S3（フロントエンド配信） | Vite dev server / 静的ビルド成果物（`frontend/dist`） | `dist` を S3 に配置し CloudFront で配信するだけで移行可能 |
| Cognito（認証） | 自前JWT認証（`backend/src/auth.ts`, bcrypt + jsonwebtoken） | Cognito User Pool + Amplify/Cognito SDK に置き換え。API側の `requireAuth` ミドルウェアをCognitoトークン検証に差し替え |
| API Gateway + Lambda | Express サーバー1プロセス（`backend/src/index.ts`） | 各ルーターをLambda関数に分割するか、Lambda Web Adapter でExpressごとコンテナ化 |
| S3（画像保存） | ローカルディスク（`backend/uploads/`） | `routes/images.ts` の `fs.writeFileSync` をS3 `PutObject` に置き換え。ライフサイクルポリシーで自動削除を追加 |
| SageMaker（姿勢推定・独自モデル） | ブラウザ内 MediaPipe Tasks Vision（クライアントサイド推論） | 4.2.1のファインチューニング済みモデルをSageMaker非同期推論エンドポイントとしてデプロイし、`shared/src/mediapipeMapping.ts` 相当のマッピング処理をサーバー側の角度計算Lambdaに移設 |
| DynamoDB（測定結果・履歴） | Prisma + SQLite（`backend/prisma/schema.prisma`） | スキーマはDynamoDBのテーブル設計に近い形（User/Image/Measurement）で設計済み。Prismaを外しDynamoDB SDKに置き換え |
| CloudWatch | なし（`console.log` のみ） | Lambda/ECS移行時にCloudWatch Logsへ自然に統合 |

## 免責事項

本アプリの解析結果は姿勢の傾向を把握するための目安であり、医療診断を目的としたものではありません（要件書8章）。画像には人物の身体的特徴が含まれるため、実運用時はTLS化・保存データの暗号化・アクセス制御・利用規約と同意取得フローの整備が必須です（要件書5章）。
