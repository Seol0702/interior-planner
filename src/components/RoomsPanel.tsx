import { useState } from 'react'
import type { RoomShape, Selection } from '../types'
import { roomRect, unionArea } from '../plan'
import { toPyeong } from '../units'
import NumberField from './NumberField'

type Props = {
  rooms: RoomShape[]
  wallHeight: number
  selection: Selection
  onSelect: (id: string) => void
  onChange: (id: string, patch: Partial<RoomShape>) => void
  onAdd: () => string // 새 방의 id를 돌려준다
  onDelete: (id: string) => void
  onWallHeight: (height: number) => void
}

const ROOM = { min: 500, max: 30000 } // 방 한 변: 0.5m ~ 30m

/** 방 목록. 평소에는 이름과 평수만 보이고, 누르면 크기 입력칸이 펼쳐진다 */
export default function RoomsPanel(props: Props) {
  const { rooms, wallHeight, selection, onSelect, onChange, onAdd, onDelete, onWallHeight } = props
  const [openId, setOpenId] = useState<string | null>(null) // 펼쳐진 방
  const total = unionArea(rooms.map(roomRect))

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>방</h2>
        <span className="total">
          전체 <strong>{toPyeong(total).toFixed(1)}평</strong> ({total.toFixed(1)}㎡)
        </span>
      </div>

      <ul className="rooms">
        {rooms.map((room) => {
          const open = openId === room.id
          const selected = selection?.type === 'room' && selection.id === room.id
          const area = (room.width * room.depth) / 1e6
          return (
            <li key={room.id} className={selected ? 'selected' : ''}>
              <button
                className="room-row"
                aria-expanded={open}
                onClick={() => {
                  setOpenId(open ? null : room.id)
                  onSelect(room.id)
                }}
              >
                <span className="caret">{open ? '▾' : '▸'}</span>
                <span className="name">{room.name}</span>
                <span className="pyeong">{toPyeong(area).toFixed(1)}평</span>
              </button>
              {open && (
                <div className="room-detail">
                  <label>
                    이름
                    <input
                      type="text"
                      value={room.name}
                      maxLength={20}
                      onChange={(e) => onChange(room.id, { name: e.target.value })}
                    />
                  </label>
                  <div className="fields two">
                    <NumberField label="가로" value={room.width} {...ROOM} onCommit={(width) => onChange(room.id, { width })} />
                    <NumberField label="세로" value={room.depth} {...ROOM} onCommit={(depth) => onChange(room.id, { depth })} />
                  </div>
                  <label className="check">
                    <input type="checkbox" checked={room.open === true} onChange={(e) => onChange(room.id, { open: e.target.checked })} />
                    옆방과 벽 없이 잇기 (ㄱ자 방 만들 때)
                  </label>
                  <p className="hint">
                    {area.toFixed(2)}㎡ · 위치는 2D 평면도에서 끌어서 옮겨요
                  </p>
                  {rooms.length > 1 && (
                    <button
                      className="danger small"
                      onClick={() => {
                        onDelete(room.id)
                        setOpenId(null)
                      }}
                    >
                      이 방 삭제
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="row between">
        <button onClick={() => setOpenId(onAdd())}>+ 방 추가</button>
        <div className="inline-field">
          <NumberField label="천장 높이" value={wallHeight} min={1500} max={6000} onCommit={onWallHeight} />
        </div>
      </div>
    </section>
  )
}
