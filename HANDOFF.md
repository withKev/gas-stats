# Fuel Tracker — Agent Handoff

Read this first. It replaces the prior conversation. Everything you need is here.

## What this is

A personal fuel-tracking web app the user installs on an iPhone (13 Pro) via
Safari "Add to Home Screen". Vanilla HTML/CSS/JS. No framework. Data lives in
localStorage. Chart.js is the only runtime dependency and is vendored locally.

The user is not a developer. Explain changes in plain language. They only
deploy; they do not hand-edit the source. If the source looks broken, a
previous agent broke it — not the user.

Live at **gas-stats.pages.dev** (Cloudflare Pages), built from
**github.com/withKev/gas-stats** by GitHub Actions.

## Session start — do this first, every new chat

The container starts empty. The project ships as a zip attached to the chat.

```bash
mkdir -p /home/claude/webapp
unzip -q /mnt/user-data/uploads/fuel-tracker-source.zip -d /home/claude/webapp
cd /home/claude/webapp
npm ci                                  # REQUIRED — verify.js needs puppeteer
python3 build.py && node verify.js
```

If that prints `ALL CHECKS PASSED`, you have a known-good baseline and can
start work. If the zip is in the project files instead of uploads, look in
`/mnt/project/`. Never start editing before you have a passing baseline —
otherwise you can't tell your bug from a pre-existing one.

`npm ci` downloads Chromium (~1 min). If the sandbox blocks the download, set
`CHROME_PATH` to an existing Chrome binary and `verify.js` will use it instead.

At the end of a session, re-zip `src build.py verify.js sample-data.json
package.json package-lock.json gen_splash.py .github .gitignore` and give the
user the updated zip, so the next session starts from your work.

## Project layout

```
webapp/
  src/                  <- EDIT ONLY THESE
    index.html          markup shell + iOS splash/icon <link> tags
    styles.css          all styling, design tokens at top
    app.js              all logic
    sw.js               service worker (cache version lives here)
    manifest.json
    lib/chart.umd.min.js  200 KB  vendored, DO NOT EDIT
    icons/              icon-180/192/512.png
      splash/           16 iOS launch images (light+dark × 8 resolutions)
  build.py              build script
  verify.js             smoke test (needs `npm ci` first)
  gen_splash.py         regenerates icon-180 + all splash images from icon-512
  sample-data.json      13 real fill-ups; verify.js seeds localStorage with these
  package.json          devDeps only: puppeteer (verify), wrangler (deploy)
  .github/workflows/deploy.yml   CI/CD
  dist/                 GENERATED — never edit, never read
    fuel-tracker.html   single self-contained file (quick look / offline)
    webapp/             folder build (what Cloudflare Pages serves)
```

## Workflow — follow this exactly

1. Edit files under `src/` only. Use targeted `str_replace`, not rewrites.
2. `python3 build.py`
3. `node verify.js` — must print `ALL CHECKS PASSED`
4. Commit, push to a **non-main branch** (see CI/CD below), let the user check
   the preview URL, then merge to `main` only after they confirm.

`build.py` inlines CSS + app.js + Chart.js into the single file, copies the
folder build, and auto-increments the service-worker cache version. Never
inline by hand.

## CI/CD — how deploys work

`.github/workflows/deploy.yml` runs on push to **every** branch:

```
checkout → python → node 22 → npm ci → build.py → verify.js → wrangler pages deploy
```

The deploy step is `if: success()`, so **nothing reaches Cloudflare unless the
smoke test passes.** Cloudflare decides preview vs production from the branch:

- any branch that is not `main` → its own **preview** URL
- `main` → **production** at gas-stats.pages.dev

**The user's hard rule: push to a non-production branch first, get their
confirmation that it works, and only then merge to `main`.** Do not merge to
`main` unprompted.

Secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` already exist as
GitHub repo secrets. You never see them; the workflow injects them.

Git identity: `withKev <contact@kevintruong.ca>`.

To push you need a GitHub fine-grained PAT (Contents: RW, Workflows: RW —
Workflows is required because the repo contains a workflow file). Ask the user
for one, use it **inline** in the push URL so it never lands in `.git/config`:

```bash
git push "https://${TOKEN}@github.com/withKev/gas-stats.git" branch:branch
```

Tell them to revoke it when the session ends.

## Context discipline (important — this is why the split exists)

The shipped single file is ~270 KB, 200 KB of which is Chart.js. Reading or
writing that file burns the user's context for nothing.

- NEVER open, read, or edit `dist/`, `src/lib/chart.umd.min.js`, or
  `package-lock.json`.
- To change styling, read `src/styles.css` only.
- To change behavior, read `src/app.js` only.
- To change markup, read `src/index.html` only.
- Prefer `grep -n` to locate a symbol over viewing a whole file.
- Use `str_replace` on a small unique snippet. Don't regenerate whole files.

## Verify before you claim success

The user has repeatedly hit bugs that "looked fine" in code, and has caught
agents declaring victory on bad evidence. **Do not trust reading. Do not trust
a check that only proves a weaker claim than the one you're making.**

`node verify.js` loads both builds in real headless Chrome and asserts: no page
errors, Chart.js defined, all tab icons present, FAB icon present, fill-up rows
render, both charts actually paint pixels, the Settings tab renders, and the FAB
hides on Settings.

That is a floor, not a ceiling. If you change something visual, screenshot the
actual element and look at it. If you generate a file, open it with a real
parser (e.g. `openpyxl` for .xlsx) and assert on its contents. If you reference
an asset path, assert the file exists on disk.

Puppeteer comes from `npm ci` — `require('puppeteer')`. Seed `localStorage`
keys `fuelTrackerData_v1` / `fuelTrackerSettings_v1` via
`page.evaluateOnNewDocument()` **before** `goto`, or the app renders its empty
state. Note `sample-data.json` is `{data, settings}`, not a bare array.

## Current state of the app

Three bottom tabs: **Dashboard**, **Stats**, **Settings**.

- **Dashboard** — orange gradient hero card (last fill-up), four stat cards
  (this month, YTD, avg price/L, avg consumption), then the full fill-up
  history grouped by month, newest first. Tap any row to edit.
- **Stats** — four stat cards, an interactive Monthly Spend bar chart and a
  Price per Liter line chart (Chart.js, tooltips on tap/hover).
- **Settings** — currency (20 options), distance unit (km/mi), appearance
  (Automatic/Light/Dark), then two sections:
  - **Backup**: Export backup (JSON) / Import backup (JSON)
  - **Spreadsheet Export**: Export CSV / Export Excel — read-only
- **FAB** — round orange "+" bottom-right; opens the add sheet. Hidden on
  Settings.
- Add/edit sheet: date, station, location (+ GPS button), grade, full-tank
  toggle, liters, price/L (auto-computes total), odometer, notes, delete.

Mobile/PWA: safe-area insets, `100dvh`, 16px inputs (blocks iOS focus-zoom),
44pt tap targets, 180×180 apple-touch-icon, maskable manifest icons, and 16
`apple-touch-startup-image` splash screens (iPhone 13 mini → 17 series/Air,
light + dark). Portrait-only by intent; landscape is verified not-broken.

Design: iOS-flavored "liquid glass". Frosted translucent cards over an ambient
gradient wash, large collapsing titles, blurred nav/tab bars, monoline SVG icons
drawn in JS (`icon(name, size, strokeWidth)` in app.js). Design tokens are CSS
custom properties at the top of `styles.css`. Never hardcode hex values; use the
tokens. Dark mode is driven by `:root[data-theme="dark"]` plus a
`prefers-color-scheme` fallback for `auto`. Both paths must be updated together.

## Data model

localStorage key `fuelTrackerData_v1` — array of:

```json
{ "id":"f_...", "date":"ISO-8601", "station":"", "location":"",
  "grade":"Regular|Mid-Grade|Premium|Diesel|E85", "fullTank":true,
  "liters":0, "pricePerLiter":0, "totalCost":0, "odometer":null, "notes":"" }
```

localStorage key `fuelTrackerSettings_v1`:
`{ "currency":"CAD", "distanceUnit":"km", "theme":"auto" }`

**JSON is the only re-importable format.** Backup files are
`{ data:[...], settings:{...} }`. The importer also accepts a bare array and
back-fills defaults for missing fields — preserve that. Never drop a field
without a migration. Warn before destructive actions.

CSV and XLSX exports are **read-only archives**, deliberately. They omit `id`
and settings. Do not add spreadsheet import without asking — it's a much
heavier lift (validation of dates, grades, numerics) than JSON import.

## Non-obvious things that already bit us — don't regress these

1. **Native `confirm()` / `alert()` silently fail in iOS home-screen PWAs.**
   Use the promise-based `confirmDialog()` in app.js. This is why Import and
   Delete once appeared "broken".
2. **Chart.js must never come from a CDN.** It breaks offline, which is the
   normal state of a home-screen app. It is vendored in `src/lib/`.
   Same reasoning killed SheetJS (~440 KB) — the .xlsx writer in `app.js` is
   hand-rolled (ZIP + OOXML, ~120 lines) and adds ~12 KB instead.
3. **Fuel economy** is liters between consecutive *full* tanks divided by
   distance, and must include partial fills in between. See `computeEconomy()`.
   Naively summing only full tanks undercounts. With the sample data the
   correct answer is 16.8 L/100km.
4. **Native `<select>` popups ignore page colors.** Option colors are set
   explicitly for light and dark. Keep both.
5. **Stale service-worker caches** made fixes look like they never landed.
   `build.py` bumps the cache version every build. Still tell the user to
   delete the old home-screen app before reinstalling.
6. **Destroy charts before re-rendering** (`destroyCharts()`), or Chart.js
   leaks canvases.
7. **`.icon` must be `box-sizing: content-box`.** The global
   `*{box-sizing:border-box}` reset combined with an SVG sized only by HTML
   attributes made the tab-bar icons collapse to invisible in the user's
   browser. Pixel-*color* checks passed while the icons were plainly broken —
   the shapes weren't there. Screenshot the element, don't sample colors.
8. **`apple-touch-startup-image` needs an exact device-width/height/DPR match.**
   One wrong number and iOS silently shows a white flash instead. Regenerate
   with `gen_splash.py`; verify every `href` in `index.html` resolves to a real
   file on disk.
9. **Do not delete the `@media (display-mode: standalone)` rule in
   `styles.css`.** `apple-mobile-web-app-status-bar-style: black-translucent`
   plus `viewport-fit=cover` makes iOS shift the whole document UP by the
   status-bar inset (~47px) so content can sit behind the clock. A document that
   is exactly `height:100%` then falls short of the screen bottom by that amount
   and **iOS paints the leftover band black** — under the tab bar, in both light
   and dark, home-screen app only, never in Safari. The rule
   `html{ min-height: calc(100% + env(safe-area-inset-top,0px)) }` fills it.
   It looks like a no-op and is not. If the black band ever returns, the escape
   hatch is to drop `black-translucent` (use `default`), which kills the whole
   bug class at the cost of the edge-to-edge status bar.

## Tooling gotchas (cost real time; don't rediscover)

- `getBoundingClientRect()` returns a DOMRect that does **not** survive
  `page.evaluate()` serialization — it arrives as `{}`. Copy the fields you
  want into a plain object inside the browser context first.
- `page.click(sel)` uses synthetic mouse coordinates and can land on an
  overlapping fixed element (tab bar, FAB). Use
  `page.evaluate(() => document.querySelector(sel).click())` to fire the
  handler directly.
- Blob downloads can't be re-fetched from a `file://` page. Hook
  `URL.createObjectURL` to capture the Blob object itself.
- GitHub's raw Actions logs live on Azure blob storage, which the sandbox can't
  reach. To see why a step failed, have the workflow echo the error as
  `::error::…` and read it back from
  `/repos/{o}/{r}/check-runs/{job_id}/annotations`.
- `api.github.com` rate-limits unauthenticated requests fast, even for public
  repos. Use the PAT for API reads too.
- **wrangler v4 requires Node ≥ 22.** Pinning Node 20 in CI fails at the deploy
  step only, after build+verify pass — looks like a Cloudflare problem, isn't.
- Chrome cannot emulate `display-mode: standalone` — not via
  `page.emulateMediaFeatures()` (throws "Unsupported media feature") and not via
  raw CDP `Emulation.setEmulatedMedia`. The standalone code path is only
  testable on a real device. Don't claim you verified it.
- `document.styleSheets[].cssRules` throws a SecurityError for `<link>`ed CSS on
  a `file://` page, so the folder build reports **zero** stylesheets. Inspect
  `dist/fuel-tracker.html` (CSS inlined) when you need to read the CSSOM.
- Forcing `html{min-height:calc(100% + 47px)}` in desktop Chrome makes the root
  scrollable by 47px. **This is an artifact.** On real iOS standalone the
  document is already shifted up by that inset, so the extra height is consumed
  and no scroll appears. Verified on device. Don't "fix" the phantom scroll.
- `scrollHeight > clientHeight` does not tell you whether a user can scroll —
  `overflow:hidden` leaves that true and still allows programmatic `scrollTop`.

## Deployment (what to tell the user)

- Normal path: push a branch → check the preview URL → merge `main` → live.
- Quick look / single file: open `dist/fuel-tracker.html`. Self-contained,
  works offline, no service worker.
- HTTPS is required for Add-to-Home-Screen and geolocation.
- After any update: **delete the old home-screen app first, then re-add.**
  Otherwise the old cache can persist.

## Known limitations — state these honestly, don't paper over them

- **No iCloud sync.** Web apps cannot reach iCloud APIs. Backup is manual
  Export/Import to Files. If the user wants real sync, that needs a backend
  (e.g. Supabase) — offer it, don't fake it.
- Data is per-browser, per-device. Clearing Safari data deletes it.
- Location autofill uses the free Nominatim geocoder, which can rate-limit;
  it falls back to raw coordinates.
- A native Swift/SwiftData+CloudKit version was prototyped early on and
  abandoned in favor of this web app. Don't resurrect it unprompted.
- The sandbox cannot reach `*.pages.dev`. You cannot confirm a live deploy
  yourself — ask the user to look. Don't claim it works.

## Next steps

Nothing committed. Two mobile items were scoped but not built:

1. **Keyboard-safe form layout** — unverified whether add/edit sheet inputs
   stay visible when the iOS keyboard opens.
2. **Scroll/animation performance pass** — heavy `backdrop-filter` blur may
   drop frames on the 120 Hz ProMotion display. Unprofiled.

Housekeeping: workflow still uses `actions/checkout@v4` etc., which GitHub warns
run on a deprecated Node 20 runtime. Harmless; bump when convenient.

Ask before building.
