import { useState } from 'react'
import type { Finish, PatternId } from '../types'
import { FLOORS, FLOOR_PATTERNS, WALLPAPERS, WALL_PATTERNS, sameFinish, swatchUrl } from '../finishes'

type Props = {
  targetLabel: string // 어디에 바르는지 ("거실" 또는 "모든 방")
  wall: Finish // 지금 발라져 있는 벽지
  floor: Finish
  onApply: (kind: 'wall' | 'floor', finish: Finish) => void
}

/** 벽지·바닥재 고르기: 기본 제공 목록 + 직접 디자인(무늬·색·크기) */
export default function FinishPanel({ targetLabel, wall, floor, onApply }: Props) {
  const [kind, setKind] = useState<'wall' | 'floor'>('wall')
  const presets = kind === 'wall' ? WALLPAPERS : FLOORS
  const patterns = kind === 'wall' ? WALL_PATTERNS : FLOOR_PATTERNS
  const current = kind === 'wall' ? wall : floor
  const apply = (finish: Finish) => onApply(kind, finish)
  const plain = current.pattern === 'solid'

  return (
    <>
      <div className="panel-head">
        <div>
          <h2>벽지 · 바닥</h2>
          <p className="sub">적용 대상: {targetLabel}</p>
        </div>
      </div>
      <div className="seg block" role="tablist">
        <button role="tab" aria-selected={kind === 'wall'} className={kind === 'wall' ? 'on' : ''} onClick={() => setKind('wall')}>
          벽지
        </button>
        <button role="tab" aria-selected={kind === 'floor'} className={kind === 'floor' ? 'on' : ''} onClick={() => setKind('floor')}>
          바닥
        </button>
      </div>

      <div className="swatch-grid">
        {presets.map((p) => (
          <button key={p.id} className={`swatch ${sameFinish(p.finish, current) ? 'on' : ''}`} onClick={() => apply(p.finish)} title={p.name}>
            <span className="swatch-chip" style={{ backgroundImage: `url(${swatchUrl(p.finish)})` }} />
            <span className="swatch-name">{p.name}</span>
          </button>
        ))}
      </div>

      <div className="divider" />
      <h3>직접 디자인</h3>
      <label className="field">
        무늬
        <select value={current.pattern} onChange={(e) => apply({ ...current, pattern: e.target.value as PatternId })}>
          {patterns.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="fields two">
        <label className="field">
          바탕색
          <input type="color" value={current.color} onChange={(e) => apply({ ...current, color: e.target.value })} />
        </label>
        {!plain && (
          <label className="field">
            무늬색
            <input type="color" value={current.accent} onChange={(e) => apply({ ...current, accent: e.target.value })} />
          </label>
        )}
      </div>
      {!plain && (
        <label className="field">
          무늬 크기 {current.size / 10}cm
          <input type="range" min={50} max={2000} step={50} value={current.size} onChange={(e) => apply({ ...current, size: Number(e.target.value) })} />
        </label>
      )}
      <p className="hint">방을 선택한 상태면 그 방에만, 아니면 모든 방에 적용돼요.</p>
    </>
  )
}
