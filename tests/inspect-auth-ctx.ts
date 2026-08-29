import { auth } from "@/lib/auth";

async function inspectAuthContext() {
  const ctx = await (auth as any).$context;
  console.log("Resolved auth.$context keys:", Object.keys(ctx || {}));
  if (ctx.secret) console.log("secret is string:", typeof ctx.secret);
  if (ctx.authCookies) console.log("authCookies:", ctx.authCookies);
  if (ctx.internalAdapter) console.log("internalAdapter keys:", Object.keys(ctx.internalAdapter));
  
  // Can internalAdapter create session?
  // Let's check internalAdapter.createSession
  console.log("createSession:", typeof ctx.internalAdapter?.createSession);
  console.log("findSession:", typeof ctx.internalAdapter?.findSession);
  
  // Let's check cookie signing method or helper
  console.log("setSignedCookie:", typeof ctx.setSignedCookie);
  console.log("getSignedCookie:", typeof ctx.getSignedCookie);
  console.log("cookie signature functions in ctx:", Object.keys(ctx).filter(k => k.toLowerCase().includes("sign") || k.toLowerCase().includes("cookie")));
}

inspectAuthContext().catch(console.error);
