import React from 'react';
import { 
  LayoutDashboard, 
  GitCompare, 
  AlertCircle, 
  Crosshair, 
  CheckCircle2, 
  ChevronDown, 
  Server,
  ChevronsUpDown
} from 'lucide-react';

export default function Sidebar({ 
  activeSection, 
  onSelectSection, 
  isLiveApi, 
  onToggleApiMode 
}) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'comparisons', label: 'Version Comparisons', icon: GitCompare },
    { id: 'failures', label: 'Failure Patterns', icon: AlertCircle, badge: '4', badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-800/40' },
    { id: 'diagnosis', label: 'Diagnosis & Evidence', icon: Crosshair, badge: '1 Culprit', badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-800/40' },
    { id: 'verification', label: 'Fix Verification', icon: CheckCircle2, badge: 'Ready', badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40' }
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-[#1e2638] bg-[#0b0f19] flex flex-col justify-between py-4 select-none">
      <div>
        {/* Navigation Section */}
        <div className="px-3 mb-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">Navigation</p>
        </div>

        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-all ${
                  isActive 
                    ? 'bg-purple-950/40 text-purple-200 border border-purple-500/30 shadow-sm shadow-purple-950/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#131926]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom section: Active Project & Backend Status */}
      <div className="px-3 pt-4 border-t border-[#1e2638] space-y-3">
        {/* Active Project Switcher */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
            Active Project
          </span>
          <div className="bg-[#111726] border border-[#222e44] rounded-md p-2 flex items-center justify-between text-xs cursor-pointer hover:border-[#2d3d5a] transition-colors">
            <span className="font-semibold text-slate-200 truncate">Order Support Agent</span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </div>
          
          {/* Environment dropdown badge */}
          <div className="mt-1.5 flex items-center justify-between bg-[#111726]/60 border border-[#1b2537] rounded px-2 py-1 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>production-evals</span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </div>
        </div>

        {/* Backend Status indicator */}
        <div className="pt-2 border-t border-[#1a2233]">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLiveApi ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`}></span>
              <span className="text-slate-300 font-medium">Backend Status:</span>
            </div>
            <span className={`text-[10px] font-mono ${isLiveApi ? 'text-emerald-400' : 'text-cyan-400'}`}>
              {isLiveApi ? 'Live API' : 'Ready'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
            <span>{isLiveApi ? 'FastAPI Connected' : '(Sandbox Mock)'}</span>
            <button
              onClick={onToggleApiMode}
              className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
            >
              Toggle
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
