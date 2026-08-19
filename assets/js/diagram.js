document.addEventListener("DOMContentLoaded", () => {
  const host = document.getElementById("diagram-svg-host");
  const stage = document.getElementById("diagram-stage");
  const video = document.getElementById("diagram-video");
  const memoryEl = document.getElementById("diagram-memory-text");
  if (!host || !stage) return;

  fetch("assets/img/model_overview_interactive.svg")
    .then((r) => r.text())
    .then((raw) => {
      const cleaned = raw
        .replace(/<\?xml[^>]*\?>/, "")
        .replace(/<!DOCTYPE[^>]*>/, "");
      host.innerHTML = cleaned;
      initDiagram();
    })
    .catch(() => {
      host.innerHTML = "";
    });

  function initDiagram() {
    const svg = host.querySelector("svg");
    if (!svg) return;

    const byId = (id) => host.querySelector("#" + CSS.escape(id));
    const byRole = (role) =>
      Array.from(host.querySelectorAll('[data-role="' + role + '"]'));

    const eventClassifierBox = byId("event-classifier-box");
    const dashedBorder = byId("event-classifier-dashed-border");
    const annotation = byRole("event-classifier-annotation");
    const hcacheCylinder = byRole("hcache-cylinder");
    const slot1 = byId("hcache-slot-1");
    const slot2 = byId("hcache-slot-2");
    const slot3 = byId("hcache-slot-3");
    const slot4 = byRole("hcache-slot-4-empty");
    const ztLabel = byRole("ztlabel-connector");
    const keyframeEncoder = byRole("keyframe-encoder-box");

    const SLIDE_UNITS = 22;
    const slotEls = [slot1, slot2, slot3, ...slot4].filter(Boolean);

    const fadeGroups = [
      eventClassifierBox,
      dashedBorder,
      ...annotation,
      ...ztLabel,
    ].filter(Boolean);

    fadeGroups.forEach((el) => {
      el.style.transition = "opacity 0.5s ease";
      el.style.opacity = "0";
    });
    slotEls.forEach((el) => {
      el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      el.style.transform = "translateX(" + SLIDE_UNITS + "px)";
      el.style.opacity = "0";
    });
    hcacheCylinder.forEach((el) => {
      el.style.transition = "opacity 0.6s ease";
      el.style.opacity = "0.22";
    });

    const EVENTS = [
      { t: 7.3, label: "human tap", slots: [slot1] },
      { t: 11.44, label: "grabbed spoon", slots: [slot2] },
      { t: 14.56, label: "scooped beans", slots: [slot3] },
      { t: 19.76, label: "poured beans", slots: slot4 },
    ];

    let fired = 0;
    let history = [];

    function setMemory(text) {
      if (memoryEl) memoryEl.textContent = text;
    }

    function revealSlot(el) {
      if (!el) return;
      el.style.opacity = "1";
      el.style.transform = "translateX(0)";
    }

    function hideSlot(el) {
      if (!el) return;
      el.style.opacity = "0";
      el.style.transform = "translateX(" + SLIDE_UNITS + "px)";
    }

    function resetDiagram() {
      fired = 0;
      history = [];
      setMemory("History: none");
      fadeGroups.forEach((el) => (el.style.opacity = "0"));
      slotEls.forEach(hideSlot);
      hcacheCylinder.forEach((el) => (el.style.opacity = "0.22"));
    }

    function revealClassifier() {
      eventClassifierBox.style.opacity = "1";
      dashedBorder.style.opacity = "1";
      annotation.forEach((el) => (el.style.opacity = "1"));
      ztLabel.forEach((el) => (el.style.opacity = "1"));
    }

    function flyToEncoder(sourceEl) {
      if (!sourceEl || keyframeEncoder.length === 0) return;
      const imgSrc = sourceEl.matches("image")
        ? sourceEl
        : sourceEl.querySelector("image");
      if (!imgSrc) return;
      const href =
        imgSrc.getAttribute("xlink:href") || imgSrc.getAttribute("href");
      if (!href) return;

      const srcRect = sourceEl.getBoundingClientRect();
      const dstRect = keyframeEncoder[0].getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();

      const clone = document.createElement("img");
      clone.src = href;
      clone.style.position = "absolute";
      clone.style.left = srcRect.left - stageRect.left + "px";
      clone.style.top = srcRect.top - stageRect.top + "px";
      clone.style.width = srcRect.width + "px";
      clone.style.height = srcRect.height + "px";
      clone.style.borderRadius = "6px";
      clone.style.boxShadow = "0 4px 14px rgba(0,0,0,0.25)";
      clone.style.zIndex = "5";
      clone.style.transition =
        "transform 0.9s cubic-bezier(.4,0,.2,1), opacity 0.9s ease";
      clone.style.pointerEvents = "none";
      stage.appendChild(clone);

      const dx = dstRect.left + dstRect.width / 2 - (srcRect.left + srcRect.width / 2);
      const dy = dstRect.top + dstRect.height / 2 - (srcRect.top + srcRect.height / 2);

      requestAnimationFrame(() => {
        clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.35)`;
        clone.style.opacity = "0";
      });
      setTimeout(() => clone.remove(), 1000);
    }

    function fireEvent(ev) {
      history.push(ev.label);
      setMemory("History: " + history.join(", "));
      revealClassifier();
      hcacheCylinder.forEach((el) => (el.style.opacity = "1"));
      ev.slots.forEach(revealSlot);
      if (ev.slots[0]) flyToEncoder(ev.slots[0]);
    }

    function runIntro() {
      hcacheCylinder.forEach((el) => (el.style.opacity = "0.22"));
      setTimeout(() => {
        revealSlot(slot1);
        flyToEncoder(slot1);
        setTimeout(() => {
          if (fired === 0) hideSlot(slot1);
        }, 1400);
      }, 500);
    }

    if (video) {
      video.addEventListener("timeupdate", () => {
        const t = video.currentTime;
        if (t < 0.5 && fired > 0) resetDiagram();
        while (fired < EVENTS.length && t >= EVENTS[fired].t) {
          fireEvent(EVENTS[fired]);
          fired++;
        }
      });
    }

    runIntro();
  }
});
