document.addEventListener("DOMContentLoaded", () => {
  const host = document.getElementById("diagram-svg-host");
  const stage = document.getElementById("diagram-stage");
  const video = document.getElementById("diagram-video");
  const videoSlot = document.getElementById("diagram-video-slot");
  const memoryEl = document.getElementById("diagram-memory-text");
  if (!host || !stage) return;

  fetch("assets/img/model_overview_interactive.svg?v=15")
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
    const eventClassifierPhoto = byId("event-classifier-photo");
    const annotation = byRole("event-classifier-annotation");
    const bracketEl = byId("event-classifier-bracket");
    const flowArrow = byId("it-flow-arrow");
    const fphiArrowEl = byId("fphi-arrow");
    const fphiArrow = fphiArrowEl ? [fphiArrowEl] : [];
    const hcacheCylinder = byRole("hcache-cylinder");
    const slot1 = byId("hcache-slot-1");
    const slot2 = byId("hcache-slot-2");
    const slot3 = byId("hcache-slot-3");
    const ztLabel = byRole("ztlabel-connector");
    const currentImageBox = byRole("current-image-box");
    const actionExpertToVideoArrow = byId("action-expert-to-video-arrow");
    const flowMatchingArrow = byId("flow-matching-arrow");
    const outerDashedBoxes = byRole("outer-dashed-box");
    const nullEventEl = byId("null-event-text");

    // the faint dashed boxes wrapping H_cache and the encoder/tokenizer -
    // removed entirely, for the whole time
    outerDashedBoxes.forEach((el) => {
      el.style.opacity = "0";
    });

    // idle indicator: hidden until the video starts, then pulses
    // continuously except when the annotation photo is flashing in its place
    if (nullEventEl) {
      nullEventEl.style.transition = "opacity 0.4s ease";
      nullEventEl.style.opacity = "0";
    }

    // baked-in photos the video now covers - never shown
    currentImageBox.forEach((el) => {
      el.style.opacity = "0";
    });

    // bump font size on the labels called out as too small, scaling from
    // each element's own measured center (transform-box:fill-box was
    // unreliable on these foreignObject-based text nodes), then nudge
    // position - translate applies after scale, in the parent's coordinate
    // system, so it's unaffected by transform-origin
    const boostAndMove = (el, scale, dx, dy) => {
      if (!el || !el.getBBox) return;
      const b = el.getBBox();
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      el.style.transformOrigin = cx + "px " + cy + "px";
      el.style.transform = "translate(" + dx + "px, " + dy + "px) scale(" + scale + ")";
    };
    boostAndMove(byId("keyframe-encoder-text"), 1.6, 35, -20);
    boostAndMove(byId("ztlabel-text"), 1.6, 45, 7);

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
    // the original annotation photo (before fireEvent starts overwriting it
    // per-event) is actually the color-edited "poured beans" photo - reuse
    // it rather than a separately-copied, uncorrected file
    const POURED_BEANS_HREF =
      bakedHref(eventClassifierPhoto) || "assets/img/poured_beans_keyframe.png";

    const annotationGroup = [
      ...annotation,
      ...(flowArrow ? [flowArrow] : []),
    ];

    // permanently hidden - never revealed
    tokenizerInputText.forEach((el) => {
      el.style.opacity = "0";
    });

    // Gemma Backbone, Action Expert, Tokenizer, Keyframe Encoder, f_phi,
    // the arrow into f_phi, z_t, and the flow-matching loop arrow around
    // Action Expert are left untouched here - visible immediately with no
    // fade and never hidden, unlike everything below. The flow-matching
    // arrow is stationary until the video starts, then animates forever.

    // everything else starts hidden; only the video gets a timed fade-in,
    // the rest is revealed later by actual events - which are keyed to the
    // video's own currentTime, so the video must stay paused at 0 until it
    // is actually visible, or those events fire while it's invisible
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    if (videoSlot) {
      videoSlot.style.transition = "none";
      videoSlot.style.opacity = "0";
    }
    if (actionExpertToVideoArrow) {
      actionExpertToVideoArrow.style.opacity = "0";
    }
    if (bracketEl) {
      bracketEl.style.opacity = "0";
    }
    encoderInputText.forEach((el) => {
      el.style.opacity = "0";
    });
    annotationGroup.forEach((el) => {
      el.style.transition = "opacity 0.4s ease";
      el.style.opacity = "0";
    });
    slotPositions.forEach((el) => {
      el.style.transition = "transform 0.45s ease, opacity 0.45s ease";
      el.style.opacity = "0";
    });
    hcacheCylinder.forEach((el) => {
      el.style.transition = "none";
      el.style.opacity = "0.22";
    });

    // squish animation for the action-expert-to-video arrow: base fixed,
    // tip dips down and springs back, looping for the rest of the video
    if (actionExpertToVideoArrow && actionExpertToVideoArrow.getBBox) {
      try {
        const b = actionExpertToVideoArrow.getBBox();
        actionExpertToVideoArrow.style.transformOrigin =
          b.x + b.width / 2 + "px " + (b.y + b.height) + "px";
      } catch (e) {
        /* skip transform-origin if bbox unavailable */
      }
    }

    function playIntro() {
      setTimeout(() => {
        if (videoSlot) {
          videoSlot.style.transition = "opacity 2s ease";
          videoSlot.style.opacity = "1";
        }
        hcacheCylinder.forEach((el) => {
          el.style.transition = "opacity 2s ease";
          el.style.opacity = "1";
        });
        encoderInputText.forEach((el) => {
          el.style.transition = "opacity 2s ease";
          el.style.opacity = "1";
        });
      }, 4000);
      setTimeout(() => {
        if (video) {
          video.currentTime = 0;
          video.play();
        }
        if (actionExpertToVideoArrow) {
          actionExpertToVideoArrow.style.transition = "opacity 0.4s ease";
          actionExpertToVideoArrow.style.opacity = "1";
          actionExpertToVideoArrow.style.animation =
            "unimem-squish 1.2s ease-in-out infinite";
        }
        if (bracketEl) {
          bracketEl.style.transition = "opacity 0.4s ease";
          bracketEl.style.opacity = "1";
        }
        if (flowMatchingArrow) {
          flowMatchingArrow.style.animation = "unimem-flow-dash 0.5s linear infinite";
        }
        if (nullEventEl) {
          nullEventEl.style.opacity = "1";
          nullEventEl.style.animation = "unimem-null-pulse 1.6s ease-in-out infinite";
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

    function blinkAnnotationThenHide(onFullyHidden) {
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
            setTimeout(() => {
              if (onFullyHidden) onFullyHidden();
            }, 500);
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

    function resetDiagram() {
      fired = 0;
      history = [];
      queue = [];
      setMemory("History: none");
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      if (videoSlot) {
        videoSlot.style.transition = "none";
        videoSlot.style.opacity = "0";
      }
      if (actionExpertToVideoArrow) {
        actionExpertToVideoArrow.style.transition = "none";
        actionExpertToVideoArrow.style.opacity = "0";
        actionExpertToVideoArrow.style.animation = "none";
      }
      if (bracketEl) {
        bracketEl.style.transition = "none";
        bracketEl.style.opacity = "0";
      }
      encoderInputText.forEach((el) => {
        el.style.transition = "none";
        el.style.opacity = "0";
      });
      if (flowMatchingArrow) flowMatchingArrow.style.animation = "none";
      annotationGroup.forEach((el) => (el.style.opacity = "0"));
      if (nullEventEl) {
        nullEventEl.style.transition = "none";
        nullEventEl.style.opacity = "0";
        nullEventEl.style.animation = "none";
      }
      renderQueue(false);
      hcacheCylinder.forEach((el) => {
        el.style.transition = "none";
        el.style.opacity = "0.22";
      });
      playIntro();
    }

    function fireEvent(ev) {
      if (video) video.pause();

      history.push(ev.label);
      setMemory("History: " + history.join(", "));

      if (ev.href) {
        const photoImg = getImageEl(eventClassifierPhoto);
        if (photoImg) {
          photoImg.setAttribute("xlink:href", ev.href);
          photoImg.setAttribute("href", ev.href);
        }
      }

      if (nullEventEl) {
        nullEventEl.style.animation = "none";
        nullEventEl.style.opacity = "0";
      }
      blinkAnnotationThenHide(() => {
        if (nullEventEl) {
          nullEventEl.style.opacity = "1";
          nullEventEl.style.animation = "unimem-null-pulse 1.6s ease-in-out infinite";
        }
      });
      flowArrowFor(3000);

      queue.push(ev.href);
      if (queue.length > 3) queue.shift();
      renderQueue(true);

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
