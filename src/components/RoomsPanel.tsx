import { useState } from 'react'
import type { RoomShape, Selection } from '../types'
import { roomRect, unionArea } from '../plan'
import { toPyeong } from '../units'
import Icon from '../icons'
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
    <>
      <div className="panel-head">
        <div>
          <h2>방</h2>
          <p className="sub">
            전체 {toPyeong(total).toFixed(1)}평 · {total.toFixed(1)}㎡
          </p>
        </div>
        <button className="btn primary sm" onClick={() => setOpenId(onAdd())}>
          <Icon name="plus" size={15} />방 추가
        </button>
      </div>

      <ul className="rooms">
        {rooms.map((room) => {
          const open = openId === room.id
          const selected = selection?.type === 'room' && selection.id === room.id
          const area = (room.width * room.depth) / 1e6
          return (
            <li key={room.id} className={`${selected ? 'on' : ''} ${open ? 'open' : ''}`}>
              <button
                className="room-row"
                aria-expanded={open}
                onClick={() => {
                  setOpenId(open ? null : room.id)
                  onSelect(room.id)
                }}
              >
                <span className="dot" style={{ background: room.floor.color }} />
                <span className="name">{room.name}</span>
                <span className="meta">{toPyeong(area).toFixed(1)}평</span>
                <Icon name="chevron" size={15} />
              </button>
              {open && (
                <div className="room-edit">
                  <label className="field">
                    이름
                    <input type="text" value={room.name} maxLength={20} onChange={(e) => onChange(room.id, { name: e.target.value })} />
                  </label>
                  <div className="fields two">
                    <NumberField label="가로" value={room.width} {...ROOM} onCommit={(width) => onChange(room.id, { width })} />
                    <NumberField label="세로" value={room.depth} {...ROOM} onCommit={(depth) => onChange(room.id, { depth })} />
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={room.open === true} onChange={(e) => onChange(room.id, { open: e.target.checked })} />
                    <span className="track" />
                    옆방과 벽 없이 잇기
                  </label>
                  {rooms.length > 1 && (
                    <button
                      className="btn danger sm"
                      onClick={() => {
                        onDelete(room.id)
                        setOpenId(null)
                      }}
                    >
                      <Icon name="trash" size={15} />이 방 삭제
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="divider" />
      <NumberField label="천장 높이" value={wallHeight} min={1500} max={6000} onCommit={onWallHeight} />
      <p className="hint">방의 위치는 평면도에서 끌어서 옮겨요. 방끼리 붙이면 사이에 벽이 생겨요.</p>
    </>
  )
}
