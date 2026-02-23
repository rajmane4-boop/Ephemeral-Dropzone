<script>
  let isDragging = $state(false);

  function handleDragOver(e) {
    e.preventDefault();
    isDragging = true;
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(e) {
    e.preventDefault();
    isDragging = false;
  }

  function handleDrop(e) {
    isDragging = false;
    // Let the event bubble up to App.svelte's root div handler
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="mx-3 my-2 rounded-xl border-2 border-dashed transition-all duration-200 flex-shrink-0
    {isDragging
    ? 'border-[var(--accent)] bg-[var(--accent-glow)] scale-[1.02]'
    : 'border-white/10 hover:border-white/20 bg-white/[0.02]'}"
  style="min-height: 80px;"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  role="region"
  aria-label="Drop zone"
>
  <div
    class="flex flex-col items-center justify-center h-full py-4 pointer-events-none"
  >
    {#if isDragging}
      <div class="text-[var(--accent)] mb-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-7 h-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path d="M12 4v16m0-16-4 4m4-4 4 4" />
        </svg>
      </div>
      <p class="text-sm font-medium text-[var(--accent)]">Release to capture</p>
    {:else}
      <div class="text-white/20 mb-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </div>
      <p class="text-xs text-white/30 font-medium">
        Drop text, links, or images
      </p>
    {/if}
  </div>
</div>
