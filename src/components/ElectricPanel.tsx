import type { Wire } from '../types'
import { LIBRARY } from '../library'
import { WALL_ITEM_PRESETS, type WallItemPreset } from '../structures'
import Icon from '../icons'

type Props = {
  thumbs: Record<string, string>
  wires: Wire[]
  wiring: boolean // 전선 그리기 도구가 켜져 있는가
  onAddWallItem: (preset: WallItemPreset) => void
  onAddFurniture: (libraryId: string) => void
  onToggleWire: () => void
}

/** 전기: 콘센트, 멀티탭, 전선 */
export default function ElectricPanel({ thumbs, wires, wiring, onAddWallItem, onAddFurniture, onToggleWire }: Props) {
  const outlet = WALL_ITEM_PRESETS.find((p) => p.kind === 'outlet')!
  // 모든 전선의 길이 합계
  const total = wires.reduce(
    (sum, w) => sum + w.points.reduce((len, p, i) => (i === 0 ? 0 : len + Math.hypot(p.x - w.points[i - 1].x, p.y - w.points[i - 1].y)), 0),
    0,
  )

  return (
    <>
      <div className="panel-head">
        <div>
          <h2>전기</h2>
          <p className="sub">콘센트 · 멀티탭 · 전선</p>
        </div>
      </div>
      <div className="cards">
        <button className="card" onClick={() => onAddWallItem(outlet)}>
          <span className="thumb outlet-thumb">
            <Icon name="outlet" size={34} />
          </span>
          <span className="card-name">콘센트</span>
          <span className="card-meta">벽에 붙임 · 바닥에서 {outlet.sill / 10}cm</span>
        </button>
        {LIBRARY.filter((i) => i.layer === 'electric').map((i) => (
          <button key={i.id} className="card" onClick={() => onAddFurniture(i.id)}>
            <span className="thumb">{thumbs[i.id] ? <img src={thumbs[i.id]} alt="" /> : null}</span>
            <span className="card-name">{i.name}</span>
            <span className="card-meta">바닥에 놓음</span>
          </button>
        ))}
      </div>

      <div className="divider" />
      <h3>전선</h3>
      <button className={`btn block ${wiring ? 'primary' : ''}`} onClick={onToggleWire}>
        <Icon name="wire" />
        {wiring ? '그리는 중 · 누르면 그만' : '전선 그리기'}
      </button>
      <p className="hint">
        {wires.length > 0 ? `전선 ${wires.length}개 · 모두 ${(total / 1000).toFixed(1)}m` : '아직 그린 전선이 없어요.'}
        <br />
        바닥을 차례로 눌러 길을 그리고 Enter로 끝내요. 콘센트·멀티탭 근처에서는 착 붙어요.
      </p>
    </>
  )
}
