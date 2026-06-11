/**
 * stdio MCP Server（面向 Cursor）↔ Streamable HTTP MCP Client（面向 Java 后端）代理。
 *
 * 多容器部署场景下，负载均衡可能将请求路由到不持有当前 session 的容器，
 * 导致 HTTP 404 / "session not found" 错误。本模块在检测到此类错误时自动
 * 重建连接并重试请求（最多 MAX_RETRIES 次，指数退避）。
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, InitializeRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { assertSafeBackendUrl, BackendUrlGuardError, } from "./backendUrlGuard.js";
import { hasPassphraseAuthEnv, injectCredentials, readCredentialEnv, } from "./credentials.js";
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 100;
function log(msg) {
    process.stderr.write(`[zoomex-mcp-server] ${msg}\n`);
}
function formatError(err) {
    if (err instanceof Error) {
        return err.message;
    }
    return String(err);
}
/**
 * 判断错误是否为 session 丢失。
 * SDK 在收到 HTTP 4xx 时抛出 Error，message 中含 HTTP 状态码或 "session" 关键词。
 * 多容器部署时，session 不存在的容器通常返回 404。
 */
function isSessionError(err) {
    if (!(err instanceof Error)) {
        return false;
    }
    const msg = err.message.toLowerCase();
    return (msg.includes("404") ||
        msg.includes("session") ||
        msg.includes("not found"));
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * 断开旧连接并用新的 transport 重新连接。
 * 调用方应确保同一时刻只有一个 reconnect 在执行（通过 reconnectPromise 实现）。
 */
async function reconnect(ctx) {
    log("INFO: session lost, reconnecting to backend...");
    try {
        await ctx.client.close();
    }
    catch {
        // 忽略关闭时的错误，继续重建
    }
    const transport = new StreamableHTTPClientTransport(ctx.backendUrl);
    await ctx.client.connect(transport);
    log("INFO: reconnected to backend successfully");
}
/**
 * 确保重连只执行一次：若已有重连在进行则等待其完成，否则发起新一轮重连。
 */
function ensureReconnected(ctx) {
    ctx.reconnectPromise ??= reconnect(ctx).finally(() => {
        ctx.reconnectPromise = null;
    });
    return ctx.reconnectPromise;
}
/**
 * 包装任意 MCP 调用：遇到 session 错误时自动重连并重试，支持指数退避。
 */
async function withSessionRetry(ctx, action, label) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await action();
        }
        catch (err) {
            if (isSessionError(err) && attempt < MAX_RETRIES) {
                const delay = RETRY_BASE_MS * Math.pow(2, attempt);
                log(`WARN: ${label} failed (session error, attempt ${attempt + 1}/${MAX_RETRIES}): ` +
                    `${formatError(err)} — reconnecting in ${delay}ms`);
                await sleep(delay);
                await ensureReconnected(ctx);
            }
            else {
                throw err;
            }
        }
    }
    // TypeScript 要求穷尽所有路径，实际上循环内已覆盖
    throw new Error(`${label}: exceeded max retries`);
}
/**
 * 启动桥接：连接 Java 后端，在 stdio 上暴露 MCP Server。
 */
export async function startBridge(config) {
    const credentialEnv = readCredentialEnv();
    if (hasPassphraseAuthEnv(credentialEnv)) {
        log(`credentials from env: apiKey=${credentialEnv.apiKey ? "set" : "missing"}, ` +
            `apiSecret=${credentialEnv.apiSecret ? "set" : "missing"}, ` +
            `passphrase=${credentialEnv.passphrase ? "set" : "missing"}`);
    }
    else {
        log("WARN: ZOOMEX_API_KEY or ZOOMEX_PASSPHRASE not set — public market tools may work; " +
            "private tools will fail AUTH until env is configured in Cursor mcp.json.");
    }
    log(`backend=${config.backendUrl} modules=${config.modules}`);
    let backendUrl;
    try {
        backendUrl = assertSafeBackendUrl(config.backendUrl);
    }
    catch (err) {
        const detail = err instanceof BackendUrlGuardError ? err.message : formatError(err);
        log(`ERROR: unsafe backend URL — ${detail}`);
        process.exit(1);
    }
    const client = new Client({ name: "zoomex-mcp-bridge", version: "0.1.0" }, { capabilities: {} });
    try {
        const transport = new StreamableHTTPClientTransport(backendUrl);
        await client.connect(transport);
    }
    catch (err) {
        log(`ERROR: cannot connect to backend ${config.backendUrl}. ` +
            `Start Java McpServerApplication first. Detail: ${formatError(err)}`);
        process.exit(1);
    }
    const ctx = {
        client,
        backendUrl,
        reconnectPromise: null,
    };
    const server = new Server({ name: "zoomex-mcp-server", version: "0.1.0" }, { capabilities: { tools: {} } });
    server.setRequestHandler(InitializeRequestSchema, async (request) => {
        return {
            protocolVersion: request.params.protocolVersion,
            capabilities: { tools: {} },
            serverInfo: { name: "zoomex-mcp-server", version: "0.1.0" },
        };
    });
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return withSessionRetry(ctx, () => ctx.client.listTools(), "listTools");
    });
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const merged = injectCredentials(request.params.arguments, credentialEnv);
        return withSessionRetry(ctx, () => ctx.client.callTool({ name: request.params.name, arguments: merged }), `callTool(${request.params.name})`);
    });
    const stdio = new StdioServerTransport();
    await server.connect(stdio);
    log("stdio bridge ready (forwarding tools/list and tools/call)");
}
