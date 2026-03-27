import { mkdir } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import type { Command } from 'commander'
import { type GenerateTipsLabel, generateTipsLabels } from '../labels.ts'
import { generateTipsImage } from '../lib/generate-tips.tsx'

function collectTip(value: string, previous: string[]): string[] {
  return [...previous, value]
}

export function validateGenerateTipsOutputPath(outputPath: string): string {
  const trimmedOutputPath = outputPath.trim()

  if (!trimmedOutputPath) {
    throw new Error('Output path is required.')
  }

  if (extname(trimmedOutputPath).toLowerCase() !== '.png') {
    throw new Error('Output path must use a .png extension.')
  }

  return resolve(trimmedOutputPath)
}

export function validateGenerateTipsLabel(label: string): GenerateTipsLabel {
  const normalizedLabel = label.trim().toLowerCase()

  if (!generateTipsLabels.includes(normalizedLabel as GenerateTipsLabel)) {
    throw new Error(`Label must be one of: ${generateTipsLabels.join(', ')}.`)
  }

  return normalizedLabel as GenerateTipsLabel
}

export function registerGenerateTipsCommand(program: Command): void {
  program
    .command('generate-tips')
    .description('Generate a numbered tips image as a PNG.')
    .requiredOption(
      '--label <label>',
      `Use one of these label variants: ${generateTipsLabels.join(', ')}.`,
      validateGenerateTipsLabel,
    )
    .requiredOption('-o, --output <path>', 'Write the generated PNG to this file path.', validateGenerateTipsOutputPath)
    .option('--tip <text>', 'Add a tip. Repeat this flag between 3 and 7 times.', collectTip, [])
    .requiredOption('--title <text>', 'Set the image title.')
    .action(async (options: { label: GenerateTipsLabel; output: string; tip: string[]; title: string }) => {
      const pngBytes = await generateTipsImage({
        label: options.label,
        tips: options.tip,
        title: options.title,
      })

      await mkdir(dirname(options.output), { recursive: true })
      await Bun.write(options.output, pngBytes)

      console.log(`Wrote ${options.output}`)
    })
}
