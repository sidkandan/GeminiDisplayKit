/*
 * gemini-flash-meta-displays/display/events.js — SSE client with auto-reconnect.
 *
 * Usage:
 *   <script src="/gemini-flash-meta-displays/display/events.js"></script>
 *   <script>
 *     OmniEvents.connect({
 *       url: "/events",
 *       onEvent: (payload) => { ... },
 *       onOpen:  () => setStatus("live"),
 *       onError: () => setStatus("retry"),
 *     });
 *   </script>
 *
 * Handles the common patterns:
 *   - payload.audioData     — auto-plays base64 audio inline
 *   - payload.type==="error" — auto-tagged so UI can react
 */
(function (global) {
  let source = null;
  let retryDelay = 1000;
  let opts = {};

  function play(payload) {
    if (!payload?.audioData) return;
    try {
      const mime = payload.audioMime || "audio/mpeg";
      const audio = new Audio(`data:${mime};base64,${payload.audioData}`);
      audio.play().catch(() => {});
    } catch (error) {
      console.warn("[omni-events] audio play failed:", error.message);
    }
  }

  function open() {
    if (source) source.close();
    source = new EventSource(opts.url || "/events");
    source.addEventListener("open", () => {
      retryDelay = 1000;
      opts.onOpen?.();
    });
    source.addEventListener("message", (event) => {
      let payload = null;
      try { payload = JSON.parse(event.data); }
      catch { payload = { type: "error", message: "Bad SSE payload" }; }
      play(payload);
      opts.onEvent?.(payload);
    });
    source.addEventListener("error", () => {
      opts.onError?.();
      try { source.close(); } catch {}
      source = null;
      // Exponential backoff capped at 30s
      setTimeout(open, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30_000);
    });
  }

  const OmniEvents = {
    connect(options = {}) {
      opts = options;
      open();
    },
    close() {
      if (source) try { source.close(); } catch {}
      source = null;
    },
  };

  global.OmniEvents = OmniEvents;
})(typeof window !== "undefined" ? window : globalThis);
