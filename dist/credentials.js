/** 从 env 读取 Zoomex 凭证（支持 ZOOMEX_SECRET_KEY 命名）。 */
export function readCredentialEnv(env = process.env) {
    return {
        apiKey: trim(env.ZOOMEX_API_KEY),
        apiSecret: trim(env.ZOOMEX_SECRET_KEY),
        passphrase: trim(env.ZOOMEX_PASSPHRASE),
    };
}
/**
 * 将 env 凭证合并进 tools/call 的 arguments。
 * 规则：env 仅补全 arguments.credentials 中缺失或为空的字段，不覆盖调用方已显式传入的非空值。
 */
export function injectCredentials(args, env) {
    const base = args && typeof args === "object" ? { ...args } : {};
    const existing = base.credentials && typeof base.credentials === "object"
        ? { ...base.credentials }
        : {};
    const merged = {
        apiKey: pick(existing.apiKey, env.apiKey),
        apiSecret: pick(existing.apiSecret, env.apiSecret),
        passphrase: pick(existing.passphrase, env.passphrase),
    };
    return { ...base, credentials: merged };
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
