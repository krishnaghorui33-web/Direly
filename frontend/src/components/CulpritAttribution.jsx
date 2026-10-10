import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Zap, 
  RotateCcw, 
  Copy, 
  Check, 
  Search, 
  ExternalLink 
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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold text-white tracking-tight">Likely Culprit Attribution</h2>
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-purple-950/70 border border-purple-500/50 text-purple-300 rounded">
            {data.confidence || '98.4%'} Attribution Confidence
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Components ranked by how well their version changes align with the observed regression.
        </p>
      </div>

      {/* Grid: Left Reasoning & Suspects, Right Inspection Artifact */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left Side: Facts, Inferences, Ranked Suspects (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Fact 1: Observed Fact */}
          <div className="bg-[#0e1620] border border-emerald-800/30 rounded-lg p-2.5 flex items-start gap-2.5 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-400 font-mono text-[11px] mr-1.5">[Observed Fact]</span>
              <span>{data.observedFact}</span>
            </div>
          </div>

          {/* Fact 2: Inferred Relationship */}
          <div className="bg-[#1c1810] border border-amber-800/30 rounded-lg p-2.5 flex items-start gap-2.5 text-xs text-slate-300">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-400 font-mono text-[11px] mr-1.5">[Inferred Relationship]</span>
              <span>{data.inferredRelationship}</span>
            </div>
          </div>

          {/* Fact 3: Correlation */}
          <div className="bg-[#111425] border border-purple-800/30 rounded-lg p-2.5 flex items-start gap-2.5 text-xs text-slate-300">
            <RotateCcw className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-purple-400 font-mono text-[11px] mr-1.5">[Correlation]</span>
              <span>{data.correlation}</span>
            </div>
          </div>

          {/* Ranked Component Suspects */}
          <div className="pt-1">
            <p className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider mb-2">
              Ranked Component Suspects
            </p>
            <div className="space-y-1.5">
              {suspects.map((s) => {
                const isPrimary = s.badge === 'PRIMARY SUSPECT';
                const isCofactor = s.badge === 'CO-FACTOR';
                return (
                  <div
                    key={s.component}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                      isPrimary
                        ? 'bg-purple-950/20 border-purple-500/40'
                        : isCofactor
                        ? 'bg-[#141a29] border-[#22304c]'
                        : 'bg-[#101522] border-[#1c263b] opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono text-[11px] truncate pr-2">
                      <span className="text-slate-400">{s.rank}.</span>
                      <span className="text-white font-medium">{s.component}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400 font-sans text-xs">{s.detail}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono font-semibold text-slate-300">
                        {s.matchScore} match
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
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
        <div className="lg:col-span-5 bg-[#0e1422] border border-[#1e283d] rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1b2538] pb-2 mb-3 text-xs">
              <span className="font-mono text-purple-300 font-semibold text-[11px]">
                [{artifact.artifactId || 'EVID-4102-09'}] Inspection Artifact
              </span>
              <span className="font-mono text-slate-400 text-[10px]">
                Event ID: {artifact.eventId || 'evt_val_8821'}
              </span>
            </div>

            {/* Code / JSON Box */}
            <pre className="p-3 bg-[#080b12] border border-[#1a2336] rounded-md font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
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
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1b2538] mt-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141c2c] hover:bg-[#1a253b] border border-[#23314d] text-slate-300 rounded text-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Raw JSON'}</span>
            </button>
            <button
              onClick={onInspectTrace}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold shadow-sm transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Inspect Trace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
