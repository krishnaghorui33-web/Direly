import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import SimpleStoryView from './components/SimpleStoryView';
import OverviewBanner from './components/OverviewBanner';
import MetricCards from './components/MetricCards';
import CohortMatrix from './components/CohortMatrix';
import FailurePatterns from './components/FailurePatterns';
import CulpritAttribution from './components/CulpritAttribution';
import EventProgression from './components/EventProgression';
import FixVerification from './components/FixVerification';
import TraceModal from './components/TraceModal';
import { Sparkles, Sliders, Layers } from 'lucide-react';
import { 
  fetchComparison, 
  fetchFindings, 
  triggerReplay, 
  DEMO_DATA 
} from './services/api';

export default function App() {
  const [viewMode, setViewMode] = useState('story'); // 'story' (simple & friendly) | 'advanced' (deep logs)
  const [activeSection, setActiveSection] = useState('overview');
  const [data, setData] = useState(DEMO_DATA);
  const [isLiveApi, setIsLiveApi] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [selectedPatternId, setSelectedPatternId] = useState('fp_schema_mismatch_get_order');
  const [selectedCaseId, setSelectedCaseId] = useState('case_ord_8821');
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [isLiveApi]);

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
    <div className="min-h-screen bg-[#090c13] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Header
        onRefresh={loadData}
        onReplay={() => handleReplay({ target: 'full_eval' })}
        isRefreshing={isRefreshing}
        isReplaying={isReplaying}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeSection={activeSection}
          onSelectSection={(id) => {
            setActiveSection(id);
            if (viewMode === 'story' && (id === 'failures' || id === 'diagnosis')) {
              // Stay in story mode or switch seamlessly
            }
          }}
          isLiveApi={isLiveApi}
          onToggleApiMode={handleToggleApiMode}
        />

        {/* Content Workspace Area */}
        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-5 max-w-7xl">
          {/* Top Mode Selector: Simple Friendly View vs Advanced Trace */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1422] border border-[#1e2638] rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Dashboard Presentation Mode:</span>
              <span className="font-semibold text-white text-xs">
                {viewMode === 'story' ? 'Guided Story (Simple & Friendly)' : 'Advanced Trace (Full Developer View)'}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-[#0a0d14] p-1 rounded-lg border border-[#1c273e]">
              <button
                onClick={() => setViewMode('story')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  viewMode === 'story'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simple Story Mode (Recommended)</span>
              </button>

              <button
                onClick={() => setViewMode('advanced')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                  viewMode === 'advanced'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Advanced Developer Trace</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: Simple Friendly Story View */}
          {viewMode === 'story' ? (
            <SimpleStoryView
              data={data}
              onTriggerReplay={handleReplay}
              isReplaying={isReplaying}
            />
          ) : (
            /* VIEW 2: Advanced Detailed Technical View */
            <div className="space-y-6">
              {/* Section 1: Overview & Metrics */}
              <section id="overview" className="space-y-4">
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
              </section>

              {/* Section 2: Failure Patterns */}
              <section id="failures" className="pt-2">
                <FailurePatterns
                  patterns={data.failurePatterns}
                  selectedPatternId={selectedPatternId}
                  onSelectPattern={setSelectedPatternId}
                  selectedCaseId={selectedCaseId}
                  onSelectCase={setSelectedCaseId}
                />
              </section>

              {/* Section 3: Diagnosis & Likely Culprit */}
              <section id="diagnosis" className="pt-2">
                <CulpritAttribution
                  attribution={data.culpritAttribution}
                  onInspectTrace={() => setIsTraceModalOpen(true)}
                />
              </section>

              {/* Section 4: Execution Event Trace Timeline */}
              <section id="trace" className="pt-2">
                <EventProgression
                  eventProgression={data.eventProgression}
                  selectedCaseId={selectedCaseId}
                />
              </section>

              {/* Section 5: Fix Verification & Replay */}
              <section id="verification" className="pt-2 pb-8">
                <FixVerification
                  verificationData={data.fixVerification}
                  onTriggerReplay={handleReplay}
                  isReplaying={isReplaying}
                />
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Trace Inspector Modal */}
      <TraceModal
        isOpen={isTraceModalOpen}
        onClose={() => setIsTraceModalOpen(false)}
        artifact={data.culpritAttribution?.inspectionArtifact}
        eventProgression={data.eventProgression}
      />
    </div>
  );
}
