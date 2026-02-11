# Connectors

## Google Gemini (via MCP Client)

要將此 Tarot MCP Server 連接到 Gemini 助理，請在您的 MCP 客戶端配置（如 `claude_desktop_config.json` 或相關環境）中添加以下設定：

```json
{
  "mcpServers": {
    "tarot-expert": {
      "command": "node",
      "args": ["c:/Users/User/Downloads/antigravity/Tarot/mcp/tarot-server/dist/index.js"],
      "env": {
        "GEMINI_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## 注意事項

- 請確保路徑正確指向 `dist/index.js`。
- 必須先執行 `npm run build`。
