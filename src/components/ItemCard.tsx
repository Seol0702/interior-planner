import type { ReactNode } from 'react'
import type { Note, RoomShape, Side, WallItem, Wire } from '../types'
import { edgeLength } from '../plan'
import { KIND_NAME, SIDE_NAME } from '../structures'
import Icon from '../icons'
import NumberField from './NumberField'

/** 속성 카드의 공통 틀: 제목 + 닫기 + 내용 + 삭제 */
function Card({ title, sub, onClose, onDelete, children }: { title: string; sub?: string; onClose: () => void; onDelete: () => void; children: ReactNode }) {
  return (
    <section className="inspector" aria-label={`선택한 ${title}`}>
      <div className="inspector-head">
        <div className="inspector-title">
          <strong>{title}</strong>
          {sub && <span>{sub}</span>}
        </div>
        <button className="btn ghost icon-only" aria-label="선택 해제" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </div>
      {children}
      <div className="inspector-actions">
        <button className="btn danger sm" onClick={onDelete} title="Delete">
          <Icon name="trash" size={15} />
          삭제
        </button>
      </div>
    </section>
  )
}

type WallItemProps = {
  item: WallItem
  room: RoomShape
  onChange: (patch: Partial<WallItem>) => void
  onDelete: () => void
  onClose: () => void
}

/** 선택한 문·창문·콘센트 카드 */
export function WallItemCard({ item, room, onChange, onDelete, onClose }: WallItemProps) {
  const length = edgeLength(room, item.side)
  return (
    <Card title={KIND_NAME[item.kind]} sub={room.name} onClose={onClose} onDelete={onDelete}>
      <label className="field">
        붙은 벽
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
      {item.kind === 'door' && (
        <div className="inline-actions">
          <button className="btn sm" onClick={() => onChange({ flip: !item.flip })}>
            경첩 반대로
          </button>
          <button className="btn sm" onClick={() => onChange({ outward: !item.outward })}>
            열리는 쪽 반대로
          </button>
        </div>
      )}
    </Card>
  )
}

/** 선택한 전선 카드 */
export function WireCard({ wire, onDelete, onClose }: { wire: Wire; onDelete: () => void; onClose: () => void }) {
  const length = wire.points.reduce((sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p.x - wire.points[i - 1].x, p.y - wire.points[i - 1].y)), 0)
  return (
    <Card title="전선" onClose={onClose} onDelete={onDelete}>
      <dl className="props">
        <dt>길이</dt>
        <dd>{(length / 1000).toFixed(2)} m</dd>
        <dt>꺾이는 곳</dt>
        <dd>{Math.max(0, wire.points.length - 2)}군데</dd>
      </dl>
    </Card>
  )
}

/** 선택한 메모 카드: 여기서 글을 쓴다 */
export function NoteCard({ note, onChange, onDelete, onClose }: { note: Note; onChange: (text: string) => void; onDelete: () => void; onClose: () => void }) {
  return (
    <Card title="메모" onClose={onClose} onDelete={onDelete}>
      <textarea autoFocus rows={4} maxLength={500} placeholder="여기에 메모를 적어요" aria-label="메모 내용" value={note.text} onChange={(e) => onChange(e.target.value)} />
    </Card>
  )
}
