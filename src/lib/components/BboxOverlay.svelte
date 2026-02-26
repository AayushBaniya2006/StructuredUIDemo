<script lang="ts">
  import { onDestroy } from 'svelte';
  import { issuesStore } from '$lib/stores/issues';
  import { viewerStore } from '$lib/stores/viewer';
  import { bboxToPixels } from '$lib/utils/coordinates';
  import type { Issue } from '$lib/types';

  let { width, height, page }: { width: number; height: number; page: number } = $props();

  let issues: Issue[] = $state([]);
  let selectedId: string | null = $state(null);
  let hoveredId: string | null = $state(null);
  let showAll = $state(true);

  // When page changes, we need to tear down and re-subscribe to the correct page store.
  // Use $effect so we react to the `page` prop changing.
  let cleanupPageSub: (() => void) | null = null;

  $effect(() => {
    // This runs whenever `page` (a prop) changes
    const pageStore = issuesStore.issuesForPage(page);
    const unsub = pageStore.subscribe((v) => {
      issues = v;
    });

    cleanupPageSub?.();
    cleanupPageSub = unsub;

    return () => {
      unsub();
      cleanupPageSub = null;
    };
  });

  // Subscribe to selection, hover, and overlay state
  const unsubSelected = issuesStore.selectedId.subscribe((v) => (selectedId = v));
  const unsubHovered = issuesStore.hoveredId.subscribe((v) => (hoveredId = v));
  const unsubViewer = viewerStore.subscribe((v) => (showAll = v.showAllOverlays));

  onDestroy(() => {
    unsubSelected();
    unsubHovered();
    unsubViewer();
  });

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#6b7280';
    }
  }

  function getSeverityBg(severity: string): string {
    switch (severity) {
      case 'high': return 'rgba(239,68,68,0.12)';
      case 'medium': return 'rgba(245,158,11,0.12)';
      case 'low': return 'rgba(59,130,246,0.12)';
      default: return 'rgba(107,114,128,0.12)';
    }
  }

  function getSelectedBg(severity: string): string {
    switch (severity) {
      case 'high': return 'rgba(239,68,68,0.25)';
      case 'medium': return 'rgba(245,158,11,0.25)';
      case 'low': return 'rgba(59,130,246,0.25)';
      default: return 'rgba(107,114,128,0.25)';
    }
  }
</script>

<svg
  class="absolute left-0 top-0"
  style="pointer-events: none;"
  {width}
  {height}
  viewBox="0 0 {width} {height}"
>
  {#each issues as issue (issue.id)}
    {@const px = bboxToPixels(issue.bbox, width, height)}
    {@const isSelected = issue.id === selectedId}
    {@const isHovered = issue.id === hoveredId}
    {@const visible = showAll || isSelected}
    {@const color = getSeverityColor(issue.severity)}

    {#if visible}
      <!-- Box rect — always filled with severity tint -->
      <rect
        x={px.x}
        y={px.y}
        width={px.width}
        height={px.height}
        fill={isSelected ? getSelectedBg(issue.severity) : isHovered ? getSelectedBg(issue.severity) : getSeverityBg(issue.severity)}
        stroke={color}
        stroke-width={isSelected ? 3 : isHovered ? 2.5 : 1.5}
        rx="3"
        opacity={isSelected || isHovered ? 1 : 0.85}
        style="pointer-events: auto; cursor: pointer;"
        data-clickable
        role="button"
        tabindex="-1"
        onclick={(e: MouseEvent) => { e.stopPropagation(); issuesStore.select(issue.id); viewerStore.goToPage(issue.page); }}
        onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); issuesStore.select(issue.id); } }}
        onpointerenter={() => issuesStore.hover(issue.id)}
        onpointerleave={() => issuesStore.hover(null)}
      />

      <!-- Label — always visible on every box -->
      {@const labelY = px.y >= 26 ? px.y - 24 : px.y + px.height + 2}
      <foreignObject
        x={px.x}
        y={labelY}
        width={Math.max(px.width, 150)}
        height="22"
      >
        <div
          class="pointer-events-none rounded px-1.5 py-0.5 text-xs font-medium text-white truncate w-fit"
          style="background: {isSelected ? color : `${color}cc`};"
        >
          {issue.id}: {issue.title}
        </div>
      </foreignObject>
    {/if}
  {/each}
</svg>
