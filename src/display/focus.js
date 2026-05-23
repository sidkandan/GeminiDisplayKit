/*
 * gemini-flash-meta-displays/display/focus.js — D-pad / Neural Band focus model.
 *
 * Add `.focusable` to any element. Then:
 *   <script src="/gemini-flash-meta-displays/display/focus.js"></script>
 *   <script>
 *     OmniFocus.init({
 *       onActivate: (el) => sendAction(el.dataset.action),
 *       onEscape: () => togglePause(),
 *     });
 *   </script>
 *
 * Arrow Right / Down → next      Arrow Left / Up → previous
 * Enter / Space → onActivate(focused element)
 * Escape → onEscape()
 *
 * The library is intentionally tiny (no deps, no framework) because
 * Meta Display Web Apps must be plain HTML/CSS/JS.
 */
(function (global) {
  let elements = [];
  let index = 0;
  let opts = {};

  function refresh() {
    elements = Array.from(document.querySelectorAll(".focusable"));
    if (index >= elements.length) index = 0;
    paint();
  }

  function paint() {
    elements.forEach((el, i) => el.classList.toggle("active", i === index));
    elements[index]?.focus({ preventScroll: true });
  }

  function move(delta) {
    if (!elements.length) return;
    index = (index + delta + elements.length) % elements.length;
    paint();
    opts.onMove?.(elements[index]);
  }

  function activate() {
    const el = elements[index];
    if (!el) return;
    opts.onActivate?.(el);
  }

  function onKey(event) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault(); move(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault(); move(-1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault(); activate();
    } else if (event.key === "Escape") {
      event.preventDefault(); opts.onEscape?.();
    }
  }

  const OmniFocus = {
    init(options = {}) {
      opts = options;
      refresh();
      document.addEventListener("keydown", onKey);
      // Click is also valid (desktop testing): treat as focus + activate.
      document.addEventListener("click", (e) => {
        const target = e.target.closest(".focusable");
        if (!target) return;
        index = elements.indexOf(target);
        if (index < 0) { refresh(); index = elements.indexOf(target); }
        paint();
        activate();
      });
      // Re-scan when DOM changes (cheap MutationObserver).
      new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
    },
    refresh,
    moveNext: () => move(1),
    movePrev: () => move(-1),
    activate,
    current: () => elements[index] || null,
  };

  global.OmniFocus = OmniFocus;
})(typeof window !== "undefined" ? window : globalThis);
