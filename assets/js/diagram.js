document.addEventListener("DOMContentLoaded", () => {
  const host = document.getElementById("diagram-svg-host");
  const stage = document.getElementById("diagram-stage");
  const video = document.getElementById("diagram-video");
  const videoSlot = document.getElementById("diagram-video-slot");
  if (!host || !stage) return;

  fetch("assets/img/model_final.svg?v=2")
    .then((r) => r.text())
    .then((raw) => {
      const cleaned = raw
        .replace(/<\?xml[^>]*\?>/, "")
        .replace(/<!DOCTYPE[^>]*>/, "")
        // force the light palette - otherwise every light-dark(...) fill/
        // stroke in the artwork flips to its dark variant on systems with
        // a dark OS/browser preference, inverting the diagram's colors
        .replace(/color-scheme:\s*light dark/g, "color-scheme: light");
      host.innerHTML = cleaned;
      initDiagram();
    })
    .catch(() => {
      host.innerHTML = "";
    });

  function initDiagram() {
    const svg = host.querySelector("svg");
    if (!svg) return;

    const PREFIX = "6O-t3x135IJxxH9uS56w-";
    const cell = (n) => host.querySelector('[data-cell-id="' + PREFIX + n + '"]');

    const currentFrameCell = cell(23);
    const eventBoxCell = cell(21);
    // the small pink bubble near f_phi, baked with the text "poured beans" -
    // repurposed as a generic "event just recognized" flash: its text is
    // swapped to whichever event fired, and only once it's flashed and
    // faded back out does that event get committed to memory
    const annotationCell = cell(25);
    const annotationSpan = annotationCell ? annotationCell.querySelector("span") : null;

    // three memory "rows": the cached keyframe photo + its t_i chip on the
    // left, and the text-memory phrase + its t_i chip on the right - all
    // four pieces of a row reveal together when that row's event fires
    const rows = [
      [cell(9), cell(32), cell(13), cell(19)],
      [cell(10), cell(33), cell(14), cell(30)],
      [cell(11), cell(34), cell(15), cell(31)],
    ];

    // the text-memory list's 4th row (poured beans) is baked into the
    // artwork under a different cell-id prefix (shares one with the UniMem
    // box) - the cache has no matching 4th photo slot, so this row is only
    // ever revealed on its own, not paired with a cache photo
    const pouredBeansMemoryRow = [
      host.querySelector('[data-cell-id="qqDF_xJRQ1dh1Ij_D3h7-3"]'),
      host.querySelector('[data-cell-id="qqDF_xJRQ1dh1Ij_D3h7-4"]'),
    ];

    // the cache column only has 3 baked photo slots (t1-t3), so the 4th
    // event ("poured beans" - no baked slot of its own) evicts the oldest
    // photo and slides the other two up, sliding the new photo in at the
    // bottom - the t1/t2/t3 chips are position labels and stay put
    const cachePhotoCells = [cell(9), cell(10), cell(11)];
    const cachePhotoImgs = cachePhotoCells.map((el) => (el ? el.querySelector("image") : null));
    const ORIGINAL_CACHE_HREFS = cachePhotoImgs.map((img) =>
      img ? img.getAttribute("xlink:href") || img.getAttribute("href") : null
    );
    const POURED_BEANS_HREF = "assets/img/poured_beans_keyframe.png";
    const CACHE_SLOT_SPACING = 27;

    function setCacheHrefs(hrefs) {
      cachePhotoImgs.forEach((img, i) => {
        if (!img || !hrefs[i]) return;
        img.setAttribute("xlink:href", hrefs[i]);
        img.setAttribute("href", hrefs[i]);
      });
    }

    function evictAndSlideCache() {
      const currentHrefs = cachePhotoImgs.map(
        (img) => img && (img.getAttribute("xlink:href") || img.getAttribute("href"))
      );
      const nextHrefs = [currentHrefs[1], currentHrefs[2], POURED_BEANS_HREF];

      cachePhotoCells.forEach((el) => {
        if (!el) return;
        el.style.transition = "transform 0.4s ease";
        el.style.transform = "translateY(-" + CACHE_SLOT_SPACING + "px)";
      });

      setTimeout(() => {
        setCacheHrefs(nextHrefs);
        cachePhotoCells.forEach((el, i) => {
          if (!el) return;
          el.style.transition = "none";
          el.style.transform =
            i === 2 ? "translateY(" + CACHE_SLOT_SPACING + "px)" : "translateY(0)";
        });
        void stage.getBoundingClientRect();
        requestAnimationFrame(() => {
          cachePhotoCells.forEach((el) => {
            if (!el) return;
            el.style.transition = "transform 0.4s ease";
            el.style.transform = "translateY(0)";
          });
        });
      }, 400);
    }

    function hideInstant(el) {
      if (!el) return;
      el.style.transition = "none";
      el.style.opacity = "0";
    }

    function hideRowInstant(row) {
      row.forEach((el) => {
        if (!el) return;
        el.style.transition = "none";
        el.style.opacity = "0";
        el.style.transform = "translateY(6px)";
      });
    }

    function revealRow(row) {
      row.forEach((el) => {
        if (!el) return;
        el.style.transition = "transform 0.5s ease, opacity 0.5s ease";
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
    }

    // the baked-in current-frame photo is entirely replaced by the live
    // video overlay positioned on top of it, in CSS
    hideInstant(currentFrameCell);
    hideInstant(eventBoxCell);
    hideInstant(annotationCell);
    rows.forEach(hideRowInstant);
    hideRowInstant(pouredBeansMemoryRow);

    if (videoSlot) {
      videoSlot.style.transition = "none";
      videoSlot.style.borderColor = "#000";
      videoSlot.style.animation = "none";
    }

    function flashBorderRed() {
      if (!videoSlot) return;
      videoSlot.style.animation = "none";
      void videoSlot.offsetWidth;
      videoSlot.style.animation = "unimem-border-flash 0.18s ease-in-out 5";
      setTimeout(() => {
        videoSlot.style.animation = "none";
        videoSlot.style.borderColor = "#000";
      }, 950);
    }

    function blinkThenHide(el, onHidden) {
      if (!el) {
        if (onHidden) onHidden();
        return;
      }
      el.style.transition = "opacity 0.15s ease";
      let n = 0;
      const blink = setInterval(() => {
        el.style.opacity = n % 2 === 0 ? "1" : "0.15";
        n++;
        if (n >= 6) {
          clearInterval(blink);
          el.style.opacity = "1";
          setTimeout(() => {
            el.style.transition = "opacity 0.5s ease";
            el.style.opacity = "0";
            setTimeout(() => {
              if (onHidden) onHidden();
            }, 500);
          }, 700);
        }
      }, 150);
    }

    const EVENTS = [
      { t: 1.72, label: "human tap" },
      { t: 4.86, label: "grabbed spoon" },
      { t: 7.99, label: "scooped beans" },
      { t: 13.19, label: "poured beans" },
    ];

    let fired = 0;

    function fireEvent(i) {
      if (video) video.pause();

      flashBorderRed();
      blinkThenHide(eventBoxCell);

      if (annotationSpan) annotationSpan.textContent = EVENTS[i].label;
      if (annotationCell) {
        annotationCell.style.transition = "none";
        annotationCell.style.transform = "translateY(0)";
      }

      blinkThenHide(annotationCell, () => {
        if (i < rows.length) {
          revealRow(rows[i]);
        } else {
          evictAndSlideCache();
          revealRow(pouredBeansMemoryRow);
        }
        if (video) video.play();
      });
    }

    function resetDiagram() {
      fired = 0;
      rows.forEach(hideRowInstant);
      hideRowInstant(pouredBeansMemoryRow);
      hideInstant(annotationCell);
      hideInstant(eventBoxCell);
      setCacheHrefs(ORIGINAL_CACHE_HREFS);
      if (videoSlot) {
        videoSlot.style.animation = "none";
        videoSlot.style.borderColor = "#000";
      }
    }

    if (video) {
      video.pause();
      video.currentTime = 0;
      video.addEventListener("timeupdate", () => {
        const t = video.currentTime;
        if (t < 0.5 && fired > 0) resetDiagram();
        if (fired < EVENTS.length && t >= EVENTS[fired].t) {
          fireEvent(fired);
          fired++;
        }
      });
      setTimeout(() => {
        video.currentTime = 0;
        video.play();
      }, 600);
    }
  }
});
