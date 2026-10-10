import React from 'react';
import { 
  ChevronDown, 
  CheckCircle2, 
  CircleDot, 
  Circle, 
  Terminal, 
  AlertCircle 
} from 'lucide-react';

export default function FailurePatterns({ 
  patterns = [], 
  selectedPatternId, 
  onSelectPattern,
  selectedCaseId,
  onSelectCase
}) {
  const activePattern = patterns.find(p => p.id === selectedPatternId) || patterns[0];

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold text-white tracking-tight">Failure Patterns</h2>
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-[#1a2336] border border-[#263552] text-slate-300 rounded">
            {patterns.length} Fingerprints
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Sort by:</span>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#131a29] border border-[#222e44] rounded text-slate-300 cursor-pointer">
            <span>Regression Severity</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400 -mt-1">
        Group recurring errors to identify the dominant regression signature across the candidate test matrix.
      </p>

      {/* Failure Patterns Table */}
      <div className="border border-[#1e283d] rounded-lg bg-[#0e1422] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e283d] bg-[#121929]/70 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                <th className="py-2.5 px-3 font-semibold">Fingerprint ID</th>
                <th className="py-2.5 px-3 font-semibold">Error Category</th>
                <th className="py-2.5 px-3 font-semibold">Description / Root Cause</th>
                <th className="py-2.5 px-3 font-semibold">Affected Cases</th>
                <th className="py-2.5 px-3 font-semibold">Target Tool</th>
                <th className="py-2.5 px-3 font-semibold">First Seen</th>
                <th className="py-2.5 px-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182236]">
              {patterns.map((item) => {
                const isSelected = item.id === (activePattern?.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectPattern(item.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-purple-950/25 border-l-2 border-purple-500' 
                        : 'hover:bg-[#131b2e]'
                    }`}
                  >
                    {/* Fingerprint ID with Radio indicator */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-200">
                        {isSelected ? (
                          <CircleDot className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        )}
                        <span className={isSelected ? 'text-purple-300 font-semibold' : ''}>
                          {item.id}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        item.isNewRegression 
                          ? 'bg-rose-950/40 border-rose-600/40 text-rose-300'
                          : 'bg-slate-900/60 border-slate-700/50 text-slate-400'
                      }`}>
                        {item.errorCategory}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                      {item.description}
                    </td>

                    {/* Affected Cases */}
                    <td className="py-3 px-3 font-mono text-slate-300">
                      <span className={item.isNewRegression ? 'text-amber-400 font-semibold' : ''}>
                        {item.affectedCount} cases
                      </span>
                      {item.affectedPct && (
                        <span className="text-slate-500 text-[10px] ml-1">
                          ({item.affectedPct})
                        </span>
                      )}
                    </td>

                    {/* Target Tool */}
                    <td className="py-3 px-3 font-mono text-slate-300">
                      <span className="px-1.5 py-0.5 bg-[#141d2f] border border-[#22304d] rounded text-[11px] text-slate-300">
                        {item.targetTool}
                      </span>
                    </td>

                    {/* First Seen */}
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {item.firstSeen}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
                        item.status === 'NEW REGRESSION'
                          ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Active Selection Banner */}
        {activePattern && (
          <div className="p-3 bg-[#111726] border-t border-[#1e283d] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-purple-300 shrink-0">
                ACTIVE SELECTION: {activePattern.id?.toUpperCase()} • Affected Test Cases ({activePattern.affectedCases?.length || activePattern.affectedCount}):
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {activePattern.affectedCases?.slice(0, 5).map((caseName) => (
                  <button
                    key={caseName}
                    onClick={() => onSelectCase(caseName)}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] border transition-colors ${
                      selectedCaseId === caseName
                        ? 'bg-purple-900/60 border-purple-500 text-purple-200 font-semibold'
                        : 'bg-[#182236] border-[#293859] text-slate-300 hover:bg-[#202c44]'
                    }`}
                  >
                    {caseName}
                  </button>
                ))}
                {(activePattern.affectedCases?.length || 0) > 5 && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    +{activePattern.affectedCases.length - 5} more
                  </span>
                )}
              </div>
            </div>

            {/* Error Preview Box */}
            <div className="px-2.5 py-1 bg-[#1a1215] border border-rose-800/40 rounded text-[11px] font-mono text-rose-300 truncate max-w-md">
              {activePattern.previewSnippet}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
