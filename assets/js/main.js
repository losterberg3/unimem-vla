const CAPTIONS = {
  HammerMeasure: {
    "MemER": "MemER's high-level planner tracks task progress via subtask commands and matches UniMem's success rate here. Remaining failures are purely mechanical — the precision needed to hook the tape measure onto the hammer.",
    "No Memory": "Without any memory, the policy struggles to distinguish task progress, drifting back and forth between measuring and retracting on a whim.",
    "Text Only": "Textual memory alone improves progress tracking to 53%, but the policy still occasionally fails to distinguish or remember certain measurement events.",
    "Keyframe Only": "Keyframe memory alone also reaches 53% — visual context helps, but without textual grounding the policy can still lose track of which measurement phase it's in.",
    "UniMem (Ours)": "Combining textual and keyframe memory produces robust progress tracking, matching MemER's 87%. Remaining failures are purely mechanical — the precision needed to hook the tape measure onto the hammer.",
  },
  BeanScoop: {
    "MemER": "MemER reaches a third scoop in 67% of rollouts, but its high-level planner can output an incorrect subtask command after two scoop-pour cycles — telling the robot to place the spoon when it should scoop again. By the time the planner corrects itself, the low-level policy is often in an unrecoverable state.",
    "No Memory": "Without memory, the policy never stops scooping and pouring, collapsing onto the most common action in the training data regardless of how many scoops have already happened.",
    "Text Only": "Textual memory improves long-horizon tracking to 27%, but the policy often advances to the next scoop before committing the previous pour to memory, leading to undercounting.",
    "Keyframe Only": "Keyframe memory avoids the undercounting failure — the policy only advances once a pour keyframe is cached — reaching similar performance (20%) despite not being trained with a context window sized for this task.",
    "UniMem (Ours)": "Conditioning on both visual and textual memory at every control step prevents miscounts from happening in the first place, and near single-frame inference speed lets the robot keep correcting its trajectory — reaching 93% success.",
  },
  TableClean: {
    "MemER": "MemER conditions its high-level planner on keyframes and augments subtask commands with cues like left, right, and center, but 13% success reflects how imprecise those coarse directions are over a 60cm × 80cm table.",
    "No Memory": "Without memory, the grabbing and placing actions alias each other and the policy never even begins the wiping motion.",
    "Text Only": "With only text memory, the policy wipes in random locations and never completes a full wiping motion — language can't encode exactly where the bottle used to sit.",
    "Keyframe Only": "Keyframe memory gives the policy spatial awareness, completing the correct wipe roughly 47% of the time, but it still gets stuck in repeated wipe loops and often forgets to place the sponge back.",
    "UniMem (Ours)": "Combining keyframes with textual memory overcomes both failure modes, wiping the bottle's exact spot 80% of the time while missing by no more than 10cm. Place your finger on the screen to see exactly how close the wipe is to the original bottle location.",
  },
  TapScoopPour: {
    "MemER": "MemER pours into the correct cup only 7% of the time — essentially picking at random among eight cups, since its augmented command vocabulary still can't disambiguate that many options.",
    "No Memory": "Without memory, the robot frequently loses track of the human's tap signal once it stops, and often needs multiple taps before it initiates the grasp at all.",
    "Text Only": "Text-only memory also pours correctly only 7% of the time — language memory alone can't pin down which of eight visually similar cups was tapped.",
    "Keyframe Only": "Keyframe memory raises success to 27%, and its errors are qualitatively different: misses land on an adjacent cup rather than an arbitrary one, showing the visual memory already encodes rough location.",
    "UniMem (Ours)": "Textual memory sharpens the keyframe encoder's coarse localization into exact cup selection, reaching 60% success.",
  },
  UpDown: {
    "π0.5 + V.E.": "The fixed-interval video encoder baseline performs well here since this short task requires minimal historical context.",
    "No Memory": "Even a reactive policy with no memory succeeds about half the time, since a single pick-and-place-back cycle is nearly Markovian.",
    "Text Only": "A single textual memory event (“picked up box”) is enough to reliably trigger the put-down action.",
    "Keyframe Only": "Keyframe memory alone almost saturates this short-horizon task.",
    "UniMem (Ours)": "With both modalities, UniMem solves this short verification task perfectly, confirming memory conditioning doesn't impede low-level control.",
  },
  UpDown3Times: {
    "π0.5 + V.E.": "Sampling frames at a fixed 6-second interval provides an unreliable count of how many cycles have occurred, and performance collapses to 16%.",
    "No Memory": "Without memory the policy has no way to count repetitions and stops after an arbitrary number of cycles.",
    "Text Only": "A compact textual memory tracks repetitions reliably, reaching 93% mean subtask success.",
    "Keyframe Only": "Keyframe memory alone fails here (23%) — three past milestones isn't enough temporal reach to disambiguate which repetition the robot is on.",
    "UniMem (Ours)": "Combining text's compact counting with keyframes' visual grounding reaches 96% mean subtask success.",
  },
  OccludedTap: {
    "π0.5 + V.E.": "Sampled frames retain enough visual history to recall which bin the box went into, performing as well as the full model.",
    "No Memory": "Without memory, the policy has to guess which bin holds the box after it's no longer visible, succeeding close to chance plus partial cues.",
    "Text Only": "Text memory alone does reasonably well, but language struggles to fully disambiguate which of several near-identical bins holds the box.",
    "Keyframe Only": "Visual memory resolves this occlusion task perfectly — the keyframe captured before the box disappeared directly encodes which bin it's in.",
    "UniMem (Ours)": "UniMem solves the task with near-perfect reliability, combining visual recall with textual progress tracking.",
  },
  UpDownSpatial: {
    "π0.5 + V.E.": "Fixed-interval frames provide partial spatial grounding but still lose track of task progression at times.",
    "No Memory": "With no memory, the policy has no way to recall where the box originally sat, succeeding only by chance.",
    "Text Only": "Text memory alone drops to 30% — language provides no geometric awareness of exactly where the box was picked up from.",
    "Keyframe Only": "Keyframe memory offers better spatial guidance (52%) but can still lose track of overall task progress.",
    "UniMem (Ours)": "Combining keyframes with textual memory resolves both the spatial recall and progress-tracking failure modes, reaching 79%.",
  },
  PlateRecall: {
    "π0.5 + V.E.": "Sampled frames retain enough visual history to identify the correct plate, matching the full model.",
    "No Memory": "Without memory, the policy has no way to recall which of 4 plates originally held the box and frequently loses track of task progress.",
    "Text Only": "Text-only memory, as expected, roughly matches the 1-in-4 chance of correct plate selection. Language alone cannot encode which of four visually similar plates was the source.",
    "Keyframe Only": "Keyframe memory alone matches the full model (96%), showing visual memory cleanly resolves this discrete spatial ambiguity once task progress is easy to infer.",
    "UniMem (Ours)": "UniMem matches the ceiling set by keyframe memory alone, correctly tapping the source plate 96% of the time.",
  },
};

const SIM_TASKS = ["UpDown", "UpDown3Times", "OccludedTap", "UpDownSpatial", "PlateRecall"];
const SIM_VIDEO_ASPECT = "224 / 288"; // native resolution of the simulation-render clips

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".task-card").forEach((card) => {
    const buttons = card.querySelectorAll(".tab-btn");
    const slot = card.querySelector(".video-slot");
    const analysis = card.querySelector(".analysis");
    const taskName = card.dataset.task || "";
    const captions = CAPTIONS[taskName] || {};
    const isSim = SIM_TASKS.includes(taskName);
    const videoClass = isSim ? "vs-video-item vs-video-sim" : "vs-video-item";
    const aspectStyle = isSim ? ` style="aspect-ratio:${SIM_VIDEO_ASPECT}"` : "";

    const applyState = (btn) => {
      const condLabel = btn.dataset.label || btn.textContent.trim();
      const videoAttr = btn.dataset.video;
      if (slot) {
        if (videoAttr) {
          const paths = videoAttr.split(",").map((p) => p.trim()).filter(Boolean);
          slot.classList.add("has-video");
          slot.innerHTML =
            `<div class="vs-caption">${taskName} — ${condLabel}</div>` +
            `<div class="vs-videos${paths.length > 1 ? " vs-videos-multi" : ""}">` +
            paths
              .map(
                (p) =>
                  `<video class="${videoClass}" src="${p}" autoplay muted loop playsinline controls${aspectStyle}></video>`
              )
              .join("") +
            `</div>`;
        } else {
          slot.classList.remove("has-video");
          slot.innerHTML =
            `<span class="vs-icon">🎬</span>` +
            `<span class="vs-title">${taskName} — ${condLabel}</span>` +
            `<span class="vs-sub">Video coming soon</span>`;
        }
      }
      if (analysis && captions[condLabel]) {
        analysis.textContent = captions[condLabel];
      }
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        applyState(btn);
      });
    });

    const initialBtn = card.querySelector(".tab-btn.active") || buttons[0];
    if (initialBtn) applyState(initialBtn);
  });

  const copyBtn = document.querySelector(".copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const text = document.querySelector(".bibtex-box code").textContent;
      navigator.clipboard.writeText(text).then(() => {
        const original = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = original), 1500);
      });
    });
  }
});
