import React from 'react';
import { 
  ChevronDown, 
  RefreshCw, 
  Play, 
  ArrowRight, 
  FlaskConical,
  Layers,
  Share2
} from 'lucide-react';

export default function Header({ 
  onRefresh, 
  onReplay, 
  isRefreshing, 
  isReplaying,
  onExportReport
}) {
  return (
    <header className="h-16 border-b border-[#1e2638] bg-[#0d121d] sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Brand & Breadcrumbs */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-950/40">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider text-base text-white font-mono">DIRELY</span>
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider hidden sm:inline">AGENT RELIABILITY</span>
          </div>
          <span className="px-2 py-0.5 text-xs font-bold tracking-wider bg-purple-950/70 border border-purple-500/40 text-purple-300 rounded uppercase">
            EVALS
          </span>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-[#1e2638] hidden md:block" />

        {/* Breadcrumb Path & Version Selector */}
        <div className="hidden lg:flex items-center gap-3.5 text-sm">
          <div className="text-slate-400 flex items-center gap-2">
            <span>Projects</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200 font-medium">Order Support Agent</span>
            <span className="text-slate-600">/</span>
            <span className="text-purple-300 font-semibold">Overview</span>
          </div>

          {/* Version Selector Pill */}
          <div className="flex items-center bg-[#131a29] border border-[#222e44] rounded-lg px-3 py-1.5 text-sm gap-2.5 shadow-inner">
            <div className="flex items-center gap-1.5 text-slate-200 font-mono">
              <span className="text-emerald-400 font-semibold">v1.4.0</span>
              <span className="text-slate-500 text-xs">(baseline)</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <div className="flex items-center gap-1.5 text-slate-200 font-mono">
              <span className="text-amber-400 font-semibold">v1.5.0</span>
              <span className="text-slate-500 text-xs">(candidate)</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>

          {/* Test Run Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#131a29] border border-[#222e44] rounded-lg text-xs text-slate-300">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            <span className="font-mono text-slate-200 font-medium">Run #4102</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">200 cases</span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Export Report CTA */}
        <button
          onClick={onExportReport}
          title="Export evaluation summary"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#131a29] hover:bg-[#1a2337] border border-[#222e44] rounded-lg transition-colors"
        >
          <Share2 className="w-3.5 h-3.5 text-purple-400" />
          <span>Export Summary</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh comparison data"
          className="p-2 text-slate-400 hover:text-white bg-[#131a29] hover:bg-[#1a2337] border border-[#222e44] rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
        </button>

        {/* Primary Replay CTA */}
        <button
          onClick={onReplay}
          disabled={isReplaying}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:from-purple-700 active:to-indigo-700 text-white rounded-lg text-sm font-bold shadow-md shadow-purple-950/50 border border-purple-400/30 transition-all disabled:opacity-60"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isReplaying ? 'Replaying...' : 'Run Replay / Evaluation'}</span>
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#1e2638] border border-[#2a374f] flex items-center justify-center text-xs font-bold text-slate-200 ml-1">
          V
        </div>
      </div>
    </header>
  );
}
