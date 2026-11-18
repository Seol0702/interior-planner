import { useMemo, useRef, useState } from 'react'
import type { Point, Project, Selection, Tool, WallItem } from '../types'
import type { Guide } from '../guides'
import type { Issue } from '../drc'
import type { SunPatch } from '../sun'
import type { Visible } from './Scene3D'
import { WALL_THICKNESS, bounds, findPiece, footprint, wallItemSpan, type WallPiece } from '../plan'
import { resolveItem } from '../library'
import { fmtM, toPyeong } from '../units'
import { distance, fmtLength, lengthParts, lockAxis, snapPlan, snapTargets, type MeasureState, type P3 } from '../measure'

type DragType = 'room' | 'furniture' | 'wallItem' | 'note'

type Props = {
  project: Project
  pieces: WallPiece[]
  selection: Selection
  guides: Guide[]
  issues: Issue[]
  patches: SunPatch[] // 햇빛이 드는 자리
  visible: Visible
  tool: Tool
  draft: Point[] | null // 그리고 있는 전선
  measure: MeasureState // 줄자로 잰 것들
  onMeasure: (p: P3) => void // 줄자 도구로 점을 찍었을 때
  multi: string[] // Ctrl로 함께 고른 가구들
  onSelect: (selection: Selection, additive?: boolean) => void // additive: Ctrl+클릭 (더 고르기·빼기)
  onPlanClick: (x: number, y: number) => void // 도구(전선·메모)를 든 채로 평면을 눌렀을 때
  onFinishWire: () => void
  onMove: (type: DragType, id: string, x: number, y: number) => void
  onDragEnd: () => void
}

const MARGIN = 800 // 평면도 둘레 여백 (mm)
const ROUND = ['roundTable', 'stool', 'lamp', 'plant', 'ceilingLight', 'pendant', 'beanbag', 'puck', 'fan', 'coatStand']

/** 위에서 내려다본 2D 평면도. 방·가구·문·창문·메모를 끌어서 옮길 수 있다 */
export default function Plan2D(props: Props) {
  const { project, pieces, selection, multi, guides, issues, patches, visible, tool, draft, measure } = props
  const { onSelect, onPlanClick, onFinishWire, onMove, onDragEnd, onMeasure } = props
  const { rooms, furniture, wallItems, wires, notes } = project
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ type: DragType; id: string; dx: number; dy: number } | null>(null)
  // 끄는 동안에는 화면 범위를 고정한다 (안 그러면 방을 옮길 때 화면이 같이 출렁임)
  const [frozen, setFrozen] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [cursor, setCursor] = useState<Point | null>(null) // 전선 미리보기용 마우스 위치
  const [aim, setAim] = useState<P3 | null>(null) // 줄자 끝이 지금 붙을 자리
  const targets = useMemo(() => (tool === 'measure' ? snapTargets(project, pieces) : null), [tool, project, pieces])

  const b = bounds(rooms)
  const view = frozen ?? { x: b.minX - MARGIN, y: b.minY - MARGIN, w: b.w + 2 * MARGIN, h: b.d + 2 * MARGIN }
  const fs = Math.max(view.w, view.h) / 42 // 글자 크기 (화면 범위에 비례)
  const picking = tool === 'select'
  const isSelected = (type: string, id: string) => (selection?.type === type && selection.id === id) || (type === 'furniture' && multi.includes(id))

  /** 마우스 위치 → 평면도 좌표(mm) */
  const toPlan = (e: React.PointerEvent | React.MouseEvent) => {
    const svg = svgRef.current!
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: p.x, y: p.y }
  }

  const start = (e: React.PointerEvent, type: DragType, id: string, originX: number, originY: number) => {
    // 전선·메모 도구를 들고 있을 때는 물건을 잡지 않고, 평면 클릭으로 넘긴다
    if (e.button !== 0 || !picking) return
    e.stopPropagation()
    if (type === 'furniture' && (e.ctrlKey || e.metaKey)) {
      onSelect({ type, id }, true) // Ctrl+클릭: 끌지 않고 고르기만
      return
    }
    onSelect({ type, id })
    const p = toPlan(e)
    drag.current = { type, id, dx: originX - p.x, dy: originY - p.y }
    svgRef.current!.setPointerCapture(e.pointerId)
    setFrozen(view)
  }

  /** 줄자: 마우스 자리를 벽·가구 모서리에 붙이고, Shift면 똑바로 */
  const measurePoint = (e: React.PointerEvent): P3 => {
    const p = toPlan(e)
    const s = targets ? snapPlan(targets, p, fs * 0.7) : p
    const q = { x: s.x, y: s.y, z: 0 }
    return e.shiftKey && measure.start ? lockAxis(measure.start, q) : q
  }

  const move = (e: React.PointerEvent) => {
    const p = toPlan(e)
    if (tool === 'wire') setCursor(p)
    if (tool === 'measure') setAim(measurePoint(e))
    const d = drag.current
    if (d) onMove(d.type, d.id, p.x + d.dx, p.y + d.dy)
  }

  const end = (e: React.PointerEvent) => {
    if (!drag.current) return
    drag.current = null
    svgRef.current!.releasePointerCapture(e.pointerId)
    setFrozen(null)
    onDragEnd()
  }

  const background = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (picking) onSelect(null)
    else if (tool === 'measure') onMeasure(measurePoint(e))
    else {
      const p = toPlan(e)
      onPlanClick(p.x, p.y)
    }
  }

  return (
    <svg
      ref={svgRef}
      className={`plan2d ${picking ? '' : 'tooling'}`}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      onPointerDown={background}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={() => setAim(null)}
      onContextMenu={(e) => e.preventDefault()} // 맥의 Ctrl+클릭이 메뉴를 띄우지 않게
      onDoubleClick={() => tool === 'wire' && onFinishWire()}
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
      {rooms.map((r) => (
        <rect
          key={r.id}
          className="grab"
          x={r.x}
          y={r.y}
          width={r.width}
          height={r.depth}
          fill={r.floor.color}
          fillOpacity={0.55}
          stroke={isSelected('room', r.id) ? '#2563eb' : 'none'}
          strokeWidth={fs * 0.18}
          onPointerDown={(e) => start(e, 'room', r.id, r.x, r.y)}
        />
      ))}

      {/* 햇빛이 드는 자리 */}
      {patches.map((p, i) => (
        <polygon key={i} points={p.polygon.map((pt) => `${pt.x},${pt.y}`).join(' ')} fill="#facc15" fillOpacity={0.5} stroke="#eab308" strokeWidth={fs * 0.06} pointerEvents="none" />
      ))}

      {/* 벽 */}
      {visible.walls &&
        pieces.map((p) => (
          <rect key={p.key} x={p.rect.x} y={p.rect.y} width={p.rect.w} height={p.rect.d} fill={p.interior ? '#52525b' : '#3f3f46'} pointerEvents="none" />
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
        const item = resolveItem(f)
        if (!item || !(item.layer === 'electric' ? visible.electric : visible.furniture)) return null
        const selected = isSelected('furniture', f.id)
        const fp = footprint(item, f.rotation)
        const labelSize = Math.min(fs * 0.8, (fp.w / item.name.length) * 0.95, fp.d * 0.5)
        const mark = item.depth / 2 - Math.min(60, item.depth * 0.15)
        return (
          <g key={f.id} className="grab" transform={`translate(${f.x} ${f.y}) rotate(${f.rotation})`} onPointerDown={(e) => start(e, 'furniture', f.id, f.x, f.y)}>
            <rect
              x={-item.width / 2}
              y={-item.depth / 2}
              width={item.width}
              height={item.depth}
              rx={ROUND.includes(item.shape) || (item.shape === 'rug' && item.width === item.depth) ? item.width / 2 : 20}
              fill={f.color ?? item.color}
              fillOpacity={item.mount === 'ceiling' ? 0.45 : 1}
              stroke={selected ? '#2563eb' : '#52525b'}
              strokeWidth={selected ? fs * 0.2 : fs * 0.08}
              strokeDasharray={item.mount === 'ceiling' ? `${fs * 0.3} ${fs * 0.2}` : undefined}
            />
            {/* 앞쪽 표시 */}
            {item.mount !== 'ceiling' && (
              <line x1={-item.width * 0.3} x2={item.width * 0.3} y1={mark} y2={mark} stroke={selected ? '#2563eb' : '#3f3f46'} strokeWidth={fs * 0.14} strokeLinecap="round" />
            )}
            {labelSize > fs * 0.3 && (
              <text transform={`rotate(${-f.rotation})`} fontSize={labelSize} textAnchor="middle" dominantBaseline="central">
                {item.name}
              </text>
            )}
          </g>
        )
      })}

      {/* 문·창문·콘센트 */}
      {wallItems.map((item) => {
        if (!(item.kind === 'outlet' ? visible.electric : visible.walls)) return null
        const room = rooms.find((r) => r.id === item.roomId)
        if (!room) return null
        return (
          <WallItemShape
            key={item.id}
            item={item}
            span={wallItemSpan(item, room)}
            pieces={pieces}
            fs={fs}
            selected={isSelected('wallItem', item.id)}
            onPointerDown={(e, x, y) => start(e, 'wallItem', item.id, x, y)}
          />
        )
      })}

      {/* 전선 */}
      {visible.electric &&
        wires.map((wire) => {
          const points = wire.points.map((p) => `${p.x},${p.y}`).join(' ')
          const selected = isSelected('wire', wire.id)
          return (
            <g
              key={wire.id}
              onPointerDown={(e) => {
                if (e.button !== 0 || !picking) return
                e.stopPropagation()
                onSelect({ type: 'wire', id: wire.id })
              }}
            >
              {/* 가는 선은 누르기 어려우니, 보이지 않는 굵은 선을 겹쳐서 누를 자리를 넓힌다 */}
              <polyline points={points} fill="none" stroke="transparent" strokeWidth={fs * 0.9} />
              <polyline points={points} fill="none" stroke={selected ? '#2563eb' : '#f59e0b'} strokeWidth={fs * (selected ? 0.28 : 0.2)} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          )
        })}
      {draft && (
        <g pointerEvents="none">
          <polyline
            points={[...draft, ...(cursor ? [cursor] : [])].map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={fs * 0.2}
            strokeDasharray={`${fs * 0.5} ${fs * 0.3}`}
          />
          {draft.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={fs * 0.22} fill="#f59e0b" />
          ))}
        </g>
      )}

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

      {/* 배치 검사에서 걸린 자리 */}
      {issues.map((issue) => (
        <g
          key={issue.id}
          className="issue"
          onPointerDown={(e) => {
            e.stopPropagation()
            onSelect(issue.target)
          }}
        >
          <title>{issue.message}</title>
          <circle cx={issue.x} cy={issue.y} r={fs * 0.55} fill={issue.level === 'error' ? '#dc2626' : issue.level === 'warn' ? '#d97706' : '#64748b'} stroke="#fff" strokeWidth={fs * 0.08} />
          <text x={issue.x} y={issue.y} fontSize={fs * 0.8} fontWeight="700" textAnchor="middle" dominantBaseline="central" style={{ fill: '#fff' }}>
            !
          </text>
        </g>
      ))}

      {/* 줄자 */}
      {tool === 'measure' && (
        <g pointerEvents="none">
          {measure.list.map((m) => (
            <Dimension key={m.id} a={m.a} b={m.b} fs={fs} />
          ))}
          {measure.start && aim && <Dimension a={measure.start} b={aim} fs={fs} live />}
          {measure.start && !aim && <circle cx={measure.start.x} cy={measure.start.y} r={fs * 0.22} fill={MEASURE} />}
          {aim && <circle cx={aim.x} cy={aim.y} r={fs * 0.3} fill="none" stroke={MEASURE} strokeWidth={fs * 0.08} />}
        </g>
      )}

      {/* 메모 */}
      {visible.notes &&
        notes.map((note) => {
          const selected = isSelected('note', note.id)
          const lines = wrap(note.text || '(내용 없음)', 16)
          const lh = fs * 1.05
          const width = Math.max(...lines.map((l) => l.length)) * fs * 0.82 + fs
          return (
            <g key={note.id} className="grab" onPointerDown={(e) => start(e, 'note', note.id, note.x, note.y)}>
              <circle cx={note.x} cy={note.y} r={fs * 0.38} fill="#7c3aed" stroke={selected ? '#2563eb' : '#fff'} strokeWidth={fs * (selected ? 0.16 : 0.08)} />
              {(selected || visible.expandNotes) && (
                <g pointerEvents="none">
                  <rect x={note.x + fs * 0.6} y={note.y - fs * 0.8} width={width} height={lines.length * lh + fs * 0.6} rx={fs * 0.25} fill="#fffbe6" stroke="#7c3aed" strokeWidth={fs * 0.05} />
                  {lines.map((line, i) => (
                    <text key={i} x={note.x + fs * 1.1} y={note.y + i * lh} fontSize={fs * 0.8} dominantBaseline="central">
                      {line}
                    </text>
                  ))}
                </g>
              )}
            </g>
          )
        })}
    </svg>
  )
}

const MEASURE = '#e11d48' // 줄자 색

/** 치수선: 두 점을 잇는 선 + 양 끝 눈금 + 가운데 길이 글자 */
function Dimension({ a, b, fs, live = false }: { a: P3; b: P3; fs: number; live?: boolean }) {
  const len = distance(a, b)
  const flat = Math.hypot(b.x - a.x, b.y - a.y) // 위에서 본 길이 (높이만 잰 경우 0)
  const ux = flat > 1 ? (b.x - a.x) / flat : 1
  const uy = flat > 1 ? (b.y - a.y) / flat : 0
  const t = fs * 0.35 // 눈금 길이의 절반
  const tick = (p: P3) => <line x1={p.x - uy * t} y1={p.y + ux * t} x2={p.x + uy * t} y2={p.y - ux * t} stroke={MEASURE} strokeWidth={fs * 0.1} />
  const text = fmtLength(len)
  const sub = lengthParts(a, b)
  const size = fs * 0.75
  const w = Math.max(text.length * size * 0.62, sub.length * size * 0.5) + fs * 0.8
  const h = sub ? size * 2.5 : size * 1.5
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  return (
    <g opacity={live ? 0.85 : 1}>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={MEASURE} strokeWidth={fs * 0.1} strokeDasharray={live ? `${fs * 0.4} ${fs * 0.25}` : undefined} />
      {tick(a)}
      {tick(b)}
      <circle cx={a.x} cy={a.y} r={fs * 0.16} fill={MEASURE} />
      <circle cx={b.x} cy={b.y} r={fs * 0.16} fill={MEASURE} />
      {len >= 5 && (
        <g transform={`translate(${mx} ${my})`}>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={size * 0.4} fill="#fff" stroke={MEASURE} strokeWidth={fs * 0.06} />
          <text y={sub ? -size * 0.45 : 0} fontSize={size} fontWeight="700" textAnchor="middle" dominantBaseline="central" style={{ fill: MEASURE }}>
            {text}
          </text>
          {sub && (
            <text y={size * 0.65} fontSize={size * 0.7} textAnchor="middle" dominantBaseline="central" style={{ fill: '#52525b' }}>
              {sub}
            </text>
          )}
        </g>
      )}
    </g>
  )
}

/** 긴 글을 한 줄에 max 글자씩 나눈다 */
function wrap(text: string, max: number) {
  const lines: string[] = []
  for (const row of text.split('\n')) {
    if (row.length === 0) lines.push('')
    for (let i = 0; i < row.length; i += max) lines.push(row.slice(i, i + max))
  }
  return lines.slice(0, 12)
}

type ShapeProps = {
  item: WallItem
  span: ReturnType<typeof wallItemSpan>
  pieces: WallPiece[]
  fs: number
  selected: boolean
  onPointerDown: (e: React.PointerEvent, x: number, y: number) => void
}

/** 문(열리는 호 포함)·창문·콘센트의 평면 기호 */
function WallItemShape({ item, span, pieces, fs, selected, onPointerDown }: ShapeProps) {
  const piece = findPiece(pieces, span)
  // 벽이 차지하는 폭(벽을 가로지르는 방향)의 시작과 끝
  const lo = piece ? (span.horizontal ? piece.rect.y : piece.rect.x) : span.line - WALL_THICKNESS / 2
  const hi = piece ? lo + (span.horizontal ? piece.rect.d : piece.rect.w) : span.line + WALL_THICKNESS / 2
  // (벽 방향 좌표, 벽을 가로지르는 좌표) → 화면 좌표
  const pt = (along: number, across: number): [number, number] => (span.horizontal ? [along, across] : [across, along])
  const rect = (a: number, b: number, c: number, d: number) => {
    const [x1, y1] = pt(a, c)
    const [x2, y2] = pt(b, d)
    return { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) }
  }
  const color = selected ? '#2563eb' : '#3f3f46'
  const down = (e: React.PointerEvent) => onPointerDown(e, span.cx, span.cy)
  const normal = span.horizontal ? span.ny : span.nx // 바깥쪽이 +인지 -인지

  if (item.kind === 'outlet') {
    const [cx, cy] = pt((span.a + span.b) / 2, span.line - normal * 70)
    return (
      <g className="grab" onPointerDown={down}>
        <circle cx={cx} cy={cy} r={fs * 0.42} fill="#f59e0b" stroke={selected ? '#2563eb' : '#7c2d12'} strokeWidth={fs * (selected ? 0.16 : 0.07)} />
        <text x={cx} y={cy} fontSize={fs * 0.55} fontWeight="700" textAnchor="middle" dominantBaseline="central">
          C
        </text>
      </g>
    )
  }

  if (item.kind === 'window') {
    const mid = (lo + hi) / 2
    const [x1, y1] = pt(span.a, mid)
    const [x2, y2] = pt(span.b, mid)
    return (
      <g className="grab" onPointerDown={down}>
        <rect {...rect(span.a, span.b, lo, hi)} fill="#eaf4fb" stroke={color} strokeWidth={fs * (selected ? 0.14 : 0.07)} />
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#38bdf8" strokeWidth={fs * 0.14} />
      </g>
    )
  }

  // 문: 벽을 끊고, 문짝과 열리는 호를 그린다
  const dir = item.outward ? normal : -normal // 열리는 쪽
  const hinge = item.flip ? span.b : span.a
  const other = item.flip ? span.a : span.b
  const [hx, hy] = pt(hinge, span.line)
  const [lx, ly] = pt(hinge, span.line + dir * item.width) // 활짝 열린 문짝의 끝
  const [ox, oy] = pt(other, span.line)
  // 문짝 끝 → 반대편 문틀까지 호를 그릴 때 도는 방향
  const cross = (lx - hx) * (oy - hy) - (ly - hy) * (ox - hx)
  return (
    <g className="grab" onPointerDown={down}>
      <rect {...rect(span.a, span.b, lo, hi)} fill="#fafafa" stroke={color} strokeWidth={fs * (selected ? 0.12 : 0.05)} />
      <path d={`M ${lx} ${ly} A ${item.width} ${item.width} 0 0 ${cross > 0 ? 1 : 0} ${ox} ${oy}`} fill="none" stroke={color} strokeWidth={fs * 0.06} strokeDasharray={`${fs * 0.3} ${fs * 0.2}`} />
      <line x1={hx} y1={hy} x2={lx} y2={ly} stroke={color} strokeWidth={fs * 0.14} />
      {/* 누를 자리를 넓히는 투명 부채꼴 영역 */}
      <rect {...rect(span.a, span.b, span.line, span.line + dir * item.width)} fill="transparent" />
    </g>
  )
}
