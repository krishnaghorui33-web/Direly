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
            <h2 className="text-xl font-extrabold text-txt-primary tracking-tight">Failure Patterns</h2>
            <span className="px-2.5 py-1 text-xs font-mono font-bold bg-bg-card border border-border text-accent-cyan rounded-lg">
              {patterns.length} Fingerprints
            </span>
          </div>
          <p className="text-sm text-txt-secondary mt-1">
            Group recurring errors to identify the dominant regression signature across the candidate test matrix.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-txt-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search fingerprints, tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3.5 py-1.5 bg-bg-input border border-border rounded-lg text-xs sm:text-sm text-txt-primary placeholder:text-txt-muted focus:border-accent-teal focus:outline-none w-56 sm:w-64 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-card border border-border rounded-lg text-xs sm:text-sm text-txt-secondary cursor-pointer hover:border-accent-teal/50 transition-colors">
            <Filter className="w-3.5 h-3.5 text-txt-muted" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-txt-primary text-xs sm:text-sm outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="REGRESSION_ONLY">Regressions Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Failure Patterns Table */}
      <div className="border border-border rounded-xl bg-bg-card overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-nav text-xs uppercase font-mono tracking-wider text-txt-muted">
                <th className="py-3.5 px-4 font-semibold">Fingerprint ID</th>
                <th className="py-3.5 px-4 font-semibold">Error Category</th>
                <th className="py-3.5 px-4 font-semibold">Description / Root Cause</th>
                <th className="py-3.5 px-4 font-semibold">Affected Cases</th>
                <th className="py-3.5 px-4 font-semibold">Target Tool</th>
                <th className="py-3.5 px-4 font-semibold">First Seen</th>
                <th className="py-3.5 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPatterns.map((item) => {
                const isSelected = item.id === (activePattern?.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectPattern(item.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-accent-teal-soft border-l-4 border-accent-teal' 
                        : 'hover:bg-bg-hover'
                    }`}
                  >
                    {/* Fingerprint ID with Radio indicator */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2.5 font-mono text-sm text-txt-primary">
                        {isSelected ? (
                          <CircleDot className="w-4 h-4 text-accent-teal shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-txt-disabled shrink-0" />
                        )}
                        <span className={isSelected ? 'text-accent-cyan font-bold' : 'font-medium'}>
                          {item.id}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4 font-mono">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        item.isNewRegression 
                          ? 'bg-bg-card border-status-error/40 text-status-error'
                          : 'bg-bg-input border-border text-txt-muted'
                      }`}>
                        {item.errorCategory}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-4 px-4 text-txt-secondary max-w-sm leading-relaxed">
                      {item.description}
                    </td>

                    {/* Affected Cases */}
                    <td className="py-4 px-4 font-mono text-txt-primary">
                      <span className={item.isNewRegression ? 'text-status-warning font-bold' : 'font-semibold'}>
                        {item.affectedCount} cases
                      </span>
                      {item.affectedPct && (
                        <span className="text-txt-muted text-xs ml-1.5">
                          ({item.affectedPct})
                        </span>
                      )}
                    </td>

                    {/* Target Tool */}
                    <td className="py-4 px-4 font-mono text-txt-secondary">
                      <span className="px-2 py-0.5 bg-bg-input border border-border rounded text-xs text-txt-primary font-medium">
                        {item.targetTool}
                      </span>
                    </td>

                    {/* First Seen */}
                    <td className="py-4 px-4 font-mono text-xs text-txt-muted">
                      {item.firstSeen}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-right">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wider uppercase border ${
                        item.status === 'NEW REGRESSION'
                          ? 'bg-bg-card border-status-error/50 text-status-error'
                          : 'bg-bg-input border-border text-txt-muted'
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
          <div className="p-4 bg-bg-input border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-accent-cyan shrink-0">
                ACTIVE SELECTION: {activePattern.id?.toUpperCase()} • Affected Test Cases ({activePattern.affectedCases?.length || activePattern.affectedCount}):
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {activePattern.affectedCases?.slice(0, 5).map((caseName) => (
                  <button
                    key={caseName}
                    onClick={() => onSelectCase(caseName)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs border transition-colors ${
                      selectedCaseId === caseName
                        ? 'bg-accent-teal border-border-focus text-white dark:text-[#0B1117] font-bold'
                        : 'bg-bg-card border-border text-txt-secondary hover:bg-bg-hover'
                    }`}
                  >
                    {caseName}
                  </button>
                ))}
                {(activePattern.affectedCases?.length || 0) > 5 && (
                  <span className="text-xs text-txt-muted font-mono font-medium">
                    +{activePattern.affectedCases.length - 5} more
                  </span>
                )}
              </div>
            </div>

            {/* Error Preview Box */}
            <div className="px-3 py-1.5 bg-bg-card border border-status-error/40 rounded-lg text-xs font-mono text-status-error truncate max-w-lg">
              {activePattern.previewSnippet}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
