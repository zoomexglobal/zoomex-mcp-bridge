/**
 * 从进程环境变量构建 MCP tools/call 所需的 credentials 对象。
 * 对标 bitget/okex：用户在 Cursor mcp.json 的 env 里配置三件套即可。
 */
export interface ZoomexCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

export interface CredentialEnv {
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
}

/** 从 env 读取 Zoomex 凭证（支持 ZOOMEX_SECRET_KEY 命名）。 */
export function readCredentialEnv(
  env: NodeJS.ProcessEnv = process.env
): CredentialEnv {
  return {
    apiKey: trim(env.ZOOMEX_API_KEY),
    apiSecret: trim(env.ZOOMEX_SECRET_KEY),
    passphrase: trim(env.ZOOMEX_PASSPHRASE),
  };
}

/**
 * 将 env 凭证合并进现有 credentials 片段（camelCase + snake_case）。
 */
export function mergeCredentialsPayload(
  existingFragment: Record<string, unknown> | undefined,
  env: CredentialEnv
): Record<string, string> {
  const existing =
    existingFragment && typeof existingFragment === "object"
      ? { ...existingFragment }
      : {};

  const merged: ZoomexCredentials = {
    apiKey: pick(existing.apiKey, pick(existing.api_key, env.apiKey)),
    apiSecret: pick(
      existing.apiSecret,
      pick(existing.api_secret, env.apiSecret)
    ),
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
export function injectCredentials(
  args: Record<string, unknown> | undefined,
  env: CredentialEnv
): Record<string, unknown> {
  const base: Record<string, unknown> =
    args && typeof args === "object" ? { ...args } : {};

  const topExisting =
    base.credentials && typeof base.credentials === "object"
      ? (base.credentials as Record<string, unknown>)
      : undefined;

  const credentials = mergeCredentialsPayload(topExisting, env);
  const out: Record<string, unknown> = { ...base, credentials };

  const nestedArgs = base.arguments;
  if (
    nestedArgs &&
    typeof nestedArgs === "object" &&
    !Array.isArray(nestedArgs)
  ) {
    const inner = { ...(nestedArgs as Record<string, unknown>) };
    const innerExisting =
      inner.credentials && typeof inner.credentials === "object"
        ? (inner.credentials as Record<string, unknown>)
        : undefined;
    out.arguments = {
      ...inner,
      credentials: mergeCredentialsPayload(innerExisting, env),
    };
  }

  return out;
}

/** 是否至少配置了 apiKey + passphrase（入站鉴权最低要求）。 */
export function hasPassphraseAuthEnv(env: CredentialEnv): boolean {
  return Boolean(env.apiKey && env.passphrase);
}

function pick(
  fromArgs: unknown,
  fromEnv: string | undefined
): string {
  const a = typeof fromArgs === "string" ? fromArgs.trim() : "";
  if (a) {
    return a;
  }
  return fromEnv ?? "";
}

function trim(v: string | undefined): string | undefined {
  if (v == null) {
    return undefined;
  }
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}
