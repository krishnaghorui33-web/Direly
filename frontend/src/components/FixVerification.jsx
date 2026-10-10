import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  FastForward, 
  RotateCcw, 
  Lock, 
  LineChart 
} from 'lucide-react';

export default function FixVerification({ 
  verificationData, 
  onTriggerReplay,
  isReplaying 
}) {
  const [replayNotification, setReplayNotification] = useState(null);
  const data = verificationData || {};
  const baseline = data.baseline || {};
  const candidate = data.candidate || {};
  const patch = data.patch || {};

  const handleAction = async (type) => {
    setReplayNotification(`Executing ${type} on test suite...`);
    await onTriggerReplay({ target: type });
    setReplayNotification(`✓ Replay completed: 12/12 failing test cases re-evaluated. Status: RESOLVED.`);
    setTimeout(() => setReplayNotification(null), 5000);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold text-[#E6EDF3] tracking-tight">Fix Verification & Replay</h2>
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-[#123A3A] border border-[#14B8A6]/50 text-[#34D399] rounded">
            Verification Pipeline Ready
          </span>
        </div>
        <p className="text-xs text-[#A4B3C2]">
          Rerun evaluation cases to determine whether the regression has been resolved.
        </p>
      </div>

      {/* 3 Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Baseline Card */}
        <div className="bg-[#141F2B] border border-[#263746] rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
              <span className="text-[#718396] uppercase font-semibold">Baseline Reference</span>
              <span className="text-[#A4B3C2] font-semibold">{baseline.version || 'v1.4.0'}</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#E6EDF3] mt-1">
              {baseline.passRate || '96.0% Pass'}
            </div>
            <div className="text-xs font-mono text-[#718396] mt-1">
              {baseline.passed || 192} / {baseline.total || 200} passed • P50: {baseline.p50 || '840ms'}
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-[#1D2A36] flex items-center gap-1.5 text-[11px] text-[#34D399]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Status: {baseline.status || 'Stable Reference'}</span>
          </div>
        </div>

        {/* Candidate Card */}
        <div className="bg-[#141F2B] border border-[#263746] rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
              <span className="text-[#718396] uppercase font-semibold">Current Candidate</span>
              <span className="text-[#FBBF24] font-semibold">{candidate.version || 'v1.5.0'}</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#FBBF24] mt-1">
              {candidate.passRate || '72.0% Pass'}
            </div>
            <div className="text-xs font-mono text-[#718396] mt-1">
              {candidate.passed || 144} / {candidate.total || 200} passed • P50: {candidate.p50 || '1,120ms'}
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-[#1D2A36] flex items-center gap-1.5 text-[11px] text-[#FBBF24]">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Status: {candidate.status || 'Regressed (-24.0pp)'}</span>
          </div>
        </div>

        {/* Proposed Patch Card */}
        <div className="bg-[#123A3A] border border-[#14B8A6]/60 rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
              <span className="text-[#A4B3C2] uppercase font-semibold">Proposed Patch</span>
              <span className="px-1.5 py-0.2 bg-[#14B8A6] text-[#0B1117] rounded text-[10px] font-bold">
                {patch.version || 'v1.5.1-patch'}
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#34D399] mt-1">
              {patch.passRate || '96.0% Pass'}
            </div>
            <div className="text-xs font-mono text-[#A4B3C2] mt-1">
              {patch.passed || 192} / {patch.total || 200} passed • P50: {patch.p50 || '842ms'}
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-[#14B8A6]/30 flex items-center gap-1.5 text-[11px] text-[#34D399] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Status: {patch.status || '100% Recovered (+24.0pp)'}</span>
          </div>
        </div>
      </div>

      {/* Summary Verification Outcome Pills */}
      <div className="bg-[#141F2B] border border-[#263746] rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#34D399]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>12 / 12 Regressed Cases Recovered (Zero schema 422 failures remaining)</span>
        </div>

        <div className="flex items-center gap-2 text-[#67E8F9]">
          <LineChart className="w-4 h-4 shrink-0" />
          <span>Latency Overhead Eliminated: -278ms normalized</span>
        </div>

        <div className="flex items-center gap-2 text-[#A4B3C2]">
          <Lock className="w-4 h-4 shrink-0 text-[#718396]" />
          <span>Baseline Invariant Flakiness: 8/8 Intact (Zero collateral drift)</span>
        </div>
      </div>

      {/* Replay Notification Alert (if any) */}
      {replayNotification && (
        <div className="p-2.5 bg-[#123A3A] border border-[#14B8A6]/60 rounded-md text-xs font-mono text-[#67E8F9] animate-fadeIn">
          {replayNotification}
        </div>
      )}

      {/* Replay Trigger Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleAction('Run Verification')}
            disabled={isReplaying}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#14B8A6] hover:bg-[#0D9488] active:bg-[#0F766E] text-[#0B1117] rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Verification</span>
          </button>

          <button
            onClick={() => handleAction('Fast-Replay 12 Failing Cases')}
            disabled={isReplaying}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#141F2B] hover:bg-[#192734] border border-[#263746] text-[#E6EDF3] rounded-md text-xs font-medium transition-colors disabled:opacity-50"
          >
            <FastForward className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span>Fast-Replay 12 Failing Cases (~14s)</span>
          </button>

          <button
            onClick={() => handleAction('Replay Full Golden Suite')}
            disabled={isReplaying}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#141F2B] hover:bg-[#192734] border border-[#263746] text-[#A4B3C2] hover:text-[#E6EDF3] rounded-md text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#718396]" />
            <span>Replay Full Golden Suite (200 cases)</span>
          </button>
        </div>

        <p className="text-[11px] text-[#718396] italic">
          Metrics and execution records shown are illustrative demonstration placeholders for evaluation pipeline verification.
        </p>
      </div>
    </div>
  );
}
