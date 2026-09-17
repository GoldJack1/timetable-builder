# KWVR timetable builder

Static Vite + React app for authoring a heritage-style timetable (calendar + lettered colour panels). Deploy on Netlify.

## Reboot the local server

The app is a Vite dev server. It is not running until you start it.

1. In Terminal, go to the project folder:

```bash
cd ~/timetable-builder
```

2. If a server is already running, stop it: click that Terminal window and press **Ctrl+C**. To kill a leftover process on port 5173:

```bash
lsof -ti :5173 | xargs kill
```

3. Install dependencies only if `node_modules` is missing (first time, or after pulling):

```bash
npm install
```

4. Start it:

```bash
npm run dev
```

5. Open **http://localhost:5173/**

Edits you make in the browser are saved in that browser’s `localStorage`. Stopping the server does not delete them. **Reset example** on the Export page restores the leaflet seed.

## WordPress (any test site)

This does not need the live KWVR website. Copy the plugin onto **any** WordPress (Local, MAMP, a throwaway install).

1. Copy `wordpress/kwvr-timetable` into that site’s `wp-content/plugins/` folder and activate **KWVR Timetable**.
2. Add a page, put `[kwvr_timetable]` in it, publish, view the page.
3. Click a coloured day: an overlay shows that day’s timetable. Grey days say no trains. Close with the button, the dimmed background, or Escape. Use Previous / Next to move one month at a time.

A sample timetable and icons are already inside the plugin. No JSON URL and no Calendarize it! required.

To try your own draft: Export → JSON in the builder, upload that file in the test site’s Media, then paste the file URL in Settings → KWVR Timetable.

## Deploy

Connect this folder to Netlify (build `npm run build`, publish `dist`) or drag the `dist` folder after a local build.

## Brand files

- Gill Sans faces are WOFF2 under `public/fonts/` (from your Downloads/gillsnas set). **Do not put this on a public site unless your webfont licence allows it.**
- BR face 3 icons are under `public/icons/brface3/`.

## Exports

- PNG / JPG / SVG of the print sheet
- JSON document (save/load)
- WordPress: JSON + `wordpress/kwvr-timetable` plugin (`[kwvr_timetable]`). Optional static HTML paste for a Custom HTML block.

Drafts are stored in the browser (`localStorage`). The Nov 2026–Mar 2027 leaflet is only the starting example.
