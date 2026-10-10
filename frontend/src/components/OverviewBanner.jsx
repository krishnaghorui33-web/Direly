import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

export default function OverviewBanner({ metrics, project }) {
  return (
    <div className="space-y-5">
      {/* Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-white font-sans">
              Agent Regression Overview
            </h1>
            <span className="px-2.5 py-1 text-xs font-bold font-mono tracking-wider bg-rose-950/70 border border-rose-600/50 text-rose-300 rounded uppercase">
              ANOMALY FOUND
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1.5">
            Compare evaluation outcomes, identify failure patterns, and trace regressions to likely component changes.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#0e1422] px-3 py-1.5 rounded-lg border border-[#1e283d]">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>{project?.evaluatedAt || 'Evaluated 14 minutes ago on runner-c4-highcpu-8'}</span>
        </div>
      </div>

      {/* Regression Detected Alert Banner */}
      <div className="bg-[#1c1611]/80 border border-amber-600/40 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-amber-950/20">
        <div className="flex items-start md:items-center gap-4">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5 md:mt-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-sm text-slate-300 leading-relaxed">
            <span className="font-bold text-amber-400 uppercase tracking-wide mr-2">
              REGRESSION DETECTED
            </span>
            <span className="text-slate-400 font-mono">
              • Baseline: <span className="text-emerald-400 font-semibold">v1.4.0</span> → Candidate: <span className="text-amber-400 font-semibold">v1.5.0</span> —{' '}
            </span>
            <span>The candidate version exhibits a </span>
            <span className="font-bold text-amber-300 font-mono">-24.0 percentage point</span>
            <span> evaluation pass rate drop and </span>
            <span className="font-bold text-amber-300 font-mono">+280ms P50</span>
            <span> latency degradation across 200 evaluated test cases.</span>
          </div>
        </div>

        <div className="shrink-0 flex items-center">
          <span className="px-3 py-1 text-xs font-bold font-mono tracking-wider bg-amber-950/60 border border-amber-500/50 text-amber-300 rounded-lg shadow-sm">
            CONFIDENCE: HIGH
          </span>
        </div>
      </div>
    </div>
  );
}
