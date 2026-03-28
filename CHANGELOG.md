# sfp-images

## 0.1.0

### Minor Changes

- c3f7768: Add a local `generate-tips` Hono API with OpenAPI docs, Docker runtime support, and API test coverage.
- fe69cd1: Add a prototype `generate-tips` CLI flow with branded PNG rendering, exported generation helpers, and reference-image test coverage.

### Patch Changes

- ced3504: Add configurable API CORS origins for the Bun server and Cloudflare Worker entrypoints.
- 8ab1568: Fix packaged font resolution so `bun x` and `npx` can find the vendored Archivo Black font in published builds.
- 691ff88: Enable Cloudflare Worker observability with logs, traces, and persistence for the deployed API.
