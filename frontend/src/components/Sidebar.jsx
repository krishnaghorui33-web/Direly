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
    <aside className="w-64 shrink-0 border-r border-border bg-bg-nav flex flex-col justify-between py-6 select-none transition-colors duration-200">
      <div>
        {/* Navigation Section */}
        <div className="px-5 mb-3.5">
          <p className="text-xs font-bold text-txt-muted uppercase tracking-wider">Evaluation Steps</p>
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
                    ? 'bg-accent-teal-soft border border-accent-teal/60 text-accent-cyan shadow-sm font-bold' 
                    : 'text-txt-secondary hover:text-txt-primary hover:bg-bg-hover'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-accent-teal' : 'text-txt-muted'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                    isActive 
                      ? 'bg-accent-teal text-white dark:text-[#0B1117] font-bold' 
                      : 'bg-bg-card text-txt-secondary border border-border'
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
      <div className="px-5 pt-5 border-t border-border space-y-3.5">
        {/* Active Project Card */}
        <div className="p-3.5 bg-bg-card rounded-lg border border-border shadow-sm">
          <span className="text-xs uppercase font-bold text-txt-muted tracking-wider block mb-1">
            Active Agent
          </span>
          <div className="flex items-center justify-between text-sm font-semibold text-txt-primary">
            <span>Order Support Agent</span>
            <span className="w-2.5 h-2.5 rounded-full bg-status-success"></span>
          </div>
          <div className="text-xs text-txt-muted font-mono mt-1">
            200 evaluation cases
          </div>
        </div>

        {/* Backend Status indicator */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-txt-secondary">Backend:</span>
            <span className={`font-semibold ${isLiveApi ? 'text-status-success' : 'text-accent-teal'}`}>
              {isLiveApi ? 'Live FastAPI' : 'Demo Sandbox'}
            </span>
          </div>
          <button
            onClick={onToggleApiMode}
            className="w-full mt-2.5 py-2 px-3 text-xs font-semibold bg-bg-card hover:bg-bg-hover border border-border text-txt-secondary hover:text-txt-primary rounded-lg transition-colors"
          >
            {isLiveApi ? 'Switch to Demo Data' : 'Connect Live API'}
          </button>
        </div>
      </div>
    </aside>
  );
}
