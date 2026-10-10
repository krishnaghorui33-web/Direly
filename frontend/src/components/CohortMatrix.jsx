import React from 'react';
import { Info } from 'lucide-react';

export default function CohortMatrix({ cohort }) {
  return (
    <div className="bg-[#0e1422] border border-[#1e283d] rounded-lg p-3.5 space-y-3">
      {/* Top Details Header */}
      <div className="text-[11px] font-mono text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-bold text-white uppercase tracking-wider font-sans">Cohort Comparison Matrix</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">
          Baseline v1.4.0: <span className="text-emerald-400 font-semibold">192 Passed (96.0%)</span> • 8 Baseline Fails (4.0%) • P50: 840ms
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">
          Candidate v1.5.0: <span className="text-amber-400 font-semibold">144 Passed (72.0%)</span> • <span className="text-rose-400 font-semibold">12 Regressed (6.0%)</span> • 44 Persisted Failures (22.0%) • P50: 1,120ms
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-500">Total Evaluation Size: 200 Runs</span>
      </div>

      {/* Stacked Progress Bar */}
      <div className="w-full h-3 rounded-full bg-[#172033] overflow-hidden flex shadow-inner">
        {/* Passed Candidate (72%) */}
        <div 
          className="h-full bg-emerald-400/90 transition-all duration-500" 
          style={{ width: '72%' }}
          title="Passed Candidate: 144 runs (72%)"
        />
        {/* Newly Regressed (6%) */}
        <div 
          className="h-full bg-rose-500 transition-all duration-500" 
          style={{ width: '6%' }}
          title="Newly Regressed: 12 runs (6%)"
        />
        {/* Persistent Baseline Noise (22%) */}
        <div 
          className="h-full bg-slate-600/70 transition-all duration-500" 
          style={{ width: '22%' }}
          title="Persistent Baseline Noise: 44 runs (22%)"
        />
      </div>

      {/* Legend & Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-2 pt-1">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">Passed Candidate (72%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span className="text-slate-300">Newly Regressed (6%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            <span className="text-slate-300">Persistent Baseline Noise (22%)</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-400/90 text-[11px]">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>±0.0pp drift in existing 8 baseline test failures; regression is strictly concentrated in new tool-calling errors.</span>
        </div>
      </div>
    </div>
  );
}
