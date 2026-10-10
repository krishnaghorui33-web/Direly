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
import TraceModal from './components/TraceModal';
import { 
  fetchComparison, 
  fetchFindings, 
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
          onSelectSection={setActiveSection}
          isLiveApi={isLiveApi}
          onToggleApiMode={handleToggleApiMode}
        />

        {/* Content Workspace Area */}
        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6 max-w-7xl">
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
