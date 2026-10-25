# Release 0.1.0 limits and future work

This is a functional P0 build with selected P1 features, not completion of every feature in the master PRD. Scientific behavior is bounded simulation evidence, not a convergence proof or ranking of optimizers.

## Implemented with practical limits

- Ten analytic objectives, real GD/heavy-ball/RMSProp/Adam/noisy-gradient updates, deterministic replay, schedules, clipping, explicit termination, independent racing states, and up to four paths.
- Racing shares one hyperparameter configuration across algorithms. Per-algorithm hyperparameter panels are planned. Equal numerical learning rates have different meanings for different methods.
- 96×96 cell 3D mesh and 80×80 contour grid; sampling these bounded built-ins happens synchronously and is memoized. Only simulation updates run in a worker. Dynamic mesh resolution and worker-based large grid sampling remain future work. Performance has not been certified on a representative set of low-end GPUs.
- Numerical x/y controls and surface/contour point picking. The start marker is not draggable. Orbit, pan/zoom, fit view, wireframe/grid, and known critical labels are provided; camera follow, surface opacity, alternate colormaps, and contour-floor projection are not.
- Rewind is recorded-state inspection; running resumes from the latest state. Charts are responsive SVG with summaries and final-state tables; the chart pane is not resizable and there is no lasso.
- Numeric state, configuration, seed, history, moments, and status are saved. Camera state and UI preferences are not part of the export.
- Import performs schema/bounds validation, not independent recomputation or a scientific authenticity check. Unsupported schema versions are rejected; no older schemas exist to migrate.
- The PNG export scales a raster framebuffer. It does not re-render with more geometry. The SVG export is for convergence charts, not WebGL.
- High-contrast mode, native keyboard controls, reduced-motion CSS, no automatic simulations, HTML inspector, chart summaries, and mobile 2D-first layout are provided. A complete manual WCAG 2.2 AA and assistive-technology audit is still required before claiming conformance.
- Hidden browser tabs stop scheduling. Pause may allow one already-requested batch to finish. Worker reset revision IDs prevent old runs from overwriting a new configuration.
- Compute time is measured only in the worker; it excludes animation and UI work. Browser/hardware differences invalidate absolute benchmark comparisons.

## Explicitly planned, not implemented

- Custom safe-expression objectives and domain editor; no JavaScript evaluator or arbitrary expression execution is exposed.
- Prediction challenge with explicit scoring rules, basin maps, parameter sweeps, and algorithm benchmarks.
- Nesterov, AdaGrad, AdamW, BFGS, and L-BFGS.
- Real sample/minibatch SGD, batch sizes, finite dataset losses, and training diagnostics.
- Tiny MLP training, verified backpropagation, random/trajectory-aligned parameter-space slices, and projections of real training histories. None of the analytic surfaces are presented as neural-network losses.
- Per-optimizer parameters, cross-experiment comparison, filter/rename of notebook entries, camera persistence, advanced worker grid workloads, and full visual accessibility review.

## Deployment

GitHub Actions publishes the app from Aashikshahriar/loss_landscape to https://aashikshahriar.github.io/loss_landscape/. The workflow validates the build before deployment; its run history records publication status. The source and hosting configuration use the /loss_landscape/ base path.
