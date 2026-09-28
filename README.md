# Behavioral Video Frame Extractor

A browser-based tool for extracting high-quality still frames from behavioral videos using **experiment-relative timestamps**.

The tool was designed for workflows in which the raw video starts before the actual behavioral test. You can define the experimental **T0**, create one or more capture windows, choose a frame interval, and export consistently named images for downstream manual analysis.

## Main features

- Open large local video files directly in the browser
- Drag and drop video files
- Define **T0** from the current player position
- Display both:
  - source video time
  - experiment-relative time
- Optionally define a recording end
- Create **multiple capture windows**
  - e.g. `00:00–05:00`
  - `30:00–35:00`
  - `50:00–55:00`
- Choose any extraction interval, such as:
  - 5 s
  - 10 s
  - 15 s
  - 30 s
  - 60 s
- Capture still images at the decoded source-video dimensions
- Export as:
  - PNG (default; lossless)
  - JPEG
- Optional experimental-time overlay on each image
- Automatic standardized filenames
- Optional Video ID and window number in filenames
- Save directly to a selected folder in compatible browsers
- Download all frames as a ZIP file as a cross-browser fallback
- Automatically generate a CSV frame log with:
  - Video ID
  - source filename
  - experimental time
  - corresponding source-video time
  - output filename
  - resolution
  - image format
  - timer-overlay status

## Example

If the animals enter the experimental tank at source-video time:

`00:01:22`

set that instant as **T0**.

The program then interprets:

| Source video time | Experimental time |
|---|---|
| 00:01:22 | 00:00:00 |
| 00:01:37 | 00:00:15 |
| 00:01:52 | 00:00:30 |

With a 15-second interval, output filenames can be generated as:

```text
CTRL_01_00h_00m_00s.png
CTRL_01_00h_00m_15s.png
CTRL_01_00h_00m_30s.png
CTRL_01_00h_00m_45s.png
CTRL_01_00h_01m_00s.png
```

## Multiple capture windows

For a 1-hour recording where only three 5-minute periods should be analyzed, define:

```text
00:00–05:00
30:00–35:00
50:00–55:00
```

The times are **experimental times relative to T0**, not raw source-video timestamps.

## Files

```text
index.html
style.css
app.js
README.md
licence.txt
.gitignore
```

The project has no external JavaScript dependencies.

## Running locally

The simplest option is to open `index.html` in a current browser.

For **direct folder saving**, browsers may require a secure context. If the folder picker is unavailable when opening the file directly, use one of the following:

### Option 1 — GitHub Pages

Host the repository with GitHub Pages. Pages uses HTTPS, so the folder-access API can work in compatible browsers.

### Option 2 — local web server

If Python is installed:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

If direct folder saving is not available, the **Download ZIP** option still works without a backend.

## Browser compatibility

Recommended:

- Google Chrome (desktop)
- Microsoft Edge (desktop)

The File System Access API used by **Choose output folder** is not supported by every browser. When unsupported, use **Extract and download ZIP**.

Video decoding also depends on browser/operating-system codec support. MP4/H.264 is commonly supported.

## Image quality

The capture canvas uses:

```text
video.videoWidth × video.videoHeight
```

rather than the displayed player size. Therefore, the extracted image keeps the decoded source-video pixel dimensions.

PNG is the default because it is lossless.

## Timestamp overlay

The optional **Burn experimental timer into each image** setting draws the experimental time directly on the extracted frame.

The timer is generated from the same experiment-relative time used for the filename.

## Frame timing and scientific use

Browser seeking is appropriate for routine timestamp-based behavioral frame sampling, such as one image every 15 or 30 seconds.

However, exact frame-level decoding can depend on the codec, frame rate, keyframes, and browser decoder. If an experiment requires strict frame-perfect extraction at sub-frame precision, validate the browser output against the original recording and consider a dedicated FFmpeg-based extraction workflow.

The interface includes an approximate `±1 frame` navigation control. Set the FPS field to match the source video if you use that control.

## Frame log

Each extraction produces a CSV file named approximately:

```text
VIDEO_ID_frame_log.csv
```

Columns include:

```text
researcher
video_id
tank_group
number_of_animals
source_filename
window
experimental_time_seconds
experimental_time
source_video_time_seconds
source_video_time
frame_filename
width_px
height_px
format
timer_overlay
notes
```

This makes the generated frames traceable to their location in the source video.

## Suggested workflow with the Shoal Cohesion Tool

```text
Raw behavioral video
        ↓
Behavioral Video Frame Extractor
        ↓
Standardized PNG frames
        ↓
Shoal Cohesion Tool
        ↓
Frame-level / fish-level CSV data
```

## GitHub Pages

After uploading the files to the repository:

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the branch containing these files (usually `main`).
5. Select `/ (root)`.
6. Save.

GitHub will provide the public HTTPS address after deployment.

## License

Copyright © 2026 Matheus Gallas-Lopes.

Licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0).

See `licence.txt` for details.
