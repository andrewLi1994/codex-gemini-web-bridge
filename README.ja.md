Language: [English](README.md) | [简体中文](README.zh-CN.md) | 日本語

# Gemini Web Bridge

[![CI](https://github.com/andrewLi1994/gemini-web-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/andrewLi1994/gemini-web-bridge/actions/workflows/ci.yml)

Gemini Web Bridge は、Gemini API キーを必要とせずに、ログイン済みの Gemini Web セッションへのローカルチャネルを各種 AI クライアント（Codex、Cursor、Claude Desktop、またはカスタムスクリプトなど）に提供します。本ブリッジは信頼性の高いブラウザ自動化のみを担当し、Gemini の生の回答全文を返します。

主な用途としては、1つ以上の公開 YouTube 動画の音声や映像の理解、公開 URL に対する特定範囲の質問、または独立した補助分析の取得などが挙げられます。

## 動作モード

- **Codex プラグイン**: Codex とシームレスに統合します。
- **標準 MCP サーバー**: MCP 互換のあらゆるクライアント（Cursor、Claude Desktop、Windsurf など）で動作します。
- **スタンドアロン CLI**: ターミナルやシェルスクリプトから直接実行できます。

## 要件

- macOS
- プラグイン Marketplace に対応した Codex 拡張機能
- Node.js 22 以上
- Google Chrome、Microsoft Edge、Brave、または Chromium
- Gemini Web を利用可能な Google アカウント

## インストールまたはアップグレード

```sh
codex plugin marketplace add andrewLi1994/gemini-web-bridge --ref main
codex plugin add gemini-web-bridge@gemini-web-bridge
```

既存のインストールをアップグレードする場合：

```sh
codex plugin marketplace upgrade gemini-web-bridge
```

インストール或者アップグレード後、Codex の新しいスレッドを開始します。通常通りに結果をリクエストしてください。例：

```text
Compare the claims in these two public YouTube videos and check where their evidence differs: <URL1> <URL2>
```

Codex は、単一の Gemini 会話を使用するか、複数の新規会話を使用するか、追加のプロンプトを送信するか、あるいは Gemini を呼び出さないかを自律的に決定します。新規の呼び出しが成功するたびに、ローカルのランダムな会話ハンドルが返されます。動画や Codex スレッドは、自動的に会話を選択または再利用しません。

## MCP クライアントの設定

Gemini Web Bridge は標準的な MCP サーバーであるため、他の MCP 互換クライアントでも設定できます。

### Claude Desktop
設定ファイル（パス：`~/Library/Application Support/Claude/claude_desktop_config.json`）に以下を追加します：

```json
{
  "mcpServers": {
    "gemini-web-bridge": {
      "command": "node",
      "args": [
        "/プロジェクトの絶対パス/gemini-web-bridge/plugins/gemini-web-bridge/dist/mcp-server.mjs"
      ]
    }
  }
}
```
*注意：`/プロジェクトの絶対パス/` は、ローカル環境における実際のプロジェクトの絶対パスに置き換えてください。保存後、Claude Desktop を完全に再起動する必要があります。*

### Cursor
Cursor の設定画面から直接設定できます：
1. **Cursor Settings** > **MCP** を開きます。
2. **+ Add New MCP Server** をクリックします。
3. Name に `gemini-web-bridge`、Type に `stdio` を指定します。
4. Command に `node "/プロジェクトの絶対パス/gemini-web-bridge/plugins/gemini-web-bridge/dist/mcp-server.mjs"` を入力します。

## 初回起動時の手順

1. Codex は、最小限の必要な公開 URL、特定範囲の質問、言語、および出力要件のみを Gemini Web に送信するための許可を 1 回だけ求めます。
2. ログインが必要な場合、プラグインは専用のプロファイルを持つ可視化された Chrome ウィンドウを開きます。
3. 手動でログインを完了し、開いた専用の Chrome ウィンドウを閉じます。プラグインがログインを確認すると、保留されていた Codex のリクエストが自动的に再開されます。

通常のリクエストは、ヘッドレス（バックグラウンド）のブラウザで実行されます。タスクの成功、失败、またはキャンセルが発生すると、該当ページとブラウザは自動的に閉じられます。

## プライバシーとセキュリティ

- Codex の会話履歴全体、ローカルファイル、資格情報、シークレット、および個人データが自動的に送信されることはありません。
- Google ログインの Cookie は、ローカルの専用 Chrome プロファイル内にのみ保存されます。
- ローカル状態として保存されるのは、同意状況、ランダムな会話ハンドル、Gemini の URL、スレッドのラベル、およびタイムスタンプのみです。プロンプトや回答自体はコピーして保存されません。
- 実行時のデータは `~/Library/Application Support/Codex UI Extensions/Gemini Web Bridge/` に保存され、Git の管理対象から除外されます。
- Chrome のデバッグポートにはランダムなポートが使用され、`127.0.0.1` にのみバインドされます。
- ブラウザおよびステータス操作では、プロセス間ロック、制限されたファイル権限、アトミックな書き込み、および古いロックの回復機能が使用されます。
- 本プラグインが Google のログインフォームを自動入力したり、CAPTCHA チャレンジを回避したり、アカウントの利用制限を回避したりすることはありません。
- Gemini の回答は信頼できない外部資料として扱われます。自動化スクリプトではなく、Codex 自身が回答の品質や主張の事実関係を評価する必要があります。

## 信頼性の限界

本ブリッジは、ログインが必要な状態、CAPTCHA、レート制限、ブラウザの切断、生成の未完了、送信結果が不明、またはウェブページの構造変化といった「機械的な状態」のみを報告します。Gemini の回答がセマンティックに正しいかどうかを判断することはありません。

送信前に発生したことが明らかなエラーのみ、自動的に 1 回だけ再試行されます。送信アクションが確認された後は、ブリッジが盲目的に再送信を行うことはありません。Codex が追加質問を行うか、新規の会話を作成するかを決定します。

Gemini Web は安定した API ではありません。ページのレイアウト変更によってセレクタが更新されるまで一時的に自動化が機能しなくなる可能性があり、また、Gemini の利用可能な機能はアカウントやリクエストによって異なる場合があります。

## v0.2 の互換性

以前の `analyze_youtube` MCP ツールは引き続き利用可能ですが、非推奨となりました。既存の「動画から会話へのマッピング」は、ローカルのランダムな会話ハンドルに 1 回だけ自動的に移行され、バックアップとして元の `sessions.json` が保持されます。新しい処理には `gemini_web_ask` を使用してください。非推奨のツールは v0.3 で削除される予定です。

## 診断用 CLI

CLI は開発および障害復旧専用であり、通常のユーザーインターフェースではありません。

```sh
node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs status
node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs authorize --confirmed
node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs login --wait
printf '%s' '{"prompt":"Ask a minimal scoped question"}' | node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs ask
node plugins/gemini-web-bridge/dist/gemini-web-cli.mjs conversations
```

CLI の最終出力結果は stdout に JSON 形式で出力され、進捗イベントは stderr に JSON Lines 形式で出力されます。終了コード `2` は手動のログインまたは確認が必要であること、`3` はレート制限、`4` は自動化の失敗、`5` は无効な入力または会話が存在しないことを示します。

## アンインストール

```sh
codex plugin remove gemini-web-bridge@gemini-web-bridge
codex plugin marketplace remove gemini-web-bridge
```

卸载不会删除专用 Chrome Profile。如果还需要退出 Google 账号并删除本地对话元数据，请手动删除运行 data 目录。

## 開発

```sh
npm ci --prefix plugins/gemini-web-bridge
npm run verify
```

MCP サーバーおよび診断用 CLI は、Marketplace ユーザーが npm 依存関係をインストールしなくて済むよう、単一のバンドルファイルとして生成されてコミットされています。ソースコードや依存関係を変更した後は、`npm run build` を実行し、更新された `dist/` 内のファイルをコミットしてください。

本プロジェクトは [MIT ライセンス](LICENSE) の下で公開されています。セキュリティに関する問題は、[プライベート脆弱性レポート](SECURITY.md)を通じて報告してください。
