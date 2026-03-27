import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

export type CompareImagesInput = {
  diffOutputPath?: string
  generatedPath: string
  referencePath: string
}

export type CompareImagesResult = {
  diffPixels: number
  similarity: number
  totalPixels: number
}

function formatDimensions(png: PNG): string {
  return `${png.width}x${png.height}`
}

async function readPng(path: string): Promise<PNG> {
  const bytes = await Bun.file(path).bytes()

  return PNG.sync.read(Buffer.from(bytes))
}

export async function compareImages(input: CompareImagesInput): Promise<CompareImagesResult> {
  const generatedPng = await readPng(input.generatedPath)
  const referencePng = await readPng(input.referencePath)

  if (generatedPng.width !== referencePng.width || generatedPng.height !== referencePng.height) {
    throw new Error(
      `Generated image "${input.generatedPath}" (${formatDimensions(generatedPng)}) does not match reference image "${input.referencePath}" (${formatDimensions(referencePng)}).`,
    )
  }

  const diffPng = new PNG({
    height: generatedPng.height,
    width: generatedPng.width,
  })
  const diffPixels = pixelmatch(
    generatedPng.data,
    referencePng.data,
    diffPng.data,
    generatedPng.width,
    generatedPng.height,
  )
  const totalPixels = generatedPng.width * generatedPng.height
  const similarity = totalPixels === 0 ? 1 : 1 - diffPixels / totalPixels

  if (input.diffOutputPath) {
    await mkdir(dirname(input.diffOutputPath), { recursive: true })
    await Bun.write(input.diffOutputPath, PNG.sync.write(diffPng))
  }

  return {
    diffPixels,
    similarity,
    totalPixels,
  }
}
