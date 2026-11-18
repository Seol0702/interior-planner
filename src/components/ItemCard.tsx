import type { ReactNode } from 'react'
import type { Note, RoomShape, Side, WallItem, Wire } from '../types'
import { edgeLength } from '../plan'
import { KIND_NAME, SIDE_NAME } from '../structures'
import Icon from '../icons'
import { distance, fmtLength, lengthParts, type Measurement } from '../measure'
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
      <p className="hint">
        끌어서 옮기거나 방향키로 1cm씩 조절해요. ←→ 벽을 따라{item.kind !== 'door' && ', ↑↓ 높이'} (Shift: 10cm)
      </p>
      {item.kind === 'door' && (
        <label className="field">
          문 종류
          <select
            value={`${item.steel ? 'steel' : 'wood'}-${item.double ? 'double' : 'single'}`}
            onChange={(e) => {
              const [material, leaves] = e.target.value.split('-')
              onChange({ steel: material === 'steel' || undefined, double: leaves === 'double' || undefined })
            }}
          >
            <option value="wood-single">나무문</option>
            <option value="wood-double">양문형 나무문</option>
            <option value="steel-single">철문</option>
            <option value="steel-double">양문형 철문</option>
          </select>
        </label>
      )}
      {item.kind === 'door' && (
        <div className="inline-actions">
          {!item.double && (
            <button className="btn sm" onClick={() => onChange({ flip: !item.flip })}>
              경첩 반대로
            </button>
          )}
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

type GroupProps = {
  names: string[] // 고른 가구 이름들
  locked: boolean // 모두 고정돼 있나
  onToggleLock: () => void
  onRotate: () => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
}

/** Ctrl로 여러 개 고른 가구 카드: 한꺼번에 회전·복제·삭제 */
export function GroupCard({ names, locked, onToggleLock, onRotate, onDuplicate, onDelete, onClose }: GroupProps) {
  // 같은 이름은 묶어서 "의자 ×4"처럼
  const counts = new Map<string, number>()
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1)
  return (
    <section className="inspector" aria-label="여러 개 고른 가구">
      <div className="inspector-head">
        <div className="inspector-title">
          <strong>가구 {names.length}개</strong>
          <span>함께 옮기기·돌리기·지우기</span>
        </div>
        <button className="btn ghost icon-only" aria-label="선택 해제" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </div>
      <p className="group-names">
        {[...counts].map(([n, c]) => (c > 1 ? `${n} ×${c}` : n)).join(', ')}
      </p>
      <p className="hint">Ctrl+왼쪽 클릭으로 더 고르거나 빼요 (맥은 ⌘도 돼요). Ctrl을 누르고 있으면 이 카드가 흐려져서 밑에 있는 가구도 고를 수 있어요.</p>
      <div className="inspector-actions">
        <button className={`btn sm ${locked ? 'lock-on' : ''}`} onClick={onToggleLock} title="L" aria-pressed={locked}>
          <Icon name={locked ? 'lock' : 'unlock'} size={15} />
          {locked ? '고정됨' : '고정'}
        </button>
        <button className="btn sm" onClick={onRotate} title="R" disabled={locked}>
          <Icon name="rotate" size={15} />
          회전
        </button>
        <button className="btn sm" onClick={onDuplicate}>
          <Icon name="copy" size={15} />
          복제
        </button>
        <button className="btn danger sm" onClick={onDelete} title="Delete" disabled={locked}>
          <Icon name="trash" size={15} />
          삭제
        </button>
      </div>
    </section>
  )
}

/** 고른 줄자 카드: 길이 + 삭제 */
export function MeasureCard({ measure, onDelete, onClose }: { measure: Measurement; onDelete: () => void; onClose: () => void }) {
  const parts = lengthParts(measure.a, measure.b)
  return (
    <Card title="줄자" sub={fmtLength(distance(measure.a, measure.b))} onClose={onClose} onDelete={onDelete}>
      {parts && <p className="group-names">{parts}</p>}
      <p className="hint">Delete 키로도 지울 수 있어요.</p>
    </Card>
  )
}
