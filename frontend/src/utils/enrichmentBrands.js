/** Brands with an IMS enrichment scrape pipeline (Get details). */
export const ENRICHABLE_BRANDS = [
  'Balmain',
  'Titan',
  'Timex',
  'Tissot',
  'Fossil',
  'Casio',
  'Seiko',
  'Longines',
  'Rado',
  'Emporio Armani',
  'Armani Exchange',
  'Earnshaw',
  'Alexandre Christie',
  'Michael Kors',
]

export function getEnrichmentBrandKey(brand) {
  const b = String(brand || '').trim().toLowerCase()
  if (b === 'balmain') return 'balmain'
  if (b === 'titan') return 'titan'
  if (b === 'timex') return 'timex'
  if (b === 'tissot') return 'tissot'
  if (b === 'fossil') return 'fossil'
  if (b === 'casio') return 'casio'
  if (b === 'seiko') return 'seiko'
  if (b === 'longines') return 'longines'
  if (b === 'rado') return 'rado'
  if (b === 'emporio armani' || b === 'emporio-armani') return 'emporio-armani'
  if (b === 'armani exchange' || b === 'armani-exchange' || b === 'ax') {
    return 'armani-exchange'
  }
  if (b === 'earnshaw' || b === 'thomas earnshaw') return 'earnshaw'
  if (
    b === 'alexandre christie' ||
    b === 'alexandre-christie' ||
    b === 'alexandra christie' ||
    b === 'alexandra-christie'
  ) {
    return 'alexandre-christie'
  }
  if (b === 'michael kors' || b === 'michael-kors' || b === 'mk') {
    return 'michael-kors'
  }
  return null
}

export function isEnrichableProduct(product) {
  return Boolean(getEnrichmentBrandKey(product?.brand))
}

/** Build toast message from enrich API response (fill/skip + near-match). */
export function formatEnrichmentToast(res) {
  const fillCount = res?.data?.fillCount ?? res?.data?.fill?.length ?? 0
  const skipCount = res?.data?.skipCount ?? res?.data?.skip?.length ?? 0
  const gender = res?.data?.gender
  const nearMatch = res?.data?.nearMatch
  const fieldMapped = res?.data?.fieldMapped || {}
  const fieldUnmapped = res?.data?.fieldUnmapped || {}

  let msg = res?.message || `Filled ${fillCount}, skipped ${skipCount}`

  if (nearMatch?.nearMatch) {
    const from = nearMatch.from
    const matched = nearMatch.matchedStyle
    if (from && matched && from !== matched) {
      msg += ` · Near match: ${from} → ${matched}`
    } else if (matched) {
      msg += ` · Near match: ${matched}`
    } else {
      msg += ' · Near match'
    }
  }

  if (gender?.mappingLabel) {
    msg += ` · Gender: ${gender.mappingLabel}`
  } else if (gender?.filled && gender?.from && gender?.to) {
    msg += ` · Gender: ${gender.from} → ${gender.to}`
  } else if (gender?.unknown && (gender?.raw || gender?.from)) {
    msg += ` · Gender "${gender.raw || gender.from}" needs review`
  }

  const mappedKeys = Object.keys(fieldMapped).filter((k) => k !== 'gender')
  if (mappedKeys.length) {
    msg += ` · mapped ${mappedKeys.slice(0, 3).join(', ')}${
      mappedKeys.length > 3 ? '…' : ''
    }`
  }
  const unmappedKeys = Object.keys(fieldUnmapped)
  if (unmappedKeys.length) {
    msg += ` · left blank (unknown): ${unmappedKeys.slice(0, 3).join(', ')}${
      unmappedKeys.length > 3 ? '…' : ''
    }`
  }

  return msg
}
