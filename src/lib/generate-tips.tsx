import type { Font as OpenTypeFont } from 'opentype.js'
import type * as React from 'react'
import type { Label } from '../labels.ts'
import type { GenerateRuntime, GenerateRuntimeSvgRendererOptions } from './generate-runtime.ts'
import type { GenerateTipsCoreConfig } from './generate-tips-config.ts'

const FONT_STYLE = 'normal' as const
const FONT_WEIGHT = 400 as const
const MAX_TIP_COUNT = 7
const MIN_TIP_COUNT = 3

const COUNT_LAYOUT_PRESETS = {
  3: {
    barGap: 26,
    barHeight: 41,
    barMinWidth: 422,
    tipFontSize: 18,
    titleToBarsGap: 55,
  },
  4: {
    barGap: 13,
    barHeight: 41,
    barMinWidth: 400,
    tipFontSize: 18,
    titleToBarsGap: 53,
  },
  5: {
    barGap: 13,
    barHeight: 40,
    barMinWidth: 412,
    tipFontSize: 17,
    titleToBarsGap: 41,
  },
  6: {
    barGap: 11,
    barHeight: 35,
    barMinWidth: 346,
    tipFontSize: 17,
    titleToBarsGap: 40,
  },
  7: {
    barGap: 9,
    barHeight: 31,
    barMinWidth: 306,
    tipFontSize: 17,
    titleToBarsGap: 29,
  },
} as const

type SupportedTipCount = keyof typeof COUNT_LAYOUT_PRESETS

export type GenerateTipsBarLayout = {
  number: string
  text: string
  width: number
}

export type GenerateTipsImageInput = {
  label: Label
  title: string
  tips: string[]
}

export type GenerateTipsLayout = {
  barBadgeSize: number
  barGap: number
  barHeight: number
  barWidth: number
  bars: GenerateTipsBarLayout[]
  numberFontSize: number
  tipFontSize: number
  titleFontSize: number
  titleLines: string[]
  titleToBarsGap: number
}

export type GenerateTipsRuntime = GenerateRuntime & {
  config: GenerateTipsCoreConfig
}

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function formatDisplayText(value: string): string {
  return collapseWhitespace(value).toLocaleUpperCase('nl-NL')
}

function normalizeGenerateTipsImageInput(input: GenerateTipsImageInput): GenerateTipsImageInput {
  return {
    label: input.label,
    tips: input.tips.map((tip) => formatDisplayText(tip)),
    title: formatDisplayText(input.title),
  }
}

function measureTextWidth(font: OpenTypeFont, text: string, fontSize: number): number {
  return font.getAdvanceWidth(text, fontSize)
}

function createTitleLayout(
  config: GenerateTipsCoreConfig,
  input: GenerateTipsImageInput,
  font: OpenTypeFont,
): {
  fontSize: number
  lines: string[]
} {
  if (!input.title) {
    throw new Error('Title is required.')
  }

  for (let fontSize = config.layout.titleFontSizeMax; fontSize >= config.layout.titleFontSizeMin; fontSize -= 1) {
    if (measureTextWidth(font, input.title, fontSize) <= config.layout.titleMaxWidth) {
      return {
        fontSize,
        lines: [input.title],
      }
    }
  }

  throw new Error('Title is too long to fit on a single line in the current layout.')
}

function createTipMeasurements(
  config: GenerateTipsCoreConfig,
  input: GenerateTipsImageInput,
  barBadgeSize: number,
  font: OpenTypeFont,
  layoutPreset: (typeof COUNT_LAYOUT_PRESETS)[SupportedTipCount],
): number[] {
  const maxTextWidth =
    config.layout.barMaxWidth -
    config.layout.barBorderWidth * 2 -
    config.layout.barBadgeOffsetLeft -
    config.layout.barBadgeGap -
    barBadgeSize -
    config.layout.tipTextPaddingRight

  return input.tips.map((tip) => {
    if (!tip) {
      throw new Error('Tips cannot be blank.')
    }

    const width = measureTextWidth(font, tip, layoutPreset.tipFontSize)

    if (width > maxTextWidth) {
      throw new Error(`Tip "${tip}" is too long to fit on a single line in the current layout.`)
    }

    return width
  })
}

function getCountLayoutPreset(tipCount: number): (typeof COUNT_LAYOUT_PRESETS)[SupportedTipCount] {
  const preset = COUNT_LAYOUT_PRESETS[tipCount as SupportedTipCount]

  if (!preset) {
    throw new Error(`Internal error: no layout preset for ${tipCount} tips.`)
  }

  return preset
}

function computeGenerateTipsLayoutWithFont(
  config: GenerateTipsCoreConfig,
  input: GenerateTipsImageInput,
  font: OpenTypeFont,
): GenerateTipsLayout {
  const normalizedInput = normalizeGenerateTipsImageInput(input)

  if (normalizedInput.tips.length < MIN_TIP_COUNT || normalizedInput.tips.length > MAX_TIP_COUNT) {
    throw new Error(`Provide between ${MIN_TIP_COUNT} and ${MAX_TIP_COUNT} tips.`)
  }

  const layoutPreset = getCountLayoutPreset(normalizedInput.tips.length)
  const barBadgeSize = Math.max(
    0,
    layoutPreset.barHeight - config.layout.barBorderWidth * 2 - config.layout.barBadgeOffsetLeft * 2,
  )
  const titleLayout = createTitleLayout(config, normalizedInput, font)
  const tipWidths = createTipMeasurements(config, normalizedInput, barBadgeSize, font, layoutPreset)
  const rawBarWidth =
    Math.max(...tipWidths) +
    config.layout.barBorderWidth * 2 +
    config.layout.barBadgeOffsetLeft +
    barBadgeSize +
    config.layout.barBadgeGap +
    config.layout.tipTextPaddingRight
  const barWidth = Math.min(config.layout.barMaxWidth, Math.max(layoutPreset.barMinWidth, Math.ceil(rawBarWidth)))
  const numberFontSize = Math.max(14, Math.round(barBadgeSize * 0.68))
  const bars = normalizedInput.tips.map((tip, index) => ({
    number: String(index + 1),
    text: tip,
    width: barWidth,
  }))

  return {
    barBadgeSize,
    barGap: layoutPreset.barGap,
    barHeight: layoutPreset.barHeight,
    bars,
    barWidth,
    numberFontSize,
    tipFontSize: layoutPreset.tipFontSize,
    titleFontSize: titleLayout.fontSize,
    titleLines: titleLayout.lines,
    titleToBarsGap: layoutPreset.titleToBarsGap,
  }
}

export async function computeGenerateTipsLayoutWithRuntime(
  input: GenerateTipsImageInput,
  runtime: Pick<GenerateTipsRuntime, 'config' | 'loadFont'>,
): Promise<GenerateTipsLayout> {
  const { font } = await runtime.loadFont()

  return computeGenerateTipsLayoutWithFont(runtime.config, input, font)
}

function generateTipsSvgOptions({
  bytes,
  config,
}: {
  bytes: ArrayBuffer
  config: GenerateTipsCoreConfig
}): GenerateRuntimeSvgRendererOptions {
  return {
    fonts: [{ data: bytes, name: config.font.family, style: FONT_STYLE, weight: FONT_WEIGHT }],
    height: config.image.height,
    width: config.image.width,
  }
}
function generateTipsSvgElement({
  config,
  layout,
}: {
  config: GenerateTipsCoreConfig
  layout: GenerateTipsLayout
}): React.ReactNode {
  const titleLineEntries = layout.titleLines.map<{
    isOffset: boolean
    key: string
    line: string
  }>((line, index) => ({
    isOffset: index > 0,
    key: `${line}-${index}`,
    line,
  }))
  const styles = {
    bar: {
      alignItems: 'center',
      backgroundColor: config.colors.backgroundBar,
      border: `${config.layout.barBorderWidth}px solid ${config.colors.colorTitle}`,
      borderRadius: config.layout.barRadius,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'row',
      height: layout.barHeight,
      overflow: 'hidden',
      width: layout.barWidth,
    },
    barBody: {
      alignItems: 'center',
      boxSizing: 'border-box',
      display: 'flex',
      flex: 1,
      justifyContent: 'flex-start',
      paddingRight: config.layout.tipTextPaddingRight,
    },
    barsArea: {
      alignItems: 'center',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      marginTop: layout.titleToBarsGap,
      width: config.image.width,
    },
    barsFrame: {
      alignItems: 'center',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      width: layout.barWidth,
    },
    canvas: {
      alignItems: 'center',
      backgroundColor: config.colors.background,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      height: config.image.height,
      width: config.image.width,
    },
    numberBadge: {
      alignItems: 'center',
      backgroundColor: config.colors.backgroundNumber,
      color: config.colors.colorTitle,
      display: 'flex',
      fontSize: layout.numberFontSize,
      fontWeight: FONT_WEIGHT,
      height: layout.barBadgeSize,
      justifyContent: 'center',
      marginLeft: config.layout.barBadgeOffsetLeft,
      width: layout.barBadgeSize,
    },
    tipText: {
      color: config.colors.colorText,
      fontSize: layout.tipFontSize,
      lineHeight: `${Math.ceil(layout.tipFontSize * config.layout.tipLineHeight)}px`,
      textAlign: 'left',
      whiteSpace: 'nowrap',
      width: '100%',
    },
    title: {
      alignItems: 'center',
      boxSizing: 'border-box',
      color: config.colors.colorTitle,
      display: 'flex',
      flexDirection: 'column',
      fontSize: layout.titleFontSize,
      fontWeight: FONT_WEIGHT,
      justifyContent: 'center',
      lineHeight: `${Math.ceil(layout.titleFontSize * config.layout.titleLineHeight)}px`,
      marginTop: config.layout.titleTopPadding,
      maxWidth: config.layout.titleMaxWidth,
      textAlign: 'center',
      width: config.layout.titleMaxWidth,
    },
    titleLine: {
      display: 'flex',
      justifyContent: 'center',
      marginTop: 0,
      whiteSpace: 'nowrap',
      width: '100%',
    },
    titleLineOffset: {
      display: 'flex',
      justifyContent: 'center',
      marginTop: 2,
      whiteSpace: 'nowrap',
      width: '100%',
    },
  } as const

  return (
    <div style={styles.canvas}>
      <div style={styles.title}>
        {titleLineEntries.map((entry) => (
          <div key={entry.key} style={entry.isOffset ? styles.titleLineOffset : styles.titleLine}>
            {entry.line}
          </div>
        ))}
      </div>
      <div style={styles.barsArea}>
        <div style={styles.barsFrame}>
          {layout.bars.map((bar, index) => (
            <div
              key={`${bar.number}-${bar.text}`}
              style={{
                ...styles.bar,
                marginTop: index === 0 ? 0 : layout.barGap,
              }}
            >
              <div style={styles.numberBadge}>{bar.number}</div>
              <div style={styles.barBody}>
                <div
                  style={{
                    ...styles.tipText,
                    marginLeft: config.layout.barBadgeGap,
                  }}
                >
                  {bar.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export async function generateTipsSvgWithRuntime(
  input: GenerateTipsImageInput,
  runtime: Pick<GenerateTipsRuntime, 'config' | 'loadFont' | 'renderSvg'>,
): Promise<string> {
  const { bytes, font } = await runtime.loadFont()
  const { config } = runtime
  const layout = computeGenerateTipsLayoutWithFont(config, input, font)

  const element = generateTipsSvgElement({ config, layout })
  const options = generateTipsSvgOptions({ bytes, config })

  return runtime.renderSvg(element, options)
}

export async function generateTipsImageWithRuntime(
  input: GenerateTipsImageInput,
  runtime: GenerateTipsRuntime,
): Promise<Uint8Array> {
  const svg = await generateTipsSvgWithRuntime(input, runtime)

  return runtime.renderPng(svg)
}
