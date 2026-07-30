const video = document.querySelector("#case-video");
const chapterButtons = Array.from(document.querySelectorAll("[data-time]"));
const activeStage = document.querySelector("#active-stage");
const activeTime = document.querySelector("#active-time");
const activeChapter = document.querySelector("#active-chapter");
const gaugeState = document.querySelector("#gauge-state");
const printButton = document.querySelector("[data-print]");

const gaugeLevels = {
  dry: { level: "8%", label: "干涸" },
  mid: { level: "38%", label: "低池涨水" },
  high: { level: "64%", label: "高池涨水" },
  restored: { level: "86%", label: "湿地恢复" },
};

const chapters = chapterButtons.map((button) => ({
  button,
  time: Number(button.dataset.time),
  stage: button.dataset.stage,
  gauge: button.dataset.gauge,
  title: button.querySelector("strong").textContent,
}));

const formatTime = (seconds) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = Math.floor(safeSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

const findActiveChapter = (time) => {
  let current = chapters[0];
  for (const chapter of chapters) {
    if (time >= chapter.time) current = chapter;
    else break;
  }
  return current;
};

const updateInterface = (chapter, time = chapter.time) => {
  chapterButtons.forEach((button) => {
    const isActive = button === chapter.button;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "true" : "false");
  });

  const gauge = gaugeLevels[chapter.gauge] ?? gaugeLevels.dry;
  document.documentElement.style.setProperty("--gauge-level", gauge.level);
  activeStage.textContent = chapter.stage;
  activeTime.textContent = formatTime(time);
  activeChapter.textContent = chapter.title;
  gaugeState.textContent = gauge.label;
};

chapterButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    video.currentTime = chapters[index].time;
    updateInterface(chapters[index], chapters[index].time);
    video.play().catch(() => {
      // The user can still press the native play control when autoplay is blocked.
    });
  });

  button.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = Math.min(chapterButtons.length - 1, Math.max(0, index + direction));
    chapterButtons[nextIndex].focus();
  });
});

video.addEventListener("timeupdate", () => {
  updateInterface(findActiveChapter(video.currentTime), video.currentTime);
});

video.addEventListener("loadedmetadata", () => {
  updateInterface(findActiveChapter(video.currentTime), video.currentTime);
});

printButton?.addEventListener("click", () => window.print());

updateInterface(chapters[0], 0);
