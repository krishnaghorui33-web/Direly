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
    <header className="h-14 border-b border-[#263746] bg-[#0F1720] sticky top-0 z-30 px-5 flex items-center justify-between">
      {/* Brand & Breadcrumbs */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          {/* Logo */}
          <div className="w-7 h-7 rounded-lg bg-[#123A3A] border border-[#14B8A6]/40 flex items-center justify-center shadow-sm">
            <Layers className="w-4 h-4 text-[#14B8A6]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-wider text-sm text-[#E6EDF3] font-mono">DIRELY</span>
            <span className="text-[10px] uppercase font-semibold text-[#718396] tracking-wider hidden sm:inline">AGENT RELIABILITY</span>
          </div>
          <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider bg-[#123A3A] border border-[#14B8A6]/40 text-[#67E8F9] rounded uppercase">
            EVALS
          </span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-[#263746] hidden md:block" />

        {/* Breadcrumb Path & Version Selector */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          <div className="text-[#A4B3C2] flex items-center gap-1.5">
            <span>Projects</span>
            <span className="text-[#526170]">/</span>
            <span className="text-[#E6EDF3] font-medium">Order Support Agent</span>
            <span className="text-[#526170]">/</span>
            <span className="text-[#14B8A6] font-semibold">Overview</span>
          </div>

          {/* Version Selector Pill */}
          <div className="flex items-center bg-[#101923] border border-[#263746] rounded-md px-2.5 py-1 text-xs gap-2">
            <div className="flex items-center gap-1.5 text-[#E6EDF3] font-mono">
              <span className="text-[#34D399]">v1.4.0</span>
              <span className="text-[#718396] text-[10px]">(baseline)</span>
              <ChevronDown className="w-3 h-3 text-[#718396]" />
            </div>
            <ArrowRight className="w-3 h-3 text-[#526170]" />
            <div className="flex items-center gap-1.5 text-[#E6EDF3] font-mono">
              <span className="text-[#FBBF24]">v1.5.0</span>
              <span className="text-[#718396] text-[10px]">(candidate)</span>
              <ChevronDown className="w-3 h-3 text-[#718396]" />
            </div>
          </div>

          {/* Test Run Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#101923] border border-[#263746] rounded-md text-[11px] text-[#A4B3C2]">
            <FlaskConical className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span className="font-mono text-[#E6EDF3]">Run #4102</span>
            <span className="text-[#526170]">•</span>
            <span className="text-[#718396]">200 cases</span>
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
          className="p-1.5 text-[#A4B3C2] hover:text-[#E6EDF3] bg-[#141F2B] hover:bg-[#192734] border border-[#263746] rounded-md transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#14B8A6]' : ''}`} />
        </button>

        {/* Primary Replay CTA */}
        <button
          onClick={onReplay}
          disabled={isReplaying}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#14B8A6] hover:bg-[#0D9488] active:bg-[#0F766E] text-[#0B1117] rounded-md text-xs font-semibold shadow-sm border border-[#42D6C5]/30 transition-all disabled:opacity-60"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isReplaying ? 'Replaying...' : 'Run Replay / Evaluation'}</span>
        </button>

        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-[#141F2B] border border-[#263746] flex items-center justify-center text-[11px] font-bold text-[#A4B3C2] ml-1">
          V
        </div>
      </div>
    </header>
  );
}
