"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";

export default function AdminCompaniesPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to canonical verifications queue
    router.replace("/admin/verifications");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6 text-center">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 max-w-md space-y-4 shadow-xl">
        <Building2 size={36} className="mx-auto text-amber-400" />
        <h2 className="text-lg font-bold text-slate-100">Redirecting to Verification Queue...</h2>
        <p className="text-xs text-slate-400">
          The company verification management interface has moved to the unified KYC verification queue.
        </p>
        <Link
          href="/admin/verifications"
          className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
        >
          <span>Go to KYC Verifications</span> <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
