# Mathematical conventions

The objective registry implements quadratic, elliptical quadratic, Rosenbrock, Himmelblau, Rastrigin, Beale, ordinary saddle, monkey saddle, double well, and noisy quadratic. Each includes analytic gradients and analytic Hessians. Noisy quadratic has the exact same scalar objective as the ordinary quadratic; only the explicitly selected noisy-gradient algorithm perturbs its oracle.

The objective interface uses mathematical `(x,y)` coordinates. Mesh coordinates are scaled to a square in world space; plotting coordinates do not alter numerical updates.

## Rendering

On the visualization grid let `a` and `b` be sampled minimum and maximum values. Set `s = max(0.015(b−a), 1e−8)` and `D = log(1+(b−a)/s)` (use 1 if D is zero). The rendered height is:

`h(x,y) = 2.8 log(1 + max(f(x,y)−a, 0)/s) / D`.

This compresses large dynamic ranges and clips only rendered height below the sampled minimum. The optimizer, inspector, convergence curves, and exports retain raw values. Sampled extrema need not be true extrema. The scale legend expresses relative height/color, not absolute loss. 2D color uses the same normalization. Mesh interpolation introduces an approximation between grid vertices; line/marker heights evaluate the underlying objective exactly before the display transform.

## Critical points and curvature

For symmetric Hessian `[[a,b],[b,d]]`, the eigenvalues are `(a+d ± hypot(a−d,2b))/2`. The microscope reports them everywhere but only classifies a point when the analytic gradient norm is at most `1e−5`. Eigenvalue sign uses tolerance `1e−7`: both positive → local-minimum candidate, both negative → local-maximum candidate, mixed signs → saddle candidate, near-zero eigenvalues → inconclusive. These are numerical tests, not certificates. The monkey saddle has a zero Hessian at its origin despite descending directions.

Known critical-point markers are explicitly provided reference points, not points detected by an optimizer. Himmelblau marker coordinates are approximate.

## Derivative verification

Scientific tests compare every analytic gradient with central differences at the recommended start and two additional nonsingular points. Gradient tests use `h = 1e−5 max(1,|theta_i|)` and relative/absolute tolerance. Hessian tests differentiate gradients centrally, test symmetry, and compare against analytic entries. Independent objective-value fixtures and critical-point gradient checks supplement these tests. These finite tests do not prove every implementation correct over the entire real plane.

References: [optimization test functions, SFU](https://www.sfu.ca/~ssurjano/optimization.html), [Adam paper](https://arxiv.org/abs/1412.6980).
