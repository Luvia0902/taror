# Tarot MCP Server

提供專業塔羅占卜功能的 Model Context Protocol (MCP) Server。

## 功能 (Tools)

- `draw_cards`: 隨機抽取塔羅牌（大阿爾克那）。
- `analyze_spread`: 由 AI 進行深度牌陣分析。
- `get_card_info`: 查詢卡片詳細專業背景。

## 安裝與執行

1. 安裝依賴：
   ```powershell
   cd mcp/tarot-server; npm install
   ```

2. 編譯 TypeScript：
   ```powershell
   npm run build
   ```

3. 執行：
   ```powershell
   node dist/index.js
   ```

## 環境變數

請在 `mcp/tarot-server/.env` 中設定：
- `GEMINI_API_KEY`: 您的 Gemini API 金鑰。
