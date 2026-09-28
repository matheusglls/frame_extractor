'use strict';

const $ = (id) => document.getElementById(id);

const video = $('video');
const videoInput = $('videoInput');
const openVideoBtn = $('openVideoBtn');
const dropzone = $('dropzone');
const emptyVideoMessage = $('emptyVideoMessage');
const videoFileName = $('videoFileName');

const researcher = $('researcher');
const videoId = $('videoId');
const tankId = $('tankId');
const animalCount = $('animalCount');
const notes = $('notes');

const videoTime = $('videoTime');
const experimentalTime = $('experimentalTime');
const videoDuration = $('videoDuration');
const t0Display = $('t0Display');
const recordingEndDisplay = $('recordingEndDisplay');

const back1Btn = $('back1Btn');
const forward1Btn = $('forward1Btn');
const backFrameBtn = $('backFrameBtn');
const forwardFrameBtn = $('forwardFrameBtn');
const fpsInput = $('fpsInput');
const setT0Btn = $('setT0Btn');
const goT0Btn = $('goT0Btn');
const resetT0Btn = $('resetT0Btn');
const setRecordingEndBtn = $('setRecordingEndBtn');
const clearRecordingEndBtn = $('clearRecordingEndBtn');

const windowsBody = $('windowsBody');
const addWindowBtn = $('addWindowBtn');
const loadExampleWindowsBtn = $('loadExampleWindowsBtn');

const intervalInput = $('intervalInput');
const formatSelect = $('formatSelect');
const jpegQualityGroup = $('jpegQualityGroup');
const jpegQuality = $('jpegQuality');
const filenameMode = $('filenameMode');
const includeVideoId = $('includeVideoId');
const overlayTimer = $('overlayTimer');
const includeWindowLabel = $('includeWindowLabel');

const sourceResolution = $('sourceResolution');
const frameCount = $('frameCount');
const pixelEstimate = $('pixelEstimate');
const validationBox = $('validationBox');

const chooseFolderBtn = $('chooseFolderBtn');
const folderStatus = $('folderStatus');
const extractFolderBtn = $('extractFolderBtn');
const extractZipBtn = $('extractZipBtn');
const cancelBtn = $('cancelBtn');
const progressBar = $('progressBar');
const progressText = $('progressText');
const progressPercent = $('progressPercent');
const logOutput = $('logOutput');

const captureCanvas = $('captureCanvas');
const captureCtx = captureCanvas.getContext('2d', { alpha: false });

let videoUrl = null;
let sourceFile = null;
let t0 = null;
let recordingEnd = null;
let outputDirectoryHandle = null;
let windowCounter = 0;
let extractionCancelled = false;
let extractionRunning = false;

const TIME_EPSILON = 0.0005;

// ---------- Time helpers ----------

function pad2(value) {
  return String(Math.floor(value)).padStart(2, '0');
}

function pad3(value) {
  return String(Math.floor(value)).padStart(3, '0');
}

function formatTime(seconds, includeMs = true) {
  if (!Number.isFinite(seconds)) return '—';

  const sign = seconds < 0 ? '−' : '';
  const s = Math.abs(seconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const wholeSeconds = Math.floor(s % 60);
  const milliseconds = Math.round((s - Math.floor(s)) * 1000);

  let correctedSeconds = wholeSeconds;
  let correctedMinutes = minutes;
  let correctedHours = hours;
  let correctedMilliseconds = milliseconds;

  if (correctedMilliseconds === 1000) {
    correctedMilliseconds = 0;
    correctedSeconds += 1;
    if (correctedSeconds === 60) {
      correctedSeconds = 0;
      correctedMinutes += 1;
      if (correctedMinutes === 60) {
        correctedMinutes = 0;
        correctedHours += 1;
      }
    }
  }

  const base = `${pad2(correctedHours)}:${pad2(correctedMinutes)}:${pad2(correctedSeconds)}`;
  return includeMs ? `${sign}${base}.${pad3(correctedMilliseconds)}` : `${sign}${base}`;
}

function parseTime(text) {
  const value = String(text ?? '').trim().replace(',', '.');
  if (!value) return NaN;

  if (/^\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }

  const parts = value.split(':').map(part => part.trim());
  if (parts.some(part => part === '' || Number.isNaN(Number(part)))) {
    return NaN;
  }

  if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    if (s >= 60) return NaN;
    return m * 60 + s;
  }

  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    if (m >= 60 || s >= 60) return NaN;
    return h * 3600 + m * 60 + s;
  }

  return NaN;
}

function formatExperimentalInput(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${pad2(h)}:${pad2(m)}:${s.toFixed(3).padStart(6, '0')}`.replace(/\.000$/, '');
  }
  return `${pad2(Math.floor(seconds / 60))}:${s.toFixed(3).padStart(6, '0')}`.replace(/\.000$/, '');
}

function formatFilenameTime(seconds, mode) {
  const safeSeconds = Math.max(0, seconds);
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = Math.floor(safeSeconds % 60);
  const ms = Math.round((safeSeconds - Math.floor(safeSeconds)) * 1000);

  if (mode === 'seconds') {
    return `${safeSeconds.toFixed(3)}s`;
  }

  const msSuffix = ms ? `_${pad3(ms)}ms` : '';
  if (mode === 'compact') {
    return `${pad2(h)}-${pad2(m)}-${pad2(s)}${msSuffix}`;
  }
  return `${pad2(h)}h_${pad2(m)}m_${pad2(s)}s${msSuffix}`;
}

function sanitizeFilename(value) {
  return String(value ?? '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\s.]+|[_\s.]+$/g, '');
}

// ---------- Video loading ----------

openVideoBtn.addEventListener('click', () => videoInput.click());

videoInput.addEventListener('change', () => {
  if (videoInput.files && videoInput.files[0]) {
    loadVideoFile(videoInput.files[0]);
  }
});

['dragenter', 'dragover'].forEach(eventName => {
  dropzone.addEventListener(eventName, event => {
    event.preventDefault();
    event.stopPropagation();
    dropzone.classList.add('dragover');
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dropzone.addEventListener(eventName, event => {
    event.preventDefault();
    event.stopPropagation();
    dropzone.classList.remove('dragover');
  });
});

dropzone.addEventListener('drop', event => {
  const files = Array.from(event.dataTransfer?.files || []);
  const file = files.find(item => item.type.startsWith('video/'));
  if (file) loadVideoFile(file);
});

function loadVideoFile(file) {
  if (videoUrl) URL.revokeObjectURL(videoUrl);

  sourceFile = file;
  videoUrl = URL.createObjectURL(file);
  video.src = videoUrl;
  video.classList.add('loaded');
  emptyVideoMessage.style.display = 'none';
  videoFileName.textContent = file.name;

  if (!videoId.value.trim()) {
    videoId.value = file.name.replace(/\.[^.]+$/, '');
  }

  t0 = null;
  recordingEnd = null;
  outputDirectoryHandle = null;
  folderStatus.textContent = 'No folder selected';
  clearProgress();
  logOutput.textContent = '';
  updateAll();
}

video.addEventListener('loadedmetadata', () => {
  sourceResolution.textContent = `${video.videoWidth} × ${video.videoHeight}`;
  videoDuration.textContent = formatTime(video.duration);
  updateAll();
});

video.addEventListener('timeupdate', updateTimeDisplays);
video.addEventListener('seeked', updateTimeDisplays);
video.addEventListener('durationchange', updateAll);
video.addEventListener('error', () => {
  showValidation('error', 'The browser could not decode this video. Try a browser-supported MP4/H.264 file or transcode the source first.');
});

// ---------- Video controls ----------

function clampVideoTime(value) {
  if (!Number.isFinite(video.duration)) return Math.max(0, value);
  return Math.min(Math.max(0, value), video.duration);
}

function moveVideo(deltaSeconds) {
  if (!sourceFile) return;
  video.currentTime = clampVideoTime(video.currentTime + deltaSeconds);
}

back1Btn.addEventListener('click', () => moveVideo(-1));
forward1Btn.addEventListener('click', () => moveVideo(1));

backFrameBtn.addEventListener('click', () => {
  const fps = Math.max(1, Number(fpsInput.value) || 30);
  moveVideo(-1 / fps);
});

forwardFrameBtn.addEventListener('click', () => {
  const fps = Math.max(1, Number(fpsInput.value) || 30);
  moveVideo(1 / fps);
});

setT0Btn.addEventListener('click', () => {
  if (!sourceFile) return;
  t0 = video.currentTime;
  updateAll();
});

goT0Btn.addEventListener('click', () => {
  if (t0 == null) return;
  video.currentTime = t0;
});

resetT0Btn.addEventListener('click', () => {
  t0 = null;
  updateAll();
});

setRecordingEndBtn.addEventListener('click', () => {
  if (!sourceFile) return;
  recordingEnd = video.currentTime;
  updateAll();
});

clearRecordingEndBtn.addEventListener('click', () => {
  recordingEnd = null;
  updateAll();
});

// ---------- Capture windows ----------

function addWindow(start = '00:00', end = '05:00') {
  windowCounter += 1;

  const row = document.createElement('tr');
  row.dataset.windowId = String(windowCounter);

  row.innerHTML = `
    <td class="window-number"></td>
    <td><input class="window-time window-start" value="${start}" inputmode="decimal" aria-label="Window start"></td>
    <td><input class="window-time window-end" value="${end}" inputmode="decimal" aria-label="Window end"></td>
    <td class="preview-cell">—</td>
    <td><button class="danger remove-window" type="button">Remove</button></td>
  `;

  row.querySelector('.window-start').addEventListener('input', updateAll);
  row.querySelector('.window-end').addEventListener('input', updateAll);
  row.querySelector('.remove-window').addEventListener('click', () => {
    row.remove();
    renumberWindows();
    updateAll();
  });

  windowsBody.appendChild(row);
  renumberWindows();
  updateAll();
}

function renumberWindows() {
  [...windowsBody.querySelectorAll('tr')].forEach((row, index) => {
    row.querySelector('.window-number').textContent = String(index + 1);
  });
}

function clearWindows() {
  windowsBody.textContent = '';
}

function getWindowRows() {
  return [...windowsBody.querySelectorAll('tr')];
}

function readWindows() {
  return getWindowRows().map((row, index) => {
    const startText = row.querySelector('.window-start').value;
    const endText = row.querySelector('.window-end').value;
    return {
      index: index + 1,
      row,
      startText,
      endText,
      start: parseTime(startText),
      end: parseTime(endText)
    };
  });
}

addWindowBtn.addEventListener('click', () => addWindow());

loadExampleWindowsBtn.addEventListener('click', () => {
  clearWindows();
  addWindow('00:00', '05:00');
  addWindow('30:00', '35:00');
  addWindow('50:00', '55:00');
  updateAll();
});

// ---------- Settings ----------

[
  intervalInput,
  formatSelect,
  jpegQuality,
  filenameMode,
  includeVideoId,
  overlayTimer,
  includeWindowLabel,
  videoId,
  researcher,
  tankId,
  animalCount,
  notes
].forEach(element => {
  element.addEventListener('input', updateAll);
  element.addEventListener('change', updateAll);
});

formatSelect.addEventListener('change', () => {
  jpegQualityGroup.hidden = formatSelect.value !== 'jpg';
});

// ---------- Validation and frame schedule ----------

function getEffectiveRecordingEnd() {
  if (!sourceFile || !Number.isFinite(video.duration)) return NaN;
  return recordingEnd == null ? video.duration : Math.min(recordingEnd, video.duration);
}

function buildFrameSchedule() {
  const errors = [];
  const warnings = [];
  const frames = [];

  if (!sourceFile || !Number.isFinite(video.duration)) {
    errors.push('Open a video.');
    return { errors, warnings, frames };
  }

  if (t0 == null) {
    errors.push('Set T0.');
    return { errors, warnings, frames };
  }

  const interval = Number(intervalInput.value);
  if (!Number.isFinite(interval) || interval <= 0) {
    errors.push('Capture interval must be a positive number.');
    return { errors, warnings, frames };
  }

  const windows = readWindows();
  if (!windows.length) {
    errors.push('Add at least one capture window.');
    return { errors, warnings, frames };
  }

  const effectiveEnd = getEffectiveRecordingEnd();

  windows.forEach(windowInfo => {
    const previewCell = windowInfo.row.querySelector('.preview-cell');

    if (!Number.isFinite(windowInfo.start) || !Number.isFinite(windowInfo.end)) {
      previewCell.textContent = 'Invalid time';
      errors.push(`Window ${windowInfo.index}: invalid start/end time.`);
      return;
    }

    if (windowInfo.start < 0 || windowInfo.end < 0) {
      previewCell.textContent = 'Negative time';
      errors.push(`Window ${windowInfo.index}: times cannot be negative.`);
      return;
    }

    if (windowInfo.end < windowInfo.start) {
      previewCell.textContent = 'End < start';
      errors.push(`Window ${windowInfo.index}: end must be after start.`);
      return;
    }

    const videoStart = t0 + windowInfo.start;
    const videoEnd = t0 + windowInfo.end;

    if (videoStart > effectiveEnd + TIME_EPSILON) {
      previewCell.textContent = 'Outside recording';
      errors.push(`Window ${windowInfo.index} starts after the recording end.`);
      return;
    }

    const clippedVideoEnd = Math.min(videoEnd, effectiveEnd);
    const clippedExperimentalEnd = clippedVideoEnd - t0;

    if (videoEnd > effectiveEnd + TIME_EPSILON) {
      warnings.push(`Window ${windowInfo.index} extends past the recording end and will be clipped.`);
    }

    let count = 0;
    // Inclusive start and inclusive end if the interval lands exactly on it.
    for (
      let experimental = windowInfo.start;
      experimental <= clippedExperimentalEnd + TIME_EPSILON;
      experimental = windowInfo.start + (++count) * interval
    ) {
      if (count > 1000000) {
        errors.push('Too many frames requested. Increase the interval or shorten the windows.');
        break;
      }

      const videoSeconds = t0 + experimental;
      if (videoSeconds > effectiveEnd + TIME_EPSILON) break;

      frames.push({
        windowIndex: windowInfo.index,
        experimentalSeconds: experimental,
        videoSeconds
      });
    }

    previewCell.textContent = `${count} frame${count === 1 ? '' : 's'}`;
  });

  if (frames.length > 10000) {
    warnings.push(`This extraction contains ${frames.length.toLocaleString()} frames and may take a long time or create a very large ZIP.`);
  }

  return { errors, warnings, frames };
}

function showValidation(type, message) {
  validationBox.className = `validation-box show ${type}`;
  validationBox.textContent = message;
}

function updateAll() {
  updateTimeDisplays();

  if (sourceFile && Number.isFinite(video.duration)) {
    videoDuration.textContent = formatTime(video.duration);
  } else {
    videoDuration.textContent = '—';
  }

  sourceResolution.textContent =
    video.videoWidth && video.videoHeight
      ? `${video.videoWidth} × ${video.videoHeight}`
      : '—';

  t0Display.textContent = t0 == null ? '—' : formatTime(t0);
  recordingEndDisplay.textContent =
    recordingEnd == null ? 'video end' : formatTime(recordingEnd);

  const schedule = buildFrameSchedule();
  frameCount.textContent = schedule.frames.length
    ? schedule.frames.length.toLocaleString()
    : '—';

  if (schedule.frames.length && video.videoWidth && video.videoHeight) {
    const totalPixels = schedule.frames.length * video.videoWidth * video.videoHeight;
    pixelEstimate.textContent = `${(totalPixels / 1e9).toFixed(2)} Gpx total`;
  } else {
    pixelEstimate.textContent = '—';
  }

  if (schedule.errors.length) {
    showValidation('error', schedule.errors.join(' '));
  } else if (schedule.warnings.length) {
    showValidation('warn', schedule.warnings.join(' '));
  } else if (schedule.frames.length) {
    showValidation('ok', `${schedule.frames.length.toLocaleString()} frame${schedule.frames.length === 1 ? '' : 's'} ready to extract.`);
  } else {
    validationBox.className = 'validation-box';
    validationBox.textContent = '';
  }

  const ready = schedule.errors.length === 0 && schedule.frames.length > 0 && !extractionRunning;
  extractZipBtn.disabled = !ready;
  extractFolderBtn.disabled = !ready || !outputDirectoryHandle;
  chooseFolderBtn.disabled = extractionRunning;
}

function updateTimeDisplays() {
  if (!sourceFile) {
    videoTime.textContent = '00:00:00.000';
    experimentalTime.textContent = 'T0 not set';
    return;
  }

  videoTime.textContent = formatTime(video.currentTime);

  if (t0 == null) {
    experimentalTime.textContent = 'T0 not set';
  } else {
    experimentalTime.textContent = formatTime(video.currentTime - t0);
  }
}

// ---------- Folder API ----------

chooseFolderBtn.addEventListener('click', async () => {
  if (!('showDirectoryPicker' in window)) {
    folderStatus.textContent = 'Direct folder saving is not supported by this browser. Use ZIP download.';
    return;
  }

  try {
    outputDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    folderStatus.textContent = `Selected: ${outputDirectoryHandle.name}`;
    updateAll();
  } catch (error) {
    if (error?.name !== 'AbortError') {
      folderStatus.textContent = 'Could not select folder. Use ZIP download if needed.';
      appendLog(`Folder picker error: ${error.message || error}`);
    }
  }
});

// ---------- Frame extraction ----------

function buildFilename(frame) {
  const parts = [];
  const id = sanitizeFilename(videoId.value);

  if (includeVideoId.checked && id) {
    parts.push(id);
  }

  if (includeWindowLabel.checked) {
    parts.push(`W${String(frame.windowIndex).padStart(2, '0')}`);
  }

  parts.push(formatFilenameTime(frame.experimentalSeconds, filenameMode.value));

  const extension = formatSelect.value === 'jpg' ? 'jpg' : 'png';
  return `${parts.join('_')}.${extension}`;
}

function drawTimerOverlay(ctx, width, height, experimentalSeconds) {
  const label = formatTime(experimentalSeconds);
  const fontSize = Math.max(24, Math.round(height * 0.045));
  const pad = Math.max(10, Math.round(fontSize * 0.45));
  const margin = Math.max(12, Math.round(fontSize * 0.45));

  ctx.save();
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textBaseline = 'top';

  const metrics = ctx.measureText(label);
  const boxWidth = Math.ceil(metrics.width + pad * 2);
  const boxHeight = Math.ceil(fontSize * 1.35 + pad);

  const x = margin;
  const y = margin;

  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(x, y, boxWidth, boxHeight);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, x + pad, y + Math.round(pad * 0.45));
  ctx.restore();
}

function seekVideoTo(seconds) {
  return new Promise((resolve, reject) => {
    if (!Number.isFinite(seconds)) {
      reject(new Error('Invalid seek time.'));
      return;
    }

    const target = clampVideoTime(seconds);

    if (Math.abs(video.currentTime - target) < 0.0005 && video.readyState >= 2) {
      waitForPresentedFrame().then(resolve).catch(reject);
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out seeking to ${formatTime(target)}.`));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    }

    async function onSeeked() {
      cleanup();
      try {
        await waitForPresentedFrame();
        resolve();
      } catch (error) {
        reject(error);
      }
    }

    function onError() {
      cleanup();
      reject(new Error('Video decoding error while seeking.'));
    }

    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onError, { once: true });

    video.currentTime = target;
  });
}

function waitForPresentedFrame() {
  return new Promise(resolve => {
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      let resolved = false;
      const fallback = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }, 250);

      video.requestVideoFrameCallback(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(fallback);
          resolve();
        }
      });
    } else {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Could not encode image.'));
    }, mimeType, quality);
  });
}

async function captureFrameBlob(frame) {
  await seekVideoTo(frame.videoSeconds);

  if (!video.videoWidth || !video.videoHeight) {
    throw new Error('Video resolution is unavailable.');
  }

  captureCanvas.width = video.videoWidth;
  captureCanvas.height = video.videoHeight;

  captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

  if (overlayTimer.checked) {
    drawTimerOverlay(
      captureCtx,
      captureCanvas.width,
      captureCanvas.height,
      frame.experimentalSeconds
    );
  }

  if (formatSelect.value === 'jpg') {
    const quality = Math.min(100, Math.max(50, Number(jpegQuality.value) || 95)) / 100;
    return canvasToBlob(captureCanvas, 'image/jpeg', quality);
  }

  return canvasToBlob(captureCanvas, 'image/png');
}

function buildLogCsv(rows) {
  const headers = [
    'researcher',
    'video_id',
    'tank_group',
    'number_of_animals',
    'source_filename',
    'window',
    'experimental_time_seconds',
    'experimental_time',
    'source_video_time_seconds',
    'source_video_time',
    'frame_filename',
    'width_px',
    'height_px',
    'format',
    'timer_overlay',
    'notes'
  ];

  const csvRows = [headers];

  rows.forEach(row => {
    csvRows.push([
      researcher.value.trim(),
      videoId.value.trim(),
      tankId.value.trim(),
      animalCount.value.trim(),
      sourceFile?.name || '',
      row.frame.windowIndex,
      row.frame.experimentalSeconds.toFixed(6),
      formatTime(row.frame.experimentalSeconds),
      row.frame.videoSeconds.toFixed(6),
      formatTime(row.frame.videoSeconds),
      row.filename,
      video.videoWidth,
      video.videoHeight,
      formatSelect.value,
      overlayTimer.checked ? 'yes' : 'no',
      notes.value.trim()
    ]);
  });

  return csvRows.map(row =>
    row.map(value => {
      const text = String(value ?? '');
      const escaped = text.replaceAll('"', '""');
      return /[",\n\r]/.test(text) ? `"${escaped}"` : escaped;
    }).join(',')
  ).join('\n') + '\n';
}

function appendLog(message) {
  const now = new Date();
  const stamp = now.toLocaleTimeString();
  logOutput.textContent += `[${stamp}] ${message}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function clearProgress() {
  progressBar.style.width = '0%';
  progressPercent.textContent = '0%';
  progressText.textContent = 'Ready.';
}

function setProgress(done, total, label = '') {
  const pct = total ? Math.round((done / total) * 100) : 0;
  progressBar.style.width = `${pct}%`;
  progressPercent.textContent = `${pct}%`;
  progressText.textContent = label || `${done} / ${total}`;
}

function setExtractionRunning(running) {
  extractionRunning = running;
  extractionCancelled = false;

  cancelBtn.disabled = !running;
  chooseFolderBtn.disabled = running;
  openVideoBtn.disabled = running;
  video.controls = !running;

  getWindowRows().forEach(row => {
    row.querySelectorAll('input,button').forEach(el => el.disabled = running);
  });

  [
    addWindowBtn,
    loadExampleWindowsBtn,
    intervalInput,
    formatSelect,
    jpegQuality,
    filenameMode,
    includeVideoId,
    overlayTimer,
    includeWindowLabel,
    setT0Btn,
    goT0Btn,
    resetT0Btn,
    setRecordingEndBtn,
    clearRecordingEndBtn
  ].forEach(el => el.disabled = running);

  updateAll();
}

cancelBtn.addEventListener('click', () => {
  extractionCancelled = true;
  progressText.textContent = 'Cancelling after current frame…';
});

async function prepareExtraction() {
  const schedule = buildFrameSchedule();

  if (schedule.errors.length) {
    showValidation('error', schedule.errors.join(' '));
    return null;
  }

  if (!schedule.frames.length) {
    showValidation('error', 'No frames are scheduled.');
    return null;
  }

  if (schedule.frames.length > 15000) {
    const proceed = confirm(
      `You are about to extract ${schedule.frames.length.toLocaleString()} frames. ` +
      'This can take a long time and use substantial memory/storage. Continue?'
    );
    if (!proceed) return null;
  }

  return schedule.frames;
}

async function extractFramesCommon(onFrame, onComplete) {
  const frames = await prepareExtraction();
  if (!frames) return;

  const wasPaused = video.paused;
  video.pause();

  setExtractionRunning(true);
  logOutput.textContent = '';
  appendLog(`Starting extraction of ${frames.length.toLocaleString()} frame(s).`);
  appendLog(`Source: ${sourceFile.name}`);
  appendLog(`Resolution: ${video.videoWidth} × ${video.videoHeight}`);
  appendLog(`T0: ${formatTime(t0)}`);

  const logRows = [];

  try {
    for (let i = 0; i < frames.length; i++) {
      if (extractionCancelled) {
        appendLog('Extraction cancelled by user.');
        break;
      }

      const frame = frames[i];
      const filename = buildFilename(frame);

      setProgress(
        i,
        frames.length,
        `Capturing ${i + 1} / ${frames.length}: ${filename}`
      );

      const blob = await captureFrameBlob(frame);
      await onFrame({ frame, filename, blob, index: i, total: frames.length });

      logRows.push({ frame, filename });
      setProgress(i + 1, frames.length, `Saved ${i + 1} / ${frames.length}`);
    }

    if (!extractionCancelled) {
      const csv = buildLogCsv(logRows);
      await onComplete({ logRows, csv });
      setProgress(frames.length, frames.length, `Complete: ${frames.length} frame(s).`);
      appendLog(`Complete. ${frames.length} frame(s) generated.`);
    } else {
      progressText.textContent = `Cancelled after ${logRows.length} frame(s).`;
    }
  } catch (error) {
    appendLog(`ERROR: ${error.message || error}`);
    showValidation('error', `Extraction failed: ${error.message || error}`);
    progressText.textContent = 'Extraction failed.';
    throw error;
  } finally {
    setExtractionRunning(false);
    if (!wasPaused) {
      // Do not auto-resume; keeping the extracted timestamp visible is safer.
    }
  }
}

extractFolderBtn.addEventListener('click', async () => {
  if (!outputDirectoryHandle) return;

  try {
    const permission = await outputDirectoryHandle.requestPermission?.({ mode: 'readwrite' });
    if (permission && permission !== 'granted') {
      showValidation('error', 'Write permission to the selected folder was not granted.');
      return;
    }
  } catch {
    // Some implementations do not expose requestPermission on the directory handle.
  }

  try {
    await extractFramesCommon(
      async ({ filename, blob }) => {
        const handle = await outputDirectoryHandle.getFileHandle(filename, { create: true });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      },
      async ({ csv }) => {
        const logName = `${sanitizeFilename(videoId.value) || 'video'}_frame_log.csv`;
        const handle = await outputDirectoryHandle.getFileHandle(logName, { create: true });
        const writable = await handle.createWritable();
        await writable.write(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        await writable.close();
        appendLog(`Log saved as ${logName}`);
      }
    );
  } catch {
    // The extraction routine already surfaced the error.
  }
});

extractZipBtn.addEventListener('click', async () => {
  const zip = new SimpleZip();

  try {
    await extractFramesCommon(
      async ({ filename, blob }) => {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        zip.add(filename, bytes);
      },
      async ({ csv }) => {
        const logName = `${sanitizeFilename(videoId.value) || 'video'}_frame_log.csv`;
        zip.add(logName, new TextEncoder().encode(csv));

        appendLog('Building ZIP file…');
        const zipBlob = zip.build();

        const anchor = document.createElement('a');
        const objectUrl = URL.createObjectURL(zipBlob);
        anchor.href = objectUrl;
        anchor.download = `${sanitizeFilename(videoId.value) || 'video'}_frames.zip`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
        appendLog(`ZIP download started: ${anchor.download}`);
      }
    );
  } catch {
    // The extraction routine already surfaced the error.
  }
});

// ---------- Tiny dependency-free ZIP writer (STORE/no compression) ----------

class SimpleZip {
  constructor() {
    this.entries = [];
  }

  add(name, bytes) {
    const safeName = String(name).replace(/\\/g, '/');
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    this.entries.push({
      name: safeName,
      nameBytes: new TextEncoder().encode(safeName),
      data,
      crc: crc32(data),
      offset: 0
    });
  }

  build() {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    const { dosTime, dosDate } = dateToDos(new Date());

    for (const entry of this.entries) {
      entry.offset = offset;

      const localHeader = new Uint8Array(30 + entry.nameBytes.length);
      const view = new DataView(localHeader.buffer);

      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true); // UTF-8
      view.setUint16(8, 0, true); // STORE
      view.setUint16(10, dosTime, true);
      view.setUint16(12, dosDate, true);
      view.setUint32(14, entry.crc >>> 0, true);
      view.setUint32(18, entry.data.length, true);
      view.setUint32(22, entry.data.length, true);
      view.setUint16(26, entry.nameBytes.length, true);
      view.setUint16(28, 0, true);
      localHeader.set(entry.nameBytes, 30);

      localParts.push(localHeader, entry.data);
      offset += localHeader.length + entry.data.length;
    }

    const centralOffset = offset;

    for (const entry of this.entries) {
      const centralHeader = new Uint8Array(46 + entry.nameBytes.length);
      const view = new DataView(centralHeader.buffer);

      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(8, 0x0800, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, dosTime, true);
      view.setUint16(14, dosDate, true);
      view.setUint32(16, entry.crc >>> 0, true);
      view.setUint32(20, entry.data.length, true);
      view.setUint32(24, entry.data.length, true);
      view.setUint16(28, entry.nameBytes.length, true);
      view.setUint16(30, 0, true);
      view.setUint16(32, 0, true);
      view.setUint16(34, 0, true);
      view.setUint16(36, 0, true);
      view.setUint32(38, 0, true);
      view.setUint32(42, entry.offset, true);
      centralHeader.set(entry.nameBytes, 46);

      centralParts.push(centralHeader);
      offset += centralHeader.length;
    }

    const centralSize = offset - centralOffset;
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);

    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, this.entries.length, true);
    endView.setUint16(10, this.entries.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, centralOffset, true);
    endView.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
  }
}

function dateToDos(date) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);

  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { dosTime, dosDate };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }

  return table;
})();

function crc32(bytes) {
  let crc = 0xFFFFFFFF;

  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ---------- Initial state ----------

addWindow('00:00', '05:00');
formatSelect.dispatchEvent(new Event('change'));
updateAll();

window.addEventListener('beforeunload', () => {
  if (videoUrl) URL.revokeObjectURL(videoUrl);
});
