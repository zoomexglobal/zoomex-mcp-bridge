import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertSafeBackendUrl,
  BackendUrlGuardError,
} from "../dist/backendUrlGuard.js";

test("allows http loopback variants", () => {
  for (const url of [
    "http://127.0.0.1:8080/mcp",
    "http://localhost:8080/mcp",
    "http://[::1]:8080/mcp",
    "http://127.0.0.1",
    "http://app.localhost/mcp",
  ]) {
    const parsed = assertSafeBackendUrl(url);
    assert.equal(parsed.protocol, "http:");
  }
});

test("allows https to any host", () => {
  const parsed = assertSafeBackendUrl("https://mcp.example.com/mcp");
  assert.equal(parsed.hostname, "mcp.example.com");
});

test("rejects http to public host", () => {
  assert.throws(
    () => assertSafeBackendUrl("http://192.168.1.10:8080/mcp"),
    BackendUrlGuardError
  );
  assert.throws(
    () => assertSafeBackendUrl("http://mcp.example.com/mcp"),
    BackendUrlGuardError
  );
});

test("rejects non-http(s) schemes", () => {
  assert.throws(
    () => assertSafeBackendUrl("file:///etc/passwd"),
    BackendUrlGuardError
  );
});

test("rejects embedded credentials", () => {
  assert.throws(
    () => assertSafeBackendUrl("http://user:pass@127.0.0.1/mcp"),
    BackendUrlGuardError
  );
});

test("rejects http 0.0.0.0", () => {
  assert.throws(
    () => assertSafeBackendUrl("http://0.0.0.0:8080/mcp"),
    BackendUrlGuardError
  );
});
