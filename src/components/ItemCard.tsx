import type { Note, RoomShape, Side, WallItem, Wire } from '../types'
import { edgeLength } from '../plan'
import { KIND_NAME, SIDE_NAME } from '../structures'
import NumberField from './NumberField'

type WallItemProps = {
  item: WallItem
  room: RoomShape
  onChange: (patch: Partial<WallItem>) => void
  onDelete: () => void
}

/** 선택한 문·창문·콘센트 카드 */
export function WallItemCard({ item, room, onChange, onDelete }: WallItemProps) {
  const length = edgeLength(room, item.side)
  return (
    <section className="selection">
      <p className="selection-name">{KIND_NAME[item.kind]}</p>
      <label>
        붙은 벽 ({room.name})
        <select value={item.side} onChange={(e) => onChange({ side: e.target.value as Side })}>
          {(Object.keys(SIDE_NAME) as Side[]).map((s) => (
            <option key={s} value={s}>
              {SIDE_NAME[s]}
            </option>
          ))}
        </select>
      </label>
      <div className="fields two">
        <NumberField label="모서리에서 거리" unit="cm" value={item.offset} min={item.width / 2} max={length - item.width / 2} onCommit={(offset) => onChange({ offset })} />
        <NumberField label="폭" unit="cm" value={item.width} min={50} max={length} onCommit={(width) => onChange({ width })} />
        <NumberField label="높이" unit="cm" value={item.height} min={50} max={4000} onCommit={(height) => onChange({ height })} />
        {item.kind !== 'door' && <NumberField label="바닥에서 높이" unit="cm" value={item.sill} min={0} max={4000} onCommit={(sill) => onChange({ sill })} />}
      </div>
      <div className="row wrap actions">
        {item.kind === 'door' && (
          <>
            <button className="small" onClick={() => onChange({ flip: !item.flip })}>
              경첩 반대로
            </button>
            <button className="small" onClick={() => onChange({ outward: !item.outward })}>
              열리는 쪽 반대로
            </button>
          </>
        )}
        <button className="danger small" onClick={onDelete}>
          삭제
        </button>
      </div>
    </section>
  )
}

/** 선택한 전선 카드 */
export function WireCard({ wire, onDelete }: { wire: Wire; onDelete: () => void }) {
  const length = wire.points.reduce((sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p.x - wire.points[i - 1].x, p.y - wire.points[i - 1].y)), 0)
  return (
    <section className="selection">
      <p className="selection-name">전선</p>
      <p className="hint">
        길이 <strong>{(length / 1000).toFixed(2)}m</strong> · 꺾이는 곳 {Math.max(0, wire.points.length - 2)}군데
      </p>
      <div className="row actions">
        <button className="danger small" onClick={onDelete}>
          삭제
        </button>
      </div>
    </section>
  )
}

/** 선택한 메모 카드: 여기서 글을 쓴다 */
export function NoteCard({ note, onChange, onDelete }: { note: Note; onChange: (text: string) => void; onDelete: () => void }) {
  return (
    <section className="selection">
      <p className="selection-name">메모</p>
      <textarea autoFocus rows={4} maxLength={500} placeholder="여기에 메모를 적어요" value={note.text} onChange={(e) => onChange(e.target.value)} />
      <div className="row actions">
        <button className="danger small" onClick={onDelete}>
          삭제
        </button>
      </div>
    </section>
  )
}
