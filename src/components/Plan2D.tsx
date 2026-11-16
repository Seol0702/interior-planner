import { useMemo, useRef, useState } from 'react'
import type { FurnitureInstance, RoomShape, Selection } from '../types'
import type { Guide } from '../guides'
import { bounds, footprint, wallPieces } from '../plan'
import { findLibraryItem } from '../library'
import { fmtM, toPyeong } from '../units'

type Props = {
  rooms: RoomShape[]
  furniture: FurnitureInstance[]
  selection: Selection
  guides: Guide[]
  onSelect: (selection: Selection) => void
  onMoveFurniture: (id: string, x: number, y: number) => void
  onMoveRoom: (id: string, x: number, y: number) => void
  onDragEnd: () => void
}

const MARGIN = 800 // 평면도 둘레 여백 (mm)

/** 위에서 내려다본 2D 평면도. 방과 가구를 끌어서 옮길 수 있다 */
export default function Plan2D(props: Props) {
  const { rooms, furniture, selection, guides, onSelect, onMoveFurniture, onMoveRoom, onDragEnd } = props
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ type: 'room' | 'furniture'; id: string; dx: number; dy: number } | null>(null)
  // 끄는 동안에는 화면 범위를 고정한다 (안 그러면 방을 옮길 때 화면이 같이 출렁임)
  const [frozen, setFrozen] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  const b = bounds(rooms)
  const view = frozen ?? { x: b.minX - MARGIN, y: b.minY - MARGIN, w: b.w + 2 * MARGIN, h: b.d + 2 * MARGIN }
  const fs = Math.max(view.w, view.h) / 42 // 글자 크기 (화면 범위에 비례)
  const pieces = useMemo(() => wallPieces(rooms), [rooms])

  /** 마우스 위치 → 평면도 좌표(mm) */
  const toPlan = (e: React.PointerEvent) => {
    const svg = svgRef.current!
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: p.x, y: p.y }
  }

  const start = (e: React.PointerEvent, type: 'room' | 'furniture', id: string, originX: number, originY: number) => {
    if (e.button !== 0) return
    e.stopPropagation()
    onSelect({ type, id })
    const p = toPlan(e)
    drag.current = { type, id, dx: originX - p.x, dy: originY - p.y }
    svgRef.current!.setPointerCapture(e.pointerId)
    setFrozen(view)
  }

  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = toPlan(e)
    if (d.type === 'room') onMoveRoom(d.id, p.x + d.dx, p.y + d.dy)
    else onMoveFurniture(d.id, p.x + d.dx, p.y + d.dy)
  }

  const end = (e: React.PointerEvent) => {
    if (!drag.current) return
    drag.current = null
    svgRef.current!.releasePointerCapture(e.pointerId)
    setFrozen(null)
    onDragEnd()
  }

  return (
    <svg
      ref={svgRef}
      className="plan2d"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      onPointerDown={() => onSelect(null)}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <defs>
        {/* 모눈: 가는 선 10cm, 굵은 선 1m */}
        <pattern id="grid-small" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e4e4e7" strokeWidth="4" />
        </pattern>
        <pattern id="grid-large" width="1000" height="1000" patternUnits="userSpaceOnUse">
          <rect width="1000" height="1000" fill="url(#grid-small)" />
          <path d="M 1000 0 L 0 0 0 1000" fill="none" stroke="#d4d4d8" strokeWidth="10" />
        </pattern>
      </defs>
      <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="#fafafa" />
      <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="url(#grid-large)" />

      {/* 방 바닥 */}
      {rooms.map((r) => {
        const selected = selection?.type === 'room' && selection.id === r.id
        return (
          <rect
            key={r.id}
            className="room"
            x={r.x}
            y={r.y}
            width={r.width}
            height={r.depth}
            fill={r.floor.color}
            fillOpacity={0.55}
            stroke={selected ? '#2563eb' : 'none'}
            strokeWidth={fs * 0.18}
            onPointerDown={(e) => start(e, 'room', r.id, r.x, r.y)}
          />
        )
      })}

      {/* 벽 */}
      {pieces.map((p) => (
        <rect key={p.key} x={p.rect.x} y={p.rect.y} width={p.rect.w} height={p.rect.d} fill="#3f3f46" pointerEvents="none" />
      ))}

      {/* 방 이름·크기 */}
      {rooms.map((r) => (
        <text key={r.id} className="room-label" x={r.x + fs * 0.6} y={r.y + fs * 1.5} fontSize={fs}>
          <tspan fontWeight="600">{r.name}</tspan>
          <tspan x={r.x + fs * 0.6} dy={fs * 1.25} fontSize={fs * 0.8} fill="#52525b">
            {fmtM(r.width)} × {fmtM(r.depth)} m · {toPyeong((r.width * r.depth) / 1e6).toFixed(1)}평
          </tspan>
        </text>
      ))}

      {/* 가구 */}
      {furniture.map((f) => {
        const item = findLibraryItem(f.libraryId)
        if (!item) return null
        const selected = selection?.type === 'furniture' && selection.id === f.id
        const fp = footprint(item, f.rotation)
        const labelSize = Math.min(fs * 0.8, (fp.w / item.name.length) * 0.95, fp.d * 0.5)
        return (
          <g
            key={f.id}
            className="furniture"
            transform={`translate(${f.x} ${f.y}) rotate(${f.rotation})`}
            onPointerDown={(e) => start(e, 'furniture', f.id, f.x, f.y)}
          >
            <rect
              x={-item.width / 2}
              y={-item.depth / 2}
              width={item.width}
              height={item.depth}
              rx={item.shape === 'roundTable' || item.shape === 'stool' || item.shape === 'lamp' || item.shape === 'plant' ? item.width / 2 : 20}
              fill={f.color ?? item.color}
              stroke={selected ? '#2563eb' : '#52525b'}
              strokeWidth={selected ? fs * 0.2 : fs * 0.08}
            />
            {/* 앞쪽 표시 */}
            <line
              x1={-item.width * 0.3}
              x2={item.width * 0.3}
              y1={item.depth / 2 - Math.min(60, item.depth * 0.15)}
              y2={item.depth / 2 - Math.min(60, item.depth * 0.15)}
              stroke={selected ? '#2563eb' : '#3f3f46'}
              strokeWidth={fs * 0.14}
              strokeLinecap="round"
            />
            {labelSize > fs * 0.3 && (
              <text className="furniture-label" transform={`rotate(${-f.rotation})`} fontSize={labelSize} textAnchor="middle" dominantBaseline="central">
                {item.name}
              </text>
            )}
          </g>
        )
      })}

      {/* 스마트 가이드 */}
      {guides.map((g, i) => {
        const vertical = (g.kind === 'line') === (g.axis === 'x')
        const coords = vertical ? { x1: g.at, x2: g.at, y1: g.from, y2: g.to } : { x1: g.from, x2: g.to, y1: g.at, y2: g.at }
        return (
          <line
            key={i}
            {...coords}
            stroke="#e11d48"
            strokeWidth={g.kind === 'gap' ? fs * 0.22 : fs * 0.1}
            strokeDasharray={g.kind === 'line' ? `${fs * 0.5} ${fs * 0.35}` : undefined}
            pointerEvents="none"
          />
        )
      })}
    </svg>
  )
}
