#!/usr/bin/env node
/**
 * Zoomex MCP stdio 桥接 CLI（发布包名 zoomex-mcp-server）。
 *
 * Cursor 配置示例见 docs/MCP客户端桥接评估与实施方案.md
 */

import { parseArgs } from "./config.js";
import { startBridge } from "./bridge.js";

const config = parseArgs(process.argv.slice(2));

startBridge(config).catch((err) => {
  process.stderr.write(
    `[zoomex-mcp-server] FATAL: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exit(1);
});
