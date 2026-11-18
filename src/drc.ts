// 배치 규칙 검사 (KiCad의 DRC를 인테리어에 응용)
// 프로젝트를 훑어보고 "문제가 될 만한 배치"를 목록으로 돌려준다.
import type { FurnitureInstance, FurnitureLibraryItem, Project, Selection, WallItem } from './types'
import { bottomOf, isPassable, resolveItem } from './library'
import { findPiece, footprint, wallItemSpan, type Rect, type Span, type WallPiece } from './plan'

export type Issue = {
  id: string
  level: 'error' | 'warn' | 'info' // 오류 / 주의 / 참고
  message: string
  x: number // 표시할 위치
  y: number
  target: Selection // 누르면 선택될 것
}

const PASSAGE = 600 // 사람이 지나다니기 편한 최소 폭 (mm)

// 한글 조사 고르기: 받침이 있으면 "과/이", 없으면 "와/가" (예: 책상과, 소파와)
const hasBatchim = (word: string) => {
  const code = word.charCodeAt(word.length - 1)
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0
}
const wa = (word: string) => word + (hasBatchim(word) ? '과' : '와')
const ga = (word: string) => word + (hasBatchim(word) ? '이' : '가')

type Placed = { f: FurnitureInstance; item: FurnitureLibraryItem; rect: Rect }

/** 두 직사각형이 겹치는 크기 (안 겹치면 0 이하) */
const overlap = (a: Rect, b: Rect) => ({
  w: Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
  d: Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y),
})
const touches = (a: Rect, b: Rect) => {
  const o = overlap(a, b)
  return o.w > 10 && o.d > 10
}

/** 벽에 붙은 물건 앞쪽(방 안쪽 또는 바깥쪽)으로 depth만큼의 자리 */
function zoneInFront(span: Span, depth: number, outward = false, from = span.a, to = span.b): Rect {
  const dir = outward ? 1 : -1 // 방 안쪽은 바깥 방향의 반대
  if (span.horizontal) {
    const y = span.ny * dir > 0 ? span.line : span.line - depth
    return { x: from, y, w: to - from, d: depth }
  }
  const x = span.nx * dir > 0 ? span.line : span.line - depth
  return { x, y: from, w: depth, d: to - from }
}

/** 선분이 직사각형을 지나가는가 */
function segmentHitsRect(x1: number, y1: number, x2: number, y2: number, r: Rect) {
  // 선분을 t = 0~1로 보고, 직사각형 안에 있는 t 구간이 남는지 확인
  let t0 = 0
  let t1 = 1
  const dx = x2 - x1
  const dy = y2 - y1
  const tests: [number, number][] = [[-dx, x1 - r.x], [dx, r.x + r.w - x1], [-dy, y1 - r.y], [dy, r.y + r.d - y1]]
  for (const [p, q] of tests) {
    if (p === 0) {
      if (q < 0) return false
    } else {
      const t = q / p
      if (p < 0) t0 = Math.max(t0, t)
      else t1 = Math.min(t1, t)
      if (t0 > t1) return false
    }
  }
  return true
}

export function runChecks(project: Project, pieces: WallPiece[]): Issue[] {
  const issues: Issue[] = []
  const placed: Placed[] = []
  for (const f of project.furniture) {
    const item = resolveItem(f)
    if (!item) continue
    const { w, d } = footprint(item, f.rotation)
    placed.push({ f, item, rect: { x: f.x - w / 2, y: f.y - d / 2, w, d } })
  }
  const solid = placed.filter((p) => !isPassable(p.item)) // 러그·천장등·멀티탭은 겹쳐도 된다
  const select = (f: FurnitureInstance): Selection => ({ type: 'furniture', id: f.id })

  // 1) 가구끼리 겹침
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      const a = solid[i]
      const b = solid[j]
      if (!touches(a.rect, b.rect)) continue
      // 높이가 겹치지 않으면 괜찮다 (책상 위 컴퓨터, 벽걸이 거울 밑 서랍장 등)
      const [a0, b0] = [bottomOf(a.item, project.wallHeight), bottomOf(b.item, project.wallHeight)]
      if (a0 >= b0 + b.item.height - 1 || b0 >= a0 + a.item.height - 1) continue
      issues.push({
        id: `overlap:${a.f.id}:${b.f.id}`,
        level: 'error',
        message: `${wa(a.item.name)} ${ga(b.item.name)} 겹쳐요`,
        x: (Math.max(a.rect.x, b.rect.x) + Math.min(a.rect.x + a.rect.w, b.rect.x + b.rect.w)) / 2,
        y: (Math.max(a.rect.y, b.rect.y) + Math.min(a.rect.y + a.rect.d, b.rect.y + b.rect.d)) / 2,
        target: select(b.f),
      })
    }
  }

  // 2) 좁은 틈: 덩치 큰 가구 사이가 어중간하게 떨어져 통로로 쓰기 좁은 경우
  const small = ['chair', 'officeChair', 'stool', 'lamp', 'plant', 'beanbag', 'fan', 'tower', 'mirror', 'coatStand', 'toilet']
  const bulky = solid.filter((p) => !small.includes(p.item.shape))
  for (let i = 0; i < bulky.length; i++) {
    for (let j = i + 1; j < bulky.length; j++) {
      const a = bulky[i].rect
      const b = bulky[j].rect
      const o = overlap(a, b)
      // 한쪽 방향으로는 나란히 겹치고(200mm 이상), 다른 방향으로는 떨어져 있을 때 그 간격
      const gap = o.d > 200 && o.w < 0 ? -o.w : o.w > 200 && o.d < 0 ? -o.d : 0
      if (gap > 100 && gap < PASSAGE) {
        issues.push({
          id: `gap:${bulky[i].f.id}:${bulky[j].f.id}`,
          level: 'info',
          message: `${wa(bulky[i].item.name)} ${bulky[j].item.name} 사이가 ${Math.round(gap / 10)}cm예요 (통로는 60cm 이상 권장)`,
          x: (Math.max(a.x, b.x) + Math.min(a.x + a.w, b.x + b.w)) / 2,
          y: (Math.max(a.y, b.y) + Math.min(a.y + a.d, b.y + b.d)) / 2,
          target: select(bulky[j].f),
        })
      }
    }
  }

  // 3) 벽에 붙은 것들
  const pick = (item: WallItem): Selection => ({ type: 'wallItem', id: item.id })
  for (const item of project.wallItems) {
    const room = project.rooms.find((r) => r.id === item.roomId)
    if (!room) continue
    const span = wallItemSpan(item, room)
    const name = item.kind === 'door' ? '문' : item.kind === 'window' ? '창문' : '콘센트'

    if (!findPiece(pieces, span)) {
      issues.push({ id: `nowall:${item.id}`, level: 'warn', message: `${ga(name)} 벽이 없는 자리에 있어요`, x: span.cx, y: span.cy, target: pick(item) })
      continue
    }

    if (item.kind === 'door') {
      // 문이 열리며 쓸고 지나가는 자리: 경첩을 중심으로 한 부채꼴 (문짝 폭 = 반지름). 양문은 양쪽 경첩에서 반씩
      const leaf = item.double ? item.width / 2 : item.width
      const zone = zoneInFront(span, leaf, item.outward)
      const hinges = item.double ? [span.a, span.b] : [item.flip ? span.b : span.a]
      for (const p of solid) {
        if (!touches(zone, p.rect)) continue
        // 경첩에서 가구까지의 가장 가까운 거리가 문짝 폭보다 짧으면 부딪힌다
        const hit = hinges.some((hinge) => {
          const hx = span.horizontal ? hinge : span.line
          const hy = span.horizontal ? span.line : hinge
          const nx = Math.max(p.rect.x, Math.min(hx, p.rect.x + p.rect.w))
          const ny = Math.max(p.rect.y, Math.min(hy, p.rect.y + p.rect.d))
          return Math.hypot(nx - hx, ny - hy) < leaf - 10
        })
        if (!hit) continue
        issues.push({ id: `door:${item.id}:${p.f.id}`, level: 'error', message: `문이 열릴 때 ${p.item.name}에 부딪혀요`, x: p.f.x, y: p.f.y, target: select(p.f) })
      }
      for (const wire of project.wires) {
        const hit = wire.points.some((pt, i) => i > 0 && segmentHitsRect(wire.points[i - 1].x, wire.points[i - 1].y, pt.x, pt.y, zone))
        if (hit) issues.push({ id: `wire:${item.id}:${wire.id}`, level: 'warn', message: '전선이 문 앞을 지나가요 (걸려 넘어질 수 있어요)', x: span.cx, y: span.cy, target: { type: 'wire', id: wire.id } })
      }
    }

    if (item.kind === 'window') {
      const zone = zoneInFront(span, 250)
      for (const p of solid) {
        if (p.item.height > item.sill + 100 && touches(zone, p.rect)) {
          issues.push({ id: `window:${item.id}:${p.f.id}`, level: 'warn', message: `${ga(p.item.name)} 창문을 가려요`, x: p.f.x, y: p.f.y, target: select(p.f) })
        }
      }
    }

    if (item.kind === 'outlet') {
      const center = span.horizontal ? span.cx : span.cy
      const zone = zoneInFront(span, 100, false, center - 60, center + 60)
      for (const p of solid) {
        if (p.item.height > item.sill && touches(zone, p.rect)) {
          issues.push({ id: `outlet:${item.id}:${p.f.id}`, level: 'warn', message: `${ga(p.item.name)} 콘센트를 가려요`, x: span.cx, y: span.cy, target: select(p.f) })
        }
      }
    }
  }

  // 4) 문이 없는 방 (벽으로 막힌 방이 2개 이상일 때만 검사)
  if (project.rooms.length > 1) {
    const doorSpans = project.wallItems
      .filter((i) => i.kind === 'door')
      .flatMap((i) => {
        const room = project.rooms.find((r) => r.id === i.roomId)
        return room ? [wallItemSpan(i, room)] : []
      })
    for (const room of project.rooms) {
      if (room.open) continue
      const x2 = room.x + room.width
      const y2 = room.y + room.depth
      const onEdge = (s: Span) =>
        s.horizontal
          ? (Math.abs(s.line - room.y) < 1 || Math.abs(s.line - y2) < 1) && s.a < x2 && s.b > room.x
          : (Math.abs(s.line - room.x) < 1 || Math.abs(s.line - x2) < 1) && s.a < y2 && s.b > room.y
      if (!doorSpans.some(onEdge)) {
        issues.push({ id: `nodoor:${room.id}`, level: 'info', message: `${room.name}에 문이 없어요`, x: room.x + room.width / 2, y: room.y + room.depth / 2, target: { type: 'room', id: room.id } })
      }
    }
  }

  const order = { error: 0, warn: 1, info: 2 }
  return issues.sort((a, b) => order[a.level] - order[b.level])
}
