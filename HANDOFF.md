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

The container starts empty and **the GitHub repo is the source of truth**
(github.com/withKev/gas-stats, production = `main`). Clone it rather than
hunting for a zip:

```bash
cd /home/claude
git clone https://github.com/withKev/gas-stats.git webapp
cd webapp
npm ci                                  # REQUIRED — verify.js needs puppeteer
python3 build.py && node verify.js
```

If that prints `ALL CHECKS PASSED`, you have a known-good baseline and can start
work. Never start editing before you have a passing baseline — otherwise you
can't tell your bug from a pre-existing one.

The repo is public, so the clone needs no auth. Pushing does — ask the user for
a fresh fine-grained PAT when you're ready to deploy (see CI/CD below). A zip
may also be attached to the chat or sitting in `/mnt/project/`; if so it should
match the repo, but prefer the repo when they disagree.

`npm ci` downloads Chromium (~1 min). If the sandbox blocks the download, set
`CHROME_PATH` to an existing Chrome binary and `verify.js` will use it instead —
in this environment that path has been
`/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome`.

You don't need to hand the user a zip at the end — their work lives in the repo
once merged. Only produce a zip if they explicitly ask.

## Project layout

```
webapp/
  src/                  <- EDIT ONLY THESE
    index.html          markup shell + iOS splash/icon <link> tags + all sheets
    styles.css          all styling, design tokens at top
    app.js              all logic (~1500 lines; use grep, don't read whole)
    sw.js               service worker (cache version lives here)
    manifest.json
    lib/chart.umd.min.js  200 KB  vendored, DO NOT EDIT
    icons/              icon-180/192/512.png
      splash/           16 iOS launch images (light+dark × 8 resolutions)
  build.py              build script
  verify.js             smoke test (needs `npm ci` first)
  gen_splash.py         regenerates icon-180 + all splash images from icon-512
  sample-data.json      13 fill-ups; verify.js seeds localStorage with these
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

For one-off checks beyond the smoke test, use `test-helper.js` (committed at repo
root) instead of writing a fresh puppeteer script:
`node test-helper.js "<in-page JS returning JSON>"`, with env options
TAB/DARK/DATA/SHOT and export capture via `window.__grab()`. See its header.

That is a floor, not a ceiling. If you change something visual, screenshot the
actual element and look at it. If you generate a file, open it with a real
parser (e.g. `openpyxl` for .xlsx) and assert on its contents. If you reference
an asset path, assert the file exists on disk.

Puppeteer comes from `npm ci` — `require('puppeteer')`. Seed `localStorage`
keys `fuelTrackerData_v1` / `fuelTrackerSettings_v1` via
`page.evaluateOnNewDocument()` **before** `goto`, or the app renders its empty
state. Note `sample-data.json` is `{data, settings}`, not a bare array.

## Current state of the app

Four bottom tabs: **Dashboard**, **Stats**, **Garage**, **Settings**. The
**vehicle switcher** is the grey name + chevron at the right end of the large
title on Dashboard, Stats, and Garage (tap to open the vehicle sheet).
Everything is scoped to the active vehicle.

- **Dashboard** — orange gradient hero card (last fill-up), then four stat
  cards: This Month, a **year-selectable** spend card (native year dropdown;
  current year shows "Year to Date", past years the full-year total), Avg
  Price/L, Avg Consumption. Below, the full fill-up history grouped by month,
  newest first. Each **month header** shows that month's spend and (when
  odometers allow) distance driven; each history card has a compact metrics
  line (km driven, odometer, full-tank efficiency, price/L) that **wraps**
  rather than truncating. Tap any row to edit.
- **Stats** — a **period dropdown** at the top ("All time" + each year with
  data, default current year) scopes the whole tab: the first spend card, Avg
  Fill-Up, Avg Price/L, Avg Consumption, all three charts, and the totals. The
  **All Time** card stays fixed as a reference. Avg Consumption shows two stats
  (L/100km and km/L). Charts: Monthly Spend (bar), Monthly Distance (bar,
  green), Price per Liter Trend (line) — Chart.js, tooltips on tap/hover.
- **Garage** — maintenance + modification log. Top cards: This Year and All
  Time spend (fixed), then a **year-selectable Maintenance** subtotal (its own
  dropdown; only that number cycles) and an all-time Modifications subtotal.
  An "Up Next" due list (per intervals; status coloured
  overdue/soon/ok/unlogged), and a filterable history (All / **Maintenance** /
  Mods). Each history row shows date · odometer · DIY-or-shop-name (this line
  wraps). "Edit intervals" opens the intervals editor. The FAB opens the
  *service* form here, the fill-up form elsewhere.
- **Settings** — **Preferences** (currency, distance unit, default grade,
  appearance); **Discounts** (per-litre Discount/L + an add/remove list of
  Discount Stations); **Backup** (Export/Import JSON); **Spreadsheet Export**
  (CSV = two files fuel+service; Excel = two tabs) — read-only.
- **FAB** — round orange "+" bottom-right; opens the add sheet (fill-up, or
  service on Garage). Hidden on Settings; tucks away on scroll-down.
- Fill-up sheet: date, station (+ suggestion chips), grade (defaults from the
  Default Grade setting), full-tank toggle, liters, price/L (pump price;
  auto-computes total), Discount/L + Additional Discount (see below), total,
  odometer, notes, delete. **No location field** (removed — the station name
  identifies where you go).
- Service sheet: Maintenance/Modification toggle, **DIY/Shop** toggle (+ a Shop
  name field when Shop), a custom entry title, shared date + odometer, then an
  **Items** section — tap interval chips or "+ Add item"; each item has a cost
  and its own **part lines** (name + price). An item's cost is the sum of its
  parts when it has any (read-only) else editable. Live entry total, notes,
  delete. Opening an existing entry does **not** auto-focus a field.
- Vehicle sheet: switch/add/rename/delete (delete cascades to that vehicle's
  fill-ups, service, and intervals; blocked when only one vehicle remains).

**Fuel discounts** (pump price is unchanged; the discount only reduces the
*total paid*, so all price stats stay the posted price): each fill-up has a
per-litre **Discount / L** and a flat **Additional Discount**. saved =
discountPerLiter × liters + additionalDiscount; total = liters × price − saved.
The **Default Discount / L** (Settings → Discounts) pre-fills new fill-ups; if
one or more **Discount Stations** are listed, it fills only when the entered
station matches one of them (case-insensitive) and clears otherwise; with no
stations listed it pre-fills everywhere. `discountSaved()` computes the amount;
the fuel export has a Discount Saved column.

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

**Five localStorage keys.** All list data is per-vehicle via a `vehicleId`.
The persisted arrays are `allFills` / `allService` / `allIntervals`; render code
reads the scoped views `activeFills()` / `activeService()` / `activeIntervals()`.
**Never mix them: reads scope to the active vehicle, writes always target the
`all*` arrays.** Mixing them up is how data gets lost.

- `fuelTrackerData_v1` — fill-ups:
  `{ id:"f_...", vehicleId, date:ISO, station,
     grade:"Regular|Mid-Grade|Premium|Diesel|E85", fullTank:bool,
     liters, pricePerLiter (pump price), totalCost (net, after discount),
     discountPerLiter:null, additionalDiscount:null, odometer:null, notes }`
  (No `location` — removed. Old backups may still carry it; it's read on import
  but not shown or written.)
- `fuelTrackerVehicles_v1` — `[{ id:"v_...", name }]`
- `fuelTrackerService_v1` — service/mod log; each entry holds an `items` array,
  each item holds priced `parts`, plus a DIY/shop tag:
  `{ id:"s_...", vehicleId, kind:"service"|"mod", doneBy:"diy"|"shop"|null,
     shop, title, date:ISO, odometer:null, notes,
     items:[ { title, cost, parts:[ {name, price} ] } ] }`
  ("service" kind is labelled **Maintenance** in the UI — internal value kept
  to avoid migration.) An item's `cost` = sum of its part prices when it has
  parts, else a directly-entered value. Use the `serviceItems()` /
  `serviceCost()` / `serviceItemTitles()` / `serviceLabel()` / `doneByLabel()`
  helpers rather than reading fields raw — they normalize the shape (and
  tolerate legacy string parts). `sumCents()` rounds money sums to whole cents.
- `fuelTrackerIntervals_v1` — per-vehicle intervals:
  `{ id:"i_...", vehicleId, title, distance, months }` (either may be 0)
- `fuelTrackerSettings_v1` —
  `{ currency, distanceUnit, theme, activeVehicleId, garageFilter,
     defaultGrade, defaultDiscountPerLiter, defaultDiscountStation (comma-joined
     station list) }`

`ensureVehicles()` runs on load and after import: creates a "My Car" if none
exist, adopts orphaned fill-ups/service/intervals onto the first vehicle,
seeds `DEFAULT_INTERVALS` (oil, tire rotation, engine + cabin air filter,
brakes) for any vehicle with none, and fixes a missing/invalid activeVehicleId.
It also migrates legacy service records to the nested `items`/`parts` shape
(old single `cost`/`parts` become one priced item; a part carries the item's
cost so no money is lost). It is idempotent — safe on every load.

**JSON is the only re-importable format.** Backup files are
`{ data, settings, vehicles, service, intervals }`. The importer also accepts a
bare array and back-fills defaults, and tolerates old backups missing the
vehicles/service/intervals keys (ensureVehicles reconciles them). Never drop a
field without a migration. Warn before destructive actions.

CSV and XLSX exports are **read-only archives**, deliberately. CSV downloads two
files (fuel + service, all vehicles); XLSX is one workbook with two sheets.
Both omit `id` and settings. Do not add spreadsheet import without asking — it's
a much heavier lift than JSON import.

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
   correct answer is 16.8 L/100km. **It must be scoped to one vehicle** — two
   cars' odometers interleave (e.g. 45,000 next to 12,000) and would pair into
   meaningless distances: no error, just a silently wrong number. Same applies
   to `perFillMetrics()` (the per-card km/efficiency line) and `computeDueList()`.
   `computeEconomy(fills)` takes an optional fills array so the Stats period
   filter can scope it to one year (defaults to `activeFills()`).
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
10. **`\uXXXX` escapes only decode inside JS strings, not raw HTML.** A literal
    `\u2014` typed into markup in `index.html` prints as the four characters
    `\u2014`, not an em dash. In `app.js` template literals it decodes fine.
    In static HTML use the entity (`&mdash;`) or the actual character.
11. **"Up Next" due matching is by item title, case-insensitive.** An interval
    advances if ANY item in a service entry matches its title, so one entry can
    advance several intervals at once (brakes + rotors + filters in one visit).
    "Oil change" vs "Oil & filter" still won't match — the interval chips exist
    to keep item titles consistent.
12. **Sum money with `sumCents()`, never a raw `reduce`.** Adding decimal part
    prices produced `10.10 + 20.20 = 30.299999997`, which showed raw in the
    computed item-cost field and got stored. Any place that totals prices/costs
    must round to whole cents (or format through `fmtMoney`, which the entry
    total does).
13. **Changing an input's `type` can silently drop it out of a CSS selector.**
    `.field input[type=datetime-local]` stopped matching when the date field
    became `type=date`, so it lost all styling and iOS drew a default box. When
    you change a `type=`, grep `styles.css` for the old one.
14. **Adding a spreadsheet column shifts every hard-coded column index.** The
    CSV/XLSX writers derive numeric-column indices from the header names
    (`headers.indexOf('Liters')` etc.), not fixed positions, so a new column
    can't silently mis-format another. Keep it that way. The XLSX **width array**
    is positional, though — update its length when you add/remove a column.
15. **Pump price vs net total.** `pricePerLiter` is always the posted pump price
    and drives every price stat (Avg Price/L, trend, per-fill price/L). The
    discount only reduces `totalCost`. So on a discounted fill, `totalCost` is
    deliberately *less* than `liters × pricePerLiter` — don't "fix" that.
16. **The default discount is station-gated.** With `defaultDiscountStation`
    non-empty, the discount does NOT pre-fill on open; it fills when the entered
    station matches (via `applyStationDiscount`, wired to the station input and
    the suggestion chips). Editing preserves a stored discount unless the user
    changes the station. Blank station list → pre-fill everywhere on open.
17. **Long metadata lines wrap, they don't truncate.** The Garage history
    sub-line (`.garage-sub`) and the dashboard per-fill metrics line
    (`.row-detail`, values wrapped in nowrap `.rd-part` spans + `<wbr>`) were
    changed from ellipsis-truncation to wrapping so long shop names / four-value
    metric lines aren't cut off on narrow iPhones. Keep them wrapping.

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
- **Validate generated files with a real parser, not eyeballing.** The .xlsx
  writer is hand-rolled OOXML; after any change, drive a headless export
  (hook `URL.createObjectURL` to capture the Blob) and load it with
  `openpyxl` under `warnings.simplefilter('error')`. A subtle rels/sheet-id
  mistake makes Excel refuse to open the file, and that won't show in a smoke
  test. For CSV, check the raw bytes start with the UTF-8 BOM (`EF BB BF`) —
  `blob.text()` strips it on read, so assert on `arrayBuffer()` bytes.
- The image/screenshot viewer occasionally fails to render a valid PNG. Don't
  treat that as a code failure — confirm via measured geometry/pixel data
  instead, and note you couldn't eyeball it.

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
- A native Swift/SwiftData+CloudKit version was prototyped early on and
  abandoned in favor of this web app. Don't resurrect it unprompted.
- The sandbox cannot reach `*.pages.dev`. You cannot confirm a live deploy
  yourself — ask the user to look. Don't claim it works.

## Next steps

Everything shipped is in production (`main`). Two mobile items remain scoped but
not built — and note **neither is verifiable from the sandbox** (headless Chrome
can't emulate the iOS keyboard or measure real frame timing); they need the
user's phone:

1. **Keyboard-safe form layout** — unverified whether the fill-up/service sheet
   inputs stay visible when the iOS keyboard opens.
2. **Scroll/animation performance pass** — heavy `backdrop-filter` blur may
   drop frames on the 120 Hz ProMotion display. Unprofiled.

Minor known behaviours (not bugs, but a user might ask): editing a fill-up or
service record keeps it on its original vehicle — there's no move-between-cars.
The GitHub Actions workflow still uses `actions/checkout@v4` etc. on a
deprecated Node-20 runtime (harmless warning; bump when convenient).

Ask before building.
