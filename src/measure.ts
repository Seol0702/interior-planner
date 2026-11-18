import type { Point, Project } from './types'
import { footprint, wallItemSpan, type Rect, type WallPiece } from './plan'
import { resolveItem } from './library'
import { fmtCm, snap } from './units'

/** 줄자로 찍은 점 (mm). x·y는 평면도 좌표, z는 바닥에서 잰 높이 */
export type P3 = { x: number; y: number; z: number }

/** 다 잰 줄자 하나: 시작점 a → 끝점 b */
export type Measurement = { id: number; a: P3; b: P3 }

/** 줄자 도구의 상태: 다 잰 것들 + 찍어 둔 시작점(끝점을 기다리는 중) */
export type MeasureState = { list: Measurement[]; start: P3 | null }

export const EMPTY_MEASURE: MeasureState = { list: [], start: null }

/** 세로선(x = at, y가 from~to) 또는 가로선(y = at, x가 from~to) */
type Line = { at: number; from: number; to: number }

/** 줄자 끝이 달라붙는 자리: 모서리 점, 세로선, 가로선 */
export type SnapTargets = { points: Point[]; vertical: Line[]; horizontal: Line[] }

/**
 * 방 모서리, 벽 안쪽·바깥쪽 면, 가구 테두리, 문·창문 양 끝을 모은다.
 * 줄자 끝이 이 근처에 오면 정확히 거기에 붙어서 "벽에서 벽까지"를 잴 수 있다.
 */
export function snapTargets(project: Project, pieces: WallPiece[]): SnapTargets {
  const t: SnapTargets = { points: [], vertical: [], horizontal: [] }
  const addRect = (r: Rect) => {
    const x2 = r.x + r.w
    const y2 = r.y + r.d
    t.points.push({ x: r.x, y: r.y }, { x: x2, y: r.y }, { x: x2, y: y2 }, { x: r.x, y: y2 })
    t.vertical.push({ at: r.x, from: r.y, to: y2 }, { at: x2, from: r.y, to: y2 })
    t.horizontal.push({ at: r.y, from: r.x, to: x2 }, { at: y2, from: r.x, to: x2 })
  }
  for (const r of project.rooms) addRect({ x: r.x, y: r.y, w: r.width, d: r.depth })
  for (const p of pieces) addRect(p.rect)
  for (const f of project.furniture) {
    const item = resolveItem(f)
    if (!item) continue
    const { w, d } = footprint(item, f.rotation)
    addRect({ x: f.x - w / 2, y: f.y - d / 2, w, d })
  }
  for (const item of project.wallItems) {
    const room = project.rooms.find((r) => r.id === item.roomId)
    if (!room || item.kind === 'outlet') continue
    const s = wallItemSpan(item, room)
    for (const along of [s.a, s.b]) t.points.push(s.horizontal ? { x: along, y: s.line } : { x: s.line, y: along })
  }
  return t
}

/**
 * 평면 위의 점을 가까운 모서리 → 가까운 선 순서로 붙이고, 아무 데도 안 붙으면 1cm 단위로 맞춘다.
 * tol: 이 거리(mm) 안이면 붙는다
 */
export function snapPlan(t: SnapTargets, p: Point, tol: number): Point {
  let best: Point | null = null
  let bestD = tol
  for (const q of t.points) {
    const d = Math.hypot(q.x - p.x, q.y - p.y)
    if (d < bestD) {
      best = q
      bestD = d
    }
  }
  if (best) return { x: best.x, y: best.y }
  const near = (lines: Line[], v: number, along: number) => {
    let at: number | null = null
    let d = tol
    for (const l of lines) {
      if (along < l.from - tol || along > l.to + tol) continue
      const dd = Math.abs(l.at - v)
      if (dd < d) {
        at = l.at
        d = dd
      }
    }
    return at
  }
  return { x: near(t.vertical, p.x, p.y) ?? snap(p.x), y: near(t.horizontal, p.y, p.x) ?? snap(p.y) }
}

/** Shift: 시작점에서 가장 많이 달라진 방향(가로·세로·높이) 하나로만 똑바로 잰다 */
export function lockAxis(start: P3, p: P3): P3 {
  const dx = Math.abs(p.x - start.x)
  const dy = Math.abs(p.y - start.y)
  const dz = Math.abs(p.z - start.z)
  if (dx >= dy && dx >= dz) return { ...start, x: p.x }
  if (dy >= dz) return { ...start, y: p.y }
  return { ...start, z: p.z }
}

export const distance = (a: P3, b: P3) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)

/** 길이 글자: 235 cm */
export const fmtLength = (v: number) => `${fmtCm(v)} cm`

/** 가로·세로·높이로 나눈 길이 (두 방향 이상이 섞였을 때만) */
export function lengthParts(a: P3, b: P3) {
  const parts = [
    { name: '가로', v: Math.abs(b.x - a.x) },
    { name: '세로', v: Math.abs(b.y - a.y) },
    { name: '높이', v: Math.abs(b.z - a.z) },
  ].filter((p) => p.v >= 5)
  return parts.length >= 2 ? parts.map((p) => `${p.name} ${fmtCm(p.v)}`).join(' · ') : ''
}
