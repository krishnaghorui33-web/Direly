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
      <div className="bg-bg-card border border-border rounded-xl p-5 flex flex-col justify-between hover:bg-bg-hover transition-colors shadow-sm">
        <div>
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-bold text-txt-muted tracking-wider uppercase font-mono">
              Baseline Success Rate
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-accent-teal-soft border border-accent-teal/40 text-status-success rounded-md">
              v1.4.0 Reference
            </span>
          </div>

          <div className="flex items-baseline gap-2.5 mt-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-status-success">
              {m.baselineSuccessRate?.toFixed(1)}%
            </span>
            <span className="text-xs sm:text-sm font-mono text-txt-muted font-medium">
              {m.baselinePassed} / {m.baselineTotal} passed
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-txt-secondary">
          <span>Historical stable release baseline</span>
          <CheckCircle2 className="w-4 h-4 text-status-success" />
        </div>
      </div>

      {/* Card 2: Candidate Success Rate */}
      <div className="bg-bg-card border border-border rounded-xl p-5 flex flex-col justify-between hover:bg-bg-hover transition-colors shadow-sm">
        <div>
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-bold text-txt-muted tracking-wider uppercase font-mono">
              Candidate Success Rate
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-bg-card border border-status-warning/40 text-status-warning rounded-md">
              -24.0 pp Drop
            </span>
          </div>

          <div className="flex items-baseline gap-2.5 mt-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-status-warning">
              {m.candidateSuccessRate?.toFixed(1)}%
            </span>
            <span className="text-xs sm:text-sm font-mono text-txt-muted font-medium">
              {m.candidatePassed} / {m.candidateTotal} passed
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-txt-secondary">
          <span>{m.candidateFails || 56} total failures (12 newly introduced)</span>
          <TrendingDown className="w-4 h-4 text-status-warning" />
        </div>
      </div>

      {/* Card 3: Newly Regressed Cases */}
      <div className="bg-bg-card border border-border rounded-xl p-5 flex flex-col justify-between hover:bg-bg-hover transition-colors shadow-sm">
        <div>
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-bold text-txt-muted tracking-wider uppercase font-mono">
              Newly Regressed Cases
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-bg-card border border-status-error/40 text-status-error rounded-md">
              100% Tool Invocations
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-status-error">
              {m.newlyRegressedCases || 12}
            </span>
            <span className="text-xs sm:text-sm font-mono text-txt-muted font-medium">
              / 200 cases (6.0%)
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-txt-secondary">
          <span>Zero prior failures on these inputs in v1.4.0</span>
          <AlertCircle className="w-4 h-4 text-status-error" />
        </div>
      </div>

      {/* Card 4: Median Latency (P50) */}
      <div className="bg-bg-card border border-border rounded-xl p-5 flex flex-col justify-between hover:bg-bg-hover transition-colors shadow-sm">
        <div>
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-bold text-txt-muted tracking-wider uppercase font-mono">
              Median Latency (P50)
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-accent-teal-soft border border-accent-teal/40 text-accent-cyan rounded-md">
              +280ms Delta
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-txt-primary">
              840ms → 1,120ms
            </span>
            <span className="text-xs sm:text-sm font-mono text-status-warning font-bold">
              (+33.3%)
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-txt-muted">
          <span className="truncate pr-1">Inflated by retry loops & schema exceptions</span>
          <HelpCircle className="w-4 h-4 text-txt-disabled shrink-0" />
        </div>
      </div>
    </div>
  );
}
