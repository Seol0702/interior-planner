// 스마트 가이드: 파워포인트처럼 가구를 끌 때 다른 가구와
// 줄이 맞거나(왼쪽·가운데·오른쪽) 간격이 같아지는 자리에 "착" 붙여 주고 안내선을 띄운다.
import type { Rect } from './plan'

/** 중심 + 크기로 나타낸 가구 자리 */
export type Box = { x: number; y: number; w: number; d: number }

export type Guide =
  // 정렬선. axis가 'x'면 x = at 위치의 세로선 (from~to는 선의 y 범위)
  | { kind: 'line'; axis: 'x' | 'y'; at: number; from: number; to: number }
  // 간격 표시. axis가 'x'면 x = from~to 사이의 가로 토막 (at은 그 토막의 y 위치)
  | { kind: 'gap'; axis: 'x' | 'y'; at: number; from: number; to: number }

type Span = { lo: number; mid: number; hi: number; plo: number; phi: number }

/** 한 축 방향으로 본 범위 (lo~hi) + 반대 축 범위 (plo~phi) */
const along = (b: Box, axis: 'x' | 'y'): Span =>
  axis === 'x'
    ? { lo: b.x - b.w / 2, mid: b.x, hi: b.x + b.w / 2, plo: b.y - b.d / 2, phi: b.y + b.d / 2 }
    : { lo: b.y - b.d / 2, mid: b.y, hi: b.y + b.d / 2, plo: b.x - b.w / 2, phi: b.x + b.w / 2 }

type Candidate = { delta: number; guides: Guide[] }

function snapAxis(axis: 'x' | 'y', moving: Box, others: Box[], rooms: Rect[], threshold: number): Candidate | null {
  const m = along(moving, axis)
  const size = m.hi - m.lo
  const pmid = (m.plo + m.phi) / 2
  const cands: Candidate[] = []
  const add = (delta: number, guides: Guide[]) => {
    if (Math.abs(delta) <= threshold) cands.push({ delta, guides })
  }

  // 1) 다른 가구와 줄 맞추기 (왼쪽·가운데·오른쪽 끼리)
  const spans = others.map((o) => along(o, axis))
  for (const t of spans) {
    for (const target of [t.lo, t.mid, t.hi]) {
      for (const mine of [m.lo, m.mid, m.hi]) {
        add(target - mine, [{ kind: 'line', axis, at: target, from: Math.min(m.plo, t.plo), to: Math.max(m.phi, t.phi) }])
      }
    }
  }

  // 2) 방의 정가운데에 맞추기
  for (const r of rooms) {
    const rb = along({ x: r.x + r.w / 2, y: r.y + r.d / 2, w: r.w, d: r.d }, axis)
    if (m.mid < rb.lo || m.mid > rb.hi || pmid < rb.plo || pmid > rb.phi) continue
    add(rb.mid - m.mid, [{ kind: 'line', axis, at: rb.mid, from: rb.plo, to: rb.phi }])
  }

  // 3) 같은 간격 맞추기: 같은 줄에 있는 두 가구(A, B) 사이 간격을 기준으로
  const row = spans.filter((t) => t.phi > m.plo && t.plo < m.phi).sort((a, b) => a.mid - b.mid)
  for (let i = 0; i < row.length - 1; i++) {
    const a = row[i]
    const b = row[i + 1]
    const gap = b.lo - a.hi
    if (gap <= 0) continue
    // 간격 표시는 세 가구가 서로 겹치는 높이의 가운데에 그린다
    const at = (Math.max(a.plo, b.plo, m.plo) + Math.min(a.phi, b.phi, m.phi)) / 2
    const gapGuide = (from: number, to: number): Guide => ({ kind: 'gap', axis, at, from, to })
    // A와 B 사이 한가운데
    if (gap > size) {
      const side = (gap - size) / 2
      add((a.hi + b.lo) / 2 - m.mid, [gapGuide(a.hi, a.hi + side), gapGuide(b.lo - side, b.lo)])
    }
    // B 다음에 같은 간격으로
    add(b.hi + gap - m.lo, [gapGuide(a.hi, b.lo), gapGuide(b.hi, b.hi + gap)])
    // A 앞에 같은 간격으로
    add(a.lo - gap - m.hi, [gapGuide(a.lo - gap, a.lo), gapGuide(a.hi, b.lo)])
  }

  if (cands.length === 0) return null
  const best = cands.reduce((p, c) => (Math.abs(c.delta) < Math.abs(p.delta) ? c : p))
  // 같은 자리로 붙는 안내선은 전부 함께 보여 준다
  const guides: Guide[] = []
  for (const g of cands.filter((c) => Math.abs(c.delta - best.delta) < 1).flatMap((c) => c.guides)) {
    // 같은 위치의 정렬선은 하나로 합친다 (길이만 늘림)
    const same = guides.find((o) => o.kind === 'line' && g.kind === 'line' && Math.abs(o.at - g.at) < 1)
    if (same) {
      same.from = Math.min(same.from, g.from)
      same.to = Math.max(same.to, g.to)
    } else guides.push({ ...g })
  }
  return { delta: best.delta, guides }
}

/** 끌고 있는 가구(moving)를 가까운 정렬 자리에 붙인다. 붙지 않은 축은 null */
export function smartSnap(moving: Box, others: Box[], rooms: Rect[], threshold = 60) {
  const sx = snapAxis('x', moving, others, rooms, threshold)
  const sy = snapAxis('y', moving, others, rooms, threshold)
  return {
    x: sx ? moving.x + sx.delta : null,
    y: sy ? moving.y + sy.delta : null,
    guides: [...(sx?.guides ?? []), ...(sy?.guides ?? [])],
  }
}
