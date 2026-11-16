// 해의 위치와 창문으로 들어오는 햇빛 계산 (서울 위도 기준의 단순한 모델)
import type { Point, Project, Season } from './types'
import { findPiece, roomRect, wallItemSpan, type Rect, type WallPiece } from './plan'

const LATITUDE = 37.5 // 서울
const DECLINATION: Record<Season, number> = { summer: 23.44, equinox: 0, winter: -23.44 } // 계절별 해의 기울기
const rad = (deg: number) => (deg * Math.PI) / 180

/** 해 뜨는 시각과 지는 시각 (시 단위) */
export function daylight(season: Season) {
  const half = (Math.acos(-Math.tan(rad(LATITUDE)) * Math.tan(rad(DECLINATION[season]))) * 180) / Math.PI / 15
  return { sunrise: 12 - half, sunset: 12 + half }
}

export type Sun = {
  x: number // 해를 향하는 방향 (3D 좌표: x 오른쪽, y 위, z 평면도 아래쪽)
  y: number
  z: number
  elevation: number // 고도 (라디안). 0 이하면 해가 진 것
}

/** 시각·계절·방위 → 해가 있는 방향 */
export function sunDirection(time: number, season: Season, north: number): Sun {
  const lat = rad(LATITUDE)
  const dec = rad(DECLINATION[season])
  const hour = rad((time - 12) * 15) // 정오 기준 각도
  // 동·북·위 방향 성분
  const east = -Math.cos(dec) * Math.sin(hour)
  const northward = Math.cos(lat) * Math.sin(dec) - Math.sin(lat) * Math.cos(dec) * Math.cos(hour)
  const up = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hour)
  // 평면도에서 북쪽이 어느 방향인지에 맞춰 돌린다.
  // north = 평면도 위쪽이 가리키는 방위 (0 = 북, 90 = 동). 위쪽이 동이면 북은 왼쪽이므로 반대로 돌린다
  const a = rad(-north)
  const nx = Math.sin(a)
  const nz = -Math.cos(a)
  return { x: east * -nz + northward * nx, y: up, z: east * nx + northward * nz, elevation: Math.asin(Math.max(-1, Math.min(1, up))) }
}

/** 다각형을 직사각형 안쪽만 남기고 자른다 */
function clipToRect(polygon: Point[], r: Rect): Point[] {
  const edges: { inside: (p: Point) => boolean; cut: (p: Point, q: Point) => Point }[] = [
    { inside: (p) => p.x >= r.x, cut: (p, q) => ({ x: r.x, y: p.y + ((q.y - p.y) * (r.x - p.x)) / (q.x - p.x) }) },
    { inside: (p) => p.x <= r.x + r.w, cut: (p, q) => ({ x: r.x + r.w, y: p.y + ((q.y - p.y) * (r.x + r.w - p.x)) / (q.x - p.x) }) },
    { inside: (p) => p.y >= r.y, cut: (p, q) => ({ x: p.x + ((q.x - p.x) * (r.y - p.y)) / (q.y - p.y), y: r.y }) },
    { inside: (p) => p.y <= r.y + r.d, cut: (p, q) => ({ x: p.x + ((q.x - p.x) * (r.y + r.d - p.y)) / (q.y - p.y), y: r.y + r.d }) },
  ]
  let out = polygon
  for (const edge of edges) {
    const input = out
    out = []
    for (let i = 0; i < input.length; i++) {
      const p = input[i]
      const q = input[(i + 1) % input.length]
      if (edge.inside(p)) {
        out.push(p)
        if (!edge.inside(q)) out.push(edge.cut(p, q))
      } else if (edge.inside(q)) out.push(edge.cut(p, q))
    }
  }
  return out
}

const polygonArea = (pts: Point[]) =>
  Math.abs(pts.reduce((sum, p, i) => sum + p.x * pts[(i + 1) % pts.length].y - pts[(i + 1) % pts.length].x * p.y, 0)) / 2

/** 빛줄기의 꼭짓점: 평면 위치 + 높이 */
export type BeamPoint = { x: number; y: number; h: number }

export type SunPatch = {
  roomId: string
  polygon: Point[] // 바닥에 햇빛이 닿는 자리
  area: number // ㎡
  beam: { near: BeamPoint[]; far: BeamPoint[] } // 창문 네 귀퉁이 → 빛이 닿는 네 점 (3D 빛줄기용)
}

/**
 * 창문마다 "바닥에 햇빛이 떨어지는 자리"를 구한다.
 * 창문 네 귀퉁이를 해 반대 방향으로 바닥까지 내려 그은 평행사변형이 그 자리다.
 * (가구에 가리는 것은 계산하지 않는다. 3D 화면의 그림자가 더 정확하다)
 */
export function sunPatches(project: Project, pieces: WallPiece[], sun: Sun): SunPatch[] {
  if (sun.y <= 0.02) return []
  const patches: SunPatch[] = []
  for (const item of project.wallItems) {
    if (item.kind !== 'window') continue
    const room = project.rooms.find((r) => r.id === item.roomId)
    if (!room) continue
    const span = wallItemSpan(item, room)
    const piece = findPiece(pieces, span)
    if (!piece || piece.interior) continue // 바깥벽의 창문만
    if (sun.x * span.nx + sun.z * span.ny <= 0) continue // 해가 그 벽의 바깥쪽에 있어야 한다
    // 높이 h인 점을 지나는 빛이 바닥에 닿는 곳: 해 반대쪽으로 h / tan(고도) 만큼
    const shift = (h: number) => ({ x: (-sun.x / sun.y) * h, y: (-sun.z / sun.y) * h })
    const at = (along: number, h: number): Point => {
      const s = shift(h)
      return span.horizontal ? { x: along + s.x, y: span.line + s.y } : { x: span.line + s.x, y: along + s.y }
    }
    const top = item.sill + item.height
    const rect = roomRect(room)
    const corners: [number, number][] = [[span.a, item.sill], [span.b, item.sill], [span.b, top], [span.a, top]]
    const polygon = clipToRect(corners.map(([along, h]) => at(along, h)), rect)
    if (polygon.length < 3) continue

    // 빛줄기: 창문 귀퉁이에서 바닥까지 가는 길. 도중에 맞은편 벽에 닿으면 거기서 멈춘다
    const near: BeamPoint[] = corners.map(([along, h]) => ({ ...at(along, 0), h }))
    const far: BeamPoint[] = near.map((p) => {
      const floor = { x: p.x + shift(p.h).x, y: p.y + shift(p.h).y }
      let t = 1 // 0 = 창문, 1 = 바닥
      if (floor.x < rect.x) t = Math.min(t, (rect.x - p.x) / (floor.x - p.x))
      if (floor.x > rect.x + rect.w) t = Math.min(t, (rect.x + rect.w - p.x) / (floor.x - p.x))
      if (floor.y < rect.y) t = Math.min(t, (rect.y - p.y) / (floor.y - p.y))
      if (floor.y > rect.y + rect.d) t = Math.min(t, (rect.y + rect.d - p.y) / (floor.y - p.y))
      t = Math.max(0, t)
      return { x: p.x + (floor.x - p.x) * t, y: p.y + (floor.y - p.y) * t, h: p.h * (1 - t) }
    })
    patches.push({ roomId: room.id, polygon, area: polygonArea(polygon) / 1e6, beam: { near, far } })
  }
  return patches
}

/** 14.5 → "14:30" */
export const formatTime = (time: number) => {
  const minutes = Math.round(time * 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
