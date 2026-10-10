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
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { 
  fetchComparison, 
  triggerReplay, 
  DEMO_DATA 
} from './services/api';

export default function App() {
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
    <div className="min-h-screen bg-[#0B1117] text-[#E6EDF3] flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Header
        onRefresh={loadData}
        onReplay={() => handleReplay({ target: 'full_eval' })}
        isRefreshing={isRefreshing}
        isReplaying={isReplaying}
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

        {/* Content Workspace Area */}
        <main className="flex-1 overflow-y-auto px-6 py-6 max-w-6xl">
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
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setActiveSection('failures')}
                  className="px-4 py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] active:bg-[#0F766E] text-[#0B1117] rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
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
              <div className="pt-4 flex items-center justify-between">
                <button
                  onClick={() => setActiveSection('overview')}
                  className="px-4 py-2 bg-[#141F2B] hover:bg-[#192734] border border-[#263746] text-[#A4B3C2] hover:text-[#E6EDF3] rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Overview</span>
                </button>

                <button
                  onClick={() => setActiveSection('diagnosis')}
                  className="px-4 py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] active:bg-[#0F766E] text-[#0B1117] rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
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
              <div className="pt-4 flex items-center justify-between">
                <button
                  onClick={() => setActiveSection('failures')}
                  className="px-4 py-2 bg-[#141F2B] hover:bg-[#192734] border border-[#263746] text-[#A4B3C2] hover:text-[#E6EDF3] rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Failure Patterns</span>
                </button>

                <button
                  onClick={() => setActiveSection('verification')}
                  className="px-4 py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] active:bg-[#0F766E] text-[#0B1117] rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
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
              <div className="pt-4 flex items-center justify-between">
                <button
                  onClick={() => setActiveSection('diagnosis')}
                  className="px-4 py-2 bg-[#141F2B] hover:bg-[#192734] border border-[#263746] text-[#A4B3C2] hover:text-[#E6EDF3] rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Diagnosis</span>
                </button>

                <button
                  onClick={() => setActiveSection('backend')}
                  className="px-4 py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] active:bg-[#0F766E] text-[#0B1117] rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
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
