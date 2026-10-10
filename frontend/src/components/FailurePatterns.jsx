import React, { useState } from 'react';
import { 
  ChevronDown, 
  CircleDot, 
  Circle,
  Search,
  Filter
} from 'lucide-react';

export default function FailurePatterns({ 
  patterns = [], 
  selectedPatternId, 
  onSelectPattern,
  selectedCaseId,
  onSelectCase
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const activePattern = patterns.find(p => p.id === selectedPatternId) || patterns[0];

  const filteredPatterns = patterns.filter(p => {
    const matchesSearch = 
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.targetTool.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.errorCategory.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === 'REGRESSION_ONLY') {
      return matchesSearch && p.isNewRegression;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-white tracking-tight">Failure Patterns</h2>
            <span className="px-2.5 py-1 text-xs font-mono font-bold bg-[#1a2336] border border-[#263552] text-slate-300 rounded-lg">
              {patterns.length} Fingerprints
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Group recurring errors to identify the dominant regression signature across the candidate test matrix.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search fingerprints, tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3.5 py-1.5 bg-[#101923] border border-[#222e44] rounded-lg text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none w-56 sm:w-64 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131a29] border border-[#222e44] rounded-lg text-xs sm:text-sm text-slate-300 cursor-pointer hover:border-purple-500/50 transition-colors">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-slate-200 text-xs sm:text-sm outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#131a29]">All Categories</option>
              <option value="REGRESSION_ONLY" className="bg-[#131a29]">Regressions Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Failure Patterns Table */}
      <div className="border border-[#1e283d] rounded-xl bg-[#0e1422] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1e283d] bg-[#121929]/70 text-xs uppercase font-mono tracking-wider text-slate-400">
                <th className="py-3.5 px-4 font-semibold">Fingerprint ID</th>
                <th className="py-3.5 px-4 font-semibold">Error Category</th>
                <th className="py-3.5 px-4 font-semibold">Description / Root Cause</th>
                <th className="py-3.5 px-4 font-semibold">Affected Cases</th>
                <th className="py-3.5 px-4 font-semibold">Target Tool</th>
                <th className="py-3.5 px-4 font-semibold">First Seen</th>
                <th className="py-3.5 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182236]">
              {filteredPatterns.map((item) => {
                const isSelected = item.id === (activePattern?.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectPattern(item.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-purple-950/25 border-l-4 border-purple-500' 
                        : 'hover:bg-[#131b2e]'
                    }`}
                  >
                    {/* Fingerprint ID with Radio indicator */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2.5 font-mono text-sm text-slate-200">
                        {isSelected ? (
                          <CircleDot className="w-4 h-4 text-purple-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span className={isSelected ? 'text-purple-300 font-bold' : 'font-medium'}>
                          {item.id}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4 font-mono">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        item.isNewRegression 
                          ? 'bg-rose-950/40 border-rose-600/40 text-rose-300'
                          : 'bg-slate-900/60 border-slate-700/50 text-slate-400'
                      }`}>
                        {item.errorCategory}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-4 px-4 text-slate-300 max-w-sm leading-relaxed">
                      {item.description}
                    </td>

                    {/* Affected Cases */}
                    <td className="py-4 px-4 font-mono text-slate-300">
                      <span className={item.isNewRegression ? 'text-amber-400 font-bold' : 'font-semibold'}>
                        {item.affectedCount} cases
                      </span>
                      {item.affectedPct && (
                        <span className="text-slate-500 text-xs ml-1.5">
                          ({item.affectedPct})
                        </span>
                      )}
                    </td>

                    {/* Target Tool */}
                    <td className="py-4 px-4 font-mono text-slate-300">
                      <span className="px-2 py-0.5 bg-[#141d2f] border border-[#22304d] rounded text-xs text-slate-300 font-medium">
                        {item.targetTool}
                      </span>
                    </td>

                    {/* First Seen */}
                    <td className="py-4 px-4 font-mono text-xs text-slate-400">
                      {item.firstSeen}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-right">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wider uppercase border ${
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
          <div className="p-4 bg-[#111726] border-t border-[#1e283d] flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-purple-300 shrink-0">
                ACTIVE SELECTION: {activePattern.id?.toUpperCase()} • Affected Test Cases ({activePattern.affectedCases?.length || activePattern.affectedCount}):
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {activePattern.affectedCases?.slice(0, 5).map((caseName) => (
                  <button
                    key={caseName}
                    onClick={() => onSelectCase(caseName)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs border transition-colors ${
                      selectedCaseId === caseName
                        ? 'bg-purple-900/60 border-purple-500 text-purple-200 font-bold'
                        : 'bg-[#182236] border-[#293859] text-slate-300 hover:bg-[#202c44]'
                    }`}
                  >
                    {caseName}
                  </button>
                ))}
                {(activePattern.affectedCases?.length || 0) > 5 && (
                  <span className="text-xs text-slate-500 font-mono font-medium">
                    +{activePattern.affectedCases.length - 5} more
                  </span>
                )}
              </div>
            </div>

            {/* Error Preview Box */}
            <div className="px-3 py-1.5 bg-[#1a1215] border border-rose-800/40 rounded-lg text-xs font-mono text-rose-300 truncate max-w-lg">
              {activePattern.previewSnippet}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
