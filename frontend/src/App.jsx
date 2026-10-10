import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import OverviewBanner from './components/OverviewBanner';
import MetricCards from './components/MetricCards';
import CohortMatrix from './components/CohortMatrix';
import FailurePatterns from './components/FailurePatterns';
import CulpritAttribution from './components/CulpritAttribution';
import EventProgression from './components/EventProgression';
import FixVerification from './components/FixVerification';
import BackendStatusTab from './components/BackendStatusTab';
import TraceModal from './components/TraceModal';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { 
  fetchComparison, 
  triggerReplay, 
  DEMO_DATA 
} from './services/api';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('direly_theme') || 'dark';
  });
  const [activeSection, setActiveSection] = useState('overview');
  const [data, setData] = useState(DEMO_DATA);
  const [isLiveApi, setIsLiveApi] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [selectedPatternId, setSelectedPatternId] = useState('fp_schema_mismatch_get_order');
  const [selectedCaseId, setSelectedCaseId] = useState('case_ord_8821');
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('direly_theme', theme);
  }, [theme]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [isLiveApi]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleExportReport = () => {
    const summary = `DIRELY EVALUATION REPORT
Project: ${data.project?.name || 'Order Support Agent'}
Baseline (${data.versions?.baseline}): ${data.metrics?.baselineSuccessRate}% Pass
Candidate (${data.versions?.candidate}): ${data.metrics?.candidateSuccessRate}% Pass (Regression: ${data.metrics?.rateDropPp}pp)
Suspected Culprit: ${data.culpritAttribution?.rankedSuspects?.[0]?.component || 'tools/order_service.json'} (${data.culpritAttribution?.confidence || '98.4%'} confidence)
Fix Status: ${data.fixVerification?.patch?.passRate} Pass (100% Recovered)`;

    navigator.clipboard.writeText(summary);
    setToastMessage('✓ Diagnostic Summary copied to clipboard!');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      if (isLiveApi) {
        const comp = await fetchComparison();
        if (comp.isLive) {
          setData(comp.data);
        } else {
          setData(DEMO_DATA);
        }
      } else {
        setData(DEMO_DATA);
      }
    } catch (e) {
      console.error(e);
      setData(DEMO_DATA);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReplay = async (options = {}) => {
    setIsReplaying(true);
    try {
      await triggerReplay(options);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsReplaying(false);
    }
  };

  const handleToggleApiMode = () => {
    setIsLiveApi(!isLiveApi);
  };

  return (
    <div className="min-h-screen bg-bg-app text-txt-primary flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation Bar */}
      <Header
        onRefresh={loadData}
        onReplay={() => handleReplay({ target: 'full_eval' })}
        isRefreshing={isRefreshing}
        isReplaying={isReplaying}
        theme={theme}
        onToggleTheme={toggleTheme}
        onExportReport={handleExportReport}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <Sidebar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          isLiveApi={isLiveApi}
          onToggleApiMode={handleToggleApiMode}
        />

        {/* Content Workspace Area - Full Width & Responsive */}
        <main className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 w-full">
          <div className="max-w-[1500px] mx-auto space-y-8">
            {/* TAB 1: Detect Regressions */}
            {activeSection === 'overview' && (
              <div className="space-y-6 animate-fadeIn">
                <OverviewBanner 
                  metrics={data.metrics} 
                  project={data.project} 
                />
                <MetricCards 
                  metrics={data.metrics} 
                />
                <CohortMatrix 
                  cohort={data.cohort} 
                />

                {/* Next Step Navigation CTA */}
                <div className="pt-6 flex justify-end">
                  <button
                    onClick={() => setActiveSection('failures')}
                    className="px-5 py-3 bg-accent-teal hover:bg-accent-teal-hover active:opacity-90 text-white dark:text-[#0B1117] rounded-xl text-sm font-bold flex items-center gap-2.5 shadow-sm transition-all"
                  >
                    <span>Step 2: Inspect Failure Patterns</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Failure Patterns */}
            {activeSection === 'failures' && (
              <div className="space-y-6 animate-fadeIn">
                <FailurePatterns
                  patterns={data.failurePatterns}
                  selectedPatternId={selectedPatternId}
                  onSelectPattern={setSelectedPatternId}
                  selectedCaseId={selectedCaseId}
                  onSelectCase={setSelectedCaseId}
                />

                {/* Navigation CTAs */}
                <div className="pt-6 flex items-center justify-between">
                  <button
                    onClick={() => setActiveSection('overview')}
                    className="px-5 py-2.5 bg-bg-card hover:bg-bg-hover border border-border text-txt-secondary hover:text-txt-primary rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Overview</span>
                  </button>

                  <button
                    onClick={() => setActiveSection('diagnosis')}
                    className="px-5 py-3 bg-accent-teal hover:bg-accent-teal-hover active:opacity-90 text-white dark:text-[#0B1117] rounded-xl text-sm font-bold flex items-center gap-2.5 shadow-sm transition-all"
                  >
                    <span>Step 3: See Likely Culprit</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Diagnosis & Likely Culprit */}
            {activeSection === 'diagnosis' && (
              <div className="space-y-6 animate-fadeIn">
                <CulpritAttribution
                  attribution={data.culpritAttribution}
                  onInspectTrace={() => setIsTraceModalOpen(true)}
                />

                <EventProgression
                  eventProgression={data.eventProgression}
                  selectedCaseId={selectedCaseId}
                />

                {/* Navigation CTAs */}
                <div className="pt-6 flex items-center justify-between">
                  <button
                    onClick={() => setActiveSection('failures')}
                    className="px-5 py-2.5 bg-bg-card hover:bg-bg-hover border border-border text-txt-secondary hover:text-txt-primary rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Failure Patterns</span>
                  </button>

                  <button
                    onClick={() => setActiveSection('verification')}
                    className="px-5 py-3 bg-accent-teal hover:bg-accent-teal-hover active:opacity-90 text-white dark:text-[#0B1117] rounded-xl text-sm font-bold flex items-center gap-2.5 shadow-sm transition-all"
                  >
                    <span>Step 4: Verify Fix with Replay</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: Fix Verification & Replay */}
            {activeSection === 'verification' && (
              <div className="space-y-6 animate-fadeIn">
                <FixVerification
                  verificationData={data.fixVerification}
                  onTriggerReplay={handleReplay}
                  isReplaying={isReplaying}
                />

                {/* Navigation CTAs */}
                <div className="pt-6 flex items-center justify-between">
                  <button
                    onClick={() => setActiveSection('diagnosis')}
                    className="px-5 py-2.5 bg-bg-card hover:bg-bg-hover border border-border text-txt-secondary hover:text-txt-primary rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Diagnosis</span>
                  </button>

                  <button
                    onClick={() => setActiveSection('backend')}
                    className="px-5 py-2.5 bg-bg-card hover:bg-bg-hover border border-border text-txt-secondary hover:text-txt-primary rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
                  >
                    <span>Step 5: View System Architecture</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: Backend & MongoDB Database Status */}
            {activeSection === 'backend' && (
              <div className="space-y-6 animate-fadeIn">
                <BackendStatusTab
                  isLiveApi={isLiveApi}
                  onToggleApiMode={handleToggleApiMode}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Trace Inspector Modal */}
      <TraceModal
        isOpen={isTraceModalOpen}
        onClose={() => setIsTraceModalOpen(false)}
        artifact={data.culpritAttribution?.inspectionArtifact}
        eventProgression={data.eventProgression}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-bg-card border border-accent-teal rounded-xl shadow-xl flex items-center gap-3 text-sm text-txt-primary animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-status-success shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
