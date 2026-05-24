import { test } from "node:test";
import assert from "node:assert/strict";
import {
  injectCredentials,
  hasPassphraseAuthEnv,
} from "../dist/credentials.js";

test("injectCredentials fills missing fields from env", () => {
  const result = injectCredentials(
    { category: "linear", symbol: "BTCUSDT" },
    {
      apiKey: "key-from-env",
      apiSecret: "secret-from-env",
      passphrase: "pass-from-env",
    }
  );
  assert.equal(result.category, "linear");
  assert.deepEqual(result.credentials, {
    apiKey: "key-from-env",
    apiSecret: "secret-from-env",
    passphrase: "pass-from-env",
  });
});

test("injectCredentials does not override explicit argument credentials", () => {
  const result = injectCredentials(
    {
      credentials: {
        apiKey: "explicit-key",
        apiSecret: "",
        passphrase: "explicit-pass",
      },
    },
    {
      apiKey: "env-key",
      apiSecret: "env-secret",
      passphrase: "env-pass",
    }
  );
  assert.equal(result.credentials.apiKey, "explicit-key");
  assert.equal(result.credentials.apiSecret, "env-secret");
  assert.equal(result.credentials.passphrase, "explicit-pass");
});

test("hasPassphraseAuthEnv", () => {
  assert.equal(
    hasPassphraseAuthEnv({ apiKey: "k", passphrase: "p" }),
    true
  );
  assert.equal(hasPassphraseAuthEnv({ apiKey: "k" }), false);
});
