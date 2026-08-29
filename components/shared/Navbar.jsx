"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LogOut,
  User,
  Menu,
  X,
  Sparkles,
  Shield,
  Briefcase,
  GraduationCap,
  Building2,
  School,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { authClient, useSession, signOut, fullLogout } from "@/lib/auth-client";
import { calculateProfileCompletion } from "@/lib/onboarding-calc";
import { studentData } from "@/lib/dummy-data";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("");

  useEffect(() => {
    const updateActiveHash = () => {
      setActiveHash(window.location.hash);
    };

    updateActiveHash();
    window.addEventListener("hashchange", updateActiveHash);

    return () => window.removeEventListener("hashchange", updateActiveHash);
  }, []);

  // Better Auth session hook
  const { data: session, isPending } = useSession();

  const isLoggedIn = !!session?.user;
  const user = session?.user || null;

  // Determine active role: session user role takes precedence, fallback to path matching
  const rawRole = user?.role ? String(user.role).toUpperCase() : "";
  let role = "STUDENT";

  if (rawRole === "ADMIN") {
    role = "ADMIN";
  } else if (rawRole === "ORGANIZATION" || rawRole === "INDUSTRY") {
    role = "INDUSTRY";
  } else if (rawRole === "INSTITUTE") {
    role = "INSTITUTE";
  } else if (rawRole === "STUDENT") {
    role = "STUDENT";
  } else {
    // Path-based fallback
    if (pathname.startsWith("/admin")) {
      role = "ADMIN";
    } else if (pathname.startsWith("/recruiter") || pathname.startsWith("/organization") || pathname.startsWith("/industry")) {
      role = "INDUSTRY";
    } else if (pathname.startsWith("/institute")) {
      role = "INSTITUTE";
    } else {
      role = "STUDENT";
    }
  }

  // Calculate dynamic completion percentage for student
  const studentCompletion = user
    ? user.profileCompletion || calculateProfileCompletion("STUDENT", user.profile || user) || 78
    : studentData.profile.profileCompletion || 78;

  const handleSignOut = async () => {
    try {
      if (typeof fullLogout === "function") {
        await fullLogout();
      } else if (typeof signOut === "function") {
        await signOut();
      } else if (authClient?.signOut) {
        await authClient.signOut();
      }
    } catch (err) {
      console.error("Sign-out failed:", err);
    } finally {
      setUserDropdownOpen(false);
      setMobileMenuOpen(false);
      router.push("/");
      router.refresh();
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  };

  const isActiveRoute = (href) => {
    if (!href || href.startsWith("#") || href.includes("#")) {
      return false;
    }

    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  };

  const navLinkClassName = (isActive, mobile = false) => {
    const baseClasses = mobile
      ? "relative px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 after:absolute after:left-3 after:right-3 after:bottom-1 after:h-0.5 after:rounded-full after:bg-[#03AC88] after:transition-transform after:duration-200"
      : "relative px-3.5 py-1.5 rounded-lg text-lg font-medium transition-colors duration-200 after:absolute after:left-3.5 after:right-3.5 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-[#03AC88] after:transition-transform after:duration-200";

    return `${baseClasses} ${
      isActive
        ? "bg-[#03336F] text-white after:scale-x-100"
        : "text-white/80 hover:text-white hover:after:scale-x-100 after:scale-x-0"
    }`;
  };

  const isActiveHash = (href) =>
    pathname === "/" && activeHash === `#${href.split("#")[1]}`;

  // Nav links per role when authenticated
  const getAuthNavLinks = () => {
    switch (role) {
      case "INDUSTRY":
        return [
          { label: "Home", href: "/home" },
          // { label: "Dashboard", href: "/industry/dashboard" },
          { label: "My Opportunities", href: "/recruiter/dashboard" },
          { label: "Post Opportunity", href: "/recruiter/jobs/create" },
          { label: "Candidates", href: "/recruiter/candidates" },
          // { label: "Profile", href: "/organization/onboarding" },
        ];
      case "INSTITUTE":
        return [
          { label: "Home", href: "/home" },
          // { label: "Dashboard", href: "/institute/dashboard" },
          { label: "Skill Insights", href: "/institute/skill-gaps" },
          { label: "Industry Connections", href: "/institute/feedback" },
          { label: "Opportunities", href: "/institute/training" },
          // { label: "Profile", href: "/institute/onboarding" },
        ];
      case "ADMIN":
        return [
          { label: "Home", href: "/home" },
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Users & Roles", href: "/admin/users" },
          { label: "KYC Queue", href: "/admin/verifications" },
          { label: "Reputation Moderation", href: "/admin/reputation" },
          { label: "Audit Logs", href: "/admin/audit-logs" },
        ];
      case "STUDENT":
      default:
        return [
          { label: "Home", href: "/home" },
          // { label: "Dashboard", href: "/student/dashboard" },
          { label: "Opportunities", href: "/student/opportunities" },
          { label: "My Applications", href: "/student/applications" },
          // { label: "Profile", href: "/student/profile" },
        ];
    }
  };

  // Public Links (unauthenticated)
  const isHomePage = pathname === "/";
  const publicNavLinks = [
    { label: "Students", href: isHomePage ? "#students" : "/#students" },
    { label: "Industry", href: isHomePage ? "#industry" : "/#industry" },
    { label: "Institutes", href: isHomePage ? "#institutes" : "/#institutes" },
  ];

  const authLinks = getAuthNavLinks();

  return (
    <nav className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand / Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-700 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Image
                  src="/logo.png"
                  alt="Skill Bridge"
                  width={32}
                  height={32}
                  priority
                  className="rounded-lg object-contain"
                />
              </div>

              <div>
                <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-100 via-emerald-200 to-teal-300 bg-clip-text text-transparent flex items-center gap-1.5">
                  Skill Bridge
                  <span className="text-[10px] uppercase tracking-widest font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    RP
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Center Links */}
          <div className="hidden md:flex items-center gap-1">
            {!isPending && isLoggedIn ? (
              // Authenticated Nav Links
              authLinks.map((link) => {
                const isActive = isActiveRoute(link.href);
                return (
                  <Link
  key={link.href}
  href={link.href}
                    className={navLinkClassName(isActive)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                );
              })
            ) : (
              // Public Unauthenticated Nav Links
              publicNavLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setActiveHash(link.href.includes("#") ? `#${link.href.split("#")[1]}` : "")}
                  className={navLinkClassName(isActiveHash(link.href))}
                  aria-current={isActiveHash(link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              ))
            )}
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isPending ? (
              <div className="w-24 h-8 bg-slate-900 animate-pulse rounded-lg" />
            ) : isLoggedIn ? (
              /* Authenticated User Capsule */
              <div className="flex items-center gap-2.5">
                {/* Student Profile Completion Badge */}
                {/* Role Pill */}
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                    role === 'STUDENT'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : role === 'INDUSTRY'
                      ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                      : role === 'INSTITUTE'
                      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                      : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                  }`}
                >
                  {role}
                </span>

                {/* User Dropdown / Avatar */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/80 hover:bg-slate-900 transition-colors"
                    aria-label="User Menu"
                  >
                    {user?.image ? (
                      <img
                        src={user.image}
                        alt={user.name || "User Avatar"}
                        className="w-7 h-7 rounded-lg object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-xs">
                        {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                    <span className="text-xs font-medium text-slate-200 max-w-[100px] truncate">
                      {user?.name || "Account"}
                    </span>
                    <ChevronDown size={14} className="text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95">
                      <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                        <p className="text-xs font-bold text-slate-100 truncate">{user?.name || "Signed in"}</p>
                        <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                      </div>

                      <Link
                        href="/home"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <Sparkles size={14} className="text-emerald-400" />
                        <span>Home</span>
                      </Link>

                      {role === "STUDENT" && (
                        <>
                          <Link
                            href="/student/profile"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <User size={14} className="text-teal-400" />
                            <span>Profile</span>
                          </Link>

                          <Link
                            href="http://localhost:3000/student/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <GraduationCap size={14} className="text-emerald-400" />
                            <span>Dashboard</span>
                          </Link>
                        </>
                      )}

                      {role === "INDUSTRY" && (
                        <>
                          {/* <Link
                            href="/industry/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Building2 size={14} className="text-teal-400" />
                            <span>Dashboard</span>
                          </Link> */}
                          <Link
                            href="/organization/onboarding"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <User size={14} className="text-blue-400" />
                            <span>Profile</span>
                          </Link>
                        </>
                      )}

                      {role === "INSTITUTE" && (
                        <>
                          {/* <Link
                            href="/institute/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <School size={14} className="text-cyan-400" />
                            <span>Dashboard</span>
                          </Link> */}
                          <Link
                            href="/institute/onboarding"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <User size={14} className="text-purple-400" />
                            <span>Profile</span>
                          </Link>
                        </>
                      )}

                      {role === "ADMIN" && (
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Shield size={14} className="text-amber-400" />
                          <span>Admin Console</span>
                        </Link>
                      )}

                      <div className="border-t border-slate-800 my-1" />

                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Direct Sign Out Button */}
                
              </div>
            ) : (
              /* Logged-Out CTAs: Unified /auth entry point (replaces legacy /login and /register) */
              <div className="flex items-center gap-2">
                <Link
                  href="/auth"
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-900 transition-colors"
                >
                  Sign In
                </Link>

                <Link
                  href="/auth"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-sm shadow-emerald-500/20 hover:scale-[1.02]"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {isLoggedIn && role === "STUDENT" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {studentCompletion}%
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-3">
          <div className="flex flex-col space-y-1">
            {isLoggedIn ? (
              authLinks.map((link, idx) => {
                const isActive = isActiveRoute(link.href);
                return (
                  <Link
                    key={`mobile-${link.href}-${idx}`}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={navLinkClassName(isActive, true)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                );
              })
            ) : (
              publicNavLinks.map((link) => (
                <Link
                  key={`mobile-${link.label}`}
                  href={link.href}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setActiveHash(link.href.includes("#") ? `#${link.href.split("#")[1]}` : "");
                  }}
                  className={navLinkClassName(isActiveHash(link.href), true)}
                  aria-current={isActiveHash(link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              ))
            )}
          </div>

          <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
            {isLoggedIn ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-100">{user?.name || "Account"}</p>
                    <p className="text-[10px] text-slate-400">{role}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2 rounded-lg text-xs font-medium text-slate-300 border border-slate-700 hover:bg-slate-900"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}