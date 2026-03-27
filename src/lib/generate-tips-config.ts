import { getLabelConfig, type Label, type LabelColors } from '../labels.ts'
import { fonts } from './font-registry.ts'

export type GenerateTipsCoreConfig = {
  colors: LabelColors
  font: {
    family: string
  }
  image: {
    height: number
    width: number
  }
  layout: {
    barBadgeGap: number
    barBadgeOffsetLeft: number
    barBorderWidth: number
    barMaxWidth: number
    barRadius: number
    tipLineHeight: number
    tipTextPaddingRight: number
    titleFontSizeMax: number
    titleFontSizeMin: number
    titleLineHeight: number
    titleMaxWidth: number
    titleTopPadding: number
  }
}

export function getGenerateTipsCoreConfig(label: Label): GenerateTipsCoreConfig {
  const labelConfig = getLabelConfig(label)
  return {
    colors: labelConfig.colors,
    font: {
      family: fonts[labelConfig.font].family,
    },
    image: {
      height: 432,
      width: 768,
    },
    layout: {
      barBadgeGap: 11,
      barBadgeOffsetLeft: 3,
      barBorderWidth: 1,
      barMaxWidth: 560,
      barRadius: 0,
      tipLineHeight: 1,
      tipTextPaddingRight: 17,
      titleFontSizeMax: 28,
      titleFontSizeMin: 14,
      titleLineHeight: 1.05,
      titleMaxWidth: 728,
      titleTopPadding: 44,
    },
  }
}
