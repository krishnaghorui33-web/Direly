import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Search, 
  Wrench, 
  Play, 
  RotateCcw, 
  FileCode, 
  Zap, 
  TrendingDown, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export default function SimpleStoryView({ 
  data, 
  onTriggerReplay, 
  isReplaying 
}) {
  const [currentStep, setCurrentStep] = useState(1); // 1 = Detect, 2 = Diagnose, 3 = Verify
  const [replayDone, setReplayDone] = useState(false);
  const [selectedCase, setSelectedCase] = useState('case_ord_8821');

  const handleRunReplay = async () => {
    await onTriggerReplay({ target: 'failing_cases' });
    setReplayDone(true);
  };

  return (
    <div className="space-y-6">
      {/* 3-Step Guided Workflow Header */}
      <div className="bg-[#0f1422] border border-[#1e2638] rounded-xl p-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-950 border border-purple-500/40 text-purple-300 rounded">
                Interactive Guided Walkthrough
              </span>
              <span className="text-xs text-slate-400">Order Support Agent</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              {currentStep === 1 && "Step 1: DETECT — Did something break in the new version?"}
              {currentStep === 2 && "Step 2: DIAGNOSE — Why did it break and which change caused it?"}
              {currentStep === 3 && "Step 3: VERIFY — Did our fix resolve the regression?"}
            </h2>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center gap-2 bg-[#0a0d14] p-1.5 rounded-lg border border-[#1e2638]">
            <button
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentStep === 1
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-[#151c2e]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>1. Detect</span>
            </button>

            <button
              onClick={() => setCurrentStep(2)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentStep === 2
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-[#151c2e]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>2. Diagnose</span>
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentStep === 3
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-[#151c2e]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>3. Verify Fix</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= STEP 1: DETECT ================= */}
      {currentStep === 1 && (
        <div className="space-y-5 animate-fadeIn">
          {/* Main Alert Message */}
          <div className="bg-gradient-to-r from-rose-950/40 via-[#18111d] to-[#0f1422] border border-rose-500/40 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-rose-600/20 border border-rose-500/50 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">Regression Found in Candidate v1.5.0!</span>
                  <span className="px-2 py-0.5 bg-rose-900/60 border border-rose-500 text-rose-200 text-[10px] font-bold rounded uppercase">
                    High Confidence
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  When testing candidate <strong>v1.5.0</strong> against the standard test suite of 200 cases, the pass rate plummeted from <strong>96.0% down to 72.0%</strong>. Direly identified <strong>12 brand new failing tests</strong> that passed perfectly in v1.4.0.
                </p>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shrink-0 shadow-md transition-colors"
            >
              <span>See What Broke</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Simple Side-by-Side Version Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Baseline Card */}
            <div className="bg-[#0f1422] border border-[#1e2638] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Baseline Version</span>
                <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 rounded font-mono text-xs font-bold">
                  v1.4.0 (Stable)
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold font-mono text-emerald-400">96.0%</span>
                <span className="text-xs text-slate-400 font-medium">Evaluation Pass Rate</span>
              </div>
              <div className="p-3 bg-[#0a0d14] rounded-lg border border-[#182133] space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Passed Cases:</span>
                  <span className="font-mono font-bold text-emerald-400">192 / 200</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Average Latency:</span>
                  <span className="font-mono text-slate-300">840ms</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Health:</span>
                  <span className="text-emerald-400 font-semibold">✓ Verified Production Baseline</span>
                </div>
              </div>
            </div>

            {/* Candidate Card */}
            <div className="bg-[#141019] border border-rose-900/40 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate Version</span>
                <span className="px-2 py-0.5 bg-rose-950/80 border border-rose-500/50 text-rose-300 rounded font-mono text-xs font-bold">
                  v1.5.0 (Broken)
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold font-mono text-amber-400">72.0%</span>
                <span className="text-xs text-rose-400 font-semibold">-24.0% Regression Drop</span>
              </div>
              <div className="p-3 bg-[#0a0d14] rounded-lg border border-[#182133] space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Passed Cases:</span>
                  <span className="font-mono font-bold text-amber-400">144 / 200</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Newly Regressed Cases:</span>
                  <span className="font-mono font-bold text-rose-400">12 new failures!</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Average Latency:</span>
                  <span className="font-mono text-rose-400">1,120ms (+33% slower)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Simple Human-Readable Breakdown */}
          <div className="bg-[#0f1422] border border-[#1e2638] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">How Did Direly Separate Real Bugs from Background Noise?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              In test suites, some failures are just random network flakiness. Direly compared historical runs to separate pre-existing flakiness from the real regression:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-[#0a0d14] border border-[#1c273e]">
                <div className="text-xs font-bold text-emerald-400 mb-1">144 Passing Tests (72%)</div>
                <div className="text-[11px] text-slate-400">Agent answered order inquiries and cancellation requests normally.</div>
              </div>

              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40">
                <div className="text-xs font-bold text-rose-400 mb-1">12 Real Regressions (6%)</div>
                <div className="text-[11px] text-slate-300">Brand new failures that never occurred in v1.4.0. All 12 hit the same error!</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0a0d14] border border-[#1c273e]">
                <div className="text-xs font-bold text-slate-400 mb-1">44 Background Flaky Tests (22%)</div>
                <div className="text-[11px] text-slate-400">Pre-existing sandbox CRM timeouts that also happened in v1.4.0. Not a new bug.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 2: DIAGNOSE ================= */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-fadeIn">
          {/* Main Diagnosis Summary Card */}
          <div className="bg-gradient-to-r from-purple-950/40 via-[#131726] to-[#0f1422] border border-purple-500/40 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">
                Root Cause Diagnosed: Parameter Name Mismatch on Tool "get_order"
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Direly analyzed the 12 failing runs, clustered their error fingerprints, and matched them against version changes. 
              The problem: <strong>The backend schema was updated to require <code className="text-emerald-400 px-1 py-0.5 bg-black/40 rounded">id</code></strong>, but <strong>the agent's prompt was never updated and kept sending <code className="text-rose-400 px-1 py-0.5 bg-black/40 rounded">order_id</code></strong>!
            </p>
          </div>

          {/* Simple Visual Comparison: Expected vs Received */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* What the Agent Did */}
            <div className="bg-[#151119] border border-rose-800/40 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">What The Agent Sent</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-950 border border-rose-700/50 text-rose-300 rounded">
                  Prompt: order_support.jinja2
                </span>
              </div>
              <div className="p-3 bg-[#0a0c12] rounded-lg border border-[#231b26] font-mono text-xs text-rose-300">
                {`get_order(order_id = "ORD-9281")`}
              </div>
              <p className="text-[11px] text-slate-400">
                The agent prompt was written before the tool change, telling the model to extract and dispatch <code className="text-slate-300">order_id</code>.
              </p>
            </div>

            {/* What the Tool Needed */}
            <div className="bg-[#0f171d] border border-emerald-800/40 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">What The Tool Required</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950 border border-emerald-700/50 text-emerald-300 rounded">
                  Schema: order_service.json
                </span>
              </div>
              <div className="p-3 bg-[#0a0c12] rounded-lg border border-[#172522] font-mono text-xs text-emerald-300">
                {`parameters.required = ["id"]`}
              </div>
              <p className="text-[11px] text-slate-400">
                The tool schema was updated in v1.5.0 to require <code className="text-slate-300">id</code> instead. The tool gateway rejected the call with <strong className="text-rose-400">HTTP 422</strong>.
              </p>
            </div>
          </div>

          {/* Ranked Culprits */}
          <div className="bg-[#0f1422] border border-[#1e2638] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Suspected Components Ranked by Historical Evidence</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-950/25 border border-purple-500/40 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">1. tools/order_service.json</span>
                  <span className="text-slate-400">— Schema parameter renamed from order_id to id</span>
                </div>
                <span className="px-2 py-0.5 bg-purple-900 border border-purple-500 text-purple-200 font-bold rounded text-[11px]">
                  98.4% Match (PRIMARY SUSPECT)
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#111726] border border-[#1e283d] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-300">2. prompts/order_support.jinja2</span>
                  <span className="text-slate-400">— Prompt template was not updated to reflect new parameter</span>
                </div>
                <span className="px-2 py-0.5 bg-amber-950 border border-amber-600 text-amber-300 font-bold rounded text-[11px]">
                  84.0% Match (CO-FACTOR)
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-md transition-colors"
              >
                <span>Proceed to Fix Verification</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 3: VERIFY ================= */}
      {currentStep === 3 && (
        <div className="space-y-5 animate-fadeIn">
          {/* Action Box to Replay */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-[#101b22] to-[#0f1422] border border-emerald-500/40 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Verification Pipeline Ready: v1.5.1-patch
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                A patch was applied in <strong>v1.5.1</strong> making the prompt and tool schema match. Click the button to rerun the evaluation cases and verify whether the regression is gone.
              </p>
            </div>

            <button
              onClick={handleRunReplay}
              disabled={isReplaying}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shrink-0 shadow-lg transition-all disabled:opacity-50"
            >
              {isReplaying ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Rerunning Evaluation Cases...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>{replayDone ? 'Re-run Verification' : 'Run Fix Verification Now'}</span>
                </>
              )}
            </button>
          </div>

          {/* Verification Outcome Cards (Baseline vs Broken Candidate vs Fixed Patch) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Baseline */}
            <div className="bg-[#0f1422] border border-[#1e2638] rounded-xl p-4 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Baseline (v1.4.0)</span>
              <div className="text-2xl font-bold font-mono text-white">96.0% Pass</div>
              <div className="text-xs text-slate-400">192 / 200 passed (P50: 840ms)</div>
              <div className="text-xs text-emerald-400 pt-2 font-medium">✓ Stable reference</div>
            </div>

            {/* Candidate */}
            <div className="bg-[#141019] border border-amber-900/40 rounded-xl p-4 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Before Fix (v1.5.0)</span>
              <div className="text-2xl font-bold font-mono text-amber-400">72.0% Pass</div>
              <div className="text-xs text-slate-400">144 / 200 passed (P50: 1,120ms)</div>
              <div className="text-xs text-rose-400 pt-2 font-medium">⚠ Regressed (-24.0% drop)</div>
            </div>

            {/* Proposed Patch */}
            <div className="bg-[#0c1a1f] border border-emerald-500/60 rounded-xl p-4 space-y-2 ring-1 ring-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase">After Fix (v1.5.1-patch)</span>
                <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded text-[10px] font-bold">
                  VERIFIED
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400">96.0% Pass</div>
              <div className="text-xs text-slate-400">192 / 200 passed (P50: 842ms)</div>
              <div className="text-xs text-emerald-400 pt-2 font-bold">
                ✓ 100% Recovered (+24.0% restored)
              </div>
            </div>
          </div>

          {/* Resolution Checklist */}
          <div className="bg-[#0f1422] border border-[#1e2638] rounded-xl p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Verification Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#0a0d14] rounded-lg border border-emerald-900/40 text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>12 / 12 Regressed Cases Recovered</span>
              </div>
              <div className="p-3 bg-[#0a0d14] rounded-lg border border-cyan-900/40 text-cyan-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>Latency Normalized (-278ms eliminated)</span>
              </div>
              <div className="p-3 bg-[#0a0d14] rounded-lg border border-slate-800 text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-slate-400" />
                <span>Zero Collateral Damage to Existing Tests</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
