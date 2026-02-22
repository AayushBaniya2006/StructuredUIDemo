<script lang="ts">
  import { onDestroy } from 'svelte';
  import { issuesStore } from '$lib/stores/issues';
  import type { Issue, QACriterion } from '$lib/types';
  import { t } from '$lib/config/app-config';

  let { onClose }: { onClose: () => void } = $props();

  let issues: Issue[] = $state([]);
  let criteria: QACriterion[] = $state([]);

  const unsubIssues = issuesStore.issues.subscribe((v) => {
    issues = v;
    calculateMetrics();
  });
  const unsubCriteria = issuesStore.criteria.subscribe((v) => {
    criteria = v;
    calculateMetrics();
  });

  function calculateMetrics() {
    // Metrics are derived, this function triggers reactivity
  }

  let metrics = $derived({
    totalIssues: issues.length,
    bySeverity: {
      high: issues.filter((i) => i.severity === 'high').length,
      medium: issues.filter((i) => i.severity === 'medium').length,
      low: issues.filter((i) => i.severity === 'low').length,
    },
    byCategory: {
      clash: issues.filter((i) => i.category === 'clash').length,
      'missing-label': issues.filter((i) => i.category === 'missing-label').length,
      'code-violation': issues.filter((i) => i.category === 'code-violation').length,
      clearance: issues.filter((i) => i.category === 'clearance').length,
    },
    byStatus: {
      open: issues.filter((i) => i.status === 'open').length,
      resolved: issues.filter((i) => i.status === 'resolved').length,
    },
    criteriaStats: {
      pass: criteria.filter((c) => c.result === 'pass').length,
      fail: criteria.filter((c) => c.result === 'fail').length,
      na: criteria.filter((c) => c.result === 'not-applicable').length,
    },
    complianceScore: criteria.length > 0
      ? Math.round((criteria.filter((c) => c.result === 'pass').length / criteria.length) * 100)
      : 0,
    avgConfidence: issues.length > 0
      ? Math.round(issues.reduce((sum, i) => sum + (i.confidence ?? 50), 0) / issues.length)
      : 0,
  });

  function getComplianceColor(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 50) return 'text-yellow-500';
    return 'text-red-500';
  }

  onDestroy(() => {
    unsubIssues();
    unsubCriteria();
  });
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" data-testid="metrics-panel">
  <div class="mx-4 w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-900">Analysis Metrics</h2>
      <button
        class="rounded p-2 hover:bg-gray-100"
        onclick={onClose}
        aria-label="Close metrics panel"
      >
        <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Compliance Score -->
    <div class="mb-6 rounded-lg bg-gray-50 p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500">Overall Compliance Score</p>
          <p class="text-3xl font-bold text-gray-900">{metrics.complianceScore}%</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="text-xs text-gray-500">Pass</p>
            <p class="text-lg font-semibold text-green-600">{metrics.criteriaStats.pass}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500">Fail</p>
            <p class="text-lg font-semibold text-red-600">{metrics.criteriaStats.fail}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500">N/A</p>
            <p class="text-lg font-semibold text-gray-400">{metrics.criteriaStats.na}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Issues by Severity -->
    <div class="mb-6">
      <h3 class="mb-3 text-sm font-semibold text-gray-700">Issues by Severity</h3>
      <div class="grid grid-cols-3 gap-4">
        <div class="rounded-lg bg-red-50 p-4">
          <p class="text-xs text-red-600">High</p>
          <p class="text-2xl font-bold text-red-700">{metrics.bySeverity.high}</p>
        </div>
        <div class="rounded-lg bg-amber-50 p-4">
          <p class="text-xs text-amber-600">Medium</p>
          <p class="text-2xl font-bold text-amber-700">{metrics.bySeverity.medium}</p>
        </div>
        <div class="rounded-lg bg-blue-50 p-4">
          <p class="text-xs text-blue-600">Low</p>
          <p class="text-2xl font-bold text-blue-700">{metrics.bySeverity.low}</p>
        </div>
      </div>
    </div>

    <!-- Issues by Category -->
    <div class="mb-6">
      <h3 class="mb-3 text-sm font-semibold text-gray-700">Issues by Category</h3>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex items-center justify-between rounded border border-gray-200 p-3">
          <span class="text-sm text-gray-600">Clash</span>
          <span class="font-semibold text-gray-900">{metrics.byCategory.clash}</span>
        </div>
        <div class="flex items-center justify-between rounded border border-gray-200 p-3">
          <span class="text-sm text-gray-600">Missing Label</span>
          <span class="font-semibold text-gray-900">{metrics.byCategory['missing-label']}</span>
        </div>
        <div class="flex items-center justify-between rounded border border-gray-200 p-3">
          <span class="text-sm text-gray-600">Code Violation</span>
          <span class="font-semibold text-gray-900">{metrics.byCategory['code-violation']}</span>
        </div>
        <div class="flex items-center justify-between rounded border border-gray-200 p-3">
          <span class="text-sm text-gray-600">Clearance</span>
          <span class="font-semibold text-gray-900">{metrics.byCategory.clearance}</span>
        </div>
      </div>
    </div>

    <!-- Status Breakdown -->
    <div class="mb-6">
      <h3 class="mb-3 text-sm font-semibold text-gray-700">Status Breakdown</h3>
      <div class="flex gap-4">
        <div class="flex items-center gap-2">
          <span class="rounded-full h-3 w-3 bg-blue-500"></span>
          <span class="text-sm text-gray-600">Open: <strong>{metrics.byStatus.open}</strong></span>
        </div>
        <div class="flex items-center gap-2">
          <span class="rounded-full h-3 w-3 bg-green-500"></span>
          <span class="text-sm text-gray-600">Resolved: <strong>{metrics.byStatus.resolved}</strong></span>
        </div>
      </div>
    </div>

    <!-- AI Confidence -->
    <div class="rounded-lg bg-gray-50 p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500">Average AI Confidence</p>
          <p class="text-2xl font-bold text-gray-900">{metrics.avgConfidence}%</p>
        </div>
        <div class="h-24 w-24">
          <!-- Simple confidence gauge -->
          <svg viewBox="0 0 36 36" class="w-full h-full">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              class="text-gray-200"
            />
            <path
              d={`M18 18 m 0 -15.9155 a 15.9155 15.9155 0 0 1 0 31.831`}
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              class={getConfidenceColor(metrics.avgConfidence)}
              stroke-dasharray={`${metrics.avgConfidence * 0.316} 100`}
            />
            <text
              x="18"
              y="20"
              text-anchor="middle"
              class="text-[8px] font-bold fill-gray-900"
            >{Math.round(metrics.avgConfidence)}%</text>
          </svg>
        </div>
      </div>
    </div>

    <!-- Close button -->
    <button
      class="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
      onclick={onClose}
    >
      Close Metrics
    </button>
  </div>
</div>
