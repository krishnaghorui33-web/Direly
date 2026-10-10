import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Search, 
  Play, 
  RotateCcw, 
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

  const handleRunReplay = async () => {
    await onTriggerReplay({ target: 'failing_cases' });
    setReplayDone(true);
  };

  return (
    <div className="space-y-6">
      {/* 3-Step Guided Workflow Header */}
      <div className="bg-[#141F2B] border border-[#263746] rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#123A3A] border border-[#14B8A6]/40 text-[#67E8F9] rounded">
                Interactive Guided Walkthrough
              </span>
              <span className="text-xs text-[#718396]">Order Support Agent</span>
            </div>
            <h2 className="text-lg font-bold text-[#E6EDF3] mt-1">
              {currentStep === 1 && "Step 1: DETECT — Did something break in the new version?"}
              {currentStep === 2 && "Step 2: DIAGNOSE — Why did it break and which change caused it?"}
              {currentStep === 3 && "Step 3: VERIFY — Did our fix resolve the regression?"}
            </h2>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center gap-2 bg-[#101923] p-1.5 rounded-lg border border-[#263746]">
            <button
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentStep === 1
                  ? 'bg-[#14B8A6] text-[#0B1117] shadow'
                  : 'text-[#A4B3C2] hover:text-[#E6EDF3] hover:bg-[#192734]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>1. Detect</span>
            </button>

            <button
              onClick={() => setCurrentStep(2)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentStep === 2
                  ? 'bg-[#14B8A6] text-[#0B1117] shadow'
                  : 'text-[#A4B3C2] hover:text-[#E6EDF3] hover:bg-[#192734]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>2. Diagnose</span>
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                currentStep === 3
                  ? 'bg-[#14B8A6] text-[#0B1117] shadow'
                  : 'text-[#A4B3C2] hover:text-[#E6EDF3] hover:bg-[#192734]'
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
          <div className="bg-[#141F2B] border border-[#FB7185]/40 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-[#192734] border border-[#FB7185]/50 text-[#FB7185] shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#E6EDF3] text-base">Regression Found in Candidate v1.5.0!</span>
                  <span className="px-2 py-0.5 bg-[#101923] border border-[#FB7185]/50 text-[#FB7185] text-[10px] font-bold rounded uppercase">
                    High Confidence
                  </span>
                </div>
                <p className="text-xs text-[#A4B3C2] mt-1 max-w-2xl leading-relaxed">
                  When testing candidate <strong>v1.5.0</strong> against the standard test suite of 200 cases, the pass rate plummeted from <strong className="text-[#34D399]">96.0% down to 72.0%</strong>. Direly identified <strong className="text-[#FB7185]">12 brand new failing tests</strong> that passed perfectly in v1.4.0.
                </p>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 bg-[#14B8A6] hover:bg-[#0D9488] text-[#0B1117] rounded-lg text-xs font-bold flex items-center gap-2 shrink-0 shadow-sm transition-colors"
            >
              <span>See What Broke</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Simple Side-by-Side Version Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Baseline Card */}
            <div className="bg-[#141F2B] border border-[#263746] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#718396] uppercase tracking-wider">Baseline Version</span>
                <span className="px-2 py-0.5 bg-[#123A3A] border border-[#14B8A6]/40 text-[#34D399] rounded font-mono text-xs font-bold">
                  v1.4.0 (Stable)
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold font-mono text-[#34D399]">96.0%</span>
                <span className="text-xs text-[#A4B3C2] font-medium">Evaluation Pass Rate</span>
              </div>
              <div className="p-3 bg-[#101923] rounded-lg border border-[#1D2A36] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#E6EDF3]">
                  <span>Passed Cases:</span>
                  <span className="font-mono font-bold text-[#34D399]">192 / 200</span>
                </div>
                <div className="flex justify-between text-[#A4B3C2]">
                  <span>Average Latency:</span>
                  <span className="font-mono text-[#E6EDF3]">840ms</span>
                </div>
                <div className="flex justify-between text-[#A4B3C2]">
                  <span>Health:</span>
                  <span className="text-[#34D399] font-semibold">✓ Verified Production Baseline</span>
                </div>
              </div>
            </div>

            {/* Candidate Card */}
            <div className="bg-[#141F2B] border border-[#263746] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#718396] uppercase tracking-wider">Candidate Version</span>
                <span className="px-2 py-0.5 bg-[#101923] border border-[#FBBF24]/50 text-[#FBBF24] rounded font-mono text-xs font-bold">
                  v1.5.0 (Broken)
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold font-mono text-[#FBBF24]">72.0%</span>
                <span className="text-xs text-[#FB7185] font-semibold">-24.0% Regression Drop</span>
              </div>
              <div className="p-3 bg-[#101923] rounded-lg border border-[#1D2A36] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#E6EDF3]">
                  <span>Passed Cases:</span>
                  <span className="font-mono font-bold text-[#FBBF24]">144 / 200</span>
                </div>
                <div className="flex justify-between text-[#A4B3C2]">
                  <span>Newly Regressed Cases:</span>
                  <span className="font-mono font-bold text-[#FB7185]">12 new failures!</span>
                </div>
                <div className="flex justify-between text-[#A4B3C2]">
                  <span>Average Latency:</span>
                  <span className="font-mono text-[#FBBF24]">1,120ms (+33% slower)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Simple Human-Readable Breakdown */}
          <div className="bg-[#141F2B] border border-[#263746] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#E6EDF3]">How Did Direly Separate Real Bugs from Background Noise?</h3>
            <p className="text-xs text-[#A4B3C2] leading-relaxed">
              In test suites, some failures are just random network flakiness. Direly compared historical runs to separate pre-existing flakiness from the real regression:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-[#101923] border border-[#1D2A36]">
                <div className="text-xs font-bold text-[#34D399] mb-1">144 Passing Tests (72%)</div>
                <div className="text-[11px] text-[#A4B3C2]">Agent answered order inquiries and cancellation requests normally.</div>
              </div>

              <div className="p-3 rounded-lg bg-[#101923] border border-[#FB7185]/40">
                <div className="text-xs font-bold text-[#FB7185] mb-1">12 Real Regressions (6%)</div>
                <div className="text-[11px] text-[#E6EDF3]">Brand new failures that never occurred in v1.4.0. All 12 hit the same error!</div>
              </div>

              <div className="p-3 rounded-lg bg-[#101923] border border-[#1D2A36]">
                <div className="text-xs font-bold text-[#718396] mb-1">44 Background Flaky Tests (22%)</div>
                <div className="text-[11px] text-[#718396]">Pre-existing sandbox CRM timeouts that also happened in v1.4.0. Not a new bug.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 2: DIAGNOSE ================= */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-fadeIn">
          {/* Main Diagnosis Summary Card */}
          <div className="bg-[#141F2B] border border-[#14B8A6]/40 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#14B8A6]" />
              <h3 className="text-base font-bold text-[#E6EDF3]">
                Root Cause Diagnosed: Parameter Name Mismatch on Tool "get_order"
              </h3>
            </div>
            <p className="text-xs text-[#A4B3C2] leading-relaxed max-w-3xl">
              Direly analyzed the 12 failing runs, clustered their error fingerprints, and matched them against version changes. 
              The problem: <strong>The backend schema was updated to require <code className="text-[#34D399] px-1 py-0.5 bg-[#101923] rounded border border-[#263746]">id</code></strong>, but <strong>the agent's prompt was never updated and kept sending <code className="text-[#FB7185] px-1 py-0.5 bg-[#101923] rounded border border-[#263746]">order_id</code></strong>!
            </p>
          </div>

          {/* Simple Visual Comparison: Expected vs Received */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* What the Agent Did */}
            <div className="bg-[#141F2B] border border-[#FB7185]/40 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FB7185] uppercase tracking-wide">What The Agent Sent</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#101923] border border-[#FB7185]/40 text-[#FB7185] rounded">
                  Prompt: order_support.jinja2
                </span>
              </div>
              <div className="p-3 bg-[#101923] rounded-lg border border-[#1D2A36] font-mono text-xs text-[#FB7185]">
                {`get_order(order_id = "ORD-9281")`}
              </div>
              <p className="text-[11px] text-[#A4B3C2]">
                The agent prompt was written before the tool change, telling the model to extract and dispatch <code className="text-[#E6EDF3]">order_id</code>.
              </p>
            </div>

            {/* What the Tool Needed */}
            <div className="bg-[#141F2B] border border-[#14B8A6]/40 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#14B8A6] uppercase tracking-wide">What The Tool Required</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#123A3A] border border-[#14B8A6]/40 text-[#67E8F9] rounded">
                  Schema: order_service.json
                </span>
              </div>
              <div className="p-3 bg-[#101923] rounded-lg border border-[#1D2A36] font-mono text-xs text-[#34D399]">
                {`parameters.required = ["id"]`}
              </div>
              <p className="text-[11px] text-[#A4B3C2]">
                The tool schema was updated in v1.5.0 to require <code className="text-[#E6EDF3]">id</code> instead. The tool gateway rejected the call with <strong className="text-[#FB7185]">HTTP 422</strong>.
              </p>
            </div>
          </div>

          {/* Ranked Culprits */}
          <div className="bg-[#141F2B] border border-[#263746] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#E6EDF3]">Suspected Components Ranked by Historical Evidence</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#123A3A] border border-[#14B8A6]/50 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#E6EDF3]">1. tools/order_service.json</span>
                  <span className="text-[#A4B3C2]">— Schema parameter renamed from order_id to id</span>
                </div>
                <span className="px-2 py-0.5 bg-[#14B8A6] text-[#0B1117] font-bold rounded text-[11px]">
                  98.4% Match (PRIMARY SUSPECT)
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#101923] border border-[#263746] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#A4B3C2]">2. prompts/order_support.jinja2</span>
                  <span className="text-[#718396]">— Prompt template was not updated to reflect new parameter</span>
                </div>
                <span className="px-2 py-0.5 bg-[#141F2B] border border-[#FBBF24]/50 text-[#FBBF24] font-bold rounded text-[11px]">
                  84.0% Match (CO-FACTOR)
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 bg-[#14B8A6] hover:bg-[#0D9488] text-[#0B1117] rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
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
          <div className="bg-[#141F2B] border border-[#14B8A6]/40 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#34D399]" />
                <h3 className="text-base font-bold text-[#E6EDF3]">
                  Verification Pipeline Ready: v1.5.1-patch
                </h3>
              </div>
              <p className="text-xs text-[#A4B3C2] mt-1 max-w-2xl leading-relaxed">
                A patch was applied in <strong>v1.5.1</strong> making the prompt and tool schema match. Click the button to rerun the evaluation cases and verify whether the regression is gone.
              </p>
            </div>

            <button
              onClick={handleRunReplay}
              disabled={isReplaying}
              className="px-5 py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] active:bg-[#0F766E] text-[#0B1117] rounded-lg text-xs font-bold flex items-center gap-2 shrink-0 shadow-sm transition-all disabled:opacity-50"
            >
              {isReplaying ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-[#0B1117]" />
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
            <div className="bg-[#141F2B] border border-[#263746] rounded-xl p-4 space-y-2">
              <span className="text-[11px] font-bold text-[#718396] uppercase">Baseline (v1.4.0)</span>
              <div className="text-2xl font-bold font-mono text-[#E6EDF3]">96.0% Pass</div>
              <div className="text-xs text-[#718396]">192 / 200 passed (P50: 840ms)</div>
              <div className="text-xs text-[#34D399] pt-2 font-medium">✓ Stable reference</div>
            </div>

            {/* Candidate */}
            <div className="bg-[#141F2B] border border-[#263746] rounded-xl p-4 space-y-2">
              <span className="text-[11px] font-bold text-[#718396] uppercase">Before Fix (v1.5.0)</span>
              <div className="text-2xl font-bold font-mono text-[#FBBF24]">72.0% Pass</div>
              <div className="text-xs text-[#718396]">144 / 200 passed (P50: 1,120ms)</div>
              <div className="text-xs text-[#FB7185] pt-2 font-medium">⚠ Regressed (-24.0% drop)</div>
            </div>

            {/* Proposed Patch */}
            <div className="bg-[#123A3A] border border-[#14B8A6]/60 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#A4B3C2] uppercase">After Fix (v1.5.1-patch)</span>
                <span className="px-1.5 py-0.5 bg-[#14B8A6] text-[#0B1117] rounded text-[10px] font-bold">
                  VERIFIED
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-[#34D399]">96.0% Pass</div>
              <div className="text-xs text-[#A4B3C2]">192 / 200 passed (P50: 842ms)</div>
              <div className="text-xs text-[#34D399] pt-2 font-bold">
                ✓ 100% Recovered (+24.0% restored)
              </div>
            </div>
          </div>

          {/* Resolution Checklist */}
          <div className="bg-[#141F2B] border border-[#263746] rounded-xl p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-[#E6EDF3] uppercase tracking-wider">Verification Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#101923] rounded-lg border border-[#14B8A6]/30 text-[#34D399] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#34D399]" />
                <span>12 / 12 Regressed Cases Recovered</span>
              </div>
              <div className="p-3 bg-[#101923] rounded-lg border border-[#263746] text-[#67E8F9] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#67E8F9]" />
                <span>Latency Normalized (-278ms eliminated)</span>
              </div>
              <div className="p-3 bg-[#101923] rounded-lg border border-[#1D2A36] text-[#A4B3C2] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#718396]" />
                <span>Zero Collateral Damage to Existing Tests</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
