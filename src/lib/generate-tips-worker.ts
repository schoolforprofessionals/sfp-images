import { getLabelConfig, type Label } from '../labels.ts'
import { fonts } from './font-registry.ts'
import { generateRuntimeWorker } from './generate-runtime-worker.ts'
import {
  type GenerateTipsImageInput,
  type GenerateTipsRuntime,
  generateTipsImageWithRuntime,
} from './generate-tips.tsx'
import { getGenerateTipsCoreConfig } from './generate-tips-config.ts'

const runtimes: Partial<Record<Label, GenerateTipsRuntime>> = {}

function getGenerateTipsRuntime(label: Label): GenerateTipsRuntime {
  const runtime = runtimes[label]

  if (runtime) {
    return runtime
  }

  const labelConfig = getLabelConfig(label)
  const nextRuntime = {
    ...generateRuntimeWorker({
      fontSourcePath: fonts[labelConfig.font].source,
    }),
    config: getGenerateTipsCoreConfig(label),
  } satisfies GenerateTipsRuntime

  runtimes[label] = nextRuntime

  return nextRuntime
}

export function generateTipsImage(input: GenerateTipsImageInput) {
  return generateTipsImageWithRuntime(input, getGenerateTipsRuntime(input.label))
}
