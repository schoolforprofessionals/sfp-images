import type { Font } from './lib/font-registry.ts'

export const labels = ['cvd', 'dga', 'dps', 'dst', 'sfp'] as const

export type Label = (typeof labels)[number]
export interface LabelColors {
  background: string
  backgroundBar: string
  backgroundNumber: string
  colorText: string
  colorTitle: string
}
export interface LabelConfig {
  colors: LabelColors
  font: Font
}

const configs: Partial<Record<Label, LabelConfig>> = {
  sfp: {
    colors: {
      background: '#3a2b58',
      backgroundBar: '#e8e3f1',
      backgroundNumber: '#f46036',
      colorText: '#3a2b58',
      colorTitle: '#ffffff',
    },
    font: 'ArchivoBlack',
  },
}

export function getLabelConfig(label: Label): LabelConfig {
  const config = configs[label]

  if (!config) {
    throw new Error(`Label "${label}" is allowed but is not defined in src/labels.ts yet.`)
  }

  return config
}
