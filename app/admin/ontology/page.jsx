"use client";

import React, { useState } from "react";
import { Layers, Plus, CheckCircle2 } from "lucide-react";
import { SKILL_ONTOLOGY } from "../../../lib/normalization";

export default function AdminOntologyPage() {
  const [ontology, setOntology] = useState(SKILL_ONTOLOGY || []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 space-y-2 shadow-2xl">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider">
          <Layers size={14} /> Skill Ontology & Normalization Layer
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">Canonical Skill Dictionary & Alias Registry</h1>
        <p className="text-xs text-slate-400">
          Maps heterogeneous terms (ReactJS, React.js $\to$ React) to prevent duplicate skill names.
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ontology.map((entry) => (
            <div key={entry.id || entry.canonicalName} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-100">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={14} /> {entry.canonicalName}
                </span>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                  {entry.category}
                </span>
              </div>
              <div className="text-slate-400 text-[11px]">
                <span className="text-slate-500 font-mono">Aliases:</span>{" "}
                <span className="font-mono text-purple-300">
                  {Array.isArray(entry.aliases) ? entry.aliases.join(", ") : "None"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
