import { useRef } from 'react'
import type { Lighting, RoomShape, Season } from '../types'
import { daylight, formatTime, type SunPatch } from '../sun'

type Props = {
  lighting: Lighting
  north: number
  rooms: RoomShape[]
  patches: SunPatch[]
  hasWindows: boolean
  onChange: (patch: Partial<Lighting>) => void
  onNorth: (north: number) => void
}

const SEASONS: { id: Season; name: string }[] = [
  { id: 'summer', name: '여름 (하지)' },
  { id: 'equinox', name: '봄·가을' },
  { id: 'winter', name: '겨울 (동지)' },
]
const NORTHS = [
  { value: 0, name: '위쪽이 북' },
  { value: 90, name: '위쪽이 동' },
  { value: 180, name: '위쪽이 남' },
  { value: 270, name: '위쪽이 서' },
]

// 반원 그림의 크기
const CX = 120
const CY = 112
const R = 96

/** 햇빛·조명 설정. 반원 위의 해를 끌어서 시각을 바꾼다 */
export default function SunPanel({ lighting, north, rooms, patches, hasWindows, onChange, onNorth }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const { sunrise, sunset } = daylight(lighting.season)
  // 해 뜰 때 0 → 해 질 때 1
  const fraction = Math.min(1, Math.max(0, (lighting.time - sunrise) / (sunset - sunrise)))
  const sunX = CX - R * Math.cos(fraction * Math.PI)
  const sunY = CY - R * Math.sin(fraction * Math.PI)

  /** 마우스 위치 → 반원 위의 각도 → 시각 */
  const pick = (e: React.PointerEvent) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse())
    const angle = Math.atan2(Math.max(0, CY - p.y), p.x - CX) // 0(오른쪽) ~ π(왼쪽)
    const f = 1 - angle / Math.PI
    onChange({ time: Math.round((sunrise + f * (sunset - sunrise)) * 12) / 12, night: false }) // 5분 단위
  }

  // 방별로 햇빛이 드는 넓이 합계
  const lit = rooms
    .map((room) => {
      const area = patches.filter((p) => p.roomId === room.id).reduce((sum, p) => sum + p.area, 0)
      return { room, area, percent: (area / ((room.width * room.depth) / 1e6)) * 100 }
    })
    .filter((r) => r.area > 0.005)

  return (
    <section className="panel">
      <h2>햇빛 · 조명</h2>
      <label className="check">
        <input type="checkbox" checked={lighting.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} />
        햇빛·그림자 효과 켜기
      </label>

      {lighting.enabled && (
        <>
          <svg
            ref={svg}
            className={`sundial ${lighting.night ? 'night' : ''}`}
            viewBox="0 0 240 132"
            onPointerDown={(e) => {
              dragging.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              pick(e)
            }}
            onPointerMove={(e) => dragging.current && pick(e)}
            onPointerUp={() => (dragging.current = false)}
          >
            {/* 해가 지나가는 길(반원)과 지평선 */}
            <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="8" y1={CY} x2="232" y2={CY} stroke="#a1a1aa" strokeWidth="1.5" />
            <text x={CX - R} y={CY + 14} textAnchor="middle">일출 {formatTime(sunrise)}</text>
            <text x={CX + R} y={CY + 14} textAnchor="middle">일몰 {formatTime(sunset)}</text>
            <text x={CX} y={CY - 30} textAnchor="middle" className="clock">
              {lighting.night ? '밤' : formatTime(lighting.time)}
            </text>
            <text x={CX} y={CY - 14} textAnchor="middle">해를 끌어서 시각 바꾸기</text>
            {!lighting.night && <circle cx={sunX} cy={sunY} r="11" fill="#f59e0b" stroke="#fff" strokeWidth="2" />}
          </svg>
          {/* 키보드로도 조절할 수 있게 슬라이더를 함께 둔다 */}
          <input
            type="range"
            aria-label="시각"
            min={sunrise}
            max={sunset}
            step={1 / 12}
            value={Math.min(sunset, Math.max(sunrise, lighting.time))}
            disabled={lighting.night}
            onChange={(e) => onChange({ time: Number(e.target.value) })}
          />

          <div className="fields two">
            <label>
              계절
              <select value={lighting.season} onChange={(e) => onChange({ season: e.target.value as Season })}>
                {SEASONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              평면도 방위
              <select value={north} onChange={(e) => onNorth(Number(e.target.value))}>
                {NORTHS.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={lighting.night} onChange={(e) => onChange({ night: e.target.checked })} />
            밤으로 보기 (해 없음)
          </label>
          <label className="check">
            <input type="checkbox" checked={lighting.lamps} onChange={(e) => onChange({ lamps: e.target.checked })} />
            실내 조명 켜기 (플로어 램프·천장등)
          </label>

          <h3>지금 햇빛이 드는 넓이</h3>
          {lighting.night ? (
            <p className="hint">밤에는 햇빛이 없어요.</p>
          ) : !hasWindows ? (
            <p className="hint">창문이 없어요. 라이브러리의 "문·창문"에서 창문을 달아 보세요.</p>
          ) : lit.length === 0 ? (
            <p className="hint">이 시각에는 창으로 직접 드는 햇빛이 없어요.</p>
          ) : (
            <ul className="lit">
              {lit.map(({ room, area, percent }) => (
                <li key={room.id}>
                  <span>{room.name}</span>
                  <span className="bar">
                    <span style={{ width: `${Math.min(100, percent)}%` }} />
                  </span>
                  <span className="num">
                    {area.toFixed(1)}㎡ ({percent.toFixed(0)}%)
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="hint">서울 위도 기준의 근사 계산이에요. 가구 그림자는 3D 화면에서 확인하세요.</p>
        </>
      )}
    </section>
  )
}
