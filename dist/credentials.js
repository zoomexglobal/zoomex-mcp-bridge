/** 从 env 读取 Zoomex 凭证（支持 ZOOMEX_SECRET_KEY 命名）。 */
export function readCredentialEnv(env = process.env) {
    return {
        apiKey: trim(env.ZOOMEX_API_KEY),
        apiSecret: trim(env.ZOOMEX_SECRET_KEY),
        passphrase: trim(env.ZOOMEX_PASSPHRASE),
    };
}
/**
 * 将 env 凭证合并进现有 credentials 片段（camelCase + snake_case）。
 */
export function mergeCredentialsPayload(existingFragment, env) {
    const existing = existingFragment && typeof existingFragment === "object"
        ? { ...existingFragment }
        : {};
    const merged = {
        apiKey: pick(existing.apiKey, pick(existing.api_key, env.apiKey)),
        apiSecret: pick(existing.apiSecret, pick(existing.api_secret, env.apiSecret)),
        passphrase: pick(existing.passphrase, env.passphrase),
    };
    return {
        apiKey: merged.apiKey,
        apiSecret: merged.apiSecret,
        passphrase: merged.passphrase,
    };
}
/**
 * 将 env 凭证合并进 tools/call 的 arguments。
 * 规则：env 仅补全 arguments.credentials 中缺失或为空的字段，不覆盖调用方已显式传入的非空值。
 *
 * Cursor / 工具 schema 若呈 `{ arguments: { accountType, … } }` 嵌套，Java 往往只绑定内层对象，
 * 故除顶层 `credentials` 外，亦向内层 `arguments` 注入 `credentials`。
 */
export function injectCredentials(args, env) {
    const base = args && typeof args === "object" ? { ...args } : {};
    const topExisting = base.credentials && typeof base.credentials === "object"
        ? base.credentials
        : undefined;
    const credentials = mergeCredentialsPayload(topExisting, env);
    const out = { ...base, credentials };
    const nestedArgs = base.arguments;
    if (nestedArgs &&
        typeof nestedArgs === "object" &&
        !Array.isArray(nestedArgs)) {
        const inner = { ...nestedArgs };
        const innerExisting = inner.credentials && typeof inner.credentials === "object"
            ? inner.credentials
            : undefined;
        out.arguments = {
            ...inner,
            credentials: mergeCredentialsPayload(innerExisting, env),
        };
    }
    return out;
}
/** 是否至少配置了 apiKey + passphrase（入站鉴权最低要求）。 */
export function hasPassphraseAuthEnv(env) {
    return Boolean(env.apiKey && env.passphrase);
}
function pick(fromArgs, fromEnv) {
    const a = typeof fromArgs === "string" ? fromArgs.trim() : "";
    if (a) {
        return a;
    }
    return fromEnv ?? "";
}
function trim(v) {
    if (v == null) {
        return undefined;
    }
    const t = v.trim();
    return t.length > 0 ? t : undefined;
}
