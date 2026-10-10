import React from 'react';

export default function EventProgression({ eventProgression, selectedCaseId }) {
  const data = eventProgression || {};
  const caseId = selectedCaseId || data.caseId || 'case_ord_8821';
  const events = data.events || [];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold text-[#E6EDF3] tracking-tight">Execution Event Progression</h2>
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-[#101923] border border-[#263746] text-[#67E8F9] rounded">
            {caseId}
          </span>
        </div>
        <p className="text-xs text-[#A4B3C2]">
          Chronological event trace from prompt ingestion to tool dispatch failure.
        </p>
      </div>

      {/* Event Trace Timeline Container */}
      <div className="border border-[#263746] rounded-lg bg-[#141F2B] p-4">
        <div className="space-y-2.5">
          {events.map((evt, idx) => {
            const isFailurePoint = evt.status === 'failure' && evt.type.includes('FAILURE POINT');
            const isAssertion = evt.type === 'EVALUATION_ASSERTION';
            const isWarning = evt.status === 'warning';

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors ${
                  isFailurePoint
                    ? 'bg-[#141F2B] border-[#FB7185]/50'
                    : isAssertion
                    ? 'bg-[#101923] border-[#263746]'
                    : isWarning
                    ? 'bg-[#141F2B] border-[#FBBF24]/40'
                    : 'bg-[#101923] border-[#1D2A36]'
                }`}
              >
                {/* Left: Timestamp + Tag + Description */}
                <div className="flex items-start sm:items-center gap-3">
                  {/* Timestamp */}
                  <span className="font-mono text-[11px] text-[#718396] shrink-0">
                    {evt.timestamp}
                  </span>

                  {/* Event Type Pill */}
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider shrink-0 uppercase border ${
                    isFailurePoint
                      ? 'bg-[#141F2B] border-[#FB7185]/60 text-[#FB7185]'
                      : isAssertion
                      ? 'bg-[#141F2B] border-[#263746] text-[#67E8F9]'
                      : 'bg-[#141F2B] border-[#263746] text-[#A4B3C2]'
                  }`}>
                    {evt.type}
                  </span>

                  {/* Description */}
                  <span className={`text-xs ${
                    isFailurePoint 
                      ? 'font-semibold text-[#FB7185]' 
                      : isAssertion 
                      ? 'text-[#67E8F9] font-medium'
                      : 'text-[#E6EDF3]'
                  }`}>
                    {evt.description}
                  </span>
                </div>

                {/* Right: Meta Tag */}
                <div className="shrink-0 flex items-center justify-end">
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                    isFailurePoint
                      ? 'bg-[#101923] border border-[#FB7185]/50 text-[#FB7185] font-bold'
                      : isAssertion
                      ? 'text-[#FB7185] font-semibold'
                      : 'text-[#718396]'
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
