<script lang="ts">
  import { issuesStore } from '$lib/stores/issues';
  import { viewerStore } from '$lib/stores/viewer';
  import { bboxToPixels } from '$lib/utils/coordinates';
  import { derived } from 'svelte/store';

  let { width, height, page }: { width: number; height: number; page: number } = $props();

  const pageIssues = $derived(issuesStore.issuesForPage(page));
  let issues: import('$lib/types').Issue[] = $state([]);
  let selectedId: string | null = $state(null);
  let hoveredId: string | null = $state(null);
  let showAll = $state(true);

  // Subscribe to reactive stores
  $effect(() => {
    const unsub = derived(
      [pageIssues, issuesStore.selectedId, issuesStore.hoveredId, viewerStore],
      ([$issues, $selId, $hovId, $viewer]) => ({
        issues: $issues,
        selectedId: $selId,
        hoveredId: $hovId,
        showAll: $viewer.showAllOverlays,
      })
    ).subscribe((val) => {
      issues = val.issues;
      selectedId = val.selectedId;
      hoveredId = val.hoveredId;
      showAll = val.showAll;
    });

    return unsub;
  });

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#6b7280';
    }
  }
</script>

<svg
  class="pointer-events-none absolute left-0 top-0"
  {width}
  {height}
  viewBox="0 0 {width} {height}"
>
  {#each issues as issue (issue.id)}
    {@const px = bboxToPixels(issue.bbox, width, height)}
    {@const isSelected = issue.id === selectedId}
    {@const isHovered = issue.id === hoveredId}
    {@const visible = showAll || isSelected}

    {#if visible}
      <rect
        x={px.x}
        y={px.y}
        width={px.width}
        height={px.height}
        fill={isSelected ? `${getSeverityColor(issue.severity)}20` : isHovered ? `${getSeverityColor(issue.severity)}15` : 'transparent'}
        stroke={getSeverityColor(issue.severity)}
        stroke-width={isSelected ? 3 : isHovered ? 2 : 1.5}
        stroke-dasharray={isSelected ? 'none' : '6 3'}
        rx="2"
        class:animate-pulse={isHovered && !isSelected}
        opacity={isSelected || isHovered ? 1 : 0.5}
      />

      {#if isSelected}
        <!-- Label above selected bbox -->
        <foreignObject
          x={px.x}
          y={px.y - 24}
          width={Math.max(px.width, 120)}
          height="22"
        >
          <div class="pointer-events-none rounded bg-gray-900/80 px-1.5 py-0.5 text-xs font-medium text-white truncate">
            {issue.id}: {issue.title}
          </div>
        </foreignObject>
      {/if}
    {/if}
  {/each}
</svg>
