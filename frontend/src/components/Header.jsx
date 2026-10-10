import React from 'react';
import { 
  ChevronDown, 
  RefreshCw, 
  Play, 
  ArrowRight, 
  FlaskConical,
  Layers,
  Sun,
  Moon,
  Share2
} from 'lucide-react';

export default function Header({ 
  onRefresh, 
  onReplay, 
  isRefreshing, 
  isReplaying,
  theme,
  onToggleTheme,
  onExportReport
}) {
  return (
    <header className="h-16 border-b border-border bg-bg-nav sticky top-0 z-30 px-6 flex items-center justify-between transition-colors duration-200">
      {/* Brand & Breadcrumbs */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg bg-accent-teal-soft border border-accent-teal/40 flex items-center justify-center shadow-sm">
            <Layers className="w-5 h-5 text-accent-teal" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider text-base text-txt-primary font-mono">DIRELY</span>
            <span className="text-xs uppercase font-semibold text-txt-muted tracking-wider hidden sm:inline">AGENT RELIABILITY</span>
          </div>
          <span className="px-2 py-0.5 text-xs font-bold tracking-wider bg-accent-teal-soft border border-accent-teal/40 text-accent-cyan rounded uppercase">
            EVALS
          </span>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-border hidden md:block" />

        {/* Breadcrumb Path & Version Selector */}
        <div className="hidden lg:flex items-center gap-3.5 text-sm">
          <div className="text-txt-secondary flex items-center gap-2">
            <span>Projects</span>
            <span className="text-txt-disabled">/</span>
            <span className="text-txt-primary font-medium">Order Support Agent</span>
            <span className="text-txt-disabled">/</span>
            <span className="text-accent-teal font-semibold">Overview</span>
          </div>

          {/* Version Selector Pill */}
          <div className="flex items-center bg-bg-input border border-border rounded-lg px-3 py-1.5 text-sm gap-2.5">
            <div className="flex items-center gap-1.5 text-txt-primary font-mono">
              <span className="text-status-success font-semibold">v1.4.0</span>
              <span className="text-txt-muted text-xs">(baseline)</span>
              <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-txt-disabled" />
            <div className="flex items-center gap-1.5 text-txt-primary font-mono">
              <span className="text-status-warning font-semibold">v1.5.0</span>
              <span className="text-txt-muted text-xs">(candidate)</span>
              <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
            </div>
          </div>

          {/* Test Run Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-input border border-border rounded-lg text-xs text-txt-secondary">
            <FlaskConical className="w-4 h-4 text-accent-teal" />
            <span className="font-mono text-txt-primary font-medium">Run #4102</span>
            <span className="text-txt-disabled">•</span>
            <span className="text-txt-muted">200 cases</span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Dark / Light Mode Toggle */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 text-txt-secondary hover:text-txt-primary bg-bg-card hover:bg-bg-hover border border-border rounded-lg transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-status-warning" />
          ) : (
            <Moon className="w-4 h-4 text-accent-teal" />
          )}
        </button>

        {/* Export / Share Report button */}
        <button
          onClick={onExportReport}
          title="Export evaluation summary"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-txt-secondary hover:text-txt-primary bg-bg-card hover:bg-bg-hover border border-border rounded-lg transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Export Summary</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh comparison data"
          className="p-2 text-txt-secondary hover:text-txt-primary bg-bg-card hover:bg-bg-hover border border-border rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-accent-teal' : ''}`} />
        </button>

        {/* Primary Replay CTA */}
        <button
          onClick={onReplay}
          disabled={isReplaying}
          className="flex items-center gap-2 px-4 py-2 bg-accent-teal hover:bg-accent-teal-hover active:opacity-90 text-white dark:text-[#0B1117] rounded-lg text-xs sm:text-sm font-bold shadow-sm transition-all disabled:opacity-60"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isReplaying ? 'Replaying...' : 'Run Replay / Evaluation'}</span>
        </button>
      </div>
    </header>
  );
}
