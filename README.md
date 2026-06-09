# zoomex-mcp-server

An MCP (Model Context Protocol) stdio bridge for Zoomex. Enables AI tools that support MCP — such as Cursor, Claude Desktop, and other MCP-compatible clients — to interact with the Zoomex trading platform using natural language, with credentials injected automatically via environment variables.

## Quick Start

Configure your MCP-compatible AI tool to launch this server via `npx`:

```json
{
  "mcpServers": {
    "zoomex": {
      "command": "npx",
      "args": ["-y", "zoomex-mcp-server", "--modules", "all"],
      "env": {
        "ZOOMEX_API_KEY": "<your-api-key>",
        "ZOOMEX_SECRET_KEY": "<your-api-secret>",
        "ZOOMEX_PASSPHRASE": "<your-passphrase>"
      }
    }
  }
}
```

> **Testnet:** Add `"ZOOMEX_MCP_URL": "https://api2-testnet.zoomex.com/mcp"` to `env` to connect to the Zoomex testnet.

## Environment Variables

| Variable | Description |
|---|---|
| `ZOOMEX_API_KEY` | Your Zoomex API Key |
| `ZOOMEX_SECRET_KEY` | Your Zoomex API Secret |
| `ZOOMEX_PASSPHRASE` | Your Zoomex API Passphrase |
| `ZOOMEX_MCP_URL` | _(Optional)_ MCP backend URL. Defaults to `https://api2-testnet.zoomex.com/mcp` |

## CLI Options

| Option | Description |
|---|---|
| `--modules <value>` | Tool modules to load (default: `all`) |
| `--url <url>` | Override the MCP backend URL |

## Requirements

- Node.js >= 18
- A valid Zoomex API Key with appropriate permissions

## License

[MIT](LICENSE)
