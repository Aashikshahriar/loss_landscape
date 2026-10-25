# Algorithms and stopping rules

Step 0 is theta_0. At update t, evaluate `g_t = gradient f(theta_t)`; the result is recorded as theta_(t+1). The recorded analytic gradient is at the new theta; `oracleGradient` stores the gradient actually used for that update, after optional noise and clipping. The vector diagram compares the last update with that oracle, not with a gradient evaluated at a different point.

## Update rules

- **GD:** `theta_(t+1) = theta_t − eta_t g_t`.
- **Heavy-ball momentum:** `v_(t+1) = beta v_t + g_t`, then `theta_(t+1) = theta_t − eta_t v_(t+1)`. The stored first moment is the velocity. There is no `(1−beta)` multiplier on g.
- **RMSProp:** `s_(t+1) = rho s_t + (1−rho) g_t²`, then `theta_(t+1) = theta_t − eta_t g_t/(sqrt(s_(t+1))+epsilon)`.
- **Adam:** `m_(t+1) = beta1 m_t + (1−beta1) g_t`; `v_(t+1) = beta2 v_t + (1−beta2) g_t²`. Divide by `1−beta1^(t+1)` and `1−beta2^(t+1)` respectively, then update with `eta_t mhat/(sqrt(vhat)+epsilon)`.
- **Noisy gradient simulation:** `g_t = gradient f(theta_t) + sigma xi_t`, with independent uniform coordinates on `[−sqrt(3),sqrt(3)]`. The noise has zero mean and per-coordinate variance sigma². A seeded Mulberry32-style integer generator is used, with two draws per update. Seed zero is valid. This is not actual SGD: there are no sample losses or minibatches.

All moments start at zero. RMSProp/Adam operations are elementwise; epsilon is outside the square root. Gradient clipping, when enabled, limits the oracle norm before the optimizer sees it. It defaults to off. Equal learning rates are not equal effective step sizes across algorithms.

## Schedules

For update index t, constant uses eta_0; exponential uses `eta_0 gamma^t`; cosine uses `eta_0(1+cos(pi min(t/T,1)))/2`, where T is the maximum update budget. All selected algorithms use the same schedule and hyperparameters in release 0.1.0.

## Termination

The first applicable condition wins: non-finite state/moments/gradient/update, explicit domain-exit policy, analytic gradient tolerance (deterministic methods only), step tolerance, optional absolute loss-change tolerance, then maximum iterations. Initial stationary points stop without an update; initial domain violations stop if the policy is enabled. Loss and step tolerances may stop at non-optimal points. Noisy runs do not stop merely because the exact gradient norm is small. Zero disables loss/step tolerance; gradient tolerance zero checks exact zero.

Domain boundaries are visualization bounds, not constraints. An out-of-domain state is retained and never projected. A non-finite attempt stops immediately; its invalid state is excluded from the finite trajectory, but attempted evaluations and compute time are counted.

Pause finishes at most an in-flight bounded batch and schedules no further updates. Reset invalidates previous worker messages and resets theta, moments, time index, seed, and history. Rewind inspects recorded states; resuming continues from the latest numerical state, rather than branching from the historical cursor.

## Metrics

Each accepted update computes the old-point oracle gradient and the new-point analytic gradient for diagnostics. Both are counted. A value is evaluated at the new point; enabled loss-change checks make an additional old-point value call, only when execution reaches that condition. Initial values and gradients count once. Visualization sampling and inspector Hessians are excluded from optimizer evaluation counters. Counters include rejected non-finite attempts.

Browser worker runtime measures update-batch computation using `performance.now()`, excluding playback waits, message transfer, rendering, and initial grid computation. It is hardware/browser dependent. The pure synchronous test helper deliberately does not measure runtime and returns zero runtime; the application uses the measured worker implementation.
