import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

export default function OverviewBanner({ metrics, project }) {
  return (
    <div className="space-y-4">
      {/* Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-[#E6EDF3] font-sans">
              Agent Regression Overview
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold font-mono tracking-wider bg-[#141F2B] border border-[#FB7185]/40 text-[#FB7185] rounded uppercase">
              ANOMALY FOUND
            </span>
          </div>
          <p className="text-xs text-[#A4B3C2] mt-1">
            Compare evaluation outcomes, identify failure patterns, and trace regressions to likely component changes.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#718396]">
          <Clock className="w-3.5 h-3.5 text-[#718396]" />
          <span>{project?.evaluatedAt || 'Evaluated 14 minutes ago on runner-c4-highcpu-8'}</span>
        </div>
      </div>

      {/* Regression Detected Alert Banner */}
      <div className="bg-[#141F2B] border border-[#FBBF24]/40 rounded-lg p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start md:items-center gap-3">
          <div className="p-1.5 rounded-md bg-[#192734] border border-[#FBBF24]/30 text-[#FBBF24] shrink-0 mt-0.5 md:mt-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xs text-[#A4B3C2]">
            <span className="font-bold text-[#FBBF24] uppercase tracking-wide mr-2">
              REGRESSION DETECTED
            </span>
            <span className="text-[#718396] font-mono">
              • Baseline: <span className="text-[#34D399]">v1.4.0</span> → Candidate: <span className="text-[#FBBF24]">v1.5.0</span> —{' '}
            </span>
            <span>The candidate version exhibits a </span>
            <span className="font-bold text-[#FB7185] font-mono">-24.0 percentage point</span>
            <span> evaluation pass rate drop and </span>
            <span className="font-bold text-[#FBBF24] font-mono">+280ms P50</span>
            <span> latency degradation across 200 evaluated test cases.</span>
          </div>
        </div>

        <div className="shrink-0 flex items-center">
          <span className="px-2.5 py-1 text-[11px] font-bold font-mono tracking-wider bg-[#101923] border border-[#263746] text-[#67E8F9] rounded">
            CONFIDENCE: HIGH
          </span>
        </div>
      </div>
    </div>
  );
}
