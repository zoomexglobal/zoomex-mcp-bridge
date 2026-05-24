/**
 * CLI 与环境变量解析。
 */

export interface BridgeConfig {
  /** 后端 Spring Boot Streamable HTTP MCP 端点 */
  backendUrl: string;
  /** 预留：--modules all，当前不裁剪工具 */
  modules: string;
}

const DEFAULT_BACKEND = "http://127.0.0.1:8080/mcp";

export function parseArgs(argv: string[]): BridgeConfig {
  let modules = "all";
  let backendUrl = trim(process.env.ZOOMEX_MCP_URL) ?? DEFAULT_BACKEND;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--modules" && i + 1 < argv.length) {
      modules = argv[++i];
      continue;
    }
    if (arg === "--url" && i + 1 < argv.length) {
      backendUrl = argv[++i];
      continue;
    }
    if (arg.startsWith("--modules=")) {
      modules = arg.slice("--modules=".length);
      continue;
    }
    if (arg.startsWith("--url=")) {
      backendUrl = arg.slice("--url=".length);
    }
  }

  return { backendUrl, modules };
}

function trim(v: string | undefined): string | undefined {
  if (v == null) {
    return undefined;
  }
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}
