// 가구 모양 만들기.
// 가구 하나를 "부품(박스·원기둥·공)" 여러 개로 조립한다. 3D 모델 파일 없이도
// 의자·침대 같은 모양이 나오고, 치수(W×D×H)를 바꾸면 모양이 따라 바뀐다(파라메트릭).
import type { ShapeId } from './types'
import { shade } from './colors'

/** 부품의 색 역할 */
export type Tone =
  | 'main' // 본체 색
  | 'accent' // 포인트 색
  | 'glow' // 조명의 빛나는 부분 (포인트 색, 켜지면 빛남)
  | 'dark' // 본체보다 어두운 색 (다리 등)
  | 'metal'
  | 'screen'
  | 'white'
  | 'leaf'
  | 'wood'
  | 'book1'
  | 'book2'
  | 'book3'

/** 부품 하나. x,y,z는 부품 중심 (가구 바닥 중심이 0,0,0 / y가 위쪽 / +z가 가구 앞쪽), 단위 mm */
export type Part = {
  kind: 'box' | 'cyl' | 'ball'
  tone: Tone
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
  axis?: 'y' | 'z' // 원기둥이 서 있는 방향
}

const box = (tone: Tone, x: number, y: number, z: number, w: number, h: number, d: number): Part =>
  ({ kind: 'box', tone, x, y, z, w, h, d })
const cyl = (tone: Tone, x: number, y: number, z: number, dia: number, h: number, axis: 'y' | 'z' = 'y'): Part =>
  ({ kind: 'cyl', tone, x, y, z, w: dia, h, d: dia, axis })
const ball = (tone: Tone, x: number, y: number, z: number, dia: number): Part =>
  ({ kind: 'ball', tone, x, y, z, w: dia, h: dia, d: dia })

/** 네 귀퉁이 다리 */
const legs = (tone: Tone, lx: number, lz: number, h: number, t: number): Part[] =>
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => box(tone, sx * lx, h / 2, sz * lz, t, h, t))

type Builder = (W: number, D: number, H: number) => Part[]

const builders: Record<ShapeId, Builder> = {
  box: (W, D, H) => [box('main', 0, H / 2, 0, W, H, D)],

  chair: (W, D, H) => {
    const sh = Math.min(460, H * 0.55) // 앉는 높이
    const t = 40
    const st = 50
    const lx = W / 2 - t / 2
    const lz = D / 2 - t / 2
    const bh = H - sh
    return [
      ...legs('main', lx, lz, sh - st, t),
      box('accent', 0, sh - st / 2, 0, W, st, D), // 좌판
      box('main', -lx, sh + bh / 2, -lz, t, bh, t), // 등받이 기둥
      box('main', lx, sh + bh / 2, -lz, t, bh, t),
      box('main', 0, H - 20 - bh * 0.25, -lz, W - 2 * t, bh * 0.5, 25), // 등받이 판
    ]
  },

  officeChair: (W, D, H) => {
    const sh = Math.min(480, H * 0.5)
    return [
      cyl('dark', 0, 25, 0, W * 0.9, 50), // 바퀴 받침
      cyl('metal', 0, 50 + (sh - 130) / 2, 0, 60, sh - 130), // 기둥
      box('accent', 0, sh - 40, 0, W * 0.85, 80, D * 0.8), // 좌판
      box('accent', 0, sh + 60 + (H - sh - 60) / 2, -D * 0.36, W * 0.75, H - sh - 60, 60), // 등받이
      box('dark', -W * 0.42, sh + 120, 0, 40, 30, D * 0.5), // 팔걸이
      box('dark', W * 0.42, sh + 120, 0, 40, 30, D * 0.5),
    ]
  },

  stool: (W, D, H) => [cyl('accent', 0, H - 20, 0, W, 40), ...legs('main', W * 0.28, D * 0.28, H - 40, 30)],

  sofa: (W, D, H) => {
    const lh = 60 // 다리 높이
    const sb = H * 0.3 // 받침 두께
    const aw = Math.min(180, W * 0.14) // 팔걸이 폭
    const bt = Math.min(220, D * 0.28) // 등받이 두께
    const ah = H * 0.72 // 팔걸이 높이
    const inner = W - 2 * aw
    const n = Math.max(1, Math.round(inner / 700)) // 쿠션 개수
    const cw = inner / n
    const seatTop = lh + sb
    const parts: Part[] = [
      box('main', 0, lh + sb / 2, 0, W, sb, D),
      box('main', 0, seatTop + (H - seatTop) / 2, -D / 2 + bt / 2, W, H - seatTop, bt),
      box('main', -W / 2 + aw / 2, lh + (ah - lh) / 2, 0, aw, ah - lh, D),
      box('main', W / 2 - aw / 2, lh + (ah - lh) / 2, 0, aw, ah - lh, D),
      ...legs('dark', W / 2 - 60, D / 2 - 60, lh, 50),
    ]
    for (let i = 0; i < n; i++) {
      const x = -inner / 2 + cw * (i + 0.5)
      parts.push(box('accent', x, seatTop + 55, bt / 2, cw - 16, 110, D - bt - 16)) // 방석
      parts.push(box('accent', x, seatTop + 110 + (H - seatTop - 110) * 0.42, -D / 2 + bt + 50, cw - 16, (H - seatTop - 110) * 0.8, 100)) // 등쿠션
    }
    return parts
  },

  bed: (W, D, H) => {
    const lh = 80
    const fh = 220 // 프레임 두께
    const mt = 200 // 매트리스 두께
    const hb = 80 // 헤드보드 두께
    const top = lh + fh + mt
    const n = W >= 1300 ? 2 : 1 // 베개 개수
    const pw = Math.min(650, (W - 100) / n - 40)
    const parts: Part[] = [
      box('main', 0, lh + fh / 2, 0, W, fh, D),
      ...legs('dark', W / 2 - 60, D / 2 - 60, lh, 60),
      box('main', 0, H / 2, -D / 2 + hb / 2, W, H, hb), // 헤드보드
      box('white', 0, lh + fh + mt / 2, hb / 2, W - 40, mt, D - hb - 40), // 매트리스
      box('accent', 0, top + 14, D / 2 - (D - hb) * 0.31, W - 20, 30, (D - hb) * 0.6), // 이불
    ]
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : (i === 0 ? -1 : 1) * (W / 4 - 10)
      parts.push(box('white', x, top + 50, -D / 2 + hb + 250, pw, 100, 380))
    }
    return parts
  },

  table: (W, D, H) => [box('main', 0, H - 20, 0, W, 40, D), ...legs('main', W / 2 - 70, D / 2 - 70, H - 40, 60)],

  roundTable: (W, _D, H) => [
    cyl('main', 0, H - 20, 0, W, 40),
    cyl('dark', 0, 30 + (H - 70) / 2, 0, 90, H - 70),
    cyl('dark', 0, 15, 0, W * 0.55, 30),
  ],

  desk: (W, D, H) => {
    const fh = (H - 30) / 3 // 서랍 한 칸 높이
    const dx = W / 2 - 200 // 서랍장 중심 x
    const parts: Part[] = [
      box('main', 0, H - 15, 0, W, 30, D), // 상판
      box('main', -W / 2 + 15, (H - 30) / 2, 0, 30, H - 30, D - 40), // 왼쪽 옆판
      box('main', dx, (H - 30) / 2, 0, 400, H - 30, D - 40), // 서랍장
    ]
    if (W - 430 > 100) parts.push(box('main', -185, H - 180, -D / 2 + 40, W - 430, 300, 18)) // 가림판
    for (let i = 0; i < 3; i++) {
      parts.push(box('accent', dx, fh * (i + 0.5), D / 2 - 15, 380, fh - 12, 10))
      parts.push(cyl('dark', dx, fh * (i + 0.5), D / 2 - 6, 24, 12, 'z'))
    }
    return parts
  },

  wardrobe: (W, D, H) => {
    const n = Math.max(1, Math.round(W / 500)) // 문짝 개수
    const dw = W / n
    const parts: Part[] = [box('main', 0, H / 2, -20, W, H, D - 40)]
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + dw * (i + 0.5)
      parts.push(box('accent', x, H / 2 + 20, D / 2 - 30, dw - 8, H - 80, 20))
      parts.push(box('dark', x + (i % 2 === 0 ? dw / 2 - 40 : -dw / 2 + 40), H * 0.5, D / 2 - 12, 14, 220, 16)) // 손잡이
    }
    return parts
  },

  bookshelf: (W, D, H) => {
    const t = 25
    const inner = W - 2 * t
    const base = 60 + t // 맨 아래 칸 바닥 높이
    const n = Math.max(1, Math.round(H / 380) - 1) // 중간 선반 개수
    const lh = (H - t - base) / (n + 1) // 한 칸 높이
    const parts: Part[] = [
      box('dark', 0, H / 2, -D / 2 + 6, W, H, 12), // 뒤판
      box('main', -W / 2 + t / 2, H / 2, 0, t, H, D),
      box('main', W / 2 - t / 2, H / 2, 0, t, H, D),
      box('main', 0, H - t / 2, 0, W, t, D),
      box('main', 0, 60 + t / 2, 0, inner, t, D),
    ]
    const tones: Tone[] = ['book1', 'book2', 'book3']
    for (let j = 0; j <= n; j++) {
      const floorY = base + lh * j
      if (j > 0) parts.push(box('main', 0, floorY - 10, 6, inner, 20, D - 12)) // 선반
      const bw = inner * [0.55, 0.7, 0.4, 0.62][j % 4]
      const bh = Math.min(lh - 50, 240) * [0.9, 0.75, 0.85][j % 3]
      if (bh > 60) parts.push(box(tones[j % 3], -inner / 2 + bw / 2 + 10, floorY + bh / 2, 0, bw, bh, D * 0.6)) // 책
    }
    return parts
  },

  tvUnit: (W, D, H) => {
    const sh = Math.min(450, H * 0.38) // TV장 높이
    const lh = 80
    const n = Math.max(2, Math.round(W / 600))
    const dw = W / n
    const tw = Math.min(W * 0.8, 1450) // TV 폭
    const th = Math.min(tw * 0.58, H - sh - 70)
    const parts: Part[] = [
      box('main', 0, lh + (sh - lh) / 2, -10, W, sh - lh, D - 20),
      ...legs('dark', W / 2 - 80, D / 2 - 70, lh, 40),
      box('dark', 0, sh + 10, 0, tw * 0.35, 20, Math.min(D * 0.6, 240)), // TV 받침
      box('dark', 0, sh + 45, 0, 80, 50, 40),
      box('screen', 0, sh + 70 + th / 2, 0, tw, th, 45), // 화면
    ]
    for (let i = 0; i < n; i++) parts.push(box('accent', -W / 2 + dw * (i + 0.5), lh + (sh - lh) / 2, D / 2 - 15, dw - 10, sh - lh - 14, 10))
    return parts
  },

  lamp: (W, _D, H) => [
    cyl('dark', 0, 15, 0, W * 0.65, 30),
    cyl('metal', 0, 30 + (H - 310) / 2, 0, 24, H - 310),
    cyl('glow', 0, H - 140, 0, W, 280), // 갓
  ],

  // 천장등: 부품 좌표는 0~H이고, 그릴 때 천장 높이에 맞춰 올려 붙인다
  ceilingLight: (W, _D, H) => [cyl('main', 0, H * 0.8, 0, W * 0.9, H * 0.4), cyl('glow', 0, H * 0.3, 0, W, H * 0.6)],

  powerStrip: (W, D, H) => {
    const n = Math.max(2, Math.floor((W - 60) / 55)) // 구멍 개수
    const parts: Part[] = [box('main', 0, H / 2, 0, W, H, D)]
    for (let i = 0; i < n; i++) parts.push(cyl('dark', -W / 2 + 70 + i * 55, H + 1, 0, 34, 3))
    parts.push(box('accent', -W / 2 + 22, H + 3, 0, 20, 8, 28)) // 스위치
    return parts
  },

  plant: (W, _D, H) => {
    const ph = H * 0.28 // 화분 높이
    return [
      cyl('main', 0, ph / 2, 0, W * 0.55, ph),
      cyl('wood', 0, ph + (H * 0.25) / 2, 0, 36, H * 0.25),
      ball('leaf', 0, H - W * 0.42, 0, W * 0.84),
      ball('leaf', -W * 0.2, H * 0.56, W * 0.12, W * 0.6),
      ball('leaf', W * 0.22, H * 0.6, -W * 0.1, W * 0.55),
    ]
  },

  rug: (W, D) => [box('main', 0, 6, 0, W, 12, D), box('accent', 0, 8, 0, W - 240, 12, D - 240)],

  fridge: (W, D, H) => {
    const parts: Part[] = [box('main', 0, H / 2, -25, W, H, D - 50)]
    if (W >= 800) {
      // 양문형
      for (const s of [-1, 1]) {
        parts.push(box('accent', (s * W) / 4, H / 2 + 10, D / 2 - 35, W / 2 - 8, H - 40, 30))
        parts.push(box('dark', s * 30, H * 0.55, D / 2 - 10, 16, H * 0.4, 20))
      }
    } else {
      // 위아래 문
      const upper = (H - 40) * 0.62
      parts.push(box('accent', 0, H - 10 - upper / 2, D / 2 - 35, W - 8, upper - 6, 30))
      parts.push(box('accent', 0, 30 + (H - 40 - upper) / 2, D / 2 - 35, W - 8, H - 40 - upper - 6, 30))
      parts.push(box('dark', W / 2 - 40, H - 10 - upper * 0.6, D / 2 - 10, 16, upper * 0.4, 20))
    }
    return parts
  },

  drawers: (W, D, H) => {
    const lh = H > 600 ? 80 : 50
    const n = Math.max(1, Math.round((H - lh) / 220)) // 서랍 개수
    const fh = (H - lh - 16) / n
    const parts: Part[] = [box('main', 0, lh + (H - lh) / 2, -10, W, H - lh, D - 20), ...legs('dark', W / 2 - 40, D / 2 - 45, lh, 40)]
    for (let i = 0; i < n; i++) {
      const y = lh + 8 + fh * (i + 0.5)
      parts.push(box('accent', 0, y, D / 2 - 15, W - 24, fh - 10, 10))
      for (const x of W > 700 ? [-W * 0.25, W * 0.25] : [0]) parts.push(cyl('dark', x, y, D / 2 - 6, 26, 12, 'z'))
    }
    return parts
  },

  washer: (W, D, H) => [
    box('main', 0, H / 2, -10, W, H, D - 20),
    cyl('dark', 0, H * 0.48, D / 2 - 14, W * 0.62, 12, 'z'), // 문 테두리
    cyl('screen', 0, H * 0.48, D / 2 - 10, W * 0.46, 12, 'z'), // 유리
    box('accent', 0, H - 70, D / 2 - 16, W - 60, 70, 8), // 조작부
  ],
}

/** 모양 + 치수 → 부품 목록 */
export const buildParts = (shape: ShapeId, W: number, D: number, H: number): Part[] => builders[shape](W, D, H)

/** 부품의 색 역할 → 실제 색 */
export function toneColor(tone: Tone, main: string, accent: string): string {
  switch (tone) {
    case 'main': return main
    case 'accent':
    case 'glow': return accent
    case 'dark': return shade(main, -0.4)
    case 'metal': return '#a1a1aa'
    case 'screen': return '#1f2125'
    case 'white': return '#f5f3ee'
    case 'leaf': return '#5c8a50'
    case 'wood': return '#7a5c40'
    case 'book1': return '#b5544a'
    case 'book2': return '#4f6f8f'
    case 'book3': return '#d9b65c'
  }
}
