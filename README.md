# zoomex-mcp-server（stdio 桥接）

在 Cursor 里用 `command` + `npx` + `env` 三件套接入 Zoomex MCP，**无需在对话里手写 credentials**。

桥接进程通过 stdio 与 Cursor 通信，将 `tools/call` 转发到本地 Java Spring Boot MCP，并自动注入：

```json
{
  "credentials": {
    "apiKey": "<ZOOMEX_API_KEY>",
    "apiSecret": "<ZOOMEX_SECRET_KEY>",
    "passphrase": "<ZOOMEX_PASSPHRASE>"
  }
}
```

## Cursor 配置

### mcp配置（npm）

```json
{
  "mcpServers": {
    "zoomex": {
      "command": "npx",
      "args": ["-y", "zoomex-mcp-server@0.1.0", "--modules", "all"],
      "env": {
        "ZOOMEX_API_KEY": "你的key",
        "ZOOMEX_SECRET_KEY": "你的secret",
        "ZOOMEX_PASSPHRASE": "你的口令"
      }
    }
  }
}
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `ZOOMEX_API_KEY` | API Key |
| `ZOOMEX_SECRET_KEY` | API Secret（出站 Zoomex 签名） |
| `ZOOMEX_PASSPHRASE` | API 口令（MCP 入站鉴权） |
| `ZOOMEX_MCP_URL` | 可选，默认 `http://127.0.0.1:8080/mcp` |

## CLI

```bash
zoomex-mcp-server --modules all
zoomex-mcp-server --modules all --url http://127.0.0.1:8080/mcp
```