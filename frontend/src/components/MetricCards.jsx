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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Card 1: Baseline Success Rate */}
      <div className="bg-[#141F2B] border border-[#263746] rounded-lg p-3.5 flex flex-col justify-between hover:bg-[#192734] transition-colors">
        <div>
          <div className="flex items-center justify-between text-[11px] mb-2">
            <span className="font-semibold text-[#718396] tracking-wider uppercase font-mono">
              Baseline Success Rate
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium bg-[#123A3A] border border-[#14B8A6]/40 text-[#34D399] rounded">
              v1.4.0 Reference
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[#34D399]">
              {m.baselineSuccessRate?.toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-[#A4B3C2]">
              {m.baselinePassed} / {m.baselineTotal} passed
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#1D2A36] flex items-center justify-between text-[11px] text-[#A4B3C2]">
          <span>Historical stable release baseline</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
        </div>
      </div>

      {/* Card 2: Candidate Success Rate */}
      <div className="bg-[#141F2B] border border-[#263746] rounded-lg p-3.5 flex flex-col justify-between hover:bg-[#192734] transition-colors">
        <div>
          <div className="flex items-center justify-between text-[11px] mb-2">
            <span className="font-semibold text-[#718396] tracking-wider uppercase font-mono">
              Candidate Success Rate
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium bg-[#141F2B] border border-[#FBBF24]/40 text-[#FBBF24] rounded">
              -24.0 pp Drop
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[#FBBF24]">
              {m.candidateSuccessRate?.toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-[#A4B3C2]">
              {m.candidatePassed} / {m.candidateTotal} passed
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#1D2A36] flex items-center justify-between text-[11px] text-[#A4B3C2]">
          <span>{m.candidateFails || 56} total failures (12 newly introduced)</span>
          <TrendingDown className="w-3.5 h-3.5 text-[#FBBF24]" />
        </div>
      </div>

      {/* Card 3: Newly Regressed Cases */}
      <div className="bg-[#141F2B] border border-[#263746] rounded-lg p-3.5 flex flex-col justify-between hover:bg-[#192734] transition-colors">
        <div>
          <div className="flex items-center justify-between text-[11px] mb-2">
            <span className="font-semibold text-[#718396] tracking-wider uppercase font-mono">
              Newly Regressed Cases
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium bg-[#141F2B] border border-[#FB7185]/40 text-[#FB7185] rounded">
              100% Tool Invocations
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono text-[#FB7185]">
              {m.newlyRegressedCases || 12}
            </span>
            <span className="text-xs font-mono text-[#A4B3C2]">
              / 200 cases (6.0%)
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#1D2A36] flex items-center justify-between text-[11px] text-[#A4B3C2]">
          <span>Zero prior failures on these inputs in v1.4.0</span>
          <AlertCircle className="w-3.5 h-3.5 text-[#FB7185]" />
        </div>
      </div>

      {/* Card 4: Median Latency (P50) */}
      <div className="bg-[#141F2B] border border-[#263746] rounded-lg p-3.5 flex flex-col justify-between hover:bg-[#192734] transition-colors">
        <div>
          <div className="flex items-center justify-between text-[11px] mb-2">
            <span className="font-semibold text-[#718396] tracking-wider uppercase font-mono">
              Median Latency (P50)
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium bg-[#123A3A] border border-[#14B8A6]/40 text-[#67E8F9] rounded">
              +280ms Delta
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-bold font-mono text-[#E6EDF3]">
              840ms → 1,120ms
            </span>
            <span className="text-xs font-mono text-[#FBBF24] font-semibold">
              (+33.3%)
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#1D2A36] flex items-center justify-between text-[11px] text-[#718396]">
          <span className="truncate pr-1">Inflated by retry loops & schema exceptions</span>
          <HelpCircle className="w-3.5 h-3.5 text-[#526170] shrink-0" />
        </div>
      </div>
    </div>
  );
}
