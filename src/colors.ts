// 색(#rrggbb) 계산 도우미

/** 색을 밝게(+) 또는 어둡게(-) 만든다. amount는 -1 ~ 1 */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount),
  )
  return rgbToHex(channels[0], channels[1], channels[2])
}

export const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')

/** #rrggbb 형식이 맞는지 검사 */
export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
