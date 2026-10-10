import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Zap, 
  RotateCcw, 
  Copy, 
  Check, 
  Search 
} from 'lucide-react';

export default function CulpritAttribution({ 
  attribution, 
  onInspectTrace 
}) {
  const [copied, setCopied] = useState(false);
  const data = attribution || {};
  const artifact = data.inspectionArtifact || {};
  const suspects = data.rankedSuspects || [];

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(artifact.jsonPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-extrabold text-white tracking-tight">Likely Culprit Attribution</h2>
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-purple-950/70 border border-purple-500/50 text-purple-300 rounded-lg">
            {data.confidence || '98.4%'} Attribution Confidence
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Components ranked by how well their version changes align with the observed regression.
        </p>
      </div>

      {/* Grid: Left Reasoning & Suspects, Right Inspection Artifact */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Facts, Inferences, Ranked Suspects (7 cols) */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Fact 1: Observed Fact */}
          <div className="bg-[#0e1620] border border-emerald-800/30 rounded-xl p-3.5 flex items-start gap-3 text-sm text-slate-300 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-emerald-400 font-mono text-xs mr-2">[Observed Fact]</span>
              <span>{data.observedFact}</span>
            </div>
          </div>

          {/* Fact 2: Inferred Relationship */}
          <div className="bg-[#1c1810] border border-amber-800/30 rounded-xl p-3.5 flex items-start gap-3 text-sm text-slate-300 shadow-sm">
            <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-amber-400 font-mono text-xs mr-2">[Inferred Relationship]</span>
              <span>{data.inferredRelationship}</span>
            </div>
          </div>

          {/* Fact 3: Correlation */}
          <div className="bg-[#111425] border border-purple-800/30 rounded-xl p-3.5 flex items-start gap-3 text-sm text-slate-300 shadow-sm">
            <RotateCcw className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-purple-400 font-mono text-xs mr-2">[Correlation]</span>
              <span>{data.correlation}</span>
            </div>
          </div>

          {/* Ranked Component Suspects */}
          <div className="pt-2">
            <p className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider mb-2.5">
              Ranked Component Suspects
            </p>
            <div className="space-y-2">
              {suspects.map((s) => {
                const isPrimary = s.badge === 'PRIMARY SUSPECT';
                const isCofactor = s.badge === 'CO-FACTOR';
                return (
                  <div
                    key={s.component}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-sm transition-all ${
                      isPrimary
                        ? 'bg-purple-950/20 border-purple-500/40 shadow-sm'
                        : isCofactor
                        ? 'bg-[#141a29] border-[#22304c]'
                        : 'bg-[#101522] border-[#1c263b] opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 font-mono text-xs sm:text-sm truncate pr-2">
                      <span className="text-slate-400 font-bold">{s.rank}.</span>
                      <span className="text-white font-bold">{s.component}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400 font-sans text-xs sm:text-sm">{s.detail}</span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs sm:text-sm font-mono font-bold text-slate-200">
                        {s.matchScore} match
                      </span>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wider uppercase border ${
                        isPrimary
                          ? 'bg-purple-900/60 border-purple-500 text-purple-200'
                          : isCofactor
                          ? 'bg-amber-950/60 border-amber-600/50 text-amber-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}>
                        {s.badge}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Inspection Artifact (5 cols) */}
        <div className="lg:col-span-5 bg-[#0e1422] border border-[#1e283d] rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-[#1b2538] pb-3 mb-3.5 text-sm">
              <span className="font-mono text-purple-300 font-bold text-xs sm:text-sm">
                [{artifact.artifactId || 'EVID-4102-09'}] Inspection Artifact
              </span>
              <span className="font-mono text-slate-400 text-xs">
                Event ID: {artifact.eventId || 'evt_val_8821'}
              </span>
            </div>

            {/* Code / JSON Box */}
            <pre className="p-4 bg-[#080b12] border border-[#1a2336] rounded-lg font-mono text-xs sm:text-sm text-slate-300 overflow-x-auto leading-relaxed">
              <code>
{`{
  "tool": "get_order",
  "payload_sent": {
    "order_id": "ORD-9281"
  },
  "expected_schema_params": [
    "id"
  ],
  "http_status": 422
}`}
              </code>
            </pre>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#1b2538] mt-4">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#141c2c] hover:bg-[#1a253b] border border-[#23314d] text-slate-300 rounded-lg text-xs sm:text-sm font-medium transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Raw JSON'}</span>
            </button>
            <button
              onClick={onInspectTrace}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Inspect Trace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
