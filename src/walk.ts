// 걷기(1인칭·3인칭) 모드에서 쓰는 계산: 몸 크기, 부딪히는 물건, 움직이기.
// 화면과 상관없는 순수한 계산만 모아둔다. 길이는 mm.
import type { Project } from './types'
import { resolveItem, isPassable } from './library'
import { contains, findPiece, footprint, roomRect, wallItemSpan, type Rect, type WallPiece } from './plan'

/**
 * 키로부터 몸 크기를 정한다.
 * - 눈높이: 키의 약 93% (키 170cm → 158cm)
 * - 몸 폭(양 어깨 바깥쪽 끝 사이): 키의 약 27% (키 170cm → 46cm)
 *   한국인 인체치수조사(사이즈코리아)의 20~30대 남성 평균에 맞춘 비율
 */
export function bodySize(height: number) {
  return { height, eye: Math.round(height * 0.93), width: Math.round(height * 0.27) }
}

export const DEFAULT_BODY_HEIGHT = 1700

/** 걷는 사람이 부딪히는 것들 */
export type Obstacles = {
  blocks: Rect[] // 벽(문 자리는 뚫림) + 가구
  walls: Rect[] // 벽만 (3인칭 카메라가 벽 밖으로 나가지 않게 할 때 씀)
  rooms: Rect[] // 서 있을 수 있는 바닥 (방 안)
}

/** 벽 조각에서 문 자리를 잘라 낸 나머지 */
function wallWithoutDoors(piece: WallPiece, doors: [number, number][]): Rect[] {
  const { rect } = piece
  const lo = piece.horizontal ? rect.x : rect.y
  const hi = lo + (piece.horizontal ? rect.w : rect.d)
  let segs: [number, number][] = [[lo, hi]]
  for (const [a, b] of doors) {
    segs = segs.flatMap(([s, e]): [number, number][] => {
      if (b <= s || a >= e) return [[s, e]]
      return [...(a > s ? [[s, a] as [number, number]] : []), ...(b < e ? [[b, e] as [number, number]] : [])]
    })
  }
  return segs.map(([s, e]) => (piece.horizontal ? { x: s, y: rect.y, w: e - s, d: rect.d } : { x: rect.x, y: s, w: rect.w, d: e - s }))
}

export function buildObstacles(project: Project, pieces: WallPiece[]): Obstacles {
  // 문 자리: 어느 벽 조각의 어느 구간이 뚫렸는지
  const doorsByPiece = new Map<WallPiece, [number, number][]>()
  for (const item of project.wallItems) {
    if (item.kind !== 'door') continue
    const room = project.rooms.find((r) => r.id === item.roomId)
    if (!room) continue
    const span = wallItemSpan(item, room)
    const piece = findPiece(pieces, span)
    if (!piece) continue
    doorsByPiece.set(piece, [...(doorsByPiece.get(piece) ?? []), [span.a, span.b]])
  }
  const walls = pieces.flatMap((p) => wallWithoutDoors(p, doorsByPiece.get(p) ?? []))

  // 가구: 러그·천장등·멀티탭처럼 밟고 지나갈 수 있는 것은 빼고, 바닥에서 차지하는 자리
  const furniture: Rect[] = []
  for (const f of project.furniture) {
    const item = resolveItem(f)
    if (!item || isPassable(item)) continue
    const { w, d } = footprint(item, f.rotation)
    furniture.push({ x: f.x - w / 2, y: f.y - d / 2, w, d })
  }
  return { blocks: [...walls, ...furniture], walls, rooms: project.rooms.map(roomRect) }
}

/** 점에서 직사각형까지의 거리 (안에 있으면 0) */
function distanceToRect(px: number, py: number, r: Rect) {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w))
  const dy = Math.max(r.y - py, 0, py - (r.y + r.d))
  return Math.hypot(dx, dy)
}

/** 몸(반지름 radius인 원)이 (x, y)에 설 수 있는가 */
export function canStand(o: Obstacles, x: number, y: number, radius: number) {
  if (!o.rooms.some((r) => contains(r, x, y))) return false // 방 밖(허공)으로는 못 나간다
  return !o.blocks.some((b) => distanceToRect(x, y, b) < radius)
}

/**
 * (x, y)에서 (dx, dy)만큼 걸어간다. 앞이 막히면 벽을 따라 미끄러지듯 옆으로만 간다.
 * 한 번에 크게 움직이면 얇은 벽을 뚫을 수 있으므로 잘게 나눠서 움직인다.
 */
export function walk(o: Obstacles, x: number, y: number, dx: number, dy: number, radius: number) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 40))
  const sx = dx / steps
  const sy = dy / steps
  for (let i = 0; i < steps; i++) {
    if (canStand(o, x + sx, y + sy, radius)) {
      x += sx
      y += sy
    } else if (canStand(o, x + sx, y, radius)) x += sx
    else if (canStand(o, x, y + sy, radius)) y += sy
    else break
  }
  return { x, y }
}

/** (x, y)에서 가장 가까운, 설 수 있는 자리를 찾는다 (없으면 null) */
export function findStandingSpot(o: Obstacles, x: number, y: number, radius: number) {
  if (canStand(o, x, y, radius)) return { x, y }
  // 점점 넓은 원을 그리며 찾아본다 (5cm 간격, 최대 15m)
  for (let r = 50; r <= 15000; r += 50) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / 50))
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const px = x + Math.cos(a) * r
      const py = y + Math.sin(a) * r
      if (canStand(o, px, py, radius)) return { x: px, y: py }
    }
  }
  return null
}

/**
 * 3인칭 카메라: 사람(x, y)에서 (dirX, dirY) 방향으로 maxDist까지 갔을 때 벽에 닿기 전까지의 거리.
 * 카메라가 벽 너머로 나가서 벽이 화면을 가리는 일을 막는다.
 */
export function clearDistance(o: Obstacles, x: number, y: number, dirX: number, dirY: number, maxDist: number, margin: number) {
  for (let d = 0; d <= maxDist; d += 25) {
    const px = x + dirX * d
    const py = y + dirY * d
    if (o.walls.some((w) => distanceToRect(px, py, w) < margin) || !o.rooms.some((r) => contains(r, px, py))) return Math.max(0, d - 25)
  }
  return maxDist
}
