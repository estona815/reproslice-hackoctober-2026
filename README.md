# ReproSlice

Keep the failure. Lose the noise.

A portable, local browser lab for reducing a **synthetic** failing configuration and inspecting every single-line deletion. Built for HackOctober MLH X Tech4hack (31802), October 21, 2026. This is a new project; no earlier contest source is reused. AI assistance: OpenAI Codex helped with implementation, tests, design and documentation. The design reference was generated with the built-in image tool; no generated raster UI is shipped.

## Try it

Serve this directory using `python3 -m http.server 8883 --bind 127.0.0.1`, then open `http://127.0.0.1:8883/`. No package installation, account or API key is needed. `node --test engine.test.mjs` runs the engine checks with Node 20+.

1. Keep **Conflicting flags**, then choose **Reduce configuration**. The 12-line sample retains the original CACHE and FRESH lines. Each single-line deletion passes.
2. Choose **Required dependency**, **Load example**, then reduce. The failing three-line core includes HEADER. Deleting HEADER is **UNRESOLVED**. The app deliberately withholds a verified 1-minimality claim.
3. Choose **Exact sequence**, load and reduce. OPEN, COMMIT, CLOSE must keep their original order. Duplicate text remains distinct by source line ID.
4. Expand **Reduction trace**, or **Export report**. The JSON contains input, retained lines, target signature, all observations, deletion audit and an explicit `global_minimum_claimed:false`. The displayed SHA-256 covers exact downloadable JSON bytes, including the final LF.

## What the evidence means

The reducer accepts a candidate only when its **failure signature matches the selected target**. Unrelated failure does not count as reproducing the target. Partition complements reduce the input; a final deletion sweep and explicit per-line audit check the retained result. A conservative certification requires every single deletion to return PASS. UNRESOLVED and unrelated failures cannot silently become passes.

This is not a production debugger. The three oracles are hand-written deterministic teaching models. It executes no submitted code, invokes no real service, and makes no claim about root cause, real-world savings, global minimality, statistical confidence, or a novel reduction algorithm. The trace may contain cached observations; execution and observation counts are separate. Two different globally minimal sets may exist. Returned line IDs refer to the original input.

## Limits and privacy

At most 128 lines and 20,000 UTF-16 code units; malformed Unicode surrogates are rejected. CRLF/CR become LF, while spaces and blank lines are preserved. Trimming is used only by the toy oracles for token comparison. Original and retained line text stays in the report. **Reports include all original input. Review them before sharing. Use no secrets.** There is no fetch, analytics, storage, worker, backend or remote API. CSP disables network connections. The attribution link opens the research website only when clicked.

The generic reduction function is an internal JavaScript API used by the tests, not a browser interface for running arbitrary predicates. Input is rendered with textContent, never HTML.

## Credit

Delta debugging is established work by Andreas Zeller and Ralf Hildebrandt: [Simplifying and Isolating Failure-Inducing Input, IEEE TSE 28(2), 2002](https://www.st.cs.uni-saarland.de/papers/tse2002/). ReproSlice is an independently written educational implementation with signature-aware reduction, explicit unresolved checks and portable evidence. It does not claim invention of delta debugging or reuse third-party implementation code.

## Submission state

Local candidate. Native event registration is verified. An existing empty Devpost draft (submission1251377, project1496931) must be continued, never created again. No final submission, public deployment or award is claimed by these files.
