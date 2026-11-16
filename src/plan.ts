// 평면 계산: 방(직사각형)들의 합친 모양, 벽 위치, 가구가 방 안에 있는지 등.
// 화면과 상관없는 순수한 계산만 모아둔다.
import type { FurnitureInstance, FurnitureLibraryItem, RoomShape, Side, WallItem } from './types'

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
  roomId: string // 이 벽이 감싸는 방
  otherRoomId?: string // 방 사이 벽일 때 반대편 방
  rect: Rect // 벽이 차지하는 자리
  nx: number // roomId 방에서 봤을 때 바깥쪽 방향
  ny: number
  horizontal: boolean // 가로로 긴 벽인가
  length: number
  interior: boolean // 방과 방 사이의 벽인가
  line: number // 벽이 서 있는 방 경계선의 좌표 (가로 벽이면 y, 세로 벽이면 x)
  from: number // 벽이 시작하는 좌표 (가로 벽이면 x, 세로 벽이면 y)
}

/**
 * 벽을 세운다.
 * - 바깥 테두리에는 바깥벽
 * - 맞닿은 두 방 사이에는 사이벽 (둘 중 하나라도 "벽 없이 잇기"면 생략)
 * - 겹쳐 놓은 방끼리는 벽 없이 하나로 합쳐진다
 */
export function wallPieces(rooms: RoomShape[]): WallPiece[] {
  const T = WALL_THICKNESS
  const rects = rooms.map(roomRect)
  const inside = (px: number, py: number) => rects.some((r) => contains(r, px, py))
  const pieces: WallPiece[] = []

  rooms.forEach((room, index) => {
    const r = rects[index]
    const others = rooms.map((o, i) => ({ room: o, rect: rects[i] })).filter((_, i) => i !== index)
    const x2 = r.x + r.w
    const y2 = r.y + r.d

    // ── 가로 벽 (위쪽, 아래쪽) ──
    for (const edge of [{ y: r.y, ny: -1 }, { y: y2, ny: 1 }]) {
      // 이 변의 바깥쪽에서 변까지 닿아 있는 다른 방들
      const beyond = others.filter(({ rect: o }) =>
        edge.ny < 0 ? o.y < edge.y - EPS && o.y + o.d >= edge.y - EPS : o.y <= edge.y + EPS && o.y + o.d > edge.y + EPS,
      )
      for (const [s, e] of subtract(r.x, x2, beyond.map(({ rect: o }) => [o.x, o.x + o.w]))) {
        // 볼록한 모서리에서는 벽을 두께만큼 늘려서 모서리 구멍을 메운다
        const midY = edge.y + (edge.ny * T) / 2
        const start = inside(s - T / 2, midY) ? s : s - T
        const end = inside(e + T / 2, midY) ? e : e + T
        pieces.push({
          key: `${room.id}:h:${edge.y}:${s}:${e}`,
          roomId: room.id,
          rect: { x: start, y: edge.ny < 0 ? edge.y - T : edge.y, w: end - start, d: T },
          nx: 0,
          ny: edge.ny,
          horizontal: true,
          length: end - start,
          interior: false,
          line: edge.y,
          from: start,
        })
      }
      // 사이벽: 중복을 피하려고 "위쪽 변"에서만 만든다 (아랫방 기준으로 윗방과의 벽)
      if (edge.ny < 0) {
        const merged = beyond.filter(({ rect: o }) => o.y + o.d > edge.y + EPS).map(({ rect: o }): [number, number] => [o.x, o.x + o.w])
        for (const { room: other, rect: o } of beyond) {
          if (Math.abs(o.y + o.d - edge.y) > EPS || room.open || other.open) continue
          for (const [s, e] of subtract(Math.max(r.x, o.x), Math.min(x2, o.x + o.w), merged)) {
            if (e - s < 1) continue
            pieces.push({
              key: `${room.id}:ih:${edge.y}:${s}:${e}`,
              roomId: room.id,
              otherRoomId: other.id,
              rect: { x: s, y: edge.y - T / 2, w: e - s, d: T },
              nx: 0,
              ny: -1,
              horizontal: true,
              length: e - s,
              interior: true,
              line: edge.y,
              from: s,
            })
          }
        }
      }
    }

    // ── 세로 벽 (왼쪽, 오른쪽) ──
    for (const edge of [{ x: r.x, nx: -1 }, { x: x2, nx: 1 }]) {
      const beyond = others.filter(({ rect: o }) =>
        edge.nx < 0 ? o.x < edge.x - EPS && o.x + o.w >= edge.x - EPS : o.x <= edge.x + EPS && o.x + o.w > edge.x + EPS,
      )
      for (const [s, e] of subtract(r.y, y2, beyond.map(({ rect: o }) => [o.y, o.y + o.d]))) {
        pieces.push({
          key: `${room.id}:v:${edge.x}:${s}:${e}`,
          roomId: room.id,
          rect: { x: edge.nx < 0 ? edge.x - T : edge.x, y: s, w: T, d: e - s },
          nx: edge.nx,
          ny: 0,
          horizontal: false,
          length: e - s,
          interior: false,
          line: edge.x,
          from: s,
        })
      }
      if (edge.nx < 0) {
        const merged = beyond.filter(({ rect: o }) => o.x + o.w > edge.x + EPS).map(({ rect: o }): [number, number] => [o.y, o.y + o.d])
        for (const { room: other, rect: o } of beyond) {
          if (Math.abs(o.x + o.w - edge.x) > EPS || room.open || other.open) continue
          for (const [s, e] of subtract(Math.max(r.y, o.y), Math.min(y2, o.y + o.d), merged)) {
            if (e - s < 1) continue
            pieces.push({
              key: `${room.id}:iv:${edge.x}:${s}:${e}`,
              roomId: room.id,
              otherRoomId: other.id,
              rect: { x: edge.x - T / 2, y: s, w: T, d: e - s },
              nx: -1,
              ny: 0,
              horizontal: false,
              length: e - s,
              interior: true,
              line: edge.x,
              from: s,
            })
          }
        }
      }
    }
  })
  return pieces
}

export const rectsIntersect = (a: Rect, b: Rect) =>
  a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS && a.y < b.y + b.d - EPS && a.y + a.d > b.y + EPS

// ───────── 벽에 붙는 것 (문·창문·콘센트) ─────────

/** 방의 한 변의 길이 */
export const edgeLength = (room: RoomShape, side: Side) => (side === 'N' || side === 'S' ? room.width : room.depth)

/** 벽에 붙은 물건이 평면에서 차지하는 구간 */
export type Span = {
  horizontal: boolean // 가로 벽에 붙었는가
  line: number // 그 변의 좌표
  a: number // 구간 시작
  b: number // 구간 끝
  cx: number // 중심점
  cy: number
  nx: number // 방에서 본 바깥쪽 방향
  ny: number
}

export function wallItemSpan(item: WallItem, room: RoomShape): Span {
  const half = item.width / 2
  switch (item.side) {
    case 'N': return { horizontal: true, line: room.y, a: room.x + item.offset - half, b: room.x + item.offset + half, cx: room.x + item.offset, cy: room.y, nx: 0, ny: -1 }
    case 'S': return { horizontal: true, line: room.y + room.depth, a: room.x + item.offset - half, b: room.x + item.offset + half, cx: room.x + item.offset, cy: room.y + room.depth, nx: 0, ny: 1 }
    case 'W': return { horizontal: false, line: room.x, a: room.y + item.offset - half, b: room.y + item.offset + half, cx: room.x, cy: room.y + item.offset, nx: -1, ny: 0 }
    case 'E': return { horizontal: false, line: room.x + room.width, a: room.y + item.offset - half, b: room.y + item.offset + half, cx: room.x + room.width, cy: room.y + item.offset, nx: 1, ny: 0 }
  }
}

/** 물건이 변 밖으로 삐져나가지 않게 위치를 고친다 */
export function clampWallItem(item: WallItem, room: RoomShape): WallItem {
  const length = edgeLength(room, item.side)
  const width = Math.min(item.width, length)
  return { ...item, width, offset: clamp(item.offset, width / 2, length - width / 2) }
}

/** 그 자리에 실제로 서 있는 벽 조각 찾기 (없으면 undefined = 벽이 없는 자리) */
export const findPiece = (pieces: WallPiece[], span: Span) =>
  pieces.find((p) => p.horizontal === span.horizontal && Math.abs(p.line - span.line) < 1 && p.from < span.b - EPS && p.from + p.length > span.a + EPS)

/** 평면의 한 점에서 가장 가까운 "방의 변"과 그 변 위의 위치 */
export function nearestEdge(rooms: RoomShape[], px: number, py: number) {
  let best: { roomId: string; side: Side; offset: number; dist: number } | null = null
  for (const room of rooms) {
    const x2 = room.x + room.width
    const y2 = room.y + room.depth
    const ox = clamp(px, room.x, x2) - room.x // 가로 변 위의 위치
    const oy = clamp(py, room.y, y2) - room.y // 세로 변 위의 위치
    const candidates: { side: Side; offset: number; dist: number }[] = [
      { side: 'N', offset: ox, dist: Math.hypot(px - (room.x + ox), py - room.y) },
      { side: 'S', offset: ox, dist: Math.hypot(px - (room.x + ox), py - y2) },
      { side: 'W', offset: oy, dist: Math.hypot(px - room.x, py - (room.y + oy)) },
      { side: 'E', offset: oy, dist: Math.hypot(px - x2, py - (room.y + oy)) },
    ]
    for (const c of candidates) if (!best || c.dist < best.dist) best = { roomId: room.id, ...c }
  }
  return best as { roomId: string; side: Side; offset: number; dist: number } | null
}

/** 회전을 반영한 바닥 점유 크기. 90°/270°면 폭과 깊이가 뒤바뀐다 */
export function footprint(item: FurnitureLibraryItem, rotation: number) {
  return rotation % 180 !== 0 ? { w: item.depth, d: item.width } : { w: item.width, d: item.depth }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** 방에서 사이벽이 차지하는 만큼(두께의 절반)을 뺀, 가구를 놓을 수 있는 자리 */
function usableRect(r: Rect, walls: WallPiece[]): Rect {
  const half = WALL_THICKNESS / 2
  const has = (horizontal: boolean, line: number, lo: number, hi: number) =>
    walls.some((p) => p.horizontal === horizontal && Math.abs(p.line - line) < EPS && p.from < hi - EPS && p.from + p.length > lo + EPS)
  const top = has(true, r.y, r.x, r.x + r.w) ? half : 0
  const bottom = has(true, r.y + r.d, r.x, r.x + r.w) ? half : 0
  const left = has(false, r.x, r.y, r.y + r.d) ? half : 0
  const right = has(false, r.x + r.w, r.y, r.y + r.d) ? half : 0
  return { x: r.x + left, y: r.y + top, w: r.w - left - right, d: r.d - top - bottom }
}

/**
 * 가구가 방 밖(벽 너머)으로 나가거나 사이벽에 박히지 않게 위치를 고친다.
 * 이미 괜찮은 자리면 그대로, 아니면 가장 가까운 "방 안" 위치로 옮긴다.
 */
export function placeInPlan(
  instance: FurnitureInstance,
  item: FurnitureLibraryItem,
  rooms: RoomShape[],
  pieces: WallPiece[] = wallPieces(rooms),
): FurnitureInstance {
  const rects = rooms.map(roomRect)
  if (rects.length === 0) return instance
  const walls = pieces.filter((p) => p.interior)
  const { w, d } = footprint(item, instance.rotation)
  const spot: Rect = { x: instance.x - w / 2, y: instance.y - d / 2, w, d }
  if (isCovered(spot, rects) && !walls.some((p) => rectsIntersect(spot, p.rect))) return instance

  let best: { x: number; y: number; dist: number } | null = null
  const consider = (x: number, y: number) => {
    const dist = (x - instance.x) ** 2 + (y - instance.y) ** 2
    if (!best || dist < best.dist) best = { x, y, dist }
  }
  // 가구가 통째로 들어가는 방마다 "그 방 안에서 가장 가까운 자리"를 구해 비교
  for (const rect of rects) {
    const r = usableRect(rect, walls)
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
