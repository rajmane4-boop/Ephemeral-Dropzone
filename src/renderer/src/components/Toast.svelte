<script>
  let { message, visible } = $props()
</script>

{#if visible}
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
    <div class="px-4 py-2 rounded-full text-[11px] font-medium
      bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent-glow)]
      whitespace-nowrap">
      {message}
    </div>
  </div>
{/if}
