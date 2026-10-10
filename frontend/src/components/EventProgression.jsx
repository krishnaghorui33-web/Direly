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
          <h2 className="text-xl font-extrabold text-txt-primary tracking-tight">Execution Event Progression</h2>
          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-bg-input border border-border text-accent-cyan rounded-lg">
            {caseId}
          </span>
        </div>
        <p className="text-sm text-txt-secondary">
          Chronological event trace from prompt ingestion to tool dispatch failure.
        </p>
      </div>

      {/* Event Trace Timeline Container */}
      <div className="border border-border rounded-xl bg-bg-card p-5 shadow-sm transition-colors">
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
                    ? 'bg-bg-card border-status-error/50 shadow-sm'
                    : isAssertion
                    ? 'bg-bg-input border-border'
                    : isWarning
                    ? 'bg-bg-card border-status-warning/40'
                    : 'bg-bg-input border-border/80'
                }`}
              >
                {/* Left: Timestamp + Tag + Description */}
                <div className="flex items-start sm:items-center gap-3.5">
                  {/* Timestamp */}
                  <span className="font-mono text-xs text-txt-muted shrink-0 font-medium">
                    {evt.timestamp}
                  </span>

                  {/* Event Type Pill */}
                  <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold tracking-wider shrink-0 uppercase border ${
                    isFailurePoint
                      ? 'bg-bg-card border-status-error/60 text-status-error'
                      : isAssertion
                      ? 'bg-bg-card border-border text-accent-cyan'
                      : 'bg-bg-card border-border text-txt-secondary'
                  }`}>
                    {evt.type}
                  </span>

                  {/* Description */}
                  <span className={`text-sm ${
                    isFailurePoint 
                      ? 'font-bold text-status-error' 
                      : isAssertion 
                      ? 'text-accent-cyan font-semibold'
                      : 'text-txt-primary'
                  }`}>
                    {evt.description}
                  </span>
                </div>

                {/* Right: Meta Tag */}
                <div className="shrink-0 flex items-center justify-end">
                  <span className={`text-xs font-mono px-2.5 py-1 rounded-md font-medium ${
                    isFailurePoint
                      ? 'bg-bg-input border border-status-error/50 text-status-error font-bold'
                      : isAssertion
                      ? 'text-status-error font-semibold'
                      : 'text-txt-muted'
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
