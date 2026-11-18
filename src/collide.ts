// 가구끼리 부딪힘: 끌거나 방향키로 옮길 때 다른 가구를 통과하지 못하게 한다.
// 러그·천장등·멀티탭처럼 겹쳐도 되는 것, 높이가 겹치지 않는 것(책상 위 컴퓨터, 서랍장 위 벽걸이 거울)은 막지 않는다.
import type { FurnitureInstance, FurnitureLibraryItem, Project } from './types'
import { bottomOf, isPassable, resolveItem } from './library'
import { footprint, type Rect } from './plan'

/** 이만큼(mm)까지 겹치는 건 "닿은 것"으로 보고 넘어간다 (높이 쪽) */
export const TOUCH = 30

/** 부딪히는 가구 하나: 바닥 자리 + 높이 범위 */
export type Solid = { id: string; rect: Rect; lo: number; hi: number }

/** 가구가 바닥에서 차지하는 자리 */
export function rectOf(f: FurnitureInstance, item: FurnitureLibraryItem): Rect {
  const { w, d } = footprint(item, f.rotation)
  return { x: f.x - w / 2, y: f.y - d / 2, w, d }
}

/** 부딪힐 수 있는 가구들 (exclude에 든 것은 빼고) */
export function solidsOf(project: Project, exclude: string[]): Solid[] {
  return project.furniture.flatMap((f) => {
    const item = resolveItem(f)
    if (!item || isPassable(item) || exclude.includes(f.id)) return []
    const lo = bottomOf(item, project.wallHeight)
    return [{ id: f.id, rect: rectOf(f, item), lo, hi: lo + item.height }]
  })
}

/** 높이가 실제로 겹치나 (살짝 닿는 정도는 빼고) */
export const heightsOverlap = (aLo: number, aHi: number, bLo: number, bHi: number) => Math.min(aHi, bHi) - Math.max(aLo, bLo) > TOUCH

/**
 * box를 (dx, dy)만큼 옮기되, 다른 가구에 막히면 딱 닿는 자리에서 멈춘다. 가로 먼저, 그다음 세로.
 * 처음부터 겹쳐 있던 가구는 무시한다 (겹친 채 놓인 가구도 빠져나올 수 있게).
 */
export function limitMove(box: Rect, lo: number, hi: number, dx: number, dy: number, solids: Solid[]) {
  const b = { ...box }
  const blockers = solids.filter((o) => heightsOverlap(lo, hi, o.lo, o.hi))
  const over = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0) > 1
  // 가로로 움직이기
  for (const { rect: o } of blockers) {
    if (!over(b.y, b.y + b.d, o.y, o.y + o.d) || over(b.x, b.x + b.w, o.x, o.x + o.w)) continue
    if (dx > 0 && o.x >= b.x + b.w - 1) dx = Math.max(0, Math.min(dx, o.x - (b.x + b.w)))
    if (dx < 0 && o.x + o.w <= b.x + 1) dx = Math.min(0, Math.max(dx, o.x + o.w - b.x))
  }
  b.x += dx
  // 세로로 움직이기
  for (const { rect: o } of blockers) {
    if (!over(b.x, b.x + b.w, o.x, o.x + o.w) || over(b.y, b.y + b.d, o.y, o.y + o.d)) continue
    if (dy > 0 && o.y >= b.y + b.d - 1) dy = Math.max(0, Math.min(dy, o.y - (b.y + b.d)))
    if (dy < 0 && o.y + o.d <= b.y + 1) dy = Math.min(0, Math.max(dy, o.y + o.d - b.y))
  }
  return { dx, dy }
}

/**
 * 책상 위에 두는 물건(컴퓨터·프린터 등)이 올라앉을 높이:
 * 물건 가운데 바로 밑에 있는 가구 중 가장 높은 윗면. 밑에 아무것도 없으면 바닥(0).
 */
export function surfaceUnder(project: Project, self: FurnitureInstance): number {
  let top = 0
  for (const f of project.furniture) {
    if (f.id === self.id) continue
    const item = resolveItem(f)
    if (!item || isPassable(item) || item.onTop || item.mount === 'ceiling') continue
    const r = rectOf(f, item)
    if (self.x < r.x || self.x > r.x + r.w || self.y < r.y || self.y > r.y + r.d) continue
    top = Math.max(top, bottomOf(item, project.wallHeight) + item.height)
  }
  return top
}
