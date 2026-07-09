/**
 * Smoke test for Fuel Tracker. Run AFTER `python3 build.py`:
 *
 *   node verify.js
 *
 * Loads both builds in real headless Chrome with sample data, and checks:
 * page errors, Chart.js loaded, tab icons, FAB, row counts, charts actually
 * painting pixels, and the Settings tab rendering.
 *
 * Requires `npm ci` first (installs puppeteer + its own bundled Chromium).
 * Set CHROME_PATH to point at a specific Chrome binary instead (e.g. to
 * reuse an already-installed browser and skip Puppeteer's download).
 */
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const CHROME = process.env.CHROME_PATH || undefined; // undefined -> Puppeteer's own bundled Chromium
// Sample data ships with the repo so verify works in a fresh session.
const SAMPLE = path.join(__dirname, 'sample-data.json');

async function check(url, label) {
  const sample = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
  const launchOpts = { headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] };
  if (CHROME) launchOpts.executablePath = CHROME;
  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluateOnNewDocument((d, s) => {
    localStorage.setItem('fuelTrackerData_v1', JSON.stringify(d));
    localStorage.setItem('fuelTrackerSettings_v1', JSON.stringify(s));
  }, sample.data, sample.settings);

  await page.goto(url, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));

  const r = { errors };
  r.chartLoaded = await page.evaluate(() => typeof Chart !== 'undefined');
  r.tabs = await page.evaluate(() => [...document.querySelectorAll('.tab-btn')].map(t => t.dataset.tab));
  r.allTabIcons = await page.evaluate(() => [...document.querySelectorAll('.tab-btn')].every(t => !!t.querySelector('svg')));
  r.fabIcon = await page.evaluate(() => !!document.getElementById('fab').querySelector('svg'));
  r.fillUpRows = await page.evaluate(() => document.querySelectorAll('.list-row[data-id]').length);

  await page.evaluate(() => document.querySelector('.tab-btn[data-tab="stats"]').click());
  await new Promise(r2 => setTimeout(r2, 600));
  r.canvases = await page.evaluate(() => document.querySelectorAll('canvas').length);
  // Strongest check: did the chart actually paint any pixels?
  r.chartsPainted = await page.evaluate(() => {
    const c = document.getElementById('monthlyCanvas');
    if (!c) return false;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return true;
    return false;
  });

  await page.evaluate(() => document.querySelector('.tab-btn[data-tab="settings"]').click());
  await new Promise(r2 => setTimeout(r2, 300));
  r.settingsRenders = await page.evaluate(() =>
    !!document.getElementById('s-currency') && !!document.getElementById('export-row'));
  r.fabHiddenOnSettings = await page.evaluate(() =>
    document.getElementById('fab').classList.contains('hidden'));

  await browser.close();

  const ok = r.errors.length === 0 && r.chartLoaded && r.allTabIcons && r.fabIcon
    && r.chartsPainted && r.settingsRenders && r.fabHiddenOnSettings && r.fillUpRows > 0;
  console.log(`\n--- ${label}: ${ok ? 'PASS' : 'FAIL'} ---`);
  console.log(JSON.stringify(r, null, 1));
  return ok;
}

(async () => {
  const root = __dirname;
  const a = await check('file://' + path.join(root, 'dist/fuel-tracker.html'), 'SINGLE FILE');
  const b = await check('file://' + path.join(root, 'dist/webapp/index.html'), 'FOLDER BUILD');
  console.log(`\n${a && b ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}\n`);
  process.exit(a && b ? 0 : 1);
})();
