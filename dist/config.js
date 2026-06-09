/**
 * CLI 与环境变量解析。
 */
const DEFAULT_BACKEND = "https://api2-testnet.zoomex.com/mcp";
export function parseArgs(argv) {
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
function trim(v) {
    if (v == null) {
        return undefined;
    }
    const t = v.trim();
    return t.length > 0 ? t : undefined;
}
