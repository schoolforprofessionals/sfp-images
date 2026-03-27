import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validateGenerateTipsLabel, validateGenerateTipsOutputPath } from '../src/cli/command-generate-tips.ts'

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
const sampleTips = ['Lead with clarity', 'Keep the copy short', 'Measure real text width', 'Render once to PNG']
const sampleTitle = 'This is a way to generate images'

test('validateGenerateTipsOutputPath rejects non-png output paths', () => {
  expect(() => validateGenerateTipsOutputPath('./tmp/output.jpg')).toThrow('Output path must use a .png extension.')
})

test('validateGenerateTipsLabel rejects unsupported labels', () => {
  expect(() => validateGenerateTipsLabel('abc')).toThrow('Label must be one of: cvd, dga, dps, dst, sfp.')
})

test('generate-tips CLI writes a PNG file', async () => {
  const cliTipArguments = sampleTips.slice(0, 4).flatMap((tip) => ['--tip', tip])
  const outputDirectory = await mkdtemp(join(tmpdir(), 'sfp-images-'))
  const outputPath = join(outputDirectory, 'tips.png')
  const childProcess = Bun.spawn(
    [
      'bun',
      'run',
      './src/cli.ts',
      'generate-tips',
      '--label',
      'sfp',
      '--title',
      sampleTitle,
      ...cliTipArguments,
      '--output',
      outputPath,
    ],
    {
      cwd: globalThis.process.cwd(),
      stderr: 'pipe',
      stdout: 'pipe',
    },
  )
  const exitCode = await childProcess.exited
  const stderr = await new Response(childProcess.stderr).text()
  const outputFile = Bun.file(outputPath)

  expect(exitCode).toBe(0)
  expect(stderr).toBe('')
  expect(await outputFile.exists()).toBe(true)
  expect(Array.from(new Uint8Array(await outputFile.arrayBuffer()).slice(0, pngSignature.length))).toEqual(pngSignature)
})

test('generate-tips CLI fails when the requested label is not defined yet', async () => {
  const cliTipArguments = sampleTips.slice(0, 4).flatMap((tip) => ['--tip', tip])
  const outputDirectory = await mkdtemp(join(tmpdir(), 'sfp-images-'))
  const outputPath = join(outputDirectory, 'tips.png')
  const childProcess = Bun.spawn(
    [
      'bun',
      'run',
      './src/cli.ts',
      'generate-tips',
      '--label',
      'dga',
      '--title',
      sampleTitle,
      ...cliTipArguments,
      '--output',
      outputPath,
    ],
    {
      cwd: globalThis.process.cwd(),
      stderr: 'pipe',
      stdout: 'pipe',
    },
  )
  const exitCode = await childProcess.exited
  const stderr = await new Response(childProcess.stderr).text()

  expect(exitCode).toBe(1)
  expect(stderr).toContain('Label "dga" is allowed but is not defined in src/labels.ts yet.')
})
