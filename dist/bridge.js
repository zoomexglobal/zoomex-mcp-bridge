/**
 * stdio MCP Server（面向 Cursor）↔ Streamable HTTP MCP Client（面向 Java 后端）代理。
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, InitializeRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { assertSafeBackendUrl, BackendUrlGuardError, } from "./backendUrlGuard.js";
import { hasPassphraseAuthEnv, injectCredentials, readCredentialEnv, } from "./credentials.js";
function log(msg) {
    process.stderr.write(`[zoomex-mcp-server] ${msg}\n`);
}
/**
 * 启动桥接：连接 Java 后端，在 stdio 上暴露 MCP Server。
 */
export async function startBridge(config) {
    const credentialEnv = readCredentialEnv();
    if (!hasPassphraseAuthEnv(credentialEnv)) {
        log("WARN: ZOOMEX_API_KEY or ZOOMEX_PASSPHRASE not set — public market tools may work; " +
            "private tools will fail AUTH until env is configured in Cursor mcp.json.");
    }
    else {
        log(`credentials from env: apiKey=${credentialEnv.apiKey ? "set" : "missing"}, ` +
            `apiSecret=${credentialEnv.apiSecret ? "set" : "missing"}, ` +
            `passphrase=${credentialEnv.passphrase ? "set" : "missing"}`);
    }
    log(`backend=${config.backendUrl} modules=${config.modules}`);
    let backendUrl;
    try {
        backendUrl = assertSafeBackendUrl(config.backendUrl);
    }
    catch (err) {
        const detail = err instanceof BackendUrlGuardError
            ? err.message
            : formatError(err);
        log(`ERROR: unsafe backend URL — ${detail}`);
        process.exit(1);
    }
    const httpTransport = new StreamableHTTPClientTransport(backendUrl);
    const client = new Client({ name: "zoomex-mcp-bridge", version: "0.1.0" }, { capabilities: {} });
    try {
        await client.connect(httpTransport);
    }
    catch (err) {
        log(`ERROR: cannot connect to backend ${config.backendUrl}. ` +
            `Start Java McpServerApplication first (port 8080). Detail: ${formatError(err)}`);
        process.exit(1);
    }
    const server = new Server({ name: "zoomex-mcp-server", version: "0.1.0" }, { capabilities: { tools: {} } });
    server.setRequestHandler(InitializeRequestSchema, async (request) => {
        return {
            protocolVersion: request.params.protocolVersion,
            capabilities: {
                tools: {},
            },
            serverInfo: {
                name: "zoomex-mcp-server",
                version: "0.1.0",
            },
        };
    });
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return client.listTools();
    });
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const merged = injectCredentials(request.params.arguments, credentialEnv);
        return client.callTool({
            name: request.params.name,
            arguments: merged,
        });
    });
    const stdio = new StdioServerTransport();
    await server.connect(stdio);
    log("stdio bridge ready (forwarding tools/list and tools/call)");
}
function formatError(err) {
    if (err instanceof Error) {
        return err.message;
    }
    return String(err);
}
