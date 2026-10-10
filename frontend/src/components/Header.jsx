import React from 'react';
import { 
  ChevronDown, 
  RefreshCw, 
  Play, 
  ArrowRight, 
  FlaskConical,
  Layers
} from 'lucide-react';

export default function Header({ 
  onRefresh, 
  onReplay, 
  isRefreshing, 
  isReplaying 
}) {
  return (
    <header className="h-14 border-b border-[#1e2638] bg-[#0d121d]/90 backdrop-blur sticky top-0 z-30 px-4 flex items-center justify-between">
      {/* Brand & Breadcrumbs */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          {/* Logo */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-950/40">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-wider text-sm text-white font-mono">DIRELY</span>
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider hidden sm:inline">AGENT RELIABILITY</span>
          </div>
          <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider bg-purple-950/70 border border-purple-500/40 text-purple-300 rounded uppercase">
            EVALS
          </span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-[#1e2638] hidden md:block" />

        {/* Breadcrumb Path & Version Selector */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <span>Projects</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300 font-medium">Order Support Agent</span>
            <span className="text-slate-600">/</span>
            <span className="text-purple-300 font-semibold">Overview</span>
          </div>

          {/* Version Selector Pill */}
          <div className="flex items-center bg-[#131a29] border border-[#222e44] rounded-md px-2 py-1 text-xs gap-2 shadow-inner">
            <div className="flex items-center gap-1.5 text-slate-300 font-mono">
              <span className="text-emerald-400">v1.4.0</span>
              <span className="text-slate-500 text-[10px]">(baseline)</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </div>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <div className="flex items-center gap-1.5 text-slate-300 font-mono">
              <span className="text-amber-400">v1.5.0</span>
              <span className="text-slate-500 text-[10px]">(candidate)</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </div>
          </div>

          {/* Test Run Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#131a29] border border-[#222e44] rounded-md text-[11px] text-slate-300">
            <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-mono text-slate-200">Run #4102</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">200 cases</span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh comparison data"
          className="p-1.5 text-slate-400 hover:text-white bg-[#131a29] hover:bg-[#1a2337] border border-[#222e44] rounded-md transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
        </button>

        {/* Primary Replay CTA */}
        <button
          onClick={onReplay}
          disabled={isReplaying}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:from-purple-700 active:to-indigo-700 text-white rounded-md text-xs font-semibold shadow-md shadow-purple-950/50 border border-purple-400/30 transition-all disabled:opacity-60"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isReplaying ? 'Replaying...' : 'Run Replay / Evaluation'}</span>
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-[#1e2638] border border-[#2a374f] flex items-center justify-center text-[11px] font-bold text-slate-300 ml-1">
          V
        </div>
      </div>
    </header>
  );
}
