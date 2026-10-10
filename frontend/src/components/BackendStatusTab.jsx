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
        <h2 className="text-2xl font-extrabold text-white">Backend & Database Architecture</h2>
        <p className="text-sm text-slate-400 mt-1">
          Review 2 technical verification area: FastAPI REST API integration and MongoDB Atlas data layer.
        </p>
      </div>

      {/* Connection Controller Card */}
      <div className="bg-[#0f1422] border border-[#1e2638] rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border ${
              isLiveApi 
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400' 
                : 'bg-purple-950/60 border-purple-500/50 text-purple-400'
            }`}>
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm sm:text-base font-bold text-white">FastAPI Base URL:</h3>
                <code className="text-xs sm:text-sm font-mono text-purple-300 px-2.5 py-1 bg-black/40 rounded-lg border border-[#222e44]">
                  http://localhost:8000
                </code>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Current active mode: <strong className="text-white font-bold">{isLiveApi ? 'Live Backend API' : 'Sandbox Demonstration Mode'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2.5 bg-[#172033] hover:bg-[#202c44] border border-[#263554] text-slate-200 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin text-purple-400' : ''}`} />
              <span>Ping Backend</span>
            </button>

            <button
              onClick={onToggleApiMode}
              className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold border transition-all ${
                isLiveApi
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 border-purple-500 text-white'
              }`}
            >
              {isLiveApi ? 'Switch to Sandbox' : 'Connect Live FastAPI'}
            </button>
          </div>
        </div>

        {pingResult && (
          <div className="p-3.5 bg-[#0a0d14] rounded-lg border border-[#1e2638] text-xs sm:text-sm font-mono text-slate-300">
            {pingResult}
          </div>
        )}
      </div>

      {/* MongoDB Data Model */}
      <div className="bg-[#0f1422] border border-[#1e2638] rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Database className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base sm:text-lg font-bold text-white">
            MongoDB Atlas Architecture (Database: <code className="text-emerald-400 font-mono">direly</code>)
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-400">
          The backend runs deterministic aggregation pipelines and strict <code className="text-slate-300 font-mono">$jsonSchema</code> validators across 5 primary collections:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {collections.map((c) => (
            <div key={c.name} className="p-4 bg-[#0a0d14] rounded-xl border border-[#1a2336] space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="font-bold text-purple-300">{c.name}</span>
                <span className="text-xs text-slate-500">{c.count}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* API Endpoints Contract */}
      <div className="bg-[#0f1422] border border-[#1e2638] rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-purple-400" />
          <h3 className="text-base sm:text-lg font-bold text-white">Agreed Team REST Endpoints</h3>
        </div>
        <div className="space-y-2.5">
          {endpoints.map((ep) => (
            <div key={ep.path} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-[#0a0d14] border border-[#1a2336] text-sm gap-2">
              <div className="flex items-center gap-2.5 font-mono">
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                  ep.method === 'POST' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {ep.method}
                </span>
                <span className="text-slate-200 font-bold">{ep.path}</span>
              </div>
              <span className="text-xs sm:text-sm text-slate-400">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
