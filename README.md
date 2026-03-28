# sfp-images

`sfp-images` is a Bun and TypeScript package for generating branded images for School for Professionals sites.

## Overview

The package is intended to support:

- a CLI for scripted or repeatable image generation
- a shared internal image-generation core
- consistent output across School for Professionals sites

## CLI

The CLI currently provides a `generate-tips` command that renders a numbered tips image as a PNG:

```bash
bun x sfp-image generate-tips \
  --label sfp \
  --title "This is a way to generate images" \
  --tip "This is tip 1" \
  --tip "This is tip 2" \
  --tip "This is tip 3" \
  --tip "This is tip 4" \
  --output ./tmp/output.png
```

For local development in this repository, replace `bun x sfp-image` with `bun dev`.

Command rules:

- currently only `--label sfp` is implemented
- output paths must end in `.png`
- provide between `3` and `7` `--tip` flags
- tips must fit on a single line
- titles stay on one line and shrink when needed
- the CLI uses the vendored `Archivo Black` font under `assets/fonts/`

## API

The repository also includes a local Hono API for image generation and OpenAPI-based tooling.

Local development and Docker still use the Bun adapter. Cloudflare Workers uses the separate entrypoint in `src/api-worker.ts` via `wrangler.jsonc`.

Start it with:

```bash
bun dev api
```

If port `3000` is already in use, override it with `PORT`:

```bash
PORT=3100 bun dev api
```

Set `CORS_ORIGINS` to a comma-separated list of allowed origins to enable CORS. Leave it unset or blank to keep CORS disabled:

```bash
CORS_ORIGINS=https://app.example,https://studio.example bun dev api
```

For the Cloudflare Worker entrypoint, pass the same value through Wrangler:

```bash
bun x wrangler dev --config ./wrangler.jsonc --var CORS_ORIGINS:https://app.example,https://studio.example
```

Useful local URLs:

- docs UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- example image URL: [http://localhost:3000/api/generate-tips?label=sfp&title=Een%20presentatie%20geven%20in%205%20stappen&tip=Formuleer%20je%20kernboodschap&tip=Structureer%20je%20verhaal&tip=Ontwerp%20je%20slides&tip=Oefen%20voor%20een%20bekende&tip=Pas%20presentatietechnieken%20toe](http://localhost:3000/api/generate-tips?label=sfp&title=Een%20presentatie%20geven%20in%205%20stappen&tip=Formuleer%20je%20kernboodschap&tip=Structureer%20je%20verhaal&tip=Ontwerp%20je%20slides&tip=Oefen%20voor%20een%20bekende&tip=Pas%20presentatietechnieken%20toe)
- OpenAPI JSON: [http://localhost:3000/api/openapi.json](http://localhost:3000/api/openapi.json)

The `generate-tips` endpoint accepts the CLI-style query params except `output`:

- `label`
- repeated `tip`
- `title`

## Repository Metadata

- Bugs: [https://github.com/schoolforprofessionals/sfp-images/issues](https://github.com/schoolforprofessionals/sfp-images/issues)
- CLI: `sfp-image`
- Homepage: [https://github.com/schoolforprofessionals/sfp-images#readme](https://github.com/schoolforprofessionals/sfp-images#readme)
- License: [MIT](./LICENSE)
- Package: `sfp-images`
- Repository: [https://github.com/schoolforprofessionals/sfp-images](https://github.com/schoolforprofessionals/sfp-images)

## Development

Install dependencies with Bun:

```bash
bun install
```

Common commands:

```bash
bun run build
bun run check-types
bun run lint
bun run lint:fix
bun test
bun run test:watch
bun run test:worker
```

Reference fixtures live under `test/fixtures/generate-tips/`. Committed reference PNGs use the `*.reference.png` suffix. Running `bun test` regenerates sibling `*.generated.png` and `*.diff.png` artifacts beside those references and fails only if a committed reference becomes identical to the generated output, which usually means the original reference was overwritten with a generated copy.

## License

MIT; see [LICENSE](./LICENSE).
