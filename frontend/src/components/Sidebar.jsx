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
    <aside className="w-60 shrink-0 border-r border-[#263746] bg-[#0F1720] flex flex-col justify-between py-5 select-none">
      <div>
        {/* Navigation Section */}
        <div className="px-4 mb-3">
          <p className="text-[11px] font-bold text-[#718396] uppercase tracking-wider">Evaluation Steps</p>
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
                    ? 'bg-[#123A3A] border border-[#14B8A6]/60 text-[#67E8F9] shadow-sm' 
                    : 'text-[#A4B3C2] hover:text-[#E6EDF3] hover:bg-[#192734]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#14B8A6]' : 'text-[#718396]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isActive 
                      ? 'bg-[#14B8A6] text-[#0B1117] font-bold' 
                      : 'bg-[#141F2B] text-[#A4B3C2] border border-[#263746]'
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
      <div className="px-4 pt-4 border-t border-[#1D2A36] space-y-3">
        {/* Active Project Card */}
        <div className="p-3 bg-[#141F2B] rounded-lg border border-[#263746]">
          <span className="text-[10px] uppercase font-bold text-[#718396] tracking-wider block mb-1">
            Active Agent
          </span>
          <div className="flex items-center justify-between text-xs font-semibold text-[#E6EDF3]">
            <span>Order Support Agent</span>
            <span className="w-2 h-2 rounded-full bg-[#34D399]"></span>
          </div>
          <div className="text-[11px] text-[#A4B3C2] font-mono mt-0.5">
            200 evaluation cases
          </div>
        </div>

        {/* Backend Status indicator */}
        <div className="pt-2 border-t border-[#1D2A36]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#A4B3C2]">Backend:</span>
            <span className={`font-semibold ${isLiveApi ? 'text-[#34D399]' : 'text-[#14B8A6]'}`}>
              {isLiveApi ? 'Live FastAPI' : 'Demo Sandbox'}
            </span>
          </div>
          <button
            onClick={onToggleApiMode}
            className="w-full mt-2 py-1.5 px-2 text-[11px] font-medium bg-[#141F2B] hover:bg-[#192734] border border-[#263746] text-[#A4B3C2] hover:text-[#E6EDF3] rounded transition-colors"
          >
            {isLiveApi ? 'Switch to Demo Data' : 'Connect Live API'}
          </button>
        </div>
      </div>
    </aside>
  );
}
