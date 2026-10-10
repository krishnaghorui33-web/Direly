import React from 'react';

export default function EventProgression({ eventProgression, selectedCaseId }) {
  const data = eventProgression || {};
  const caseId = selectedCaseId || data.caseId || 'case_ord_8821';
  const events = data.events || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-extrabold text-white tracking-tight">Execution Event Progression</h2>
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-[#1a2336] border border-[#263552] text-purple-300 rounded-lg">
            {caseId}
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Chronological event trace from prompt ingestion to tool dispatch failure.
        </p>
      </div>

      {/* Event Trace Timeline Container */}
      <div className="border border-[#1e283d] rounded-xl bg-[#0e1422] p-5 shadow-sm">
        <div className="space-y-3">
          {events.map((evt, idx) => {
            const isFailurePoint = evt.status === 'failure' && evt.type.includes('FAILURE POINT');
            const isAssertion = evt.type === 'EVALUATION_ASSERTION';
            const isWarning = evt.status === 'warning';

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm transition-colors ${
                  isFailurePoint
                    ? 'bg-rose-950/30 border-rose-600/50 shadow-sm shadow-rose-950/40'
                    : isAssertion
                    ? 'bg-[#15121c] border-purple-900/40'
                    : isWarning
                    ? 'bg-[#181615] border-amber-900/30'
                    : 'bg-[#111726]/60 border-[#1a253a]'
                }`}
              >
                {/* Left: Timestamp + Tag + Description */}
                <div className="flex items-start sm:items-center gap-3.5">
                  {/* Timestamp */}
                  <span className="font-mono text-xs text-slate-400 shrink-0 font-medium">
                    {evt.timestamp}
                  </span>

                  {/* Event Type Pill */}
                  <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold tracking-wider shrink-0 uppercase border ${
                    isFailurePoint
                      ? 'bg-rose-900/60 border-rose-500 text-rose-200'
                      : isAssertion
                      ? 'bg-purple-950 border-purple-700 text-purple-300'
                      : 'bg-[#162033] border-[#253554] text-slate-300'
                  }`}>
                    {evt.type}
                  </span>

                  {/* Description */}
                  <span className={`text-sm ${
                    isFailurePoint 
                      ? 'font-bold text-rose-200' 
                      : isAssertion 
                      ? 'text-purple-200 font-semibold'
                      : 'text-slate-300'
                  }`}>
                    {evt.description}
                  </span>
                </div>

                {/* Right: Meta Tag */}
                <div className="shrink-0 flex items-center justify-end">
                  <span className={`text-xs font-mono px-2.5 py-1 rounded-md font-medium ${
                    isFailurePoint
                      ? 'bg-rose-950 border border-rose-700/60 text-rose-300 font-bold'
                      : isAssertion
                      ? 'text-rose-400 font-semibold'
                      : 'text-slate-400'
                  }`}>
                    {evt.meta}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
