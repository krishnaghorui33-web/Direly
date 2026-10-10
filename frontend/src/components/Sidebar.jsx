import React from 'react';
import { 
  BarChart3, 
  AlertCircle, 
  Crosshair, 
  CheckCircle2, 
  Server
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
    <aside className="w-64 shrink-0 border-r border-[#1e2638] bg-[#0b0f19] flex flex-col justify-between py-6 select-none">
      <div>
        {/* Navigation Section */}
        <div className="px-5 mb-3.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Evaluation Steps</p>
        </div>

        <nav className="space-y-2 px-3.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-semibold transition-all ${
                  isActive 
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40 font-bold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#131926]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded font-mono ${
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
      <div className="px-5 pt-5 border-t border-[#1e2638] space-y-3.5">
        {/* Active Project Card */}
        <div className="p-3.5 bg-[#0e1422] rounded-lg border border-[#1b2538] shadow-sm">
          <span className="text-xs uppercase font-bold text-slate-500 tracking-wider block mb-1">
            Active Agent
          </span>
          <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
            <span>Order Support Agent</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">
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
            className="w-full mt-2.5 py-2 px-3 text-xs font-semibold bg-[#131926] hover:bg-[#1a2337] border border-[#222e44] text-slate-300 hover:text-white rounded-lg transition-colors"
          >
            {isLiveApi ? 'Switch to Demo Data' : 'Connect Live API'}
          </button>
        </div>
      </div>
    </aside>
  );
}
