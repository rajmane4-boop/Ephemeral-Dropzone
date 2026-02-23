<script>
  let { snippets, selectedId, onDelete, onSavePermanent, onSelect } = $props();
  import SnippetCard from "./SnippetCard.svelte";
</script>

{#if snippets.length === 0}
  <div
    class="flex flex-col items-center justify-center h-full opacity-30 px-6 py-12"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="w-10 h-10 mb-3 text-white/20"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="1"
    >
      <path
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
    <p class="text-sm text-white/30 text-center">
      Your dropzone is empty.<br />Drag something in or press Ctrl+V to paste.
    </p>
  </div>
{:else}
  <div class="px-2 py-1 space-y-1.5">
    {#each snippets as snippet (snippet.id)}
      <SnippetCard
        {snippet}
        selected={selectedId === snippet.id}
        onDelete={() => onDelete(snippet.id)}
        onSavePermanent={() => onSavePermanent(snippet.id)}
        onSelect={() => onSelect(snippet.id)}
      />
    {/each}
  </div>
{/if}
