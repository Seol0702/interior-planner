// 단위·숫자 계산 도우미

/** mm → 3D 화면 단위(m). 3D 화면에서는 1 = 1m */
export const mm = (value: number) => value / 1000

/** 3D 화면 단위(m) → mm */
export const toMm = (value: number) => value * 1000

/** 그리드 스냅 간격 (mm) */
export const SNAP = 10

/** 값을 가장 가까운 step 배수로 맞춘다. 예) snap(1234) → 1230 */
export const snap = (value: number, step = SNAP) => Math.round(value / step) * step

/** ㎡ → 평 */
export const toPyeong = (squareMeters: number) => squareMeters / 3.3058
