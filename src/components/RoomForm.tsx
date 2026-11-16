import { useState } from 'react'
import type { Room } from '../types'
import { toPyeong } from '../units'

type Props = {
  room: Room
  onChange: (room: Room) => void
}

const LIMITS = { min: 1000, max: 30000 } // 방 한 변: 1m ~ 30m

/** 방 크기 입력 폼. 입력 중엔 바로 반영하지 않고 [적용]을 눌렀을 때 반영 */
export default function RoomForm({ room, onChange }: Props) {
  // 입력칸에 적힌 글자 (아직 적용 전)
  const [draft, setDraft] = useState({
    width: String(room.width),
    depth: String(room.depth),
    height: String(room.height),
  })
  const [error, setError] = useState('')

  const apply = (e: React.FormEvent) => {
    e.preventDefault() // 폼 제출 시 페이지가 새로고침되는 것 막기
    const next = {
      width: Number(draft.width),
      depth: Number(draft.depth),
      height: Number(draft.height),
    }
    const bad = Object.values(next).some(
      (v) => !Number.isFinite(v) || v < LIMITS.min || v > LIMITS.max,
    )
    if (bad) {
      setError(`${LIMITS.min.toLocaleString()} ~ ${LIMITS.max.toLocaleString()} mm 사이로 입력해 주세요`)
      return
    }
    setError('')
    onChange(next)
  }

  const area = (room.width * room.depth) / 1_000_000 // mm² → ㎡

  return (
    <form className="panel" onSubmit={apply}>
      <h2>방 크기</h2>
      <div className="fields">
        <label>
          가로
          <input
            type="number"
            value={draft.width}
            onChange={(e) => setDraft({ ...draft, width: e.target.value })}
          />
        </label>
        <label>
          세로
          <input
            type="number"
            value={draft.depth}
            onChange={(e) => setDraft({ ...draft, depth: e.target.value })}
          />
        </label>
        <label>
          높이
          <input
            type="number"
            value={draft.height}
            onChange={(e) => setDraft({ ...draft, height: e.target.value })}
          />
        </label>
      </div>
      <p className="hint">단위: mm</p>
      {error && <p className="error">{error}</p>}
      <button type="submit">적용</button>
      <p className="stat">
        바닥 면적 <strong>{area.toFixed(2)}㎡</strong> (약 {toPyeong(area).toFixed(1)}평)
      </p>
    </form>
  )
}
