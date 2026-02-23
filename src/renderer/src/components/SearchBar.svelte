<script>
  let { onSearch, onClear, onClose } = $props()
  let query = $state('')
  let inputEl

  function handleInput() {
    if (query.trim()) {
      onSearch(query.trim())
    } else {
      onClear()
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      query = ''
      onClear()
      onClose()
    }
  }

  $effect(() => {
    // Auto-focus when opened
    if (inputEl) inputEl.focus()
  })
</script>

<div class="px-3 py-2 border-b border-white/5 animate-fade-in">
  <div class="relative">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30"
      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
    >
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
    <input
      bind:this={inputEl}
      bind:value={query}
      oninput={handleInput}
      onkeydown={handleKeydown}
      type="text"
      placeholder="Search snippets…"
      class="w-full pl-8 pr-8 py-2 rounded-lg text-xs
        bg-white/[0.05] border border-white/10 text-white/90
        placeholder:text-white/30
        focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/20
        transition-all"
    />
    {#if query}
      <button
        onclick={() => { query = ''; onClear(); }}
        class="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    {/if}
  </div>
</div>
