// 마감재(벽지·장판): 기본 제공 목록 + 무늬를 그림으로 그리는 함수.
// 무늬는 이미지 파일 없이 캔버스에 직접 그려서 만든다 (그래서 색·크기를 자유롭게 바꿀 수 있다).
import type { Finish, PatternId } from './types'
import { shade } from './colors'

export type FinishPreset = { id: string; name: string; finish: Finish }

export const WALL_PATTERNS: { id: PatternId; name: string }[] = [
  { id: 'solid', name: '단색' },
  { id: 'stripe', name: '줄무늬' },
  { id: 'check', name: '체크' },
  { id: 'dot', name: '도트' },
  { id: 'brick', name: '벽돌' },
  { id: 'tile', name: '타일' },
]

export const FLOOR_PATTERNS: { id: PatternId; name: string }[] = [
  { id: 'solid', name: '단색' },
  { id: 'plank', name: '마루' },
  { id: 'tile', name: '타일' },
  { id: 'check', name: '체스 타일' },
  { id: 'terrazzo', name: '테라조' },
]

export const ALL_PATTERNS: PatternId[] = ['solid', 'stripe', 'check', 'dot', 'brick', 'tile', 'plank', 'terrazzo']

const f = (pattern: PatternId, color: string, accent: string, size: number): Finish => ({ pattern, color, accent, size })

export const WALLPAPERS: FinishPreset[] = [
  { id: 'w-white', name: '화이트', finish: f('solid', '#f8f8f6', '#e5e5e2', 300) },
  { id: 'w-ivory', name: '아이보리', finish: f('solid', '#f3ecdd', '#e3d5bd', 300) },
  { id: 'w-gray', name: '웜 그레이', finish: f('solid', '#d9d5cf', '#c4bfb7', 300) },
  { id: 'w-sage', name: '세이지 그린', finish: f('solid', '#c5d1bf', '#aebba7', 300) },
  { id: 'w-sky', name: '스카이 블루', finish: f('solid', '#cfe0ec', '#b3cadb', 300) },
  { id: 'w-peach', name: '피치', finish: f('solid', '#f4d9cc', '#e8bfad', 300) },
  { id: 'w-navy', name: '네이비', finish: f('solid', '#2f3e5c', '#22304a', 300) },
  { id: 'w-stripe-blue', name: '블루 스트라이프', finish: f('stripe', '#f5f5f2', '#c9d7e6', 200) },
  { id: 'w-stripe-beige', name: '베이지 스트라이프', finish: f('stripe', '#f6f0e4', '#e3d5bd', 150) },
  { id: 'w-check', name: '깅엄 체크', finish: f('check', '#f7f3ea', '#d6e2cc', 300) },
  { id: 'w-dot', name: '도트', finish: f('dot', '#f7f2ee', '#e5b8a8', 250) },
  { id: 'w-brick-red', name: '붉은 벽돌', finish: f('brick', '#a8553f', '#d8cfc4', 400) },
  { id: 'w-brick-white', name: '화이트 벽돌', finish: f('brick', '#f1eeea', '#cbc5bd', 400) },
  { id: 'w-tile', name: '화이트 타일', finish: f('tile', '#f4f6f7', '#c3ccd2', 300) },
]

export const FLOORS: FinishPreset[] = [
  { id: 'f-oak', name: '오크 마루', finish: f('plank', '#c9a67a', '#8f7150', 1200) },
  { id: 'f-white-oak', name: '화이트 오크', finish: f('plank', '#e3d3b8', '#bda888', 1200) },
  { id: 'f-walnut', name: '월넛 마루', finish: f('plank', '#7a5338', '#4f3426', 1200) },
  { id: 'f-gray', name: '그레이 마루', finish: f('plank', '#a9a39b', '#7f7972', 1200) },
  { id: 'f-beige', name: '베이지 장판', finish: f('solid', '#e7d8c4', '#d4c2a9', 600) },
  { id: 'f-tile-white', name: '화이트 타일', finish: f('tile', '#ecebe7', '#c4c2bb', 600) },
  { id: 'f-tile-dark', name: '다크 타일', finish: f('tile', '#5b5f66', '#3e4147', 600) },
  { id: 'f-terracotta', name: '테라코타', finish: f('tile', '#c4734f', '#e6d8c8', 300) },
  { id: 'f-chess', name: '체스 타일', finish: f('check', '#f1efe9', '#3a3a3a', 800) },
  { id: 'f-terrazzo', name: '테라조 타일', finish: f('terrazzo', '#cdc3b1', '#6f5c4a', 400) },
  { id: 'f-terrazzo-white', name: '화이트 테라조', finish: f('terrazzo', '#ebe7df', '#8a8580', 400) },
]

export const DEFAULT_WALL = WALLPAPERS[0].finish
export const DEFAULT_FLOOR = FLOORS[0].finish

export const sameFinish = (a: Finish, b: Finish) =>
  a.pattern === b.pattern &&
  a.color.toLowerCase() === b.color.toLowerCase() &&
  (a.pattern === 'solid' || (a.accent.toLowerCase() === b.accent.toLowerCase() && a.size === b.size))

/** 항상 같은 순서의 "가짜 난수" (마루 무늬가 그릴 때마다 달라지지 않게) */
function seededRandom(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 무늬 한 칸(S×S 픽셀)을 그린다. 이 한 칸이 가로세로로 반복되어 벽·바닥을 채운다 */
function drawPattern(ctx: CanvasRenderingContext2D, S: number, finish: Finish) {
  ctx.fillStyle = finish.color
  ctx.fillRect(0, 0, S, S)
  ctx.fillStyle = finish.accent

  switch (finish.pattern) {
    case 'stripe':
      ctx.fillRect(0, 0, S / 2, S)
      break
    case 'check':
      ctx.fillRect(0, 0, S / 2, S / 2)
      ctx.fillRect(S / 2, S / 2, S / 2, S / 2)
      break
    case 'dot':
      // 가운데 1개 + 네 모서리(이웃 칸과 합쳐져 온전한 점이 됨)
      for (const [x, y] of [[S / 2, S / 2], [0, 0], [S, 0], [0, S], [S, S]]) {
        ctx.beginPath()
        ctx.arc(x, y, S * 0.13, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case 'tile': {
      const lw = Math.max(2, S * 0.03) // 줄눈 두께
      ctx.fillRect(0, 0, S, lw / 2)
      ctx.fillRect(0, S - lw / 2, S, lw / 2)
      ctx.fillRect(0, 0, lw / 2, S)
      ctx.fillRect(S - lw / 2, 0, lw / 2, S)
      break
    }
    case 'brick': {
      const lw = Math.max(2, S * 0.05)
      // 가로 줄눈 2줄
      ctx.fillRect(0, 0, S, lw / 2)
      ctx.fillRect(0, S - lw / 2, S, lw / 2)
      ctx.fillRect(0, S / 2 - lw / 2, S, lw)
      // 세로 줄눈: 윗줄은 양 끝, 아랫줄은 가운데 (엇갈려 쌓기)
      ctx.fillRect(0, 0, lw / 2, S / 2)
      ctx.fillRect(S - lw / 2, 0, lw / 2, S / 2)
      ctx.fillRect(S / 2 - lw / 2, S / 2, lw, S / 2)
      break
    }
    case 'terrazzo': {
      // 테라조(인조석): 바탕에 크고 작은 돌 알갱이가 촘촘히 박히고, 가는 줄눈으로 타일이 나뉜다
      const rand = seededRandom(11)
      // 바탕의 은은한 얼룩
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = shade(finish.color, (rand() - 0.5) * 0.08)
        ctx.globalAlpha = 0.5
        const r = S * (0.04 + rand() * 0.08)
        const x = rand() * S
        const y = rand() * S
        for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
          ctx.beginPath()
          ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      // 돌 알갱이 색: 포인트 색(갈색) + 진한 회색 + 옅은 돌 + 어두운 돌
      const chips = [finish.accent, finish.accent, shade(finish.accent, -0.3), shade(finish.accent, 0.25), shade(finish.accent, 0.45), '#7d7b78', '#5a5856', shade(finish.color, 0.12), shade(finish.color, -0.22)]
      const n = 2300
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = chips[Math.floor(rand() * chips.length)]
        const r = S * (0.003 + rand() * rand() * 0.014) // 작은 알갱이가 훨씬 많게
        const x = rand() * S
        const y = rand() * S
        const k = 5 + Math.floor(rand() * 3) // 모난 돌 모양 (5~7각형)
        const turn = rand() * Math.PI
        const pts = Array.from({ length: k }, (_, j) => {
          const a = turn + (j / k) * Math.PI * 2
          const rr = r * (0.6 + rand() * 0.5)
          return [Math.cos(a) * rr, Math.sin(a) * rr * (0.6 + rand() * 0.4)]
        })
        // 가장자리에 걸친 알갱이는 반대편에도 그려서 이음매 없이 이어지게
        for (const dx of x < r * 2 ? [0, S] : x > S - r * 2 ? [0, -S] : [0]) {
          for (const dy of y < r * 2 ? [0, S] : y > S - r * 2 ? [0, -S] : [0]) {
            ctx.beginPath()
            pts.forEach(([px, py], j) => (j === 0 ? ctx.moveTo(x + dx + px, y + dy + py) : ctx.lineTo(x + dx + px, y + dy + py)))
            ctx.closePath()
            ctx.fill()
          }
        }
      }
      // 줄눈: 가늘고 약간 어둡게
      ctx.fillStyle = shade(finish.color, -0.35)
      ctx.globalAlpha = 0.8
      const lw = Math.max(1.5, S * 0.006)
      ctx.fillRect(0, 0, S, lw / 2)
      ctx.fillRect(0, S - lw / 2, S, lw / 2)
      ctx.fillRect(0, 0, lw / 2, S)
      ctx.fillRect(S - lw / 2, 0, lw / 2, S)
      ctx.globalAlpha = 1
      break
    }
    case 'plank': {
      const rows = 8
      const rh = S / rows
      const groove = Math.max(1, S * 0.006)
      const rand = seededRandom(7)
      for (let r = 0; r < rows; r++) {
        // 한 줄에 널빤지 2장. 이음매 위치를 줄마다 다르게
        const j1 = rand() * S
        const j2 = j1 + S * (0.4 + rand() * 0.2)
        const boards: [number, number][] = [[j1, j2], [j2, j1 + S]]
        for (const [from, to] of boards) {
          ctx.fillStyle = shade(finish.color, (rand() - 0.5) * 0.16)
          // 오른쪽 끝을 넘어가면 왼쪽에서 이어지도록 두 번 그린다
          for (const shift of [0, -S]) ctx.fillRect(from + shift, r * rh, to - from, rh)
        }
        ctx.fillStyle = finish.accent
        ctx.globalAlpha = 0.55
        ctx.fillRect(0, r * rh, S, groove)
        for (const j of [j1, j2]) ctx.fillRect(j % S, r * rh, groove, rh)
        ctx.globalAlpha = 1
      }
      break
    }
  }
}

const canvasCache = new Map<string, HTMLCanvasElement>()
const urlCache = new Map<string, string>()

/** 무늬 그림(캔버스). 같은 마감재는 한 번만 그려서 재사용 */
export function patternCanvas(finish: Finish, pixels = 512): HTMLCanvasElement {
  const key = `${finish.pattern}|${finish.color}|${finish.accent}|${pixels}`
  let canvas = canvasCache.get(key)
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = canvas.height = pixels
    drawPattern(canvas.getContext('2d')!, pixels, finish)
    canvasCache.set(key, canvas)
  }
  return canvas
}

/** 목록에 보여줄 작은 미리보기 그림 주소 */
export function swatchUrl(finish: Finish): string {
  const key = `${finish.pattern}|${finish.color}|${finish.accent}`
  let url = urlCache.get(key)
  if (!url) {
    url = patternCanvas(finish, 96).toDataURL()
    urlCache.set(key, url)
  }
  return url
}
