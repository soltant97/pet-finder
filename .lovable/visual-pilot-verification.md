# Phase 1 evidence — 2026-10-28

No application code, schema, storage policies or providers changed.
Scratch harness and dependencies are in /tmp/djur-runtime; no project dependencies added.

## Gateway image embedding
- Exact model: google/gemini-embedding-2.
- One synthetic 256×256 JPEG of colored shapes; no user photos.
- Documented /v1/embeddings, multimodal image_url with inline data URI, encoding_format float.
- HTTP/upstream 200; returned 3072 finite numeric dimensions at index 0.
- Usage: 258 image input tokens. Gateway duration: 402ms; observed request roundtrip ~0.47 seconds.
- Confirmed logged debit: 0.0004644 credits, consistent with 258 × 0.0000018.
- This proves request compatibility, not animal identification precision or private-photo privacy readiness.
- Gateway log exposes the synthetic image payload. Full-context capture must be disabled and verified before processing user photos; provider zero retention does not disable platform logging.

## Isolated workerd codec checks
- jpeg-js JPEG + fast-png PNG + @jsquash/webp explicit precompiled WASM decoded and reencoded small fixtures to JPEG successfully in workerd.
- Original test metadata strings absent in output; broken JPEG rejected.
- JPEG orientation 6 was applied successfully (32×48 input → 48×32 output).
- Full metadata test failed on WebP: exifr reports Unknown file format. Do not claim WebP EXIF orientation handling passes.
- Large-image rejection, malformed PNG/WebP, all orientation pixel layouts, and emitted TanStack/Nitro WASM bundling remain unverified.
- No user photos may be processed until these gates and logging controls pass.

## Blocked follow-on work
Schema/UI/indexing intentionally not started while Phase 1 requirements remain unmet.
Real 40-animal consented evaluation set has not been supplied; no Recall claim is possible.