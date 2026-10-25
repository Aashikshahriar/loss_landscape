# Reproducing and exporting experiments

1. Choose an objective, initial point, algorithms, hyperparameters, schedule, seed, and stopping rules.
2. Run or single-step; inspect every recorded state using the slider or convergence plot.
3. Use **Save experiment** for IndexedDB storage on this browser and origin.
4. Export **Experiment JSON** to keep the entire run outside the browser.
5. Import JSON from the Experiments page. Restore resumes the final saved state; Reset starts over with zero moments and the original seed.

Within the same engine version, configuration and seed reproduce numerical trajectories. Wall timings are not reproducible. Floating-point/transcendental implementations may introduce small differences across browser engines. Noise resume reconstructs the PRNG position from the seed and two draws per completed noisy step. No PRNG state is shared between optimizers.

The JSON format stores schema and algorithm versions, name/ID, creation timestamp, complete configuration, finite samples, raw moments, analytic and oracle gradients, counters, statuses, and compute timings. Camera orbit, selected chart, and transient hover state are not persisted in this first release. Import supports schema 1 only, caps files at 32 MB, validates finite values, consecutive step numbers, starting conditions, optimizer IDs, run counts, and bounded history. Schema validation is not independent verification of imported scientific results; reset/replay to verify a supplied trajectory.

CSV includes comment metadata containing the full configuration, timestamp, schema and algorithm version, followed by algorithm, step, x, y, loss, gradient norm, update norm, learning rate, status, and elapsed worker compute milliseconds. No non-finite numeric state is serialized; terminal failure lives in the run's JSON status and final CSV row status.

Share links contain configuration only, capped at 4,000 URL characters. They include the numeric start and random seed. They contain no histories or private datasets. Copying requires browser clipboard access. Clear the URL configuration before sharing a location if you do not want to expose it.

The viewport's camera button exports a raster PNG. Its dimensions are twice the current framebuffer plus annotation space: this is a scaled raster export, not extra geometric resolution or vector graphics. Axis labels are native Three.js sprites and are retained. The export includes objective, step, algorithms, and height-transform annotation. Chart export is genuine SVG. SVG export of the WebGL surface is not offered.

IndexedDB data stays on the device, is origin-specific, and may be cleared by browser settings. Duplicate and delete operate locally. No private data is sent to a backend. Fonts and code are bundled; outbound GitHub/reference links only open when requested.
