# Behavioral Video Frame Extractor

Browser-based tool for extracting still frames from behavioral videos at **experimental times relative to T0**. No installation or external libraries are needed.

## What it does

- Opens local videos (file selection or drag and drop).
- Sets experimental **T0** independently from the video start; optionally sets the recording end.
- Extracts PNG or JPEG images at chosen time intervals within one or more capture windows.
- Preserves the video’s decoded image dimensions, with optional timestamp overlay.
- Generates standardized filenames and a CSV log of capture times and experimental details.
- Saves frames to a selected folder (supported browsers) or downloads a ZIP archive.

## How to use

1. Open a video and move to the start of the experiment. Click **Set current time as T0**.
2. Optionally mark the end of the recording.
3. Set the capture windows using **Start** and **End** times relative to T0. For example, in a 45-minute recording:

   | Window | Start | End |
   | --- | --- | --- |
   | 1 | `00:00` | `05:00` |
   | 2 | `20:00` | `25:00` |
   | 3 | `40:00` | `45:00` |

4. Choose the sampling interval (e.g., every 15 seconds), file format and filename options.
5. Select **Extract to selected folder** or **Extract and download ZIP**. Each export also includes a CSV log.

The **±1 frame** buttons provide approximate navigation. The tool estimates FPS automatically after the video plays briefly; until then, it assumes 30 FPS. Precise frame-by-frame timing is not guaranteed by browser video seeking.

## Running the tool

Open `index.html` in your browser. Chrome or Edge on a desktop is recommended. ZIP export works without a server. Folder export requires a compatible browser and generally HTTPS or localhost.

To use GitHub Pages, upload the project files and select **Settings → Pages → Deploy from a branch**, with the branch and root folder (`/`) containing `index.html`.

## Files

- `index.html` — page structure
- `style.css` — appearance
- `app.js` — video handling and extraction
- `licence.txt` — license

## License

© 2026 Matheus Gallas-Lopes. Creative Commons **CC BY-NC 4.0**. See `licence.txt`.
