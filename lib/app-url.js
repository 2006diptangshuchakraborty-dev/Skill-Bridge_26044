function normalizeBaseUrl(value) {
  if (!value) return null;

  const clean = String(value).trim().replace(/\/+$/, "");
  if (!clean) return null;

  if (!/^https?:\/\//i.test(clean)) {
    return `https://${clean}`;
  }

  return clean;
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
