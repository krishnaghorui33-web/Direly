import React, { useState } from 'react';
import { Database, Server, RefreshCw, Layers } from 'lucide-react';
import { checkBackendStatus } from '../services/api';

export default function BackendStatusTab({ isLiveApi, onToggleApiMode }) {
  const [testing, setTesting] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setPingResult(null);
    const ok = await checkBackendStatus();
    setTesting(false);
    setPingResult(ok ? 'Connected successfully to FastAPI backend at http://localhost:8000' : 'Backend offline or not reachable on port 8000 (currently running in Sandbox Demo mode)');
  };

  const collections = [
    { name: 'projects', desc: 'Stores project metadata, settings, and tool dependency maps', count: '1 record (orderbot)' },
    { name: 'versions', desc: 'Stores version manifests, prompts, and tool parameter schemas', count: '3 records (v1.4, v1.5, v1.5.1)' },
    { name: 'runs', desc: 'Stores individual test-case execution outcomes and latency', count: '200 runs evaluated' },
    { name: 'events', desc: 'Chronological execution traces, tool calls, and error events', count: '1,240 stored events' },
    { name: 'findings', desc: 'Deduplicated diagnosis records and likely culprit rankings', count: '1 open finding' }
  ];

  const endpoints = [
    { method: 'POST', path: '/api/runs', desc: 'Receives test evaluation outcomes and events from evaluation runner' },
    { method: 'GET', path: '/api/compare', desc: 'Calculates version-to-version pass rates and component diffs' },
    { method: 'GET', path: '/api/findings', desc: 'Returns diagnosis findings, error fingerprints, and culprit ranking' },
    { method: 'POST', path: '/api/replay', desc: 'Triggers test replay against the corrected version to verify fixes' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-txt-primary">Backend & Database Architecture</h2>
        <p className="text-sm text-txt-secondary mt-1">
          Review 2 technical verification area: FastAPI REST API integration and MongoDB Atlas data layer.
        </p>
      </div>

      {/* Connection Controller Card */}
      <div className="bg-bg-card border border-border rounded-xl p-5 sm:p-6 space-y-4 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border ${
              isLiveApi 
                ? 'bg-accent-teal-soft border-accent-teal/50 text-status-success' 
                : 'bg-accent-teal-soft border-accent-teal/50 text-accent-teal'
            }`}>
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm sm:text-base font-bold text-txt-primary">FastAPI Base URL:</h3>
                <code className="text-xs sm:text-sm font-mono text-accent-cyan px-2.5 py-1 bg-bg-input rounded-lg border border-border">
                  http://localhost:8000
                </code>
              </div>
              <p className="text-xs sm:text-sm text-txt-secondary mt-1">
                Current active mode: <strong className="text-txt-primary font-bold">{isLiveApi ? 'Live Backend API' : 'Sandbox Demonstration Mode'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2.5 bg-bg-card hover:bg-bg-hover border border-border text-txt-primary rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin text-accent-teal' : ''}`} />
              <span>Ping Backend</span>
            </button>

            <button
              onClick={onToggleApiMode}
              className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold border transition-all ${
                isLiveApi
                  ? 'bg-status-success border-status-success text-white dark:text-[#0B1117]'
                  : 'bg-accent-teal hover:bg-accent-teal-hover border-border-focus text-white dark:text-[#0B1117]'
              }`}
            >
              {isLiveApi ? 'Switch to Sandbox' : 'Connect Live FastAPI'}
            </button>
          </div>
        </div>

        {pingResult && (
          <div className="p-3.5 bg-bg-input rounded-lg border border-border text-xs sm:text-sm font-mono text-accent-cyan">
            {pingResult}
          </div>
        )}
      </div>

      {/* MongoDB Data Model */}
      <div className="bg-bg-card border border-border rounded-xl p-5 sm:p-6 space-y-4 shadow-sm transition-colors">
        <div className="flex items-center gap-2.5">
          <Database className="w-5 h-5 text-accent-teal" />
          <h3 className="text-base sm:text-lg font-bold text-txt-primary">
            MongoDB Atlas Architecture (Database: <code className="text-status-success font-mono">direly</code>)
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-txt-secondary">
          The backend runs deterministic aggregation pipelines and strict <code className="text-accent-cyan font-mono">$jsonSchema</code> validators across 5 primary collections:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {collections.map((c) => (
            <div key={c.name} className="p-4 bg-bg-input rounded-xl border border-border space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="font-bold text-accent-cyan">{c.name}</span>
                <span className="text-xs text-txt-muted">{c.count}</span>
              </div>
              <p className="text-xs sm:text-sm text-txt-secondary leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* API Endpoints Contract */}
      <div className="bg-bg-card border border-border rounded-xl p-5 sm:p-6 space-y-4 shadow-sm transition-colors">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-accent-teal" />
          <h3 className="text-base sm:text-lg font-bold text-txt-primary">Agreed Team REST Endpoints</h3>
        </div>
        <div className="space-y-2.5">
          {endpoints.map((ep) => (
            <div key={ep.path} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-bg-input border border-border text-sm gap-2">
              <div className="flex items-center gap-2.5 font-mono">
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                  ep.method === 'POST' ? 'bg-accent-teal-soft text-accent-teal border border-accent-teal/40' : 'bg-bg-card text-accent-cyan border border-border'
                }`}>
                  {ep.method}
                </span>
                <span className="text-txt-primary font-bold">{ep.path}</span>
              </div>
              <span className="text-xs sm:text-sm text-txt-secondary">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
