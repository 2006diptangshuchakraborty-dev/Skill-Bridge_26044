function normalizeBaseUrl(value) {
  if (!value) return null;

  const clean = String(value).trim().replace(/\/+$/, "");
  if (!clean) return null;

  if (!/^https?:\/\//i.test(clean)) {
    return `https://${clean}`;
  }

  return clean;
}

function isLocalhostHost(value) {
  if (!value) return false;

  try {
    const host = String(value).trim().toLowerCase();
    const normalized = host
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "");

    return (
      normalized === "localhost" ||
      normalized === "127.0.0.1" ||
      normalized === "0.0.0.0" ||
      normalized.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

function resolveAppBaseUrl() {
  const candidateValues = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
  ];

  const preferredValues =
    process.env.NODE_ENV === "production"
      ? [
          process.env.BETTER_AUTH_URL,
          process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
          process.env.APP_URL,
          process.env.NEXT_PUBLIC_APP_URL,
          process.env.SITE_URL,
          process.env.NEXT_PUBLIC_SITE_URL,
          process.env.VERCEL_URL,
          process.env.NEXT_PUBLIC_VERCEL_URL,
        ]
      : candidateValues;

  const nonLocalValues = preferredValues
    .map((value) => normalizeBaseUrl(value))
    .filter((value) => value && !isLocalhostHost(value));

  if (nonLocalValues.length > 0) {
    return nonLocalValues[0];
  }

  for (const value of candidateValues) {
    const normalized = normalizeBaseUrl(value);
    if (normalized) return normalized;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

module.exports = {
  normalizeBaseUrl,
  resolveAppBaseUrl,
};
