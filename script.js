const previewVideo = document.getElementById("previewVideo");
const frameShell = document.getElementById("frameShell");
const previewArea = document.querySelector(".preview-area");
const emptyState = document.getElementById("emptyState");
const videoUpload = document.getElementById("videoUpload");
const playToggle = document.getElementById("playToggle");
const rangeLabel = document.getElementById("rangeLabel");
const durationLabel = document.getElementById("durationLabel");
const selectionWindow = document.getElementById("selectionWindow");
const selectionBody = document.getElementById("selectionBody");
const playhead = document.getElementById("playhead");
const thumbnailStrip = document.getElementById("thumbnailStrip");
const timelineTrack = document.getElementById("timelineTrack");
const startHandle = document.getElementById("startHandle");
const endHandle = document.getElementById("endHandle");
const confirmBtn = document.getElementById("confirmBtn");
const cancelBtn = document.getElementById("cancelBtn");
const hintPill = document.querySelector(".hint-pill");

const MIN_DURATION = 2;
const MAX_DURATION = 15.5;
const THUMBNAIL_PX_PER_SECOND = 40;
const TARGET_THUMB_WIDTH = 56;
const TRACK_EDGE_GUTTER = 3;
const PLAYHEAD_INSET = 6;

const state = {
  duration: 15,
  start: 0,
  end: 8,
  playing: false,
  objectUrl: "",
  toastTimer: null,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(seconds) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(Math.floor(remainder)).padStart(2, "0")}`;
}

function getMaxSelectionDuration() {
  return Math.min(MAX_DURATION, state.duration || MAX_DURATION);
}

function getMinSelectionDuration() {
  return Math.min(MIN_DURATION, getMaxSelectionDuration());
}

function getDefaultSelectionDuration() {
  return getMaxSelectionDuration();
}

function showToast(message) {
  hintPill.querySelector("span:last-child").textContent = message;
  hintPill.classList.add("is-visible");

  if (state.toastTimer) {
    window.clearTimeout(state.toastTimer);
  }

  state.toastTimer = window.setTimeout(() => {
    hintPill.classList.remove("is-visible");
    state.toastTimer = null;
  }, 3000);
}

function hideToast() {
  hintPill.classList.remove("is-visible");
  if (state.toastTimer) {
    window.clearTimeout(state.toastTimer);
    state.toastTimer = null;
  }
}

function updateVideoFrameSize() {
  const areaWidth = previewArea?.clientWidth || window.innerWidth;
  const areaHeight = previewArea?.clientHeight || window.innerHeight;
  const maxWidth = Math.max(220, Math.min(areaWidth - 48, areaWidth * 0.92));
  const maxHeight = Math.max(220, Math.min(areaHeight - 24, areaHeight * 0.92));
  const hasVideo = Boolean(previewVideo.videoWidth && previewVideo.videoHeight);
  const videoWidth = hasVideo ? previewVideo.videoWidth : maxWidth;
  const videoHeight = hasVideo ? previewVideo.videoHeight : maxHeight;
  const ratio = videoWidth / videoHeight;

  let width = maxWidth;
  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  frameShell.style.width = `${Math.round(width)}px`;
  frameShell.style.height = `${Math.round(height)}px`;
}

function updateTimelineUI() {
  const total = state.duration || 1;
  const safeStart = clamp(state.start, 0, total);
  const safeEnd = clamp(state.end, safeStart + getMinSelectionDuration(), total);
  const trackWidth = Math.max(timelineTrack.clientWidth, 1);
  const usableWidth = Math.max(1, trackWidth - TRACK_EDGE_GUTTER * 2);
  const leftPx = TRACK_EDGE_GUTTER + (safeStart / total) * usableWidth;
  const widthPx = ((safeEnd - safeStart) / total) * usableWidth;
  const current = clamp(previewVideo.currentTime || safeStart, safeStart, safeEnd);
  const rawPlayheadLeftPx = TRACK_EDGE_GUTTER + (current / total) * usableWidth;
  const playheadLeftPx = clamp(
    rawPlayheadLeftPx,
    leftPx + PLAYHEAD_INSET,
    leftPx + Math.max(PLAYHEAD_INSET, widthPx - PLAYHEAD_INSET),
  );

  selectionWindow.style.left = `${leftPx}px`;
  selectionWindow.style.width = `${widthPx}px`;
  playhead.style.left = `${playheadLeftPx}px`;
  rangeLabel.textContent = `${formatTime(safeStart)} - ${formatTime(safeEnd)}`;
  durationLabel.textContent = `Clip ${(safeEnd - safeStart).toFixed(1)}s`;
}

function applyTrimValues({ preserveCurrentTime = false } = {}) {
  const total = state.duration || 1;
  const minSelection = getMinSelectionDuration();
  const maxSelection = getMaxSelectionDuration();
  let selectionDuration = state.end - state.start;

  selectionDuration = clamp(selectionDuration, minSelection, maxSelection);
  state.start = clamp(state.start, 0, Math.max(0, total - selectionDuration));
  state.end = clamp(state.start + selectionDuration, state.start + minSelection, total);

  if (!preserveCurrentTime) {
    previewVideo.currentTime = state.start;
  }

  updateTimelineUI();
}

function stopPlayback() {
  previewVideo.pause();
  state.playing = false;
  playToggle.classList.remove("is-playing");
}

function togglePlayback() {
  if (!previewVideo.src) {
    return;
  }

  if (state.playing) {
    stopPlayback();
    return;
  }

  if (previewVideo.currentTime < state.start || previewVideo.currentTime >= state.end) {
    previewVideo.currentTime = state.start;
  }

  previewVideo.play();
  state.playing = true;
  playToggle.classList.add("is-playing");
}

function refreshFromSlider(changed) {
  return changed;
}

function percentFromPointer(clientX) {
  const rect = timelineTrack.getBoundingClientRect();
  const usableWidth = Math.max(1, rect.width - TRACK_EDGE_GUTTER * 2);
  const ratio = clamp((clientX - rect.left - TRACK_EDGE_GUTTER) / usableWidth, 0, 1);
  return ratio * 100;
}

function buildPlaceholderThumbnails() {
  const swatches = [
    "linear-gradient(135deg, #6da4ff, #203a85)",
    "linear-gradient(135deg, #515151, #1d1d1d)",
    "linear-gradient(135deg, #9bc6ff, #4669af)",
    "linear-gradient(135deg, #d8d2cd, #606571)",
    "linear-gradient(135deg, #4d76f0, #121826)",
    "linear-gradient(135deg, #8a929d, #303743)",
    "linear-gradient(135deg, #1b1b1b, #4d4d4d)",
    "linear-gradient(135deg, #9cc0ff, #7586d2)",
    "linear-gradient(135deg, #223045, #080a10)",
    "linear-gradient(135deg, #5f739a, #1a1b24)",
    "linear-gradient(135deg, #99816c, #34261d)",
    "linear-gradient(135deg, #243452, #6988db)",
  ];

  const count = Math.min(12, swatches.length);

  thumbnailStrip.innerHTML = "";
  thumbnailStrip.style.gridTemplateColumns = `repeat(${count}, minmax(0, 1fr))`;

  swatches.slice(0, count).forEach((background, index) => {
    const item = document.createElement("div");
    item.className = "thumbnail";
    item.style.background = background;
    item.style.opacity = index % 4 === 3 ? "0.5" : "1";
    thumbnailStrip.appendChild(item);
  });
}

async function generateThumbnails() {
  if (!previewVideo.src || !state.duration) {
    buildPlaceholderThumbnails();
    return;
  }

  const trackWidth = Math.max(timelineTrack.clientWidth, 1);
  const contentWidth = state.duration * THUMBNAIL_PX_PER_SECOND;
  const renderWidth = Math.min(trackWidth, contentWidth);
  const count = Math.max(1, Math.ceil(renderWidth / TARGET_THUMB_WIDTH));
  const tempVideo = document.createElement("video");
  tempVideo.src = previewVideo.currentSrc;
  tempVideo.muted = true;
  tempVideo.playsInline = true;
  tempVideo.crossOrigin = "anonymous";

  await new Promise((resolve) => {
    tempVideo.addEventListener("loadedmetadata", resolve, { once: true });
  });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const frameWidth = Math.max(1, Math.round(trackWidth / count));
  const frameHeight = timelineTrack.clientHeight || 82;
  const videoRatio = tempVideo.videoWidth / tempVideo.videoHeight || 1;
  const coverHeight = frameHeight;
  const coverWidth = coverHeight * videoRatio;
  const drawWidth = Math.max(frameWidth, coverWidth);
  const drawHeight = frameHeight;

  canvas.width = frameWidth;
  canvas.height = frameHeight;
  thumbnailStrip.innerHTML = "";
  thumbnailStrip.style.gridTemplateColumns = `repeat(${count}, minmax(0, 1fr))`;

  const seekTo = (time) =>
    new Promise((resolve) => {
      const onSeeked = () => resolve();
      tempVideo.addEventListener("seeked", onSeeked, { once: true });
      tempVideo.currentTime = clamp(time, 0, Math.max(0, tempVideo.duration - 0.05));
    });

  for (let index = 0; index < count; index += 1) {
    const time = count === 1 ? 0 : (index / (count - 1)) * tempVideo.duration;
    await seekTo(time);

    context.clearRect(0, 0, frameWidth, frameHeight);
    context.drawImage(
      tempVideo,
      Math.max(0, (tempVideo.videoWidth - tempVideo.videoHeight * (frameWidth / frameHeight)) / 2),
      0,
      Math.min(tempVideo.videoWidth, tempVideo.videoHeight * (frameWidth / frameHeight)),
      tempVideo.videoHeight,
      (frameWidth - drawWidth) / 2,
      0,
      drawWidth,
      drawHeight,
    );

    const item = document.createElement("div");
    item.className = "thumbnail";
    item.style.backgroundImage = `url(${canvas.toDataURL("image/jpeg", 0.72)})`;
    thumbnailStrip.appendChild(item);
  }

  tempVideo.removeAttribute("src");
  tempVideo.load();
}

function bindHandleDrag(handle, side) {
  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);

    const onMove = (moveEvent) => {
      const nextPercent = percentFromPointer(moveEvent.clientX);
      const total = state.duration || 1;
      const minPercentGap = (getMinSelectionDuration() / total) * 100;
      const maxPercentGap = (getMaxSelectionDuration() / total) * 100;
      const startPercent = (state.start / total) * 100;
      const endPercent = (state.end / total) * 100;

      if (side === "start") {
        const nextStartPercent = clamp(nextPercent, endPercent - maxPercentGap, endPercent - minPercentGap);
        state.start = (nextStartPercent / 100) * total;
      } else {
        const nextEndPercent = clamp(nextPercent, startPercent + minPercentGap, startPercent + maxPercentGap);
        state.end = (nextEndPercent / 100) * total;
      }

      applyTrimValues();
    };

    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  });
}

function bindSelectionDrag() {
  selectionBody.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    const total = state.duration || 1;
    const rect = timelineTrack.getBoundingClientRect();
    const selectionDuration = clamp(state.end - state.start, getMinSelectionDuration(), getMaxSelectionDuration());
    const pointerStartRatio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const offsetInSelection = pointerStartRatio * total - state.start;

    selectionBody.setPointerCapture(event.pointerId);

    const onMove = (moveEvent) => {
      const pointerRatio = clamp((moveEvent.clientX - rect.left) / rect.width, 0, 1);
      const pointerTime = pointerRatio * total;
      let nextStart = pointerTime - offsetInSelection;
      nextStart = clamp(nextStart, 0, total - selectionDuration);
      state.start = nextStart;
      state.end = nextStart + selectionDuration;
      applyTrimValues();
    };

    const onUp = () => {
      selectionBody.removeEventListener("pointermove", onMove);
      selectionBody.removeEventListener("pointerup", onUp);
      selectionBody.removeEventListener("pointercancel", onUp);
    };

    selectionBody.addEventListener("pointermove", onMove);
    selectionBody.addEventListener("pointerup", onUp);
    selectionBody.addEventListener("pointercancel", onUp);
  });
}

function validateDuration() {
  if (state.duration < MIN_DURATION || state.duration > MAX_DURATION) {
    showToast("Reference video duration must be 2–15.5 seconds.");
  } else {
    hideToast();
  }
}

videoUpload.addEventListener("change", () => {
  const [file] = videoUpload.files || [];
  if (!file) {
    return;
  }

  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
  }

  state.objectUrl = URL.createObjectURL(file);
  previewVideo.src = state.objectUrl;
  previewVideo.load();
});

previewVideo.addEventListener("loadedmetadata", async () => {
  state.duration = previewVideo.duration || 15;
  state.start = 0;
  state.end = getDefaultSelectionDuration();

  frameShell.classList.add("has-video");
  emptyState.hidden = true;
  updateVideoFrameSize();
  applyTrimValues();
  validateDuration();
  await generateThumbnails();
});

previewVideo.addEventListener("timeupdate", () => {
  if (previewVideo.currentTime >= state.end) {
    previewVideo.currentTime = state.start;
    if (!previewVideo.paused) {
      previewVideo.play();
    }
  }

  updateTimelineUI();
});

previewVideo.addEventListener("pause", () => {
  state.playing = false;
  playToggle.classList.remove("is-playing");
});

previewVideo.addEventListener("play", () => {
  state.playing = true;
  playToggle.classList.add("is-playing");
});

window.addEventListener("resize", async () => {
  updateVideoFrameSize();
  if (previewVideo.src) {
    await generateThumbnails();
  }
});

playToggle.addEventListener("click", togglePlayback);

timelineTrack.addEventListener("click", (event) => {
  if (
    event.target === startHandle ||
    event.target === endHandle ||
    event.target === selectionBody
  ) {
    return;
  }

  if (!previewVideo.src) {
    return;
  }

  const total = state.duration || 1;
  const clickedTime = (percentFromPointer(event.clientX) / 100) * total;
  previewVideo.currentTime = clamp(clickedTime, state.start, state.end);
  updateTimelineUI();
});

confirmBtn.addEventListener("click", () => {
  const message = `Trim selected: ${formatTime(state.start)} - ${formatTime(state.end)} (${(state.end - state.start).toFixed(1)}s)`;
  window.alert(message);
});

cancelBtn.addEventListener("click", () => {
  stopPlayback();
  state.start = 0;
  state.end = getDefaultSelectionDuration();
  applyTrimValues();
  validateDuration();
});

buildPlaceholderThumbnails();
bindHandleDrag(startHandle, "start");
bindHandleDrag(endHandle, "end");
bindSelectionDrag();
updateVideoFrameSize();
applyTrimValues({ preserveCurrentTime: true });
