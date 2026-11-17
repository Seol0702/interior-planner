import { useEffect, useRef, useState } from 'react'
import type { Lighting, RoomShape, Season } from '../types'
import { daylight, formatTime, type SunPatch } from '../sun'
import Icon from '../icons'

type Props = {
  lighting: Lighting
  north: number
  rooms: RoomShape[]
  patches: SunPatch[]
  hasWindows: boolean
  onChange: (patch: Partial<Lighting>) => void
  onStep: () => void // 시각을 조금 앞으로 (하루 재생용)
  onNorth: (north: number) => void
  onAddWindow: () => void
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
const CX = 130
const CY = 118
const R = 100

/** 햇빛·조명 설정. 반원 위의 해를 끌어서 시각을 바꾼다 */
export default function SunPanel({ lighting, north, rooms, patches, hasWindows, onChange, onStep, onNorth, onAddWindow }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)
  const [playing, setPlaying] = useState(false)
  const { sunrise, sunset } = daylight(lighting.season)
  // 해 뜰 때 0 → 해 질 때 1
  const fraction = Math.min(1, Math.max(0, (lighting.time - sunrise) / (sunset - sunrise)))
  const sunX = CX - R * Math.cos(fraction * Math.PI)
  const sunY = CY - R * Math.sin(fraction * Math.PI)

  // 하루 재생: 켜져 있는 동안 0.08초마다 시각을 조금씩 앞으로
  const step = useRef(onStep)
  useEffect(() => {
    step.current = onStep
  })
  const active = playing && lighting.enabled && !lighting.night
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => step.current(), 80)
    return () => clearInterval(id)
  }, [active])

  /** 마우스 위치 → 반원 위의 각도 → 시각 */
  const pick = (e: React.PointerEvent) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse())
    const angle = Math.atan2(Math.max(0, CY - p.y), p.x - CX) // 0(오른쪽) ~ π(왼쪽)
    const f = 1 - angle / Math.PI
    setPlaying(false)
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
    <>
      <div className="panel-head">
        <div>
          <h2>햇빛 · 조명</h2>
          <p className="sub">시각에 따라 창으로 드는 빛 보기</p>
        </div>
      </div>
      <label className="switch strong">
        <input type="checkbox" checked={lighting.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} />
        <span className="track" />
        햇빛·그림자 효과
      </label>

      {!lighting.enabled ? (
        <p className="empty">켜면 해의 위치에 따라 창문으로 들어오는 빛과 그림자가 3D 화면에 나타나요.</p>
      ) : (
        <>
          {!hasWindows && (
            <div className="callout">
              <strong>창문이 없어요</strong>
              <p>햇빛은 창문으로만 들어와요. 창문을 달면 시각에 따라 빛이 움직이는 것을 볼 수 있어요.</p>
              <button className="btn primary sm" onClick={onAddWindow}>
                <Icon name="window" size={15} />
                남쪽 벽에 창문 달기
              </button>
            </div>
          )}

          <svg
            ref={svg}
            className={`sundial ${lighting.night ? 'night' : ''}`}
            viewBox="0 0 260 142"
            onPointerDown={(e) => {
              dragging.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              pick(e)
            }}
            onPointerMove={(e) => dragging.current && pick(e)}
            onPointerUp={() => (dragging.current = false)}
          >
            {/* 해가 지나가는 길(반원)과 지평선 */}
            <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke="#f2b824" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" />
            <line x1="14" y1={CY} x2="246" y2={CY} stroke="#b9c0cc" strokeWidth="1.2" />
            <text x={CX - R} y={CY + 15} textAnchor="middle">
              일출 {formatTime(sunrise)}
            </text>
            <text x={CX + R} y={CY + 15} textAnchor="middle">
              일몰 {formatTime(sunset)}
            </text>
            <text x={CX} y={CY - 34} textAnchor="middle" className="clock">
              {lighting.night ? '밤' : formatTime(lighting.time)}
            </text>
            <text x={CX} y={CY - 16} textAnchor="middle">
              해를 끌어서 시각 바꾸기
            </text>
            {!lighting.night && (
              <>
                <circle cx={sunX} cy={sunY} r="17" fill="#ffc21a" opacity="0.25" />
                <circle cx={sunX} cy={sunY} r="11" fill="#ffb300" stroke="#fff" strokeWidth="2.5" />
              </>
            )}
          </svg>

          <div className="play-row">
            <button className="btn sm" disabled={lighting.night} onClick={() => setPlaying(!playing)}>
              <Icon name={active ? 'pause' : 'play'} size={14} />
              {active ? '멈춤' : '하루 재생'}
            </button>
            {/* 키보드로도 조절할 수 있게 슬라이더를 함께 둔다 */}
            <input
              type="range"
              aria-label="시각"
              min={sunrise}
              max={sunset}
              step={1 / 12}
              value={Math.min(sunset, Math.max(sunrise, lighting.time))}
              disabled={lighting.night}
              onChange={(e) => {
                setPlaying(false)
                onChange({ time: Number(e.target.value) })
              }}
            />
          </div>

          <div className="fields two">
            <label className="field">
              계절
              <select value={lighting.season} onChange={(e) => onChange({ season: e.target.value as Season })}>
                {SEASONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              평면도 방위
              <select value={north} onChange={(e) => onNorth(Number(e.target.value))}>
                {!NORTHS.some((n) => n.value === north) && <option value={north}>위쪽이 {north}°</option>}
                {NORTHS.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="divider" />
          <h3>지금 햇빛이 드는 넓이</h3>
          {lighting.night ? (
            <p className="hint">밤에는 햇빛이 없어요.</p>
          ) : !hasWindows ? (
            <p className="hint">창문을 달면 여기에 방별 넓이가 나와요.</p>
          ) : lit.length === 0 ? (
            <p className="hint">이 시각에는 창으로 직접 드는 햇빛이 없어요.</p>
          ) : (
            <ul className="lit">
              {lit.map(({ room, area, percent }) => (
                <li key={room.id}>
                  <span className="lit-name">{room.name}</span>
                  <span className="lit-num">
                    {area.toFixed(1)}㎡ · {percent.toFixed(0)}%
                  </span>
                  <span className="bar">
                    <span style={{ width: `${Math.min(100, percent)}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="divider" />
          <h3>밤 · 실내 조명</h3>
          <label className="switch">
            <input type="checkbox" checked={lighting.night} onChange={(e) => onChange({ night: e.target.checked })} />
            <span className="track" />
            밤으로 보기
          </label>
          <label className="switch">
            <input type="checkbox" checked={lighting.lamps} onChange={(e) => onChange({ lamps: e.target.checked })} />
            <span className="track" />
            실내 조명 켜기
          </label>
          <p className="hint">조명은 가구의 "조명" 분류(플로어 램프·천장등)를 놓아야 켜져요. 햇빛은 서울 위도 기준의 근사 계산이에요.</p>
        </>
      )}
    </>
  )
}
