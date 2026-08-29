"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";

export default function AdminAuditPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to canonical audit logs explorer
    router.replace("/admin/audit-logs");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6 text-center">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 max-w-md space-y-4 shadow-xl">
        <Activity size={36} className="mx-auto text-purple-400" />
        <h2 className="text-lg font-bold text-slate-100">Redirecting to Audit Logs Explorer...</h2>
        <p className="text-xs text-slate-400">
          The forensic audit trail interface is available in the unified audit log explorer.
        </p>
        <Link
          href="/admin/audit-logs"
          className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs"
        >
          <span>Go to Audit Logs</span> <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
