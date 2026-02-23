<script>
  let { count, onKeep, onDeleteAll } = $props()
</script>

<!-- Full-screen overlay -->
<div class="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
  <div class="mx-4 p-5 rounded-2xl bg-[var(--bg-card)] border border-white/10 max-w-[320px] w-full shadow-2xl">
    <!-- Warning icon -->
    <div class="flex justify-center mb-3">
      <div class="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-[var(--danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
        </svg>
      </div>
    </div>

    <!-- Title & description -->
    <h2 class="text-center text-sm font-semibold text-white mb-1">Daily Cleanup</h2>
    <p class="text-center text-[11px] text-white/50 mb-4 leading-relaxed">
      You have <span class="text-[var(--accent)] font-semibold">{count}</span> snippet{count !== 1 ? 's' : ''} waiting.<br/>
      Review them now or clear the slate.
    </p>

    <!-- Actions -->
    <div class="flex gap-2">
      <button
        onclick={onKeep}
        class="flex-1 py-2.5 rounded-xl text-xs font-medium
          bg-white/10 hover:bg-white/15 text-white/80 hover:text-white
          transition-all duration-150 border border-white/5"
      >
        Keep for now
      </button>
      <button
        onclick={onDeleteAll}
        class="flex-1 py-2.5 rounded-xl text-xs font-medium
          bg-red-500/20 hover:bg-red-500/30 text-[var(--danger)]
          transition-all duration-150 border border-red-500/20"
      >
        Delete All
      </button>
    </div>
  </div>
</div>
