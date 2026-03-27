import { getLabelConfig, type Label } from '../labels.ts'
import { fonts } from './font-registry.ts'
import { fontSourceNode } from './font-source-node.ts'
import { generateRuntimeNode } from './generate-runtime-node.ts'
import {
  computeGenerateTipsLayoutWithRuntime,
  type GenerateTipsImageInput,
  type GenerateTipsRuntime,
  generateTipsImageWithRuntime,
  generateTipsSvgWithRuntime,
} from './generate-tips.tsx'
import { type GenerateTipsCoreConfig, getGenerateTipsCoreConfig } from './generate-tips-config.ts'

export type GenerateTipsConfig = GenerateTipsCoreConfig & {
  font: GenerateTipsCoreConfig['font'] & {
    sourcePath: string
  }
}

type GenerateTipsNodeRuntime = GenerateTipsRuntime & {
  config: GenerateTipsConfig
}

const runtimes: Partial<Record<Label, GenerateTipsNodeRuntime>> = {}

function getGenerateTipsRuntime(label: Label): GenerateTipsNodeRuntime {
  const runtime = runtimes[label]

  if (runtime) {
    return runtime
  }

  const labelConfig = getLabelConfig(label)
  const coreConfig = getGenerateTipsCoreConfig(label)
  const projectFont = fonts[labelConfig.font]
  const nextRuntime = {
    ...generateRuntimeNode({
      fontSourcePath: projectFont.source,
    }),
    config: {
      ...coreConfig,
      font: {
        ...coreConfig.font,
        sourcePath: fontSourceNode(projectFont.source, import.meta.url),
      },
    },
  } satisfies GenerateTipsNodeRuntime

  runtimes[label] = nextRuntime

  return nextRuntime
}

export function getGenerateTipsConfig(label: Label): GenerateTipsConfig {
  return getGenerateTipsRuntime(label).config
}

export function computeGenerateTipsLayout(input: GenerateTipsImageInput) {
  return computeGenerateTipsLayoutWithRuntime(input, getGenerateTipsRuntime(input.label))
}

export function generateTipsSvg(input: GenerateTipsImageInput) {
  return generateTipsSvgWithRuntime(input, getGenerateTipsRuntime(input.label))
}

export function generateTipsImage(input: GenerateTipsImageInput) {
  return generateTipsImageWithRuntime(input, getGenerateTipsRuntime(input.label))
}
