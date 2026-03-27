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
bun run test:watch
bun test
```

Reference fixtures live under `test/fixtures/generate-tips/`. Committed reference PNGs use the `*.reference.png` suffix. Running `bun test` regenerates sibling `*.generated.png` and `*.diff.png` artifacts beside those references and fails only if a committed reference becomes identical to the generated output, which usually means the original reference was overwritten with a generated copy.

## License

MIT; see [LICENSE](./LICENSE).
