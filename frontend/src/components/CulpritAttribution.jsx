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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold text-[#E6EDF3] tracking-tight">Likely Culprit Attribution</h2>
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-[#123A3A] border border-[#14B8A6]/40 text-[#67E8F9] rounded">
            {data.confidence || '98.4%'} Attribution Confidence
          </span>
        </div>
        <p className="text-xs text-[#A4B3C2]">
          Components ranked by how well their version changes align with the observed regression.
        </p>
      </div>

      {/* Grid: Left Reasoning & Suspects, Right Inspection Artifact */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left Side: Facts, Inferences, Ranked Suspects (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Fact 1: Observed Fact */}
          <div className="bg-[#141F2B] border border-[#263746] rounded-lg p-2.5 flex items-start gap-2.5 text-xs text-[#A4B3C2]">
            <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#34D399] font-mono text-[11px] mr-1.5">[Observed Fact]</span>
              <span>{data.observedFact}</span>
            </div>
          </div>

          {/* Fact 2: Inferred Relationship */}
          <div className="bg-[#141F2B] border border-[#263746] rounded-lg p-2.5 flex items-start gap-2.5 text-xs text-[#A4B3C2]">
            <Zap className="w-4 h-4 text-[#FBBF24] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#FBBF24] font-mono text-[11px] mr-1.5">[Inferred Relationship]</span>
              <span>{data.inferredRelationship}</span>
            </div>
          </div>

          {/* Fact 3: Correlation */}
          <div className="bg-[#141F2B] border border-[#263746] rounded-lg p-2.5 flex items-start gap-2.5 text-xs text-[#A4B3C2]">
            <RotateCcw className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#14B8A6] font-mono text-[11px] mr-1.5">[Correlation]</span>
              <span>{data.correlation}</span>
            </div>
          </div>

          {/* Ranked Component Suspects */}
          <div className="pt-1">
            <p className="text-[10px] font-mono uppercase font-bold text-[#718396] tracking-wider mb-2">
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
                        ? 'bg-[#123A3A] border-[#14B8A6]/50'
                        : isCofactor
                        ? 'bg-[#141F2B] border-[#263746]'
                        : 'bg-[#141F2B] border-[#1D2A36] opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono text-[11px] truncate pr-2">
                      <span className="text-[#718396]">{s.rank}.</span>
                      <span className="text-[#E6EDF3] font-medium">{s.component}</span>
                      <span className="text-[#526170]">•</span>
                      <span className="text-[#A4B3C2] font-sans text-xs">{s.detail}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono font-semibold text-[#E6EDF3]">
                        {s.matchScore} match
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
                        isPrimary
                          ? 'bg-[#14B8A6] border-[#42D6C5] text-[#0B1117]'
                          : isCofactor
                          ? 'bg-[#101923] border-[#FBBF24]/50 text-[#FBBF24]'
                          : 'bg-[#101923] border-[#263746] text-[#718396]'
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
        <div className="lg:col-span-5 bg-[#141F2B] border border-[#263746] rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1D2A36] pb-2 mb-3 text-xs">
              <span className="font-mono text-[#67E8F9] font-semibold text-[11px]">
                [{artifact.artifactId || 'EVID-4102-09'}] Inspection Artifact
              </span>
              <span className="font-mono text-[#718396] text-[10px]">
                Event ID: {artifact.eventId || 'evt_val_8821'}
              </span>
            </div>

            {/* Code / JSON Box */}
            <pre className="p-3 bg-[#101923] border border-[#1D2A36] rounded-md font-mono text-[11px] text-[#A4B3C2] overflow-x-auto leading-relaxed">
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
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1D2A36] mt-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141F2B] hover:bg-[#192734] border border-[#263746] text-[#A4B3C2] hover:text-[#E6EDF3] rounded text-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Raw JSON'}</span>
            </button>
            <button
              onClick={onInspectTrace}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14B8A6] hover:bg-[#0D9488] text-[#0B1117] rounded text-xs font-semibold shadow-sm transition-colors"
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
