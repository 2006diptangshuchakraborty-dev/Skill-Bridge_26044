const assert = require("node:assert/strict");

const { resolveAppBaseUrl } = require("../lib/app-url.js");

const originalEnv = { ...process.env };

try {
  delete process.env.BETTER_AUTH_URL;
  delete process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  delete process.env.APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.VERCEL_URL;
  delete process.env.NEXT_PUBLIC_VERCEL_URL;

  process.env.VERCEL_URL = "example.vercel.app";
  assert.equal(resolveAppBaseUrl(), "https://example.vercel.app");

  process.env.BETTER_AUTH_URL = "https://api.example.com";
  assert.equal(resolveAppBaseUrl(), "https://api.example.com");

  delete process.env.BETTER_AUTH_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
  assert.equal(resolveAppBaseUrl(), "https://app.example.com");
} finally {
  process.env = { ...originalEnv };
}

console.log("auth url resolution checks passed");
