import React from 'react';
import { 
  BarChart3, 
  AlertCircle, 
  Crosshair, 
  CheckCircle2, 
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
    { id: 'overview', label: '1. Detect Regression', icon: BarChart3 },
    { id: 'failures', label: '2. Failure Patterns', icon: AlertCircle, badge: '4' },
    { id: 'diagnosis', label: '3. Likely Culprit', icon: Crosshair, badge: 'Found' },
    { id: 'verification', label: '4. Fix Verification', icon: CheckCircle2, badge: 'Ready' },
    { id: 'backend', label: '5. System & Database', icon: Server }
  ];

  return (
    <aside className="w-60 shrink-0 border-r border-[#1e2638] bg-[#0b0f19] flex flex-col justify-between py-5 select-none">
      <div>
        {/* Navigation Section */}
        <div className="px-4 mb-3">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Evaluation Steps</p>
        </div>

        <nav className="space-y-1.5 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive 
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#131926]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isActive 
                      ? 'bg-white/20 text-white font-bold' 
                      : 'bg-[#182133] text-purple-300 border border-purple-800/40'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom section: Active Project & Backend Status */}
      <div className="px-4 pt-4 border-t border-[#1e2638] space-y-3">
        {/* Active Project Card */}
        <div className="p-2.5 bg-[#0e1422] rounded-lg border border-[#1b2538]">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
            Active Agent
          </span>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
            <span>Order Support Agent</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            200 evaluation cases
          </div>
        </div>

        {/* Backend Status indicator */}
        <div className="pt-2 border-t border-[#1a2233]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Backend:</span>
            <span className={`font-semibold ${isLiveApi ? 'text-emerald-400' : 'text-purple-300'}`}>
              {isLiveApi ? 'Live FastAPI' : 'Demo Sandbox'}
            </span>
          </div>
          <button
            onClick={onToggleApiMode}
            className="w-full mt-2 py-1.5 px-2 text-[11px] font-medium bg-[#131926] hover:bg-[#1a2337] border border-[#222e44] text-slate-300 rounded transition-colors"
          >
            {isLiveApi ? 'Switch to Demo Data' : 'Connect Live API'}
          </button>
        </div>
      </div>
    </aside>
  );
}
