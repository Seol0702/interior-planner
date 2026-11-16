import type { Finish, PatternId } from '../types'
import { sameFinish, swatchUrl, type FinishPreset } from '../finishes'

type Props = {
  targetLabel: string
  presets: FinishPreset[]
  patterns: { id: PatternId; name: string }[]
  current: Finish
  onApply: (finish: Finish) => void
}

/** 벽지·장판 고르기: 기본 제공 목록 + 직접 디자인(무늬·색·크기) */
export default function FinishPicker({ targetLabel, presets, patterns, current, onApply }: Props) {
  const plain = current.pattern === 'solid'
  return (
    <>
      <p className="hint">
        적용 대상: <strong>{targetLabel}</strong>
      </p>
      <div className="swatches">
        {presets.map((p) => (
          <button key={p.id} className={sameFinish(p.finish, current) ? 'active' : ''} onClick={() => onApply(p.finish)} title={p.name}>
            <span className="chip" style={{ backgroundImage: `url(${swatchUrl(p.finish)})` }} />
            <span className="swatch-name">{p.name}</span>
          </button>
        ))}
      </div>

      <div className="designer">
        <h3>직접 디자인</h3>
        <label>
          무늬
          <select value={current.pattern} onChange={(e) => onApply({ ...current, pattern: e.target.value as PatternId })}>
            {patterns.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="fields two">
          <label>
            바탕색
            <input type="color" value={current.color} onChange={(e) => onApply({ ...current, color: e.target.value })} />
          </label>
          {!plain && (
            <label>
              무늬색
              <input type="color" value={current.accent} onChange={(e) => onApply({ ...current, accent: e.target.value })} />
            </label>
          )}
        </div>
        {!plain && (
          <label>
            무늬 크기 {current.size / 10}cm
            <input
              type="range"
              min={50}
              max={2000}
              step={50}
              value={current.size}
              onChange={(e) => onApply({ ...current, size: Number(e.target.value) })}
            />
          </label>
        )}
      </div>
    </>
  )
}
