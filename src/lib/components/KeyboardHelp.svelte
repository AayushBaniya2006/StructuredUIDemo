<script lang="ts">
  let { onClose }: { onClose: () => void } = $props();
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
  onclick={onClose}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-label="Keyboard shortcuts"
>
  <div
    class="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
    onclick={(e) => e.stopPropagation()}
    role="presentation"
  >
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-sm font-semibold text-gray-900">Keyboard Shortcuts</h2>
      <button class="text-gray-400 hover:text-gray-600" onclick={onClose} aria-label="Close">✕</button>
    </div>

    <div class="space-y-1 text-xs">
      {#each [
        { keys: ['j', 'k'], desc: 'Next / prev issue' },
        { keys: ['n', 'p'], desc: 'Next / prev page' },
        { keys: ['+', '−'], desc: 'Zoom in / out' },
        { keys: ['0'], desc: 'Fit page to window' },
        { keys: ['?'], desc: 'Show this help' },
      ] as shortcut}
        <div class="flex items-center justify-between py-1.5 border-b border-gray-50">
          <span class="text-gray-600">{shortcut.desc}</span>
          <div class="flex gap-1">
            {#each shortcut.keys as key}
              <kbd class="rounded bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-700">{key}</kbd>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
