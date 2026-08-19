document.addEventListener("DOMContentLoaded", () => {
  const host = document.getElementById("diagram-svg-host");
  const stage = document.getElementById("diagram-stage");
  const video = document.getElementById("diagram-video");
  const videoSlot = document.getElementById("diagram-video-slot");
  const memoryEl = document.getElementById("diagram-memory-text");
  if (!host || !stage) return;

  fetch("assets/img/model_overview_interactive.svg?v=4")
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

    const coreBoxes = [
      ...byRole("gemma-backbone-box"),
      ...byRole("action-expert-box"),
      ...byRole("tokenizer-box"),
      ...byRole("keyframe-encoder-box"),
    ];
    const tokenizerInputText = byRole("tokenizer-input-text");
    const encoderInputText = byRole("encoder-input-text");

    const eventClassifierBox = byId("event-classifier-box");
    const dashedBorder = byId("event-classifier-dashed-border");
    const annotation = byRole("event-classifier-annotation");
    const bracketEl = byId("event-classifier-bracket");
    const bracket = bracketEl ? [bracketEl] : [];
    const flowArrow = byId("it-flow-arrow");
    const fphiArrowEl = byId("fphi-arrow");
    const fphiArrow = fphiArrowEl ? [fphiArrowEl] : [];
    const hcacheCylinder = byRole("hcache-cylinder");
    const slot1 = byId("hcache-slot-1");
    const slot2 = byId("hcache-slot-2");
    const slot3 = byId("hcache-slot-3");
    const ztLabel = byRole("ztlabel-connector");
    const keyframeEncoder = byRole("keyframe-encoder-box");
    const currentImageBox = byRole("current-image-box");

    // baked-in photos the video now covers - never shown
    currentImageBox.forEach((el) => {
      el.style.opacity = "0";
    });

    // bump font size on the labels called out as too small, scaling from
    // each element's own measured center (transform-box:fill-box was
    // unreliable on these foreignObject-based text nodes)
    Array.from(host.querySelectorAll('[data-font-boost="1"]')).forEach((el) => {
      if (!el.getBBox) return;
      const b = el.getBBox();
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      el.style.transformOrigin = cx + "px " + cy + "px";
      el.style.transform = "scale(1.18)";
    });

    const slotPositions = [slot1, slot2, slot3].filter(Boolean);

    let SLOT_SPACING = 63;
    if (slot1 && slot2 && slot1.getBBox && slot2.getBBox) {
      try {
        const b1 = slot1.getBBox();
        const b2 = slot2.getBBox();
        const measured = Math.abs(b2.x - b1.x);
        if (measured > 5) SLOT_SPACING = measured;
      } catch (e) {
        /* fall back to default spacing */
      }
    }

    const getImageEl = (el) =>
      !el ? null : el.matches("image") ? el : el.querySelector("image");

    // capture the three keyframe photos already baked into the artwork
    const bakedHref = (el) => {
      const img = getImageEl(el);
      if (!img) return null;
      return img.getAttribute("xlink:href") || img.getAttribute("href");
    };
    const HUMAN_TAP_HREF = bakedHref(slot1);
    const GRABBED_SPOON_HREF = bakedHref(slot2);
    const SCOOPED_BEANS_HREF = bakedHref(slot3);
    const POURED_BEANS_HREF = "assets/img/poured_beans_keyframe.png";

    const annotationGroup = [
      ...annotation,
      ...bracket,
      ...(flowArrow ? [flowArrow] : []),
    ];

    // permanently hidden - never revealed
    [...tokenizerInputText, ...encoderInputText].forEach((el) => {
      el.style.opacity = "0";
    });

    // Gemma Backbone, Action Expert, Tokenizer, Keyframe Encoder, f_phi,
    // the arrow into f_phi, and z_t are left untouched here - visible
    // immediately with no fade and never hidden, unlike everything below.

    // everything else starts hidden; only the video gets a timed fade-in,
    // the rest is revealed later by actual events - which are keyed to the
    // video's own currentTime, so the video must stay paused at 0 until it
    // is actually visible, or those events fire while it's invisible
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    if (videoSlot) {
      videoSlot.style.transition = "opacity 2s ease";
      videoSlot.style.opacity = "0";
    }
    [dashedBorder, ...annotationGroup].filter(Boolean).forEach((el) => {
      el.style.transition = "opacity 0.4s ease";
      el.style.opacity = "0";
    });
    slotPositions.forEach((el) => {
      el.style.transition = "transform 0.45s ease, opacity 0.45s ease";
      el.style.opacity = "0";
    });
    hcacheCylinder.forEach((el) => {
      el.style.transition = "opacity 0.6s ease";
      el.style.opacity = "0.22";
    });

    function playIntro() {
      setTimeout(() => {
        if (videoSlot) videoSlot.style.opacity = "1";
      }, 4000);
      setTimeout(() => {
        if (video) {
          video.currentTime = 0;
          video.play();
        }
      }, 6000);
    }

    const EVENTS = [
      { t: 1.72, label: "human tap", href: HUMAN_TAP_HREF },
      { t: 4.86, label: "grabbed spoon", href: GRABBED_SPOON_HREF },
      { t: 7.99, label: "scooped beans", href: SCOOPED_BEANS_HREF },
      { t: 13.19, label: "poured beans", href: POURED_BEANS_HREF },
    ];

    let fired = 0;
    let history = [];
    let queue = [];

    function setMemory(text) {
      if (memoryEl) memoryEl.textContent = text;
    }

    function renderQueue(withAnimation) {
      const padded = [null, null, null];
      for (let i = 0; i < queue.length; i++) {
        padded[3 - queue.length + i] = queue[i];
      }

      if (!withAnimation) {
        slotPositions.forEach((el, i) => {
          const entry = padded[i];
          const img = getImageEl(el);
          el.style.transition = "none";
          el.style.transform = "translateX(0)";
          if (entry && img) {
            img.setAttribute("xlink:href", entry);
            img.setAttribute("href", entry);
          }
          el.style.opacity = entry ? "1" : "0";
        });
        return;
      }

      slotPositions.forEach((el) => {
        el.style.transition = "transform 0.4s ease";
        el.style.transform = "translateX(-" + SLOT_SPACING + "px)";
      });

      setTimeout(() => {
        slotPositions.forEach((el, i) => {
          const entry = padded[i];
          const img = getImageEl(el);
          el.style.transition = "none";
          if (entry && img) {
            img.setAttribute("xlink:href", entry);
            img.setAttribute("href", entry);
          }
          if (entry) {
            el.style.opacity = "1";
            el.style.transform =
              i === 2 ? "translateX(" + SLOT_SPACING + "px)" : "translateX(0)";
          } else {
            el.style.opacity = "0";
            el.style.transform = "translateX(0)";
          }
        });
        void stage.getBoundingClientRect();
        requestAnimationFrame(() => {
          slotPositions.forEach((el) => {
            el.style.transition = "transform 0.4s ease";
            el.style.transform = "translateX(0)";
          });
        });
      }, 400);
    }

    function blinkAnnotationThenHide() {
      if (annotationGroup.length === 0) return;
      annotationGroup.forEach((el) => (el.style.transition = "opacity 0.15s ease"));
      let n = 0;
      const blink = setInterval(() => {
        const on = n % 2 === 0;
        annotationGroup.forEach((el) => (el.style.opacity = on ? "1" : "0.15"));
        n++;
        if (n >= 5) {
          clearInterval(blink);
          annotationGroup.forEach((el) => (el.style.opacity = "1"));
          setTimeout(() => {
            annotationGroup.forEach((el) => {
              el.style.transition = "opacity 0.5s ease";
              el.style.opacity = "0";
            });
          }, 900);
        }
      }, 180);
    }

    function flowArrowFor(ms) {
      if (!flowArrow) return;
      flowArrow.style.animation = "unimem-flow-dash 0.5s linear infinite";
      setTimeout(() => {
        flowArrow.style.animation = "none";
      }, ms);
    }

    function flyToEncoder(href, srcRect) {
      if (!href || keyframeEncoder.length === 0) return;
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
        "transform 0.7s cubic-bezier(.4,0,.2,1), opacity 0.7s ease";
      clone.style.pointerEvents = "none";
      stage.appendChild(clone);

      const dx = dstRect.left + dstRect.width / 2 - (srcRect.left + srcRect.width / 2);
      const dy = dstRect.top + dstRect.height / 2 - (srcRect.top + srcRect.height / 2);

      requestAnimationFrame(() => {
        clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.35)`;
        clone.style.opacity = "0";
      });
      setTimeout(() => clone.remove(), 800);
    }

    function resetDiagram() {
      fired = 0;
      history = [];
      queue = [];
      setMemory("History: none");
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      if (videoSlot) videoSlot.style.opacity = "0";
      [dashedBorder, ...annotationGroup].filter(Boolean).forEach((el) => (el.style.opacity = "0"));
      renderQueue(false);
      hcacheCylinder.forEach((el) => (el.style.opacity = "0.22"));
      playIntro();
    }

    function fireEvent(ev) {
      if (video) video.pause();

      history.push(ev.label);
      setMemory("History: " + history.join(", "));

      dashedBorder.style.opacity = "1";
      hcacheCylinder.forEach((el) => (el.style.opacity = "1"));

      blinkAnnotationThenHide();
      flowArrowFor(3000);

      queue.push(ev.href);
      if (queue.length > 3) queue.shift();
      renderQueue(true);

      setTimeout(() => {
        if (slot3 && ev.href) {
          flyToEncoder(ev.href, slot3.getBoundingClientRect());
        }
      }, 850);

      if (video) {
        setTimeout(() => {
          video.play();
        }, 3000);
      }
    }

    playIntro();

    if (video) {
      video.addEventListener("timeupdate", () => {
        const t = video.currentTime;
        if (t < 0.5 && fired > 0) resetDiagram();
        if (fired < EVENTS.length && t >= EVENTS[fired].t) {
          fireEvent(EVENTS[fired]);
          fired++;
        }
      });
    }
  }
});
