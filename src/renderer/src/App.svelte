<script>
  import DropZone from "./components/DropZone.svelte";
  import SnippetList from "./components/SnippetList.svelte";
  import SearchBar from "./components/SearchBar.svelte";
  import DoomsdayPrompt from "./components/DoomsdayPrompt.svelte";
  import Toast from "./components/Toast.svelte";

  let expanded = $state(false);
  let snippets = $state([]);
  let showSearch = $state(false);
  let showDoomsday = $state(false);
  let toastMessage = $state("");
  let toastVisible = $state(false);
  let selectedId = $state(null);
  let dockSide = $state("right"); // 'left' or 'right'
  let isDockDragging = $state(false);
  let isDockSwitching = $state(false);
  let dockDragX = $state(0);

  // ── Drag tracking ──────────────────────────────
  let dragCounter = 0;
  let isDragging = false;
  let isOutboundDrag = false; // true when dragging OUT from a snippet card
  let collapseTimer = null;

  // Load snippets and dock side on mount
  async function loadSnippets() {
    snippets = await window.api.getSnippets();
  }

  async function loadDockSide() {
    dockSide = await window.api.getDockSide();
  }

  // Initial load
  loadSnippets();
  loadDockSide();

  function showToast(msg) {
    toastMessage = msg;
    toastVisible = true;
    setTimeout(() => {
      toastVisible = false;
    }, 2200);
  }

  // Decode file:// URI-encoded content (some IDEs put code on clipboard as file URIs)
  function cleanContent(text) {
    if (!text) return text;
    // Detect file:// URI or heavily URL-encoded text (%20 for spaces)
    if (
      text.startsWith("file://") ||
      (/%20/.test(text) &&
        /%[0-9A-Fa-f]{2}/.test(text) &&
        text.includes("%20%20"))
    ) {
      try {
        let cleaned = text;
        // Strip file:// prefix if present
        if (cleaned.startsWith("file:///")) {
          cleaned = cleaned.slice(8); // file:///
        } else if (cleaned.startsWith("file://")) {
          cleaned = cleaned.slice(7); // file://
        }
        cleaned = decodeURIComponent(cleaned);
        return cleaned;
      } catch {
        return text;
      }
    }
    return text;
  }

  async function handleDrop(data) {
    // Clean content to decode any URL-encoded text
    if (data.content) {
      data.content = cleanContent(data.content);
    }
    const result = await window.api.saveSnippet(data);
    snippets = [result, ...snippets];
    showToast(`${data.type} captured!`);
  }

  async function handleDelete(id) {
    await window.api.deleteSnippet(id);
    snippets = snippets.filter((s) => s.id !== id);
    if (selectedId === id) selectedId = null;
    showToast("Snippet deleted");
  }

  async function handleSavePermanent(id) {
    const result = await window.api.savePermanent(id);
    if (result.success) {
      showToast("Saved permanently!");
    }
  }

  async function handleDeleteAll() {
    await window.api.deleteAll();
    snippets = [];
    selectedId = null;
    showDoomsday = false;
    showToast("All snippets cleared!");
  }

  let expanding = false; // Guard against rapid mouseenter/mouseleave during resize

  function doExpand() {
    if (collapseTimer) {
      clearTimeout(collapseTimer);
      collapseTimer = null;
    }
    if (!expanded && !expanding) {
      expanding = true;
      // Step 1: Resize window FIRST (24px → 380px)
      window.api.expand();
      // Step 2: Wait for window resize to settle, THEN render content
      setTimeout(() => {
        expanded = true;
        loadSnippets();
      }, 80);
      // Step 3: Unlock after animation fully completes
      setTimeout(() => {
        expanding = false;
      }, 700);
    }
  }

  function doCollapse() {
    if (showDoomsday) return;
    if (isDragging) return; // NEVER collapse during an inbound drag
    if (isOutboundDrag) return; // NEVER collapse during outbound drag
    if (expanding) return; // NEVER collapse while expanding
    expanded = false;
    expanding = false;
    showSearch = false;
    window.api.collapse();
  }

  // Debounced collapse — gives time for window resize to settle
  function scheduleCollapse() {
    if (expanding) return; // Don't schedule collapse during expansion
    if (collapseTimer) clearTimeout(collapseTimer);
    collapseTimer = setTimeout(() => {
      collapseTimer = null;
      if (dragCounter <= 0 && !isDragging && !isOutboundDrag) {
        doCollapse();
      }
    }, 400);
  }

  function handleMouseEnter() {
    if (expanding) return; // Ignore spurious events during resize
    doExpand();
  }

  function handleMouseLeave() {
    if (expanding) return; // Ignore mouseleave during expansion
    if (!isDragging && !isOutboundDrag) {
      scheduleCollapse();
    }
  }

  function handleDragEnter(e) {
    e.preventDefault();
    dragCounter++;
    isDragging = true;
    doExpand();
  }

  function handleDragOver(e) {
    e.preventDefault();
    // Keep alive — cancel any pending collapse
    if (collapseTimer) {
      clearTimeout(collapseTimer);
      collapseTimer = null;
    }
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      // Don't collapse immediately — the window resize might cause a brief leave
      scheduleCollapse();
    }
  }

  function handleDragDrop(e) {
    e.preventDefault();
    // Reset drag state
    dragCounter = 0;
    isDragging = false;
    if (collapseTimer) {
      clearTimeout(collapseTimer);
      collapseTimer = null;
    }

    // Skip processing if this is an outbound drag dropping back on the widget
    if (isOutboundDrag) {
      isOutboundDrag = false;
      return;
    }

    const imageExtensions = /\.(jpe?g|png|gif|webp|svg|bmp|ico|tiff?)(\?.*)?$/i;

    // Helper: check if a file is an image (by MIME type OR extension)
    function isImageFile(file) {
      if (file.type && file.type.startsWith("image/")) return true;
      const name = file.name || file.path || "";
      return imageExtensions.test(name);
    }

    // Helper: read a File/Blob as image
    function readImageFile(file, name) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        handleDrop({
          type: "image",
          content: name || "Dropped image",
          thumbnail: ev.target.result,
        });
      };
      reader.readAsDataURL(file);
    }

    // 1. Check e.dataTransfer.files (desktop file drops, Explorer)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      let handled = false;
      for (const file of e.dataTransfer.files) {
        if (isImageFile(file)) {
          readImageFile(file, file.name || file.path);
          handled = true;
        } else {
          handleDrop({ type: "file", content: file.path || file.name });
          handled = true;
        }
      }
      if (handled) return;
    }

    // 2. Check e.dataTransfer.items (Word, rich apps, clipboard manager)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      let handled = false;
      for (const item of e.dataTransfer.items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && isImageFile(file)) {
            readImageFile(file, file.name);
            handled = true;
          } else if (file) {
            handleDrop({ type: "file", content: file.name });
            handled = true;
          }
        }
      }
      if (handled) return;
    }

    // 3. Check HTML for <img> tags (web images, Word rich content)
    const html = e.dataTransfer.getData("text/html");
    if (html) {
      // Match img src with single or double quotes
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        const src = imgMatch[1];
        // For local file:// paths (Word temp files), read via main process
        if (src.startsWith("file:///") || src.startsWith("file://")) {
          window.api.readLocalImage(src).then((dataUrl) => {
            if (dataUrl) {
              handleDrop({
                type: "image",
                content: "Word image",
                thumbnail: dataUrl,
              });
            } else {
              handleDrop({ type: "image", content: src, thumbnail: src });
            }
          });
          return;
        }
        // For data: URLs or http(s) URLs, use directly
        handleDrop({ type: "image", content: src, thumbnail: src });
        return;
      }
    }

    // 4. Check URI list (only http/https URLs, not file:// which are IDE artifacts)
    const url = e.dataTransfer.getData("text/uri-list");
    if (url) {
      const cleanUrl = url.split("\n")[0].trim();
      // Only handle real web URLs, not file:// URIs from IDEs/Word
      if (/^https?:\/\//i.test(cleanUrl)) {
        if (imageExtensions.test(cleanUrl)) {
          handleDrop({ type: "image", content: cleanUrl, thumbnail: cleanUrl });
        } else {
          handleDrop({ type: "link", content: cleanUrl });
        }
        return;
      }
      // file:// URIs fall through to plain text step
    }

    // 5. Plain text fallback (also capture HTML if available)
    const text = e.dataTransfer.getData("text/plain");
    if (text) {
      const trimmed = text.trim();
      // Filter HTML: only keep genuine rich formatting, reject IDE/file URI garbage
      let cleanHtml = null;
      if (html) {
        const isGarbage =
          /file:\/\//i.test(html) ||
          /%20%20%20/.test(html) ||
          /%7B|%7D/.test(html);
        const hasRichContent =
          !isGarbage &&
          /<(b|strong|i|em|u|h[1-6]|table|ul|ol|li)\b/i.test(html);
        if (hasRichContent) {
          cleanHtml = html;
        }
      }
      if (imageExtensions.test(trimmed)) {
        handleDrop({ type: "image", content: trimmed, thumbnail: trimmed });
      } else {
        const isUrl = /^https?:\/\//i.test(trimmed);
        handleDrop({
          type: isUrl ? "link" : "text",
          content: trimmed,
          htmlContent: cleanHtml,
        });
      }
      return;
    }

    // 6. Nothing matched — likely an OLE drag (Word, Excel, etc.)
    showToast("Use Ctrl+C in Word, then Ctrl+V here to paste images");
  }

  function handleDragEnd() {
    dragCounter = 0;
    isDragging = false;
    isOutboundDrag = false;
  }

  // Detect outbound drags starting from inside the widget (snippet cards)
  function handleInternalDragStart() {
    isOutboundDrag = true;
  }

  // ── Dock Side Toggle & Drag-to-dock ──────────────────────
  async function switchDockWithAnimation(newSide) {
    if (newSide === dockSide) return;

    // Phase 1: Slide out in the current direction
    isDockSwitching = true;
    await new Promise((r) => setTimeout(r, 250));

    // Phase 2: Reposition
    expanded = false;
    showSearch = false;
    dockSide = newSide;
    await window.api.setDockSide(newSide);

    // Phase 3: Brief pause then expand on new side
    await new Promise((r) => setTimeout(r, 100));
    isDockSwitching = false;
    expanded = true;
    window.api.expand();
    showToast(`Docked to ${newSide}`);
  }

  function toggleDockSide() {
    const newSide = dockSide === "right" ? "left" : "right";
    switchDockWithAnimation(newSide);
  }

  // Drag-to-dock: mousedown on the header grip starts tracking
  function handleDockDragStart(e) {
    e.preventDefault();
    isDockDragging = true;
    dockDragX = e.screenX;

    const onMove = (ev) => {
      dockDragX = ev.screenX;
    };

    const onUp = async (ev) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      isDockDragging = false;

      const screenWidth = window.screen.availWidth;
      const cursorX = ev.screenX;
      const newSide = cursorX < screenWidth / 2 ? "left" : "right";
      switchDockWithAnimation(newSide);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleSelect(id) {
    selectedId = selectedId === id ? null : id;
  }

  // ── Helper: convert data URL to Blob ──────────
  function dataUrlToBlob(dataUrl) {
    const [header, base64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  }

  // ── Helper: copy a snippet to clipboard (text or image) ──
  async function copySnippetToClipboard(snippet) {
    if (snippet.type === "image" && snippet.thumbnail) {
      try {
        const blob = dataUrlToBlob(snippet.thumbnail);
        // Clipboard API requires image/png
        let pngBlob = blob;
        if (blob.type !== "image/png") {
          // Convert to PNG via canvas
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
          pngBlob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/png"),
          );
        }
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": pngBlob }),
        ]);
        return true;
      } catch {
        await navigator.clipboard.writeText(snippet.content);
        return true;
      }
    }

    // Always write plain text for text snippets
    await navigator.clipboard.writeText(snippet.content);
    return true;
  }

  async function handleCopy() {
    const target = selectedId
      ? snippets.find((s) => s.id === selectedId)
      : snippets[0];
    if (!target) return;
    await copySnippetToClipboard(target);
    showToast(
      target.type === "image" ? "Image copied!" : "Copied to clipboard!",
    );
  }

  async function handlePaste() {
    try {
      // Use native Electron clipboard for reliable text reading (preserves newlines)
      const clip = await window.api.clipboardReadHtml();

      // 1. Check for image (only when no text)
      if (!clip.text?.trim() && clip.image) {
        await handleDrop({
          type: "image",
          content: "Pasted image",
          thumbnail: clip.image,
        });
        return;
      }

      // 2. Text content — native clipboard preserves newlines properly
      if (clip.text && clip.text.trim()) {
        const trimmed = clip.text.trim();
        const isUrl = /^https?:\/\//i.test(trimmed);
        await handleDrop({
          type: isUrl ? "link" : "text",
          content: trimmed,
        });
        return;
      }
    } catch {
      // Native clipboard failed
    }

    // 3. Fallback: web Clipboard API
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = (ev) => {
            handleDrop({
              type: "image",
              content: "Pasted image",
              thumbnail: ev.target.result,
            });
          };
          reader.readAsDataURL(blob);
          return;
        }
        if (item.types.includes("text/plain")) {
          const blob = await item.getType("text/plain");
          const text = await blob.text();
          if (text && text.trim()) {
            const isUrl = /^https?:\/\//i.test(text.trim());
            await handleDrop({
              type: isUrl ? "link" : "text",
              content: text.trim(),
            });
          }
          return;
        }
      }
    } catch {
      showToast("Clipboard access denied");
    }
  }

  async function handleCut() {
    const target = selectedId
      ? snippets.find((s) => s.id === selectedId)
      : snippets[0];
    if (!target) return;
    await copySnippetToClipboard(target);
    await handleDelete(target.id);
    selectedId = null;
    showToast(target.type === "image" ? "Image cut!" : "Cut to clipboard!");
  }

  function handleKeydown(e) {
    if (!expanded) return;
    // Skip if user is typing in search bar
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    if (e.ctrlKey || e.metaKey) {
      if (e.key === "c") {
        e.preventDefault();
        handleCopy();
      } else if (e.key === "v") {
        e.preventDefault();
        handlePaste();
      } else if (e.key === "x") {
        e.preventDefault();
        handleCut();
      }
    }
  }

  // Listen for main process events
  $effect(() => {
    window.api.onDoomsday(() => {
      expanded = true;
      showDoomsday = true;
      loadSnippets();
    });

    window.api.onHotkeySearch(() => {
      expanded = true;
      showSearch = true;
      loadSnippets();
    });

    // Safety net: always reset drag state
    const resetDrag = () => {
      dragCounter = 0;
      isDragging = false;
      isOutboundDrag = false;
    };
    document.addEventListener("drag-reset", resetDrag);

    // Initial load
    loadSnippets();

    return () => {
      document.removeEventListener("drag-reset", resetDrag);
    };
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="h-screen w-full"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  ondragstart={handleInternalDragStart}
  ondragenter={handleDragEnter}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDragDrop}
  ondragend={handleDragEnd}
  onkeydown={handleKeydown}
  tabindex="-1"
>
  {#if !expanded}
    <!-- Collapsed: thin accent strip -->
    <div
      class="h-full w-full flex items-center justify-center"
      style="background: linear-gradient(180deg, #4A8FD4 0%, #112D4E 50%, #4A8FD4 100%);"
    >
      <div class="w-1.5 h-16 rounded-full bg-white/30 animate-pulse-glow"></div>
    </div>
  {:else}
    <!-- Expanded: full panel -->
    <div
      class="glass h-full flex flex-col {isDockSwitching
        ? dockSide === 'left'
          ? 'animate-slide-out-right'
          : 'animate-slide-out-left'
        : dockSide === 'left'
          ? 'animate-slide-in-left'
          : 'animate-slide-in'}"
    >
      <!-- Draggable dock grip bar -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="flex flex-col items-center justify-center gap-1.5 py-3.5 cursor-grab active:cursor-grabbing border-b border-white/5 flex-shrink-0 hover:bg-white/8 transition-colors group/grip"
        onmousedown={handleDockDragStart}
        title="Drag to dock left or right"
      >
        <div class="flex gap-1.5">
          <div
            class="w-2 h-2 rounded-full bg-white/25 group-hover/grip:bg-[var(--accent)] transition-colors"
          ></div>
          <div
            class="w-2 h-2 rounded-full bg-white/25 group-hover/grip:bg-[var(--accent)] transition-colors"
          ></div>
          <div
            class="w-2 h-2 rounded-full bg-white/25 group-hover/grip:bg-[var(--accent)] transition-colors"
          ></div>
          <div
            class="w-2 h-2 rounded-full bg-white/25 group-hover/grip:bg-[var(--accent)] transition-colors"
          ></div>
          <div
            class="w-2 h-2 rounded-full bg-white/25 group-hover/grip:bg-[var(--accent)] transition-colors"
          ></div>
        </div>
        <div class="flex gap-1.5">
          <div
            class="w-2 h-2 rounded-full bg-white/25 group-hover/grip:bg-[var(--accent)] transition-colors"
          ></div>
          <div
            class="w-2 h-2 rounded-full bg-white/25 group-hover/grip:bg-[var(--accent)] transition-colors"
          ></div>
          <div
            class="w-2 h-2 rounded-full bg-white/25 group-hover/grip:bg-[var(--accent)] transition-colors"
          ></div>
          <div
            class="w-2 h-2 rounded-full bg-white/25 group-hover/grip:bg-[var(--accent)] transition-colors"
          ></div>
          <div
            class="w-2 h-2 rounded-full bg-white/25 group-hover/grip:bg-[var(--accent)] transition-colors"
          ></div>
        </div>
      </div>

      <!-- Header -->
      <header
        class="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-shrink-0"
      >
        <div class="flex items-center gap-2">
          <div
            class="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse-glow"
          ></div>
          <h1 class="text-base font-semibold tracking-wide text-white/90">
            Dropzone
          </h1>
        </div>
        <div class="flex items-center gap-1">
          <button
            onclick={toggleDockSide}
            class="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white/90"
            title="Move to {dockSide === 'right' ? 'left' : 'right'} side"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5 {dockSide === 'right' ? '' : 'rotate-180'}"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
            </svg>
          </button>
          <!-- Paste button -->
          <button
            onclick={handlePaste}
            class="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white/90"
            title="Paste from clipboard (Ctrl+V)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
              />
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
            </svg>
          </button>
          <!-- Search button -->
          <button
            onclick={() => {
              showSearch = !showSearch;
            }}
            class="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white/90"
            title="Search (Ctrl+Shift+Space)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </button>
          <!-- Manual cleanup trigger -->
          <button
            onclick={() => {
              showDoomsday = true;
            }}
            class="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-white/50 hover:text-[var(--danger)]"
            title="Review & clean up snippets"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
              />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
          <span class="text-xs text-white/25 font-mono">{snippets.length}</span>
          <!-- Exit button -->
          <button
            onclick={() => window.api.exitApp()}
            class="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-white/30 hover:text-[var(--danger)]"
            title="Exit Dropzone (Ctrl+Q)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Keyboard shortcut hint -->
      <div class="px-4 py-1.5 flex gap-3 border-b border-white/5 flex-shrink-0">
        <span class="text-[11px] text-white/20 font-mono">Ctrl+V paste</span>
        <span class="text-[11px] text-white/20 font-mono">Ctrl+C copy</span>
        <span class="text-[11px] text-white/20 font-mono">Ctrl+X cut</span>
      </div>

      <!-- Search Bar (toggled) -->
      {#if showSearch}
        <SearchBar
          onSearch={async (q) => {
            snippets = await window.api.searchSnippets(q);
          }}
          onClear={loadSnippets}
          onClose={() => {
            showSearch = false;
          }}
        />
      {/if}

      <!-- Drop Zone -->
      <DropZone />

      <!-- Snippet List -->
      <div class="flex-1 overflow-y-auto min-h-0">
        <SnippetList
          {snippets}
          {selectedId}
          onDelete={handleDelete}
          onSavePermanent={handleSavePermanent}
          onSelect={handleSelect}
        />
      </div>

      <!-- Doomsday Prompt -->
      {#if showDoomsday}
        <DoomsdayPrompt
          count={snippets.length}
          onKeep={() => {
            showDoomsday = false;
          }}
          onDeleteAll={handleDeleteAll}
        />
      {/if}
    </div>
  {/if}

  <!-- Toast -->
  <Toast message={toastMessage} visible={toastVisible} />
</div>
