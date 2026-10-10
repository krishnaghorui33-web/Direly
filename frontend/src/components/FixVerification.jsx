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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-extrabold text-white tracking-tight">Fix Verification & Replay</h2>
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 rounded-lg">
            Verification Pipeline Ready
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Rerun evaluation cases to determine whether the regression has been resolved.
        </p>
      </div>

      {/* 3 Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Baseline Card */}
        <div className="bg-[#0e1422] border border-[#1e283d] rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs mb-3 font-mono">
              <span className="text-slate-400 uppercase font-bold">Baseline Reference</span>
              <span className="text-slate-300 font-semibold">{baseline.version || 'v1.4.0'}</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white mt-1">
              {baseline.passRate || '96.0% Pass'}
            </div>
            <div className="text-xs sm:text-sm font-mono text-slate-400 mt-2">
              {baseline.passed || 192} / {baseline.total || 200} passed • P50: {baseline.p50 || '840ms'}
            </div>
          </div>
          <div className="mt-5 pt-3.5 border-t border-[#1a2336] flex items-center gap-2 text-xs sm:text-sm text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Status: {baseline.status || 'Stable Reference'}</span>
          </div>
        </div>

        {/* Candidate Card */}
        <div className="bg-[#14121a] border border-amber-900/30 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs mb-3 font-mono">
              <span className="text-slate-400 uppercase font-bold">Current Candidate</span>
              <span className="text-amber-400 font-semibold">{candidate.version || 'v1.5.0'}</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-400 mt-1">
              {candidate.passRate || '72.0% Pass'}
            </div>
            <div className="text-xs sm:text-sm font-mono text-slate-400 mt-2">
              {candidate.passed || 144} / {candidate.total || 200} passed • P50: {candidate.p50 || '1,120ms'}
            </div>
          </div>
          <div className="mt-5 pt-3.5 border-t border-amber-950/50 flex items-center gap-2 text-xs sm:text-sm text-amber-400 font-medium">
            <AlertTriangle className="w-4 h-4" />
            <span>Status: {candidate.status || 'Regressed (-24.0pp)'}</span>
          </div>
        </div>

        {/* Proposed Patch Card */}
        <div className="bg-[#0b171f] border border-emerald-800/40 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs mb-3 font-mono">
              <span className="text-slate-400 uppercase font-bold">Proposed Patch</span>
              <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 rounded-md text-xs font-extrabold">
                {patch.version || 'v1.5.1-patch'}
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400 mt-1">
              {patch.passRate || '96.0% Pass'}
            </div>
            <div className="text-xs sm:text-sm font-mono text-slate-400 mt-2">
              {patch.passed || 192} / {patch.total || 200} passed • P50: {patch.p50 || '842ms'}
            </div>
          </div>
          <div className="mt-5 pt-3.5 border-t border-emerald-950/50 flex items-center gap-2 text-xs sm:text-sm text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Status: {patch.status || '100% Recovered (+24.0pp)'}</span>
          </div>
        </div>
      </div>

      {/* Summary Verification Outcome Pills */}
      <div className="bg-[#0e1422] border border-[#1e283d] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs sm:text-sm shadow-sm">
        <div className="flex items-center gap-2.5 text-emerald-400 font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>12 / 12 Regressed Cases Recovered (Zero schema 422 failures remaining)</span>
        </div>

        <div className="flex items-center gap-2.5 text-cyan-400 font-medium">
          <LineChart className="w-5 h-5 shrink-0" />
          <span>Latency Overhead Eliminated: -278ms normalized</span>
        </div>

        <div className="flex items-center gap-2.5 text-slate-400 font-medium">
          <Lock className="w-5 h-5 shrink-0 text-slate-500" />
          <span>Baseline Invariant Flakiness: 8/8 Intact (Zero collateral drift)</span>
        </div>
      </div>

      {/* Replay Notification Alert (if any) */}
      {replayNotification && (
        <div className="p-3.5 bg-purple-950/60 border border-purple-500/50 rounded-xl text-xs sm:text-sm font-mono text-purple-200 animate-fadeIn">
          {replayNotification}
        </div>
      )}

      {/* Replay Trigger Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => handleAction('Run Verification')}
            disabled={isReplaying}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Run Verification</span>
          </button>

          <button
            onClick={() => handleAction('Fast-Replay 12 Failing Cases')}
            disabled={isReplaying}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#141b2a] hover:bg-[#1c263c] border border-purple-800/40 text-purple-200 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <FastForward className="w-4 h-4 text-purple-400" />
            <span>Fast-Replay 12 Failing Cases (~14s)</span>
          </button>

          <button
            onClick={() => handleAction('Replay Full Golden Suite')}
            disabled={isReplaying}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#141b2a] hover:bg-[#1c263c] border border-[#23314d] text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Replay Full Golden Suite (200 cases)</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 italic">
          Metrics and execution records shown are illustrative demonstration placeholders for evaluation pipeline verification.
        </p>
      </div>
    </div>
  );
}
