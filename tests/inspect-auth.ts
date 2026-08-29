import { auth } from "@/lib/auth";

async function inspectAuth() {
  console.log("auth properties:", Object.keys(auth));
  console.log("auth.options:", Object.keys(auth.options || {}));
  
  // What helper methods exist on auth or auth.context?
  const ctx = (auth as any).$context;
  if (ctx) {
    console.log("auth.$context keys:", Object.keys(ctx));
    if (ctx.setSignedCookie) console.log("ctx.setSignedCookie:", typeof ctx.setSignedCookie);
  }
}

inspectAuth().catch(console.error);
