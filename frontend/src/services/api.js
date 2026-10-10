/**
 * Direly API Service
 * Connects to FastAPI backend and provides safe fallback demonstration data
 * matching the orderbot scenario (v1.4.0 baseline -> v1.5.0 candidate -> v1.5.1 fix).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Default mock state for orderbot scenario
export const DEMO_DATA = {
  project: {
    projectId: 'order_support_agent',
    name: 'Order Support Agent',
    env: 'production-evals',
    totalRuns: 200,
    evaluatedAt: '14 minutes ago on runner-c4-highcpu-8'
  },
  versions: {
    baseline: 'v1.4.0',
    candidate: 'v1.5.0',
    patch: 'v1.5.1-patch'
  },
  runMeta: {
    runId: '#4102',
    totalCases: 200,
    confidence: 'HIGH'
  },
  metrics: {
    baselineSuccessRate: 96.0,
    baselinePassed: 192,
    baselineTotal: 200,
    baselineFails: 8,
    baselineP50: 840,
    candidateSuccessRate: 72.0,
    candidatePassed: 144,
    candidateTotal: 200,
    candidateFails: 56,
    candidateP50: 1120,
    rateDropPp: -24.0,
    latencyDeltaMs: 280,
    latencyDeltaPct: 33.3,
    newlyRegressedCases: 12,
    newlyRegressedPct: 6.0,
    persistedNoiseFails: 44,
    persistedNoisePct: 22.0
  },
  cohort: {
    baseline: {
      passed: 192,
      passedPct: 96.0,
      fails: 8,
      failsPct: 4.0,
      p50: 840
    },
    candidate: {
      passed: 144,
      passedPct: 72.0,
      regressed: 12,
      regressedPct: 6.0,
      persisted: 44,
      persistedPct: 22.0,
      p50: 1120
    },
    driftNote: '±0.0pp drift in existing 8 baseline test failures; regression is strictly concentrated in new tool-calling errors.'
  },
  failurePatterns: [
    {
      id: 'fp_schema_mismatch_get_order',
      errorCategory: 'TOOL_SCHEMA_VALIDATION',
      description: 'Parameter mismatch: missing required field id, received order_id',
      affectedCount: 12,
      affectedPct: '100% of new',
      targetTool: 'get_order',
      firstSeen: 'Run #4102',
      status: 'NEW REGRESSION',
      isNewRegression: true,
      affectedCases: [
        'case_ord_8821',
        'case_ord_8829',
        'case_ord_8840',
        'case_ord_8854',
        'case_ord_8862',
        'case_ord_8871',
        'case_ord_8884',
        'case_ord_8890',
        'case_ord_8902',
        'case_ord_8915',
        'case_ord_8923',
        'case_ord_8930'
      ],
      previewSnippet: "ValidationError: Field 'id' is required; unexpected field 'order_id' HTTP 422 Unprocessable Entity"
    },
    {
      id: 'fp_retrieval_empty_context',
      errorCategory: 'RAG_RETRIEVAL_EMPTY',
      description: 'Vector cosine similarity score falls below 0.62 on archived policies',
      affectedCount: 4,
      affectedPct: '2.0% total',
      targetTool: 'knowledge_retriever',
      firstSeen: 'Run #3920',
      status: 'BASELINE INVARIANT',
      isNewRegression: false,
      affectedCases: ['case_ord_8102', 'case_ord_8144', 'case_ord_8190', 'case_ord_8205'],
      previewSnippet: "ContextRetrievalError: 0 document chunks retrieved above threshold score 0.62"
    },
    {
      id: 'fp_timeout_external_crm',
      errorCategory: 'UPSTREAM_TIMEOUT',
      description: 'Sandbox gateway latency exceeds 4,000ms SLA in mock CRM',
      affectedCount: 3,
      affectedPct: '1.5% total',
      targetTool: 'zendesk_crm',
      firstSeen: 'Run #3811',
      status: 'BASELINE INVARIANT',
      isNewRegression: false,
      affectedCases: ['case_ord_8301', 'case_ord_8312', 'case_ord_8340'],
      previewSnippet: "GatewayTimeout: Upstream service /api/crm/v2 timed out after 4000ms"
    },
    {
      id: 'fp_token_limit_exceeded',
      errorCategory: 'CONTEXT_OVERFLOW',
      description: 'Multi-turn ticket thread breaches 18k context window constraint',
      affectedCount: 1,
      affectedPct: '0.5% total',
      targetTool: 'agent_llm',
      firstSeen: 'Run #4015',
      status: 'BASELINE INVARIANT',
      isNewRegression: false,
      affectedCases: ['case_ord_8499'],
      previewSnippet: "ContextWindowExceeded: Prompt tokens 18,432 exceed max limit 16,384"
    }
  ],
  culpritAttribution: {
    confidence: '98.4%',
    observedFact: 'Prompt template prompts/order_support.jinja2:42 remained unmodified, still directing model to dispatch order_id.',
    inferredRelationship: 'Model generates valid order_id per prompt rules, which fails tool gateway Pydantic validation with HTTP 422.',
    correlation: '12 out of 12 (100.0%) new evaluation failures strictly occurred on calls targeting get_order.',
    rankedSuspects: [
      {
        rank: 1,
        component: 'tools/order_service.json',
        detail: 'Schema contract mismatch',
        matchScore: '98.4%',
        badge: 'PRIMARY SUSPECT',
        badgeColor: 'teal'
      },
      {
        rank: 2,
        component: 'prompts/order_support.jinja2',
        detail: 'Unsynchronized parameter instructions',
        matchScore: '84.0%',
        badge: 'CO-FACTOR',
        badgeColor: 'amber'
      },
      {
        rank: 3,
        component: 'connectors/zendesk_crm.py',
        detail: 'Baseline invariant timeout noise',
        matchScore: '14.0%',
        badge: 'UNRELATED',
        badgeColor: 'slate'
      }
    ],
    inspectionArtifact: {
      artifactId: 'EVID-4102-09',
      eventId: 'evt_val_8821',
      jsonPayload: {
        tool: "get_order",
        payload_sent: {
          order_id: "ORD-9281"
        },
        expected_schema_params: [
          "id"
        ],
        http_status: 422
      }
    }
  },
  eventProgression: {
    caseId: 'case_ord_8821',
    events: [
      {
        timestamp: '00:00.000',
        type: 'AGENT_INIT',
        description: 'User query ingested: "Can you cancel my order ORD-9281 right now?"',
        meta: 'Session: sess_981a2',
        status: 'info'
      },
      {
        timestamp: '00:00.420',
        type: 'LLM_PROMPT_DISPATCH',
        description: 'Prompt dispatched to model with active tools schema (348 tokens)',
        meta: 'Latency: 420ms',
        status: 'info'
      },
      {
        timestamp: '00:00.860',
        type: 'LLM_RESPONSE_STREAM',
        description: 'Model requests tool invocation: get_order(order_id="ORD-9281")',
        meta: 'Generated: 42 tokens',
        status: 'info'
      },
      {
        timestamp: '00:00.980',
        type: 'FAILURE POINT • TOOL_SCHEMA_VALIDATION',
        description: 'HTTP 422 Unprocessable Entity: missing required field \'id\'',
        meta: 'Exit Code 422',
        status: 'failure'
      },
      {
        timestamp: '00:01.120',
        type: 'AGENT_ABORT_FALLBACK',
        description: 'Agent dispatched generic error fallback: "Internal service error while retrieving order."',
        meta: 'Handled via catch-all',
        status: 'warning'
      },
      {
        timestamp: '00:01.125',
        type: 'EVALUATION_ASSERTION',
        description: 'FAILED: Missing cancellation confirmation token; marked regressed case.',
        meta: 'Regression Attributed',
        status: 'failure'
      }
    ]
  },
  fixVerification: {
    baseline: {
      version: 'v1.4.0',
      title: 'BASELINE REFERENCE',
      passRate: '96.0%',
      passed: 192,
      total: 200,
      p50: '840ms',
      status: 'Stable Reference'
    },
    candidate: {
      version: 'v1.5.0',
      title: 'CURRENT CANDIDATE',
      passRate: '72.0%',
      passed: 144,
      total: 200,
      p50: '1,120ms',
      status: 'Regressed (-24.0pp)'
    },
    patch: {
      version: 'v1.5.1-patch',
      title: 'PROPOSED PATCH',
      passRate: '96.0%',
      passed: 192,
      total: 200,
      p50: '842ms',
      status: '100% Recovered (+24.0pp)'
    },
    summaryMetrics: [
      {
        id: 'recovered',
        text: '12 / 12 Regressed Cases Recovered (Zero schema 422 failures remaining)',
        type: 'success'
      },
      {
        id: 'latency',
        text: 'Latency Overhead Eliminated: -278ms normalized',
        type: 'cyan'
      },
      {
        id: 'flakiness',
        text: 'Baseline Invariant Flakiness: 8/8 Intact (Zero collateral drift)',
        type: 'slate'
      }
    ]
  }
};

/**
 * Fetch version comparison data
 */
export async function fetchComparison(baseline = 'v1.4.0', candidate = 'v1.5.0') {
  try {
    const res = await fetch(`${API_BASE_URL}/api/compare?baseline=${baseline}&candidate=${candidate}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { data, isLive: true };
  } catch (err) {
    console.warn(`[Direly API] /api/compare unavailable (${err.message}), using verified demo data.`);
    return { data: DEMO_DATA, isLive: false, error: err.message };
  }
}

/**
 * Fetch diagnosis findings and evidence
 */
export async function fetchFindings(candidate = 'v1.5.0') {
  try {
    const res = await fetch(`${API_BASE_URL}/api/findings?version_id=${candidate}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { data, isLive: true };
  } catch (err) {
    console.warn(`[Direly API] /api/findings unavailable (${err.message}), using verified demo data.`);
    return { data: DEMO_DATA, isLive: false, error: err.message };
  }
}

/**
 * Trigger evaluation replay
 */
export async function triggerReplay(payload = { target: 'failing_cases', version: 'v1.5.1-patch' }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/replay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { data, isLive: true };
  } catch (err) {
    console.warn(`[Direly API] /api/replay fallback triggered.`);
    // Simulate real pipeline run
    await new Promise((r) => setTimeout(r, 800));
    return { 
      data: {
        success: true,
        replayedCases: 12,
        passed: 12,
        failed: 0,
        newPassRate: 96.0,
        result: 'resolved'
      }, 
      isLive: false 
    };
  }
}

/**
 * Check backend health
 */
export async function checkBackendStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
