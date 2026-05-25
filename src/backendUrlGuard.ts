/**
 * 出站 MCP 后端 URL 安全校验：仅允许 HTTPS，或面向 loopback 的 HTTP。
 * 在建立 Streamable HTTP transport 之前调用，降低 SSRF / 明文凭证泄露风险。
 */

import { isIP } from "node:net";

export class BackendUrlGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendUrlGuardError";
  }
}

/**
 * 解析并校验 backend URL。通过则返回规范化后的 URL 实例。
 */
export function assertSafeBackendUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BackendUrlGuardError(`Invalid backend URL: ${rawUrl}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new BackendUrlGuardError(
      `Backend URL must use http: or https: (got ${parsed.protocol})`
    );
  }

  if (parsed.username || parsed.password) {
    throw new BackendUrlGuardError(
      "Backend URL must not embed credentials (user:pass@host)"
    );
  }

  if (parsed.protocol === "https:") {
    return parsed;
  }

  const host = normalizeHostname(parsed.hostname);
  if (!isLoopbackHost(host)) {
    throw new BackendUrlGuardError(
      `Insecure HTTP to non-loopback host "${parsed.hostname}" is not allowed. ` +
        `Use https:// for remote backends, or http://127.0.0.1 / http://localhost for local dev.`
    );
  }

  return parsed;
}

function normalizeHostname(hostname: string): string {
  const h = hostname.toLowerCase();
  if (h.startsWith("[") && h.endsWith("]")) {
    return h.slice(1, -1);
  }
  return h;
}

function isLoopbackHost(hostname: string): boolean {
  if (hostname === "localhost") {
    return true;
  }
  if (hostname.endsWith(".localhost")) {
    return true;
  }
  if (hostname === "::1") {
    return true;
  }

  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    if (hostname === "0.0.0.0") {
      return false;
    }
    const firstOctet = Number(hostname.split(".")[0]);
    return firstOctet === 127;
  }

  if (ipVersion === 6) {
    if (hostname === "::1") {
      return true;
    }
    if (hostname.startsWith("::ffff:127.")) {
      return true;
    }
  }

  return false;
}
