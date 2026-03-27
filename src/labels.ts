export interface LabelConfig {
  colors: {
    background: string
    backgroundBar: string
    backgroundNumber: string
    colorText: string
    colorTitle: string
  }
}

export const generateTipsLabels = ['cvd', 'dga', 'dps', 'dst', 'sfp'] as const

export type GenerateTipsLabel = (typeof generateTipsLabels)[number]

export const labels: Partial<Record<GenerateTipsLabel, LabelConfig>> = {
  sfp: {
    colors: {
      background: '#3a2b58',
      backgroundBar: '#e8e3f1',
      backgroundNumber: '#f46036',
      colorText: '#3a2b58',
      colorTitle: '#ffffff',
    },
  },
}

export function getLabelConfig(label: GenerateTipsLabel): LabelConfig {
  const config = labels[label]

  if (!config) {
    throw new Error(`Label "${label}" is allowed but is not defined in src/labels.ts yet.`)
  }

  return config
}
