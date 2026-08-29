import "./globals.css";
import Navbar from "../components/shared/Navbar";
import {
  ShieldCheck,
  Users,
  GraduationCap,
  Heart,
  Send,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";

export const metadata = {
  title: "Skill Bridge",
  description: "Skill Bridge Platform",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  const teamMembers = [
    {
      name: "Pritam Hazari",
      role: "Group Leader",
      email: "pritamhazari17@gmail.com",
    },
    {
      name: "Sounava Sarkar",
      role: "Team Member",
      email: "sounavasarkar.kgec@gmail.com",
    },
    {
      name: "Ayon Bhowmick",
      role: "Team Member",
      email: "ayonbhowmick06@gmail.com",
    },
    {
      name: "Diptangshu Chakraborty",
      role: "Team Member",
      email: "2006diptangshuchakraborty@gmail.com",
    },
    {
      name: "Debayan Chakraborty",
      role: "Team Member",
      email: "debayanc32@gmail.com",
    },
    {
      name: "Adrija Datta",
      role: "Team Member",
      email: "adrijadatta2007@gmail.com",
    },
  ];

  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen flex flex-col">

        {/* ================= NAVBAR ================= */}
        <Navbar />

        {/* ================= MAIN CONTENT ================= */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* ================= FOOTER ================= */}
        <footer className="border-t border-slate-800 bg-slate-950">

          {/* ================= MAIN FOOTER ================= */}
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">

            {/* ================= FOOTER COLUMNS ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-8 lg:gap-12">

              {/* ================= BRAND ================= */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-bold text-lg">
                    <Image
  src="/logo.png"
  alt="Skill-Bridge Logo"
  width={50}
  height={50}
/>
                  </div>

                  <span className="text-xl font-bold text-slate-100">
                    Skill{" "}
                    <span className="text-emerald-400">
                      Bridge
                    </span>
                  </span>
                </div>

                <p className="text-sm text-slate-400 mb-3">
                  Bridging skills. Building futures.
                </p>

                <p className="text-sm leading-6 text-slate-400 max-w-xs">
                  A collaborative ecosystem connecting students,
                  recruiters, and institutions to bridge the skill gap
                  and foster meaningful opportunities.
                </p>
              </div>

              {/* ================= PLATFORM ================= */}
              <div>
                <h3 className="font-semibold text-white text-base">
                  Platform
                </h3>

                <div className="h-0.5 w-7 bg-emerald-400 mt-3 mb-4"></div>

                <ul className="space-y-4 text-sm text-slate-400">
                  <li>
                    <a
                      href="#students"
                      className="flex items-center gap-3 hover:text-emerald-400 transition-colors"
                    >
                      <GraduationCap size={18} />
                      <span>For Students</span>
                    </a>
                  </li>

                  <li>
                    <a
                      href="#industry"
                      className="flex items-center gap-3 hover:text-emerald-400 transition-colors"
                    >
                      <Users size={18} />
                      <span>For Recruiters</span>
                    </a>
                  </li>
                </ul>
              </div>

              {/* ================= COMPANY ================= */}
              <div>
                <h3 className="font-semibold text-white text-base">
                  Company
                </h3>

                <div className="h-0.5 w-7 bg-emerald-400 mt-3 mb-4"></div>

                <ul className="space-y-4 text-sm text-slate-400">

                  {/* About Us */}
                  <li>
                    <a
                      href="#about"
                      className="flex items-center gap-3 hover:text-emerald-400 transition-colors"
                    >
                      <Users size={18} />
                      <span>About Us</span>
                    </a>
                  </li>

                  {/* Our Team */}
                  <li>
                    <a
                      href="#about"
                      className="flex items-center gap-3 hover:text-emerald-400 transition-colors"
                    >
                      <Users size={18} />
                      <span>Our Team</span>
                    </a>
                  </li>

                </ul>
              </div>

              {/* ================= STAY UPDATED ================= */}
              <div>
                <h3 className="font-semibold text-white text-base">
                  Stay Updated
                </h3>

                <div className="h-0.5 w-7 bg-emerald-400 mt-3 mb-4"></div>

                

                <form className="flex w-full">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="min-w-0 flex-1 rounded-l-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                  />

                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="flex w-11 items-center justify-center rounded-r-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors"
                  >
                    <Send size={17} />
                  </button>
                </form>

                <p className="flex items-center gap-2 text-xs text-slate-500 mt-3">
                  <ShieldCheck size={13} />
                  No spam.
                </p>
              </div>
            </div>

            
          </div>

          {/* ================= BOTTOM BAR ================= */}
          <div className="border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">

                <p className="text-xs sm:text-sm text-slate-500">
                  © 2026 Skill Bridge. All rights reserved.
                </p>

                <p className="flex items-center gap-1 text-xs sm:text-sm text-slate-400">
                  Made with

                  <Heart
                    size={15}
                    className="fill-pink-500 text-pink-500"
                  />

                  by

                  <span className="text-slate-300">
                    Team Rising Phoenix
                  </span>
                </p>

              </div>
            </div>
          </div>
        </footer>

        {/* ===================================================== */}
        {/* ABOUT US / OUR TEAM MODAL */}
        {/* ===================================================== */}
        <div
          id="about"
          className="
            fixed inset-0 z-50 hidden target:flex
            items-center justify-center
            bg-slate-950/90 backdrop-blur-sm
            p-4 sm:p-6
          "
        >

          {/* ================= MODAL ================= */}
          <div
            className="
              relative w-full max-w-5xl
              max-h-[90vh] overflow-y-auto
              rounded-3xl
              border border-slate-800
              bg-slate-950
              shadow-2xl
              p-6 sm:p-8
            "
          >

            {/* ================= CLOSE BUTTON ================= */}
            <a
              href="#"
              aria-label="Close"
              className="
                absolute right-5 top-5
                flex h-9 w-9 items-center justify-center
                rounded-full
                border border-slate-700
                bg-slate-900
                text-slate-400
                hover:text-white
                hover:border-emerald-400
                transition-colors
              "
            >
              <X size={18} />
            </a>

            {/* ================= HEADING ================= */}
            <div className="text-center mb-8 pr-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                About Us
              </h2>

              <div className="h-0.5 w-10 bg-emerald-400 mx-auto mt-3 mb-4"></div>

              <p className="text-sm leading-6 text-slate-400 max-w-2xl mx-auto">
                Meet the team behind Skill Bridge — Team Rising Phoenix.
                We are working together to build a collaborative
                ecosystem connecting students, recruiters and
                institutions.
              </p>
            </div>

            {/* ================= TEAM CARDS ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

              {teamMembers.map((member) => (
                <div
                  key={member.email}
                  className="
                    group
                    rounded-2xl
                    border border-slate-800
                    bg-slate-900/70
                    p-5
                    hover:border-emerald-400/50
                    hover:bg-slate-900
                    transition-all duration-300
                  "
                >

                  <div className="flex items-start gap-4">

                    {/* ================= AVATAR ================= */}
                    <div className="relative shrink-0">

                      <div
                        className="
                          h-16 w-16
                          rounded-full
                          border border-slate-700
                          bg-slate-800
                          flex items-center justify-center
                          group-hover:border-emerald-400/60
                          transition-colors
                        "
                      >
                        <UserRound
                          size={34}
                          strokeWidth={1.7}
                          className="
                            text-slate-300
                            group-hover:text-emerald-400
                            transition-colors
                          "
                        />
                      </div>

                      <div
                        className="
                          absolute bottom-0 right-0
                          h-4 w-4
                          rounded-full
                          bg-emerald-400
                          border-2 border-slate-900
                        "
                      ></div>

                    </div>

                    {/* ================= MEMBER INFO ================= */}
                    <div className="min-w-0">

                      <h3 className="font-semibold text-white text-base">
                        {member.name}
                      </h3>

                      {/* Education */}
                      <p className="text-xs leading-5 text-slate-400 mt-1">
                        B.Tech undergraduate in Electronics and
                        Communication Engineering from Kalyani
                        Government Engineering College
                      </p>

                      {/* Role */}
                      <p className="text-xs text-emerald-400 mt-2">
                        {member.role}
                      </p>

                      {/* Email */}
                      <a
                        href={`mailto:${member.email}`}
                        className="
                          block
                          text-xs
                          text-slate-500
                          hover:text-emerald-400
                          mt-2
                          truncate
                          transition-colors
                        "
                      >
                        {member.email}
                      </a>

                    </div>

                  </div>

                </div>
              ))}

            </div>

            {/* ================= TEAM FOOTER ================= */}
            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <p className="text-sm text-slate-500">
                Team Rising Phoenix
              </p>

              <p className="text-xs text-slate-600 mt-1">
                Skill Bridge • 2026
              </p>
            </div>

          </div>
        </div>

      </body>
    </html>
  );
}