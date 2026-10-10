import React from 'react';
import { 
  ChevronDown, 
  CircleDot, 
  Circle 
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
          <h2 className="text-base font-bold text-[#E6EDF3] tracking-tight">Failure Patterns</h2>
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-[#101923] border border-[#263746] text-[#67E8F9] rounded">
            {patterns.length} Fingerprints
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#718396]">
          <span>Sort by:</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#101923] border border-[#263746] rounded text-[#A4B3C2] cursor-pointer hover:border-[#14B8A6]/40 transition-colors">
            <span>Regression Severity</span>
            <ChevronDown className="w-3 h-3 text-[#718396]" />
          </div>
        </div>
      </div>
      <p className="text-xs text-[#A4B3C2] -mt-1">
        Group recurring errors to identify the dominant regression signature across the candidate test matrix.
      </p>

      {/* Failure Patterns Table */}
      <div className="border border-[#263746] rounded-lg bg-[#141F2B] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#263746] bg-[#0F1720] text-[10px] uppercase font-mono tracking-wider text-[#718396]">
                <th className="py-2.5 px-3 font-semibold">Fingerprint ID</th>
                <th className="py-2.5 px-3 font-semibold">Error Category</th>
                <th className="py-2.5 px-3 font-semibold">Description / Root Cause</th>
                <th className="py-2.5 px-3 font-semibold">Affected Cases</th>
                <th className="py-2.5 px-3 font-semibold">Target Tool</th>
                <th className="py-2.5 px-3 font-semibold">First Seen</th>
                <th className="py-2.5 px-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D2A36]">
              {patterns.map((item) => {
                const isSelected = item.id === (activePattern?.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectPattern(item.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-[#123A3A] border-l-2 border-[#14B8A6]' 
                        : 'hover:bg-[#192734]'
                    }`}
                  >
                    {/* Fingerprint ID with Radio indicator */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 font-mono text-[11px] text-[#E6EDF3]">
                        {isSelected ? (
                          <CircleDot className="w-3.5 h-3.5 text-[#14B8A6] shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-[#526170] shrink-0" />
                        )}
                        <span className={isSelected ? 'text-[#67E8F9] font-semibold' : ''}>
                          {item.id}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        item.isNewRegression 
                          ? 'bg-[#141F2B] border-[#FB7185]/40 text-[#FB7185]'
                          : 'bg-[#101923] border-[#263746] text-[#718396]'
                      }`}>
                        {item.errorCategory}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-3 text-[#A4B3C2] max-w-xs truncate">
                      {item.description}
                    </td>

                    {/* Affected Cases */}
                    <td className="py-3 px-3 font-mono text-[#E6EDF3]">
                      <span className={item.isNewRegression ? 'text-[#FBBF24] font-semibold' : ''}>
                        {item.affectedCount} cases
                      </span>
                      {item.affectedPct && (
                        <span className="text-[#718396] text-[10px] ml-1">
                          ({item.affectedPct})
                        </span>
                      )}
                    </td>

                    {/* Target Tool */}
                    <td className="py-3 px-3 font-mono text-[#A4B3C2]">
                      <span className="px-1.5 py-0.5 bg-[#101923] border border-[#263746] rounded text-[11px] text-[#A4B3C2]">
                        {item.targetTool}
                      </span>
                    </td>

                    {/* First Seen */}
                    <td className="py-3 px-3 font-mono text-[#718396]">
                      {item.firstSeen}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
                        item.status === 'NEW REGRESSION'
                          ? 'bg-[#141F2B] border-[#FB7185]/50 text-[#FB7185]'
                          : 'bg-[#101923] border-[#263746] text-[#718396]'
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
          <div className="p-3 bg-[#101923] border-t border-[#263746] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-[#67E8F9] shrink-0">
                ACTIVE SELECTION: {activePattern.id?.toUpperCase()} • Affected Test Cases ({activePattern.affectedCases?.length || activePattern.affectedCount}):
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {activePattern.affectedCases?.slice(0, 5).map((caseName) => (
                  <button
                    key={caseName}
                    onClick={() => onSelectCase(caseName)}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] border transition-colors ${
                      selectedCaseId === caseName
                        ? 'bg-[#14B8A6] border-[#42D6C5] text-[#0B1117] font-semibold'
                        : 'bg-[#141F2B] border-[#263746] text-[#A4B3C2] hover:bg-[#192734]'
                    }`}
                  >
                    {caseName}
                  </button>
                ))}
                {(activePattern.affectedCases?.length || 0) > 5 && (
                  <span className="text-[11px] text-[#718396] font-mono">
                    +{activePattern.affectedCases.length - 5} more
                  </span>
                )}
              </div>
            </div>

            {/* Error Preview Box */}
            <div className="px-2.5 py-1 bg-[#141F2B] border border-[#FB7185]/40 rounded text-[11px] font-mono text-[#FB7185] truncate max-w-md">
              {activePattern.previewSnippet}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
