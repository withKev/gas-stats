# gas-stats
Personal app used to track fuel fill ups and give stats

## Development

Edit files under `src/` only -- everything else is generated or tooling.

```bash
npm ci                # installs puppeteer (for verify.js) + wrangler
python3 build.py      # builds dist/fuel-tracker.html and dist/webapp/
node verify.js        # headless-Chrome smoke test -- must say ALL CHECKS PASSED
```

## Deployment

Pushing to any branch triggers `.github/workflows/deploy.yml`: it builds,
runs the smoke test, and only on success deploys via `wrangler`. Cloudflare
Pages gives every non-production branch its own preview URL; pushing to
`main` (the project's configured production branch) deploys to production.
