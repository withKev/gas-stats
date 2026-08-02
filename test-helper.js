/**
 * Reusable test harness for one-off checks, so agents don't rebuild a puppeteer
 * script every time. Run AFTER `python3 build.py`.
 *
 *   node test-helper.js "<probe>"
 *
 * <probe> is a JS expression evaluated IN THE PAGE after it loads with sample
 * data seeded. It must return a JSON-serializable value. DOMRects don't
 * serialize -- copy the fields you need into a plain object first.
 *
 * Options via env:
 *   TAB=garage        click a tab before probing (dashboard|stats|garage|settings)
 *   DARK=1            emulate dark mode
 *   DATA=path.json    seed a custom {data,settings,vehicles,service,intervals}
 *                     or a bare fills array, instead of sample-data.json
 *   SHOT=out.png      screenshot the viewport to this path
 *   CHROME_PATH=...   use a specific Chrome (else Puppeteer's bundled one)
 *
 * Examples:
 *   node test-helper.js "document.querySelectorAll('.list-row').length"
 *   TAB=garage node test-helper.js "[...document.querySelectorAll('.stat-value')].map(v=>v.textContent)"
 *   DATA=/tmp/edge.json TAB=garage node test-helper.js "document.querySelector('.due-row .due-sub').textContent"
 *
 * To capture a downloaded export, the page exposes window.__grab():
 *   node test-helper.js "(async()=>{document.getElementById('export-csv-row').click(); await new Promise(r=>setTimeout(r,300)); return window.__grab();})()"
 * __grab() returns { name: text } for each download triggered (blob captured,
 * not written to disk). For binary (xlsx) it returns { name: base64 }.
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const probe = process.argv[2];
if (!probe) { console.error('usage: node test-helper.js "<in-page JS expression>"'); process.exit(1); }

const CHROME = process.env.CHROME_PATH || undefined;
const dataFile = process.env.DATA || path.join(__dirname, 'sample-data.json');
const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
// Accept either a full backup object or a bare fills array.
const seed = Array.isArray(raw) ? { data: raw } : raw;

(async () => {
  const opts = { headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] };
  if (CHROME) opts.executablePath = CHROME;
  const browser = await puppeteer.launch(opts);
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  if (process.env.DARK) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.evaluateOnNewDocument((s) => {
    if (s.data)      localStorage.setItem('fuelTrackerData_v1', JSON.stringify(s.data));
    if (s.settings)  localStorage.setItem('fuelTrackerSettings_v1', JSON.stringify(s.settings));
    if (s.vehicles)  localStorage.setItem('fuelTrackerVehicles_v1', JSON.stringify(s.vehicles));
    if (s.service)   localStorage.setItem('fuelTrackerService_v1', JSON.stringify(s.service));
    if (s.intervals) localStorage.setItem('fuelTrackerIntervals_v1', JSON.stringify(s.intervals));
    // Capture blob downloads without hitting the filesystem.
    window.__blobs = {}; window.__dl = {};
    const oc = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { const u = oc(b); window.__blobs[u] = b; return u; };
    HTMLAnchorElement.prototype.click = function () { if (this.download) window.__dl[this.download] = this.href; };
    window.__grab = async () => {
      const out = {};
      for (const name of Object.keys(window.__dl)) {
        const blob = window.__blobs[window.__dl[name]];
        if (name.endsWith('.csv') || name.endsWith('.json')) { out[name] = await blob.text(); }
        else { const b = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (const x of b) s += String.fromCharCode(x); out[name] = btoa(s); }
      }
      return out;
    };
  }, seed);

  await page.goto('file://' + path.join(__dirname, 'dist/webapp/index.html'), { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 350));

  if (process.env.TAB) {
    await page.evaluate((t) => document.querySelector(`.tab-btn[data-tab="${t}"]`).click(), process.env.TAB);
    await new Promise(r => setTimeout(r, 350));
  }

  let result, err;
  try { result = await page.evaluate(`(async()=>{ return (${probe}); })()`); }
  catch (e) { err = String(e); }

  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });

  console.log(JSON.stringify({ result, pageErrors: errors, evalError: err }, null, 2));
  await browser.close();
})();
