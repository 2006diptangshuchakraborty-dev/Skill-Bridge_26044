"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Industry Onboarding Route Alias
 * Redirects /industry/onboarding to canonical /organization/onboarding
 */
export default function IndustryOnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/organization/onboarding');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Routing to employer onboarding portal...</span>
      </div>
    </div>
  );
}
