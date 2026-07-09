#!/usr/bin/env python3
"""
Build Fuel Tracker.

Reads the editable sources in src/ and produces two deployables in dist/:

  dist/fuel-tracker.html     single self-contained file (CSS + JS + Chart.js inlined)
  dist/webapp/               folder build (index.html + styles.css + app.js + lib/ + icons/ + sw.js)

Run:  python3 build.py
"""
import os, re, shutil, sys

SRC = 'src'
DIST = 'dist'
FOLDER = os.path.join(DIST, 'webapp')


def read(*parts):
    with open(os.path.join(*parts), encoding='utf-8') as f:
        return f.read()


def bump_cache_version(sw_text):
    """Increment fuel-tracker-vN in sw.js so browsers drop the old cache."""
    m = re.search(r"fuel-tracker-v(\d+)", sw_text)
    if not m:
        return sw_text, None
    n = int(m.group(1)) + 1
    return re.sub(r"fuel-tracker-v\d+", f"fuel-tracker-v{n}", sw_text), n


def main():
    if not os.path.isdir(SRC):
        sys.exit(f"error: {SRC}/ not found. Run from the project root.")

    html = read(SRC, 'index.html')
    css = read(SRC, 'styles.css')
    app = read(SRC, 'app.js')
    chartjs = read(SRC, 'lib', 'chart.umd.min.js')

    # Guard: inlining breaks if a source contains a literal </script>.
    for name, text in (('app.js', app), ('lib/chart.umd.min.js', chartjs)):
        if '</script>' in text:
            sys.exit(f"error: {name} contains '</script>', which cannot be inlined.")

    # --- bump the service worker cache version once, reuse for both builds ---
    sw = read(SRC, 'sw.js')
    sw, version = bump_cache_version(sw)
    if version:
        with open(os.path.join(SRC, 'sw.js'), 'w', encoding='utf-8') as f:
            f.write(sw)

    os.makedirs(DIST, exist_ok=True)

    # ---------------- single-file build ----------------
    single = html
    single = single.replace(
        '<link rel="stylesheet" href="styles.css">',
        '<style>\n' + css.strip() + '\n</style>')
    single = single.replace(
        '<script src="lib/chart.umd.min.js"></script>',
        '<script>/* Chart.js 4.4.4 bundled inline */\n' + chartjs.strip() + '\n</script>')
    single = single.replace(
        '<script src="app.js"></script>',
        '<script>\n' + app.strip() + '\n</script>')

    # The single file has no sibling sw.js, so don't try to register one.
    single = single.replace("navigator.serviceWorker.register('sw.js')",
                            "Promise.reject()")

    for leftover in ('href="styles.css"', 'src="app.js"', 'src="lib/chart.umd.min.js"'):
        if leftover in single:
            sys.exit(f"error: failed to inline {leftover}")

    single_path = os.path.join(DIST, 'fuel-tracker.html')
    with open(single_path, 'w', encoding='utf-8') as f:
        f.write(single)

    # ---------------- folder build ----------------
    if os.path.isdir(FOLDER):
        shutil.rmtree(FOLDER)
    shutil.copytree(SRC, FOLDER)

    kb = lambda p: round(os.path.getsize(p) / 1024, 1)
    print(f"cache version   -> fuel-tracker-v{version}")
    print(f"{single_path}   {kb(single_path)} KB  (single file, ship this)")
    print(f"{FOLDER}/       folder build (self-host this)")


if __name__ == '__main__':
    main()
