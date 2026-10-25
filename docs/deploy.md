# GitHub Pages deployment

Expected URL: https://aashikshahriar.github.io/loss_landscape/

Repository: [Aashikshahriar/loss_landscape](https://github.com/Aashikshahriar/loss_landscape). The `main` branch deployment workflow publishes the site after its quality gates pass. See [workflow runs](https://github.com/Aashikshahriar/loss_landscape/actions) for deployment state.

Use Node 24 and the committed package lock:

```sh
npm ci
npm run typecheck
npm run lint
npm run test -- --run
npm run build
npx playwright install --with-deps chromium firefox
npm run test:e2e
```

Push this checkout's `main` branch to `Aashikshahriar/loss_landscape` and choose **Settings → Pages → Build and deployment → Source: GitHub Actions**. The workflows check numerical tests, types, lint, production build, and Chromium/Firefox smoke workflows before uploading/deploying. `deploy.yml` also supports manual `workflow_dispatch`. Pages deployments serialize through a concurrency group.

The workflow uses maintained action majors verified against their official documentation: checkout v7, setup-node v7, configure-pages v5, upload-pages-artifact v4, deploy-pages v4. Deployment alone has `pages: write` and `id-token: write`; build/CI use `contents: read`. Dependency caching uses the lockfile.

Vite base defaults to `/loss_landscape/`. Hash routes avoid SPA fallback requirements. Vite emits the module worker URL and bundled fonts/assets under that base. A `BASE_PATH` override is available for another static host. There are no SSR or server APIs.

After the workflow succeeds, manually verify the expected URL and `#/lab` on the live host, check worker/font/renderer requests for 404s, run a small experiment, download exports, refresh a hash route, and test a mobile viewport. Only then mark deployment complete. Browser smoke tests currently exercise the production build at the same subdirectory locally, not the live GitHub host.
