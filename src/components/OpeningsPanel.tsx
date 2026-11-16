import { WALL_ITEM_PRESETS, type WallItemPreset } from '../structures'

type Props = {
  targetName: string
  onAdd: (preset: WallItemPreset) => void
}

/** 문·창문의 간단한 정면 그림 (실제 폭·높이 비율로 그린다) */
function Elevation({ preset }: { preset: WallItemPreset }) {
  // 2.4m 높이 벽을 배경으로, 바닥에서 떨어진 높이까지 반영
  const scale = 26 / 2400
  const w = preset.width * scale
  const h = preset.height * scale
  const x = 24 - w / 2
  const y = 29 - (preset.sill + preset.height) * scale
  return (
    <svg viewBox="0 0 48 32" aria-hidden="true">
      <path d="M2 29h44" stroke="#c5cad3" strokeWidth="1.2" />
      {preset.kind === 'door' ? (
        <>
          <rect x={x} y={y} width={w} height={h} rx="0.8" fill="#d9b48c" stroke="#9a7a57" strokeWidth="1" />
          <circle cx={x + w - 2.2} cy={y + h * 0.55} r="0.9" fill="#6b5640" />
        </>
      ) : (
        <>
          <rect x={x} y={y} width={w} height={h} rx="0.8" fill="#cfe6f6" stroke="#7fa9c7" strokeWidth="1" />
          <path d={`M${x + w / 2} ${y}v${h}`} stroke="#7fa9c7" strokeWidth="0.9" />
        </>
      )}
    </svg>
  )
}

/** 문·창문 달기 */
export default function OpeningsPanel({ targetName, onAdd }: Props) {
  return (
    <>
      <div className="panel-head">
        <div>
          <h2>문 · 창문</h2>
          <p className="sub">누르면 {targetName}의 벽에 달려요</p>
        </div>
      </div>
      <div className="cards">
        {WALL_ITEM_PRESETS.filter((p) => p.kind !== 'outlet').map((p) => (
          <button key={p.id} className="card" onClick={() => onAdd(p)}>
            <span className="thumb">
              <Elevation preset={p} />
            </span>
            <span className="card-name">{p.name}</span>
            <span className="card-meta">
              폭 {p.width / 10} × 높이 {p.height / 10}cm
            </span>
          </button>
        ))}
      </div>
      <p className="hint">단 뒤에 평면도에서 끌면 가장 가까운 벽에 붙어요. 창문은 햇빛이 드는 남쪽 벽에 먼저 달려요.</p>
    </>
  )
}
