import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

export default function OverviewBanner({ metrics, project }) {
  return (
    <div className="space-y-5">
      {/* Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-txt-primary font-sans">
              Agent Regression Overview
            </h1>
            <span className="px-2.5 py-1 text-xs font-bold font-mono tracking-wider bg-bg-card border border-status-error/50 text-status-error rounded uppercase">
              ANOMALY FOUND
            </span>
          </div>
          <p className="text-sm text-txt-secondary mt-1.5">
            Compare evaluation outcomes, identify failure patterns, and trace regressions to likely component changes.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-txt-muted bg-bg-card px-3 py-1.5 rounded-lg border border-border">
          <Clock className="w-4 h-4 text-txt-muted" />
          <span>{project?.evaluatedAt || 'Evaluated 14 minutes ago on runner-c4-highcpu-8'}</span>
        </div>
      </div>

      {/* Regression Detected Alert Banner */}
      <div className="bg-bg-card border border-status-warning/40 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm transition-colors">
        <div className="flex items-start md:items-center gap-4">
          <div className="p-2.5 rounded-lg bg-bg-hover border border-status-warning/30 text-status-warning shrink-0 mt-0.5 md:mt-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-sm text-txt-secondary leading-relaxed">
            <span className="font-bold text-status-warning uppercase tracking-wide mr-2">
              REGRESSION DETECTED
            </span>
            <span className="text-txt-muted font-mono">
              • Baseline: <span className="text-status-success font-semibold">v1.4.0</span> → Candidate: <span className="text-status-warning font-semibold">v1.5.0</span> —{' '}
            </span>
            <span>The candidate version exhibits a </span>
            <span className="font-bold text-status-error font-mono">-24.0 percentage point</span>
            <span> evaluation pass rate drop and </span>
            <span className="font-bold text-status-warning font-mono">+280ms P50</span>
            <span> latency degradation across 200 evaluated test cases.</span>
          </div>
        </div>

        <div className="shrink-0 flex items-center">
          <span className="px-3 py-1 text-xs font-bold font-mono tracking-wider bg-bg-input border border-border text-accent-cyan rounded-lg">
            CONFIDENCE: HIGH
          </span>
        </div>
      </div>
    </div>
  );
}
