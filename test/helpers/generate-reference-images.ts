import { access, mkdir } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { type GenerateTipsImageInput, generateTipsImage } from '../../src/index.ts'
import { getLabelConfig, type Label } from '../../src/labels.ts'

const referenceImageSuffix = '.reference.png'

export type GenerateTipsReferenceFixture = {
  referenceFileName: string
  tips: string[]
  title: string
}

export type GenerateTipsReferenceFixtures = Partial<Record<Label, readonly GenerateTipsReferenceFixture[]>>

export type GenerateTipsReferenceEntry = GenerateTipsImageInput & {
  diffPath: string
  generatedPath: string
  referenceFileName: string
  referencePath: string
}

function createGenerateTipsReferenceEntry(
  fixture: GenerateTipsReferenceFixture,
  fixturesDirectoryPath: string,
  label: Label,
): GenerateTipsReferenceEntry {
  if (!fixture.referenceFileName) {
    throw new Error(`Reference entry for label "${label}" must define a reference image filename.`)
  }

  if (!fixture.title) {
    throw new Error(`Reference entry "${fixture.referenceFileName}" is missing a title.`)
  }

  if (fixture.tips.length === 0) {
    throw new Error(`Reference entry "${fixture.referenceFileName}" must include at least one tip.`)
  }

  const referencePath = resolve(fixturesDirectoryPath, label, fixture.referenceFileName)

  return {
    diffPath: createDiffReferenceImagePath(referencePath),
    generatedPath: createGeneratedReferenceImagePath(referencePath),
    label,
    referenceFileName: fixture.referenceFileName,
    referencePath,
    tips: fixture.tips,
    title: fixture.title,
  }
}

function createReferenceArtifactPath(referencePath: string, suffix: string): string {
  if (!referencePath.endsWith(referenceImageSuffix)) {
    throw new Error(`Reference image "${referencePath}" must use a ${referenceImageSuffix} extension.`)
  }

  const referenceBaseName = basename(referencePath, referenceImageSuffix)

  return join(dirname(referencePath), `${referenceBaseName}.${suffix}.png`)
}

export function createDiffReferenceImagePath(referencePath: string): string {
  return createReferenceArtifactPath(referencePath, 'diff')
}

export function createGeneratedReferenceImagePath(referencePath: string): string {
  return createReferenceArtifactPath(referencePath, 'generated')
}

export async function resolveGenerateTipsReferenceEntries(
  fixtures: GenerateTipsReferenceFixtures,
  fixturesDirectoryPath: string,
): Promise<GenerateTipsReferenceEntry[]> {
  const entries: GenerateTipsReferenceEntry[] = []
  const labels = Object.keys(fixtures).sort() as Label[]

  for (const label of labels) {
    getLabelConfig(label)

    const labelFixtures = fixtures[label] ?? []

    for (const fixture of labelFixtures) {
      const entry = createGenerateTipsReferenceEntry(fixture, fixturesDirectoryPath, label)

      await access(entry.referencePath)
      entries.push(entry)
    }
  }

  if (entries.length === 0) {
    throw new Error('No reference entries were found in the generate-tips fixtures.')
  }

  return entries
}

export async function writeGenerateTipsReferenceImages(
  entries: readonly GenerateTipsReferenceEntry[],
): Promise<GenerateTipsReferenceEntry[]> {
  const finalizedEntries = [...entries]

  for (const entry of finalizedEntries) {
    const pngBytes = await generateTipsImage({
      label: entry.label,
      tips: entry.tips,
      title: entry.title,
    })

    await mkdir(dirname(entry.generatedPath), { recursive: true })
    await Bun.write(entry.generatedPath, pngBytes)
  }

  return finalizedEntries
}
