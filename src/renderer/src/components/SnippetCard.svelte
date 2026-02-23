<script>
  let { snippet, selected, onDelete, onSavePermanent, onSelect } = $props();
  let showActions = $state(false);
  let copied = $state(false);
  let dragging = $state(false);

  function getTypeIcon(type) {
    const icons = {
      text: `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>`,
      link: `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1"/></svg>`,
      image: `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
      file: `<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
    };
    return icons[type] || icons.text;
  }

  function getTypeColor(type) {
    const colors = {
      text: "#4A8FD4",
      link: "#38BDF8",
      image: "#A78BFA",
      file: "#FBBF24",
    };
    return colors[type] || colors.text;
  }

  async function copyContent() {
    try {
      if (snippet.type === "image" && snippet.thumbnail) {
        const img = new Image();
        const loaded = new Promise((resolve) => {
          img.onload = resolve;
        });
        img.src = snippet.thumbnail;
        await loaded;
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        const pngBlob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngBlob }),
        ]);
      } else {
        await navigator.clipboard.writeText(snippet.content);
      }
    } catch {
      await navigator.clipboard.writeText(snippet.content);
    }
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 1500);
  }

  function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function truncate(text, max = 120) {
    return text.length > max ? text.slice(0, max) + "…" : text;
  }

  // ── Outbound drag: set dataTransfer with snippet content ──
  function handleDragStart(e) {
    dragging = true;

    // Always set plain text
    e.dataTransfer.setData("text/plain", snippet.content);

    if (snippet.type === "link") {
      e.dataTransfer.setData("text/uri-list", snippet.content);
      e.dataTransfer.setData(
        "text/html",
        `<a href="${snippet.content}">${snippet.content}</a>`,
      );
    } else if (snippet.type === "image" && snippet.thumbnail) {
      e.dataTransfer.setData("text/html", `<img src="${snippet.thumbnail}" />`);
      if (snippet.thumbnail.startsWith("http")) {
        e.dataTransfer.setData("text/uri-list", snippet.thumbnail);
      }
    } else {
      // Wrap in <pre> to preserve whitespace/newlines, HTML-escape content
      const escaped = snippet.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      e.dataTransfer.setData("text/html", `<pre>${escaped}</pre>`);
    }

    e.dataTransfer.effectAllowed = "copyMove";
  }

  function handleDragEnd() {
    dragging = false;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="group relative rounded-lg p-2.5 transition-all duration-150 animate-fade-in
    cursor-grab border
    {selected
    ? 'bg-[var(--bg-hover)] border-[var(--accent)]/40 ring-1 ring-[var(--accent)]/20'
    : 'hover:bg-[var(--bg-hover)] border-transparent hover:border-white/5'}
    {dragging ? 'opacity-40 scale-95' : ''}"
  onmouseenter={() => (showActions = true)}
  onmouseleave={() => (showActions = false)}
  onclick={onSelect}
  draggable="true"
  ondragstart={handleDragStart}
  ondragend={handleDragEnd}
>
  <!-- Drag handle indicator -->
  <div
    class="absolute top-2 left-0.5 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="w-2.5 h-2.5 text-white"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
    </svg>
  </div>

  <!-- Type badge + content -->
  <div class="flex items-start gap-2">
    <div
      class="flex-shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center"
      style="background: {getTypeColor(snippet.type)}22; color: {getTypeColor(
        snippet.type,
      )}"
    >
      {@html getTypeIcon(snippet.type)}
    </div>

    <div class="flex-1 min-w-0">
      {#if snippet.type === "image" && snippet.thumbnail}
        <!-- svelte-ignore a11y_missing_attribute -->
        <img
          src={snippet.thumbnail}
          alt=""
          class="w-full h-20 object-cover rounded-md mb-1"
        />
      {/if}

      {#if snippet.type === "link"}
        <p
          class="text-sm text-[var(--type-link)] break-all leading-relaxed font-mono"
        >
          {truncate(snippet.content, 100)}
        </p>
      {:else}
        <p class="text-sm text-white/80 break-words leading-relaxed">
          {truncate(snippet.content)}
        </p>
      {/if}

      <div class="flex items-center gap-2 mt-1">
        <p class="text-[11px] text-[var(--text-secondary)]">
          {formatTime(snippet.created_at)}
        </p>
        {#if selected}
          <span
            class="text-[10px] text-[var(--accent)] font-medium uppercase tracking-wider"
            >selected</span
          >
        {/if}
      </div>
    </div>
  </div>

  <!-- Action buttons (bottom bar on hover) -->
  {#if showActions}
    <div
      class="flex items-center gap-1 mt-2 pt-2 border-t border-white/5 animate-fade-in"
    >
      <button
        onclick={(e) => {
          e.stopPropagation();
          copyContent();
        }}
        class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-white/5 hover:bg-white/15 transition-colors text-white/50 hover:text-white text-xs"
        title="Copy (Ctrl+C)"
      >
        {#if copied}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-3.5 h-3.5 text-[var(--success)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"><path d="M5 12l5 5L20 7" /></svg
          >
          <span class="text-[var(--success)]">Copied</span>
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            ><rect width="14" height="14" x="8" y="8" rx="2" /><path
              d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
            /></svg
          >
          <span>Copy</span>
        {/if}
      </button>
      <button
        onclick={(e) => {
          e.stopPropagation();
          onSavePermanent();
        }}
        class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-white/5 hover:bg-white/15 transition-colors text-white/50 hover:text-white text-xs"
        title="Save permanently"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
            points="7 10 12 15 17 10"
          /><line x1="12" y1="15" x2="12" y2="3" /></svg
        >
        <span>Save</span>
      </button>
      <button
        onclick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-white/5 hover:bg-red-500/20 transition-colors text-white/50 hover:text-[var(--danger)] text-xs"
        title="Delete"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          ><path d="M3 6h18" /><path
            d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
          /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg
        >
        <span>Delete</span>
      </button>
    </div>
  {/if}
</div>
