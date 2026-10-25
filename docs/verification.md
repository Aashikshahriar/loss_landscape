# Verification record — 2026-10-25

Environment: Windows, Node v24.18.0, npm 11.16.0. The lockfile records exact dependencies.

| Check                             | Observed result                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`               | Passed, strict TypeScript                                                                                    |
| `npm run lint`                    | Passed, ESLint 10                                                                                            |
| `npm run test -- --run`           | 94 passed across 3 files                                                                                     |
| `npm run build`                   | Passed; static `dist` generated with base `/loss_landscape/`                                                 |
| `npm run test:e2e`                | 13 passed, 1 explicit skip across Chromium and Firefox                                                       |
| Automated axe accessibility audit | Zero violations for selected WCAG A/AA tags on the core 2D workspace in both tested browsers                 |
| 3D review script                  | Raycast changed the actual initialization, run advanced through real updates, PNG downloaded; no page errors |
| Desktop/mobile screenshots        | Actual production app captured in `docs/images`                                                              |
| Subdirectory assets               | Core mobile/browser workflow loaded production assets and worker without local 404s                          |
| Git repository                    | Branch main; commits attributed only to Aashikshahriar                                                       |
| Remote repository                 | Aashikshahriar/loss_landscape; account access verified                                                       |
| Public deployment                 | See the Deploy GitHub Pages workflow for current publication status                                          |

`npm audit --audit-level=high` reported zero vulnerabilities. The core mobile workflow also checks reflow at 390 px and 320 px without body overflow.

The skipped case is the Firefox-specific 3D picking/PNG test, because headless Firefox WebGL availability varies. Chromium 3D picking, PNG, navigation, and view switching pass. Firefox 2D workflows, import/resume, persistence, exports, mobile controls, and axe checks pass. This is not a Safari/WebKit test or a complete manual assistive-technology audit.

The seeded import/resume test exports a real five-step noisy run, imports it through the UI, restores it from IndexedDB, performs update six, exports again, and compares theta, oracle gradient, and loss against an independently executed deterministic kernel run.

Unit tests also verify actual evaluation counters, including rejected non-finite attempts and optional loss-change evaluations; history retains only finite states. Deterministic test helper timing is intentionally zero. Application runtime is measured in the browser worker.

Initial production bundle measurements: main JavaScript approximately 479 kB (148 kB gzip), on-demand 3D module 930 kB (249 kB gzip), contour module 9.4 kB (3.9 kB gzip), worker 8.1 kB. These are build output sizes, not device performance measurements. Mesh size is 96×96 cells; broad device/GPU benchmarks remain outstanding.

All public deployment and full conformance claims remain explicitly withheld until their corresponding checks are performed.
