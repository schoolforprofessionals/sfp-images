import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import {
  computeGenerateTipsLayout,
  type GenerateTipsImageInput,
  generateTipsImage,
  generateTipsSvg,
  getGenerateTipsConfig,
} from '../src/index.ts'
import { generateTipsReferenceFixtures } from './fixtures/generate-tips/references.ts'
import { type CompareImagesInput, compareImages } from './helpers/compare-images.ts'
import {
  createDiffReferenceImagePath,
  createGeneratedReferenceImagePath,
  resolveGenerateTipsReferenceEntries,
  writeGenerateTipsReferenceImages,
} from './helpers/generate-reference-images.ts'

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
const generateTipsFixturesDirectoryPath = fileURLToPath(new URL('./fixtures/generate-tips', import.meta.url))
const sampleInput: GenerateTipsImageInput = {
  label: 'sfp',
  tips: ['Lead with clarity', 'Keep the copy short', 'Measure real text width', 'Render once to PNG'],
  title: 'This is a way to generate images',
}
const generateTipsConfig = getGenerateTipsConfig(sampleInput.label)

type Rgba = readonly [number, number, number, number]

function createPngBytes(height: number, pixels: readonly Rgba[], width: number): Uint8Array {
  const png = new PNG({ height, width })

  if (pixels.length !== width * height) {
    throw new Error(`Expected ${width * height} pixels but received ${pixels.length}.`)
  }

  pixels.forEach(([red, green, blue, alpha], index) => {
    const offset = index * 4

    png.data[offset] = red
    png.data[offset + 1] = green
    png.data[offset + 2] = blue
    png.data[offset + 3] = alpha
  })

  return PNG.sync.write(png)
}

async function createTemporaryComparisonPaths(fileName: string): Promise<{
  diffOutputPath: string
  directoryPath: string
  generatedPath: string
  referencePath: string
}> {
  const directoryPath = await mkdtemp(join(tmpdir(), 'sfp-images-compare-'))

  return {
    diffOutputPath: join(directoryPath, `${fileName}.diff.png`),
    directoryPath,
    generatedPath: join(directoryPath, `${fileName}.generated.png`),
    referencePath: join(directoryPath, `${fileName}.reference.png`),
  }
}

async function writeComparisonFixtures(
  input: CompareImagesInput & {
    generatedPixels: readonly Rgba[]
    generatedSize: readonly [number, number]
    referencePixels: readonly Rgba[]
    referenceSize: readonly [number, number]
  },
): Promise<CompareImagesInput> {
  const [generatedWidth, generatedHeight] = input.generatedSize
  const [referenceWidth, referenceHeight] = input.referenceSize

  await Bun.write(input.generatedPath, createPngBytes(generatedHeight, input.generatedPixels, generatedWidth))
  await Bun.write(input.referencePath, createPngBytes(referenceHeight, input.referencePixels, referenceWidth))

  return {
    diffOutputPath: input.diffOutputPath,
    generatedPath: input.generatedPath,
    referencePath: input.referencePath,
  }
}

test('computeGenerateTipsLayout rejects fewer than three tips', async () => {
  await expect(
    computeGenerateTipsLayout({
      label: 'sfp',
      tips: ['One tip', 'Two tips'],
      title: 'Valid title',
    }),
  ).rejects.toThrow('Provide between 3 and 7 tips.')
})

test('computeGenerateTipsLayout rejects more than seven tips', async () => {
  await expect(
    computeGenerateTipsLayout({
      label: 'sfp',
      tips: ['1', '2', '3', '4', '5', '6', '7', '8'],
      title: 'Valid title',
    }),
  ).rejects.toThrow('Provide between 3 and 7 tips.')
})

test('computeGenerateTipsLayout rejects a blank title', async () => {
  await expect(
    computeGenerateTipsLayout({
      label: 'sfp',
      tips: ['One', 'Two', 'Three'],
      title: '   ',
    }),
  ).rejects.toThrow('Title is required.')
})

test('computeGenerateTipsLayout rejects a blank tip', async () => {
  await expect(
    computeGenerateTipsLayout({
      label: 'sfp',
      tips: ['One', '   ', 'Three'],
      title: 'Valid title',
    }),
  ).rejects.toThrow('Tips cannot be blank.')
})

test('computeGenerateTipsLayout rejects a tip that is too long for one line', async () => {
  await expect(
    computeGenerateTipsLayout({
      label: 'sfp',
      tips: [
        'A practical tip',
        'This single tip is intentionally long enough to overflow the allowed bar width and should fail validation immediately',
        'Another practical tip',
      ],
      title: 'Valid title',
    }),
  ).rejects.toThrow('is too long to fit on a single line')
})

test('computeGenerateTipsLayout keeps reference titles on one line by shrinking the font', async () => {
  const layout = await computeGenerateTipsLayout({
    label: 'sfp',
    tips: ['Maak je ambities kenbaar', 'Deel je expertise', 'Verspreid je ideeën', 'Neem deel aan projecten'],
    title: 'Minder onzichtbaar zijn met 4 acties',
  })

  expect(layout.titleLines).toEqual(['MINDER ONZICHTBAAR ZIJN MET 4 ACTIES'])
  expect(layout.titleFontSize).toBeLessThanOrEqual(generateTipsConfig.layout.titleFontSizeMax)
  expect(layout.titleFontSize).toBeGreaterThanOrEqual(generateTipsConfig.layout.titleFontSizeMin)
})

test('computeGenerateTipsLayout rejects a title that cannot fit on one line', async () => {
  await expect(
    computeGenerateTipsLayout({
      label: 'sfp',
      tips: ['One', 'Two', 'Three'],
      title:
        'This title is intentionally verbose enough to stay much too long for a single line even after shrinking and should still fail validation cleanly',
    }),
  ).rejects.toThrow('Title is too long to fit on a single line in the current layout.')
})

test('createGeneratedReferenceImagePath creates a sibling .generated.png path', () => {
  expect(createGeneratedReferenceImagePath('/tmp/sfp-4-tips.reference.png')).toBe('/tmp/sfp-4-tips.generated.png')
})

test('createDiffReferenceImagePath creates a sibling .diff.png path', () => {
  expect(createDiffReferenceImagePath('/tmp/sfp-4-tips.reference.png')).toBe('/tmp/sfp-4-tips.diff.png')
})

test('resolveGenerateTipsReferenceEntries resolves fixture entries by label directory', async () => {
  const entries = await resolveGenerateTipsReferenceEntries(
    {
      sfp: [
        {
          referenceFileName: 'sfp-3-tips.reference.png',
          tips: ['Deel een gedachte-experiment', 'Schets een droombeeld', 'Geef een dynamische demo'],
          title: 'Zet je publiek aan het denken',
        },
      ],
    },
    generateTipsFixturesDirectoryPath,
  )

  expect(entries).toEqual([
    {
      diffPath: join(generateTipsFixturesDirectoryPath, 'sfp', 'sfp-3-tips.diff.png'),
      generatedPath: join(generateTipsFixturesDirectoryPath, 'sfp', 'sfp-3-tips.generated.png'),
      label: 'sfp',
      referenceFileName: 'sfp-3-tips.reference.png',
      referencePath: join(generateTipsFixturesDirectoryPath, 'sfp', 'sfp-3-tips.reference.png'),
      tips: ['Deel een gedachte-experiment', 'Schets een droombeeld', 'Geef een dynamische demo'],
      title: 'Zet je publiek aan het denken',
    },
  ])
})

test('compareImages returns full similarity for identical images', async () => {
  const paths = await createTemporaryComparisonPaths('identical')
  const redPixel: Rgba = [255, 0, 0, 255]
  const greenPixel: Rgba = [0, 255, 0, 255]
  const comparisonInput = await writeComparisonFixtures({
    ...paths,
    generatedPixels: [redPixel, greenPixel],
    generatedSize: [2, 1],
    referencePixels: [redPixel, greenPixel],
    referenceSize: [2, 1],
  })

  await expect(compareImages(comparisonInput)).resolves.toEqual({
    diffPixels: 0,
    similarity: 1,
    totalPixels: 2,
  })
})

test('compareImages throws when image dimensions do not match', async () => {
  const paths = await createTemporaryComparisonPaths('dimension-mismatch')
  const redPixel: Rgba = [255, 0, 0, 255]
  const comparisonInput = await writeComparisonFixtures({
    ...paths,
    generatedPixels: [redPixel],
    generatedSize: [1, 1],
    referencePixels: [redPixel, redPixel],
    referenceSize: [2, 1],
  })

  await expect(compareImages(comparisonInput)).rejects.toThrow(
    `Generated image "${comparisonInput.generatedPath}" (1x1) does not match reference image "${comparisonInput.referencePath}" (2x1).`,
  )
})

test('compareImages reports differing pixels when images do not match', async () => {
  const paths = await createTemporaryComparisonPaths('different')
  const bluePixel: Rgba = [0, 0, 255, 255]
  const greenPixel: Rgba = [0, 255, 0, 255]
  const redPixel: Rgba = [255, 0, 0, 255]
  const comparisonInput = await writeComparisonFixtures({
    ...paths,
    generatedPixels: [redPixel, bluePixel],
    generatedSize: [2, 1],
    referencePixels: [redPixel, greenPixel],
    referenceSize: [2, 1],
  })
  const result = await compareImages(comparisonInput)

  expect(result.diffPixels).toBeGreaterThan(0)
  expect(result.similarity).toBeLessThan(1)
  expect(result.totalPixels).toBe(2)
})

test('compareImages writes a diff PNG when requested', async () => {
  const paths = await createTemporaryComparisonPaths('diff-output')
  const bluePixel: Rgba = [0, 0, 255, 255]
  const greenPixel: Rgba = [0, 255, 0, 255]
  const redPixel: Rgba = [255, 0, 0, 255]
  const comparisonInput = await writeComparisonFixtures({
    ...paths,
    generatedPixels: [redPixel, bluePixel],
    generatedSize: [2, 1],
    referencePixels: [redPixel, greenPixel],
    referenceSize: [2, 1],
  })
  const result = await compareImages(comparisonInput)
  const diffFile = Bun.file(paths.diffOutputPath)

  expect(result.diffPixels).toBeGreaterThan(0)
  expect(await diffFile.exists()).toBe(true)
  expect(Array.from(new Uint8Array(await diffFile.arrayBuffer()).slice(0, pngSignature.length))).toEqual(pngSignature)
})

test('generateTipsImage returns PNG bytes', async () => {
  const png = await generateTipsImage(sampleInput)

  expect(Array.from(png.slice(0, pngSignature.length))).toEqual(pngSignature)
  expect(png.byteLength).toBeGreaterThan(0)
})

test('generateTipsImage is deterministic for a fixed input', async () => {
  const [firstPng, secondPng] = await Promise.all([generateTipsImage(sampleInput), generateTipsImage(sampleInput)])

  expect(firstPng).toEqual(secondPng)
})

test('generateTipsSvg uses colors from the provided label', async () => {
  const svg = await generateTipsSvg({
    ...sampleInput,
  })

  expect(svg).toContain('#3a2b58')
  expect(svg).toContain('#e8e3f1')
  expect(svg).toContain('#f46036')
  expect(svg).toContain('#ffffff')
})

test('computeGenerateTipsLayout shares one bar width across all bars', async () => {
  const layout = await computeGenerateTipsLayout(sampleInput)
  const uniqueWidths = new Set(layout.bars.map((bar) => bar.width))

  expect(layout.barWidth).toBeLessThanOrEqual(generateTipsConfig.layout.barMaxWidth)
  expect(layout.barWidth).toBeGreaterThan(0)
  expect(uniqueWidths.size).toBe(1)
})

test('generate-tips reference fixtures regenerate sibling artifacts and stay distinct from references', async () => {
  const entries = await resolveGenerateTipsReferenceEntries(
    generateTipsReferenceFixtures,
    generateTipsFixturesDirectoryPath,
  )
  const identicalMatches: string[] = []

  await writeGenerateTipsReferenceImages(entries)

  for (const entry of entries) {
    const generatedBytes = await Bun.file(entry.generatedPath).bytes()
    const comparisonResult = await compareImages({
      diffOutputPath: entry.diffPath,
      generatedPath: entry.generatedPath,
      referencePath: entry.referencePath,
    })
    const diffBytes = await Bun.file(entry.diffPath).bytes()

    expect(Array.from(generatedBytes.slice(0, pngSignature.length))).toEqual(pngSignature)
    expect(Array.from(diffBytes.slice(0, pngSignature.length))).toEqual(pngSignature)

    if (comparisonResult.diffPixels === 0) {
      identicalMatches.push(
        `${entry.referenceFileName}: similarity=${comparisonResult.similarity.toFixed(6)}, generatedPath=${entry.generatedPath}, diffPath=${entry.diffPath}`,
      )
    }
  }

  if (identicalMatches.length > 0) {
    throw new Error(
      `Generated output exactly matches ${identicalMatches.length} reference fixture(s). This usually means a committed *.reference.png file was replaced with a generated copy:\n${identicalMatches.join('\n')}`,
    )
  }
})
