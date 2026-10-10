import React from 'react';
import { CheckCircle2, TrendingDown, AlertCircle, HelpCircle } from 'lucide-react';

export default function MetricCards({ metrics }) {
  const m = metrics || {
    baselineSuccessRate: 96.0,
    baselinePassed: 192,
    baselineTotal: 200,
    candidateSuccessRate: 72.0,
    candidatePassed: 144,
    candidateTotal: 200,
    candidateFails: 56,
    newlyRegressedCases: 12,
    latencyDeltaPct: 33.3
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* Card 1: Baseline Success Rate */}
      <div className="bg-[#0e1422] border border-[#1e283d] rounded-xl p-5 flex flex-col justify-between hover:border-[#2b3a57] transition-all shadow-sm">
        <div>
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-bold text-slate-400 tracking-wider uppercase font-mono">
              Baseline Success Rate
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 rounded-md">
              v1.4.0 Reference
            </span>
          </div>

          <div className="flex items-baseline gap-2.5 mt-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400">
              {m.baselineSuccessRate?.toFixed(1)}%
            </span>
            <span className="text-xs sm:text-sm font-mono text-slate-400 font-medium">
              {m.baselinePassed} / {m.baselineTotal} passed
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#1a2336] flex items-center justify-between text-xs text-slate-400">
          <span>Historical stable release baseline</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
      </div>

      {/* Card 2: Candidate Success Rate */}
      <div className="bg-[#0e1422] border border-[#1e283d] rounded-xl p-5 flex flex-col justify-between hover:border-[#2b3a57] transition-all shadow-sm">
        <div>
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-bold text-slate-400 tracking-wider uppercase font-mono">
              Candidate Success Rate
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-amber-950/50 border border-amber-500/30 text-amber-300 rounded-md">
              -24.0 pp Drop
            </span>
          </div>

          <div className="flex items-baseline gap-2.5 mt-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-400">
              {m.candidateSuccessRate?.toFixed(1)}%
            </span>
            <span className="text-xs sm:text-sm font-mono text-slate-400 font-medium">
              {m.candidatePassed} / {m.candidateTotal} passed
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#1a2336] flex items-center justify-between text-xs text-slate-400">
          <span>{m.candidateFails || 56} total failures (12 newly introduced)</span>
          <TrendingDown className="w-4 h-4 text-amber-400" />
        </div>
      </div>

      {/* Card 3: Newly Regressed Cases */}
      <div className="bg-[#0e1422] border border-[#1e283d] rounded-xl p-5 flex flex-col justify-between hover:border-[#2b3a57] transition-all shadow-sm">
        <div>
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-bold text-slate-400 tracking-wider uppercase font-mono">
              Newly Regressed Cases
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-rose-950/50 border border-rose-500/30 text-rose-300 rounded-md">
              100% Tool Invocations
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-rose-400">
              {m.newlyRegressedCases || 12}
            </span>
            <span className="text-xs sm:text-sm font-mono text-slate-400 font-medium">
              / 200 cases (6.0%)
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#1a2336] flex items-center justify-between text-xs text-slate-400">
          <span>Zero prior failures on these inputs in v1.4.0</span>
          <AlertCircle className="w-4 h-4 text-rose-400" />
        </div>
      </div>

      {/* Card 4: Median Latency (P50) */}
      <div className="bg-[#0e1422] border border-[#1e283d] rounded-xl p-5 flex flex-col justify-between hover:border-[#2b3a57] transition-all shadow-sm">
        <div>
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-bold text-slate-400 tracking-wider uppercase font-mono">
              Median Latency (P50)
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 rounded-md">
              +280ms Delta
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              840ms → 1,120ms
            </span>
            <span className="text-xs sm:text-sm font-mono text-amber-400 font-bold">
              (+33.3%)
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#1a2336] flex items-center justify-between text-xs text-slate-400">
          <span className="truncate pr-1">Inflated by retry loops & schema exceptions</span>
          <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
        </div>
      </div>
    </div>
  );
}
