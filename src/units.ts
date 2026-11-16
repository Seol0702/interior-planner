// 단위·숫자 계산 도우미

/** mm → 3D 화면 단위(m). 3D 화면에서는 1 = 1m */
export const mm = (value: number) => value / 1000

/** 3D 화면 단위(m) → mm */
export const toMm = (value: number) => value * 1000

/** 그리드 스냅 간격 (mm) = 1cm */
export const SNAP = 10

/** 값을 가장 가까운 step 배수로 맞춘다. 예) snap(1234) → 1230 */
export const snap = (value: number, step = SNAP) => Math.round(value / step) * step

/** ㎡ → 평 */
export const toPyeong = (squareMeters: number) => squareMeters / 3.3058

/** mm → "4" / "3.5" 같은 m 글자 (필요 없는 0은 뗀다) */
export const fmtM = (value: number) => String(Number((value / 1000).toFixed(2)))

/** mm → cm 글자 */
export const fmtCm = (value: number) => String(Number((value / 10).toFixed(1)))
