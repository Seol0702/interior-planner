import { useEffect, useState } from 'react'
import { fmtM } from '../units'

type Props = {
  label: string
  value: number // mm
  min: number // mm
  max: number // mm
  onCommit: (value: number) => void
}

/**
 * 길이를 m 단위로 입력하는 칸.
 * 글자를 치는 중에는 반영하지 않고, Enter를 누르거나 칸을 벗어날 때 반영한다.
 */
export default function NumberField({ label, value, min, max, onCommit }: Props) {
  const [draft, setDraft] = useState(fmtM(value))
  // 바깥에서 값이 바뀌면(불러오기 등) 입력칸 글자도 맞춘다
  useEffect(() => setDraft(fmtM(value)), [value])

  const commit = () => {
    const meters = Number(draft)
    const next = Math.round((meters * 1000) / 10) * 10 // cm 단위로 맞춤
    if (draft.trim() === '' || !Number.isFinite(meters) || next < min || next > max) {
      setDraft(fmtM(value)) // 잘못된 값이면 원래대로
      return
    }
    setDraft(fmtM(next))
    if (next !== value) onCommit(next)
  }

  return (
    <label>
      {label}
      <span className="unit-input">
        <input
          type="number"
          step="0.1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <span>m</span>
      </span>
    </label>
  )
}
