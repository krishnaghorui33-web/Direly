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
        <h2 className="text-xl font-bold text-[#E6EDF3]">Backend & Database Architecture</h2>
        <p className="text-xs text-[#A4B3C2] mt-1">
          Review 2 technical verification area: FastAPI REST API integration and MongoDB Atlas data layer.
        </p>
      </div>

      {/* Connection Controller Card */}
      <div className="bg-[#141F2B] border border-[#263746] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${
              isLiveApi 
                ? 'bg-[#123A3A] border-[#14B8A6]/50 text-[#34D399]' 
                : 'bg-[#123A3A] border-[#14B8A6]/50 text-[#14B8A6]'
            }`}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#E6EDF3]">FastAPI Base URL:</h3>
                <code className="text-xs font-mono text-[#67E8F9] px-2 py-0.5 bg-[#101923] rounded border border-[#263746]">
                  http://localhost:8000
                </code>
              </div>
              <p className="text-xs text-[#A4B3C2] mt-0.5">
                Current active mode: <strong className="text-[#E6EDF3]">{isLiveApi ? 'Live Backend API' : 'Sandbox Demonstration Mode'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3.5 py-2 bg-[#141F2B] hover:bg-[#192734] border border-[#263746] text-[#E6EDF3] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-[#14B8A6]' : ''}`} />
              <span>Ping Backend</span>
            </button>

            <button
              onClick={onToggleApiMode}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                isLiveApi
                  ? 'bg-[#34D399] border-[#34D399] text-[#0B1117]'
                  : 'bg-[#14B8A6] hover:bg-[#0D9488] border-[#42D6C5]/40 text-[#0B1117]'
              }`}
            >
              {isLiveApi ? 'Switch to Sandbox' : 'Connect Live FastAPI'}
            </button>
          </div>
        </div>

        {pingResult && (
          <div className="p-3 bg-[#101923] rounded-lg border border-[#263746] text-xs font-mono text-[#67E8F9]">
            {pingResult}
          </div>
        )}
      </div>

      {/* MongoDB Data Model */}
      <div className="bg-[#141F2B] border border-[#263746] rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#14B8A6]" />
          <h3 className="text-sm font-bold text-[#E6EDF3]">MongoDB Atlas Architecture (Database: <code className="text-[#34D399] font-mono">direly</code>)</h3>
        </div>
        <p className="text-xs text-[#A4B3C2]">
          The backend runs deterministic aggregation pipelines and strict <code className="text-[#67E8F9] font-mono">$jsonSchema</code> validators across 5 primary collections:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {collections.map((c) => (
            <div key={c.name} className="p-3 bg-[#101923] rounded-lg border border-[#1D2A36] space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-[#67E8F9]">{c.name}</span>
                <span className="text-[11px] text-[#718396]">{c.count}</span>
              </div>
              <p className="text-[11px] text-[#A4B3C2]">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* API Endpoints Contract */}
      <div className="bg-[#141F2B] border border-[#263746] rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#14B8A6]" />
          <h3 className="text-sm font-bold text-[#E6EDF3]">Agreed Team REST Endpoints</h3>
        </div>
        <div className="space-y-2">
          {endpoints.map((ep) => (
            <div key={ep.path} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-[#101923] border border-[#1D2A36] text-xs gap-2">
              <div className="flex items-center gap-2 font-mono">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  ep.method === 'POST' ? 'bg-[#123A3A] text-[#14B8A6] border border-[#14B8A6]/40' : 'bg-[#101923] text-[#67E8F9] border border-[#263746]'
                }`}>
                  {ep.method}
                </span>
                <span className="text-[#E6EDF3] font-semibold">{ep.path}</span>
              </div>
              <span className="text-[11px] text-[#A4B3C2]">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
