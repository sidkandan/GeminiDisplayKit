(function () {
  const els = {
    scene: document.getElementById("scene"),
    caption: document.getElementById("caption"),
    choices: document.getElementById("choices"),
    loading: document.getElementById("loading"),
  };

  let choices = [];
  let active = 0;
  let seq = -1;
  let committing = false;

  function renderChoices() {
    els.choices.innerHTML = "";
    choices.forEach((c, i) => {
      const el = document.createElement("div");
      el.className = "choice" + (i === active ? " active" : "");
      el.innerHTML = '<span class="dot"></span><span></span>';
      el.querySelector("span:last-child").textContent = c.label || c;
      el.addEventListener("click", () => { active = i; commit(); });
      els.choices.appendChild(el);
    });
  }

  function setActive(i) {
    if (!choices.length) return;
    active = (i + choices.length) % choices.length;
    [...els.choices.children].forEach((el, idx) => el.classList.toggle("active", idx === active));
  }

  async function poll() {
    try {
      const d = await (await fetch("/scene-data")).json();
      els.loading.classList.toggle("on", !!d.generating);
      if (d.seq === seq) return;
      seq = d.seq;
      if (d.hasImage) els.scene.src = "/scene-image?seq=" + seq;
      els.caption.textContent = d.caption || "";
      choices = d.choices || [];
      active = 0;
      renderChoices();
      committing = false;
    } catch (_) { /* network blip; retry next tick */ }
  }

  async function commit() {
    if (committing || !choices.length) return;
    committing = true;
    els.loading.classList.add("on");
    try {
      await fetch("/choose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ index: active }),
      });
    } catch (_) {
      committing = false;
      els.loading.classList.remove("on");
    }
  }

  // Neural Band: arrows = swipe, Enter/Space = pinch
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commit(); }
  });

  poll();
  setInterval(poll, 1400);
})();
