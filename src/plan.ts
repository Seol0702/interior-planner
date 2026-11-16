// 평면 계산: 방(직사각형)들의 합친 모양, 벽 위치, 가구가 방 안에 있는지 등.
// 화면과 상관없는 순수한 계산만 모아둔다.
import type { FurnitureInstance, FurnitureLibraryItem, RoomShape } from './types'

/** 왼쪽 위 모서리 + 크기로 나타낸 직사각형 */
export type Rect = { x: number; y: number; w: number; d: number }

export const WALL_THICKNESS = 100 // 벽 두께 (mm)
const EPS = 0.5 // 소수점 오차 허용값

export const roomRect = (r: RoomShape): Rect => ({ x: r.x, y: r.y, w: r.width, d: r.depth })

export const contains = (r: Rect, px: number, py: number) =>
  px >= r.x - EPS && px <= r.x + r.w + EPS && py >= r.y - EPS && py <= r.y + r.d + EPS

/** 전체 방을 감싸는 범위 */
export function bounds(rooms: RoomShape[]) {
  if (rooms.length === 0) return { minX: 0, minY: 0, maxX: 4000, maxY: 4000, w: 4000, d: 4000, cx: 2000, cy: 2000 }
  const minX = Math.min(...rooms.map((r) => r.x))
  const minY = Math.min(...rooms.map((r) => r.y))
  const maxX = Math.max(...rooms.map((r) => r.x + r.width))
  const maxY = Math.max(...rooms.map((r) => r.y + r.depth))
  return { minX, minY, maxX, maxY, w: maxX - minX, d: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
}

/** lo~hi 구간을 values 위치에서 잘게 나눈 경계값 목록 */
function cuts(values: number[], lo: number, hi: number) {
  const set = new Set([lo, hi])
  for (const v of values) if (v > lo + EPS && v < hi - EPS) set.add(v)
  return [...set].sort((a, b) => a - b)
}

/** target 직사각형이 rects(여러 방)를 합친 영역 안에 완전히 들어가는가? */
export function isCovered(target: Rect, rects: Rect[]) {
  // 방 경계선으로 target을 작은 칸들로 나눈 뒤, 모든 칸이 어느 방엔가 속하는지 확인
  const xs = cuts(rects.flatMap((r) => [r.x, r.x + r.w]), target.x, target.x + target.w)
  const ys = cuts(rects.flatMap((r) => [r.y, r.y + r.d]), target.y, target.y + target.d)
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2
      const cy = (ys[j] + ys[j + 1]) / 2
      if (!rects.some((r) => contains(r, cx, cy))) return false
    }
  }
  return true
}

/** 방들을 합친 넓이 (㎡). 겹친 부분은 한 번만 센다 */
export function unionArea(rects: Rect[]) {
  const xs = [...new Set(rects.flatMap((r) => [r.x, r.x + r.w]))].sort((a, b) => a - b)
  const ys = [...new Set(rects.flatMap((r) => [r.y, r.y + r.d]))].sort((a, b) => a - b)
  let area = 0
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2
      const cy = (ys[j] + ys[j + 1]) / 2
      if (rects.some((r) => contains(r, cx, cy))) area += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j])
    }
  }
  return area / 1_000_000
}

/** lo~hi 구간에서 covers 구간들을 빼고 남은 조각들 */
function subtract(lo: number, hi: number, covers: [number, number][]) {
  let segs: [number, number][] = [[lo, hi]]
  for (const [a, b] of covers) {
    segs = segs.flatMap(([s, e]): [number, number][] => {
      if (b <= s + EPS || a >= e - EPS) return [[s, e]]
      const out: [number, number][] = []
      if (a > s + EPS) out.push([s, a])
      if (b < e - EPS) out.push([b, e])
      return out
    })
  }
  return segs
}

/** 벽 조각 하나 (평면에서 본 직사각형) */
export type WallPiece = {
  key: string
  roomId: string
  rect: Rect // 벽이 차지하는 자리
  nx: number // 바깥쪽 방향
  ny: number
  horizontal: boolean // 가로로 긴 벽인가
  length: number
}

/**
 * 방들의 바깥 테두리에만 벽을 세운다.
 * 두 방이 맞닿거나 겹친 부분에는 벽을 만들지 않아서 하나의 공간으로 이어진다.
 */
export function wallPieces(rooms: RoomShape[]): WallPiece[] {
  const T = WALL_THICKNESS
  const rects = rooms.map(roomRect)
  const inside = (px: number, py: number) => rects.some((r) => contains(r, px, py))
  const pieces: WallPiece[] = []

  rooms.forEach((room, index) => {
    const r = rects[index]
    const others = rects.filter((_, i) => i !== index)
    const x2 = r.x + r.w
    const y2 = r.y + r.d

    // 가로 벽 (위쪽, 아래쪽)
    const horizontals: { y: number; ny: number; covers: [number, number][] }[] = [
      { y: r.y, ny: -1, covers: others.filter((o) => o.y < r.y - EPS && o.y + o.d >= r.y - EPS).map((o) => [o.x, o.x + o.w]) },
      { y: y2, ny: 1, covers: others.filter((o) => o.y <= y2 + EPS && o.y + o.d > y2 + EPS).map((o) => [o.x, o.x + o.w]) },
    ]
    for (const h of horizontals) {
      for (const [s, e] of subtract(r.x, x2, h.covers)) {
        // 볼록한 모서리에서는 벽을 두께만큼 늘려서 모서리 구멍을 메운다
        const midY = h.y + (h.ny * T) / 2
        const start = inside(s - T / 2, midY) ? s : s - T
        const end = inside(e + T / 2, midY) ? e : e + T
        pieces.push({
          key: `${room.id}:h:${h.y}:${s}:${e}`,
          roomId: room.id,
          rect: { x: start, y: h.ny < 0 ? h.y - T : h.y, w: end - start, d: T },
          nx: 0,
          ny: h.ny,
          horizontal: true,
          length: end - start,
        })
      }
    }

    // 세로 벽 (왼쪽, 오른쪽)
    const verticals: { x: number; nx: number; covers: [number, number][] }[] = [
      { x: r.x, nx: -1, covers: others.filter((o) => o.x < r.x - EPS && o.x + o.w >= r.x - EPS).map((o) => [o.y, o.y + o.d]) },
      { x: x2, nx: 1, covers: others.filter((o) => o.x <= x2 + EPS && o.x + o.w > x2 + EPS).map((o) => [o.y, o.y + o.d]) },
    ]
    for (const v of verticals) {
      for (const [s, e] of subtract(r.y, y2, v.covers)) {
        pieces.push({
          key: `${room.id}:v:${v.x}:${s}:${e}`,
          roomId: room.id,
          rect: { x: v.nx < 0 ? v.x - T : v.x, y: s, w: T, d: e - s },
          nx: v.nx,
          ny: 0,
          horizontal: false,
          length: e - s,
        })
      }
    }
  })
  return pieces
}

/** 회전을 반영한 바닥 점유 크기. 90°/270°면 폭과 깊이가 뒤바뀐다 */
export function footprint(item: FurnitureLibraryItem, rotation: number) {
  return rotation % 180 !== 0 ? { w: item.depth, d: item.width } : { w: item.width, d: item.depth }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/**
 * 가구가 방 밖(벽 너머)으로 나가지 않게 위치를 고친다.
 * 이미 방 안이면 그대로, 아니면 가장 가까운 "방 안" 위치로 옮긴다.
 */
export function placeInPlan(
  instance: FurnitureInstance,
  item: FurnitureLibraryItem,
  rooms: RoomShape[],
): FurnitureInstance {
  const rects = rooms.map(roomRect)
  if (rects.length === 0) return instance
  const { w, d } = footprint(item, instance.rotation)
  if (isCovered({ x: instance.x - w / 2, y: instance.y - d / 2, w, d }, rects)) return instance

  let best: { x: number; y: number; dist: number } | null = null
  const consider = (x: number, y: number) => {
    const dist = (x - instance.x) ** 2 + (y - instance.y) ** 2
    if (!best || dist < best.dist) best = { x, y, dist }
  }
  // 가구가 통째로 들어가는 방마다 "그 방 안에서 가장 가까운 자리"를 구해 비교
  for (const r of rects) {
    if (w <= r.w + EPS && d <= r.d + EPS) {
      consider(clamp(instance.x, r.x + w / 2, r.x + r.w - w / 2), clamp(instance.y, r.y + d / 2, r.y + r.d - d / 2))
    }
  }
  // 어느 방에도 안 들어갈 만큼 크면 중심만이라도 방 안에 둔다
  if (!best) for (const r of rects) consider(clamp(instance.x, r.x, r.x + r.w), clamp(instance.y, r.y, r.y + r.d))
  const found = best as { x: number; y: number } | null
  return found ? { ...instance, x: found.x, y: found.y } : instance
}

/** 겹치지 않는 고유 id 만들기 */
export const newId = () => crypto.randomUUID()
