import { useState } from 'react'
import type { Finish } from '../types'
import { FURNITURE_CATEGORIES, LIBRARY } from '../library'
import { FLOORS, FLOOR_PATTERNS, WALLPAPERS, WALL_PATTERNS } from '../finishes'
import { WALL_ITEM_PRESETS, type WallItemPreset } from '../structures'
import FinishPicker from './FinishPicker'

type Tab = 'furniture' | 'wall' | 'floor' | 'openings' | 'electric'

type Props = {
  targetLabel: string // 벽지·장판을 어디에 바르는지 ("거실" 또는 "모든 방")
  wall: Finish // 지금 발라져 있는 벽지
  floor: Finish
  wiring: boolean // 전선 그리기 도구가 켜져 있는가
  onAddFurniture: (libraryId: string) => void
  onAddWallItem: (preset: WallItemPreset) => void
  onToggleWire: () => void
  onApplyFinish: (kind: 'wall' | 'floor', finish: Finish) => void
}

const TABS: { id: Tab; name: string }[] = [
  { id: 'furniture', name: '가구' },
  { id: 'wall', name: '벽지' },
  { id: 'floor', name: '장판' },
  { id: 'openings', name: '문·창문' },
  { id: 'electric', name: '전기' },
]

/** 라이브러리: 큰 분류(가구·벽지·장판·문창문·전기)를 고르면 아래에 목록이 펼쳐진다 */
export default function LibraryPanel(props: Props) {
  const { targetLabel, wall, floor, wiring, onAddFurniture, onAddWallItem, onToggleWire, onApplyFinish } = props
  const [tab, setTab] = useState<Tab>('furniture')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  // 검색어(이름·분류)와 분류 버튼으로 가구 걸러내기
  const q = query.trim().toLowerCase()
  const items = LIBRARY.filter(
    (item) =>
      (!category || item.category === category) &&
      (!q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)),
  )

  return (
    <section className="panel">
      <h2>라이브러리</h2>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.name}
          </button>
        ))}
      </div>

      {tab === 'furniture' && (
        <>
          <input
            type="search"
            className="search"
            placeholder="가구 검색 (예: 소파, 침실)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="chips">
            <button className={category === null ? 'active' : ''} onClick={() => setCategory(null)}>
              전체
            </button>
            {FURNITURE_CATEGORIES.map((c) => (
              <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(category === c ? null : c)}>
                {c}
              </button>
            ))}
          </div>
          <ul className="library">
            {items.map((item) => (
              <li key={item.id}>
                <button onClick={() => onAddFurniture(item.id)} title="눌러서 방에 놓기">
                  <span className="swatch" style={{ background: item.color }} />
                  <span className="name">{item.name}</span>
                  <span className="dims">
                    {item.width}×{item.depth}×{item.height}
                  </span>
                </button>
              </li>
            ))}
            {items.length === 0 && <li className="empty">"{query}"에 맞는 가구가 없어요</li>}
          </ul>
        </>
      )}

      {tab === 'wall' && (
        <FinishPicker
          key="wall"
          targetLabel={targetLabel}
          presets={WALLPAPERS}
          patterns={WALL_PATTERNS}
          current={wall}
          onApply={(finish) => onApplyFinish('wall', finish)}
        />
      )}
      {tab === 'floor' && (
        <FinishPicker
          key="floor"
          targetLabel={targetLabel}
          presets={FLOORS}
          patterns={FLOOR_PATTERNS}
          current={floor}
          onApply={(finish) => onApplyFinish('floor', finish)}
        />
      )}

      {tab === 'openings' && (
        <>
          <p className="hint">
            놓을 방: <strong>{targetLabel}</strong> · 놓은 뒤 2D 평면도에서 끌면 가까운 벽에 붙어요
          </p>
          <ul className="library">
            {WALL_ITEM_PRESETS.filter((p) => p.kind !== 'outlet').map((p) => (
              <li key={p.id}>
                <button onClick={() => onAddWallItem(p)}>
                  <span className="swatch" style={{ background: p.kind === 'door' ? '#c9a37a' : '#a9d3ee' }} />
                  <span className="name">{p.name}</span>
                  <span className="dims">
                    폭 {p.width / 10} × 높이 {p.height / 10}cm
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'electric' && (
        <>
          <ul className="library">
            {WALL_ITEM_PRESETS.filter((p) => p.kind === 'outlet').map((p) => (
              <li key={p.id}>
                <button onClick={() => onAddWallItem(p)}>
                  <span className="swatch" style={{ background: '#f59e0b' }} />
                  <span className="name">{p.name}</span>
                  <span className="dims">벽에 붙임 · 바닥에서 {p.sill / 10}cm</span>
                </button>
              </li>
            ))}
            {LIBRARY.filter((i) => i.layer === 'electric').map((i) => (
              <li key={i.id}>
                <button onClick={() => onAddFurniture(i.id)}>
                  <span className="swatch" style={{ background: '#a1a1aa' }} />
                  <span className="name">{i.name}</span>
                  <span className="dims">바닥에 놓음</span>
                </button>
              </li>
            ))}
          </ul>
          <button className={`wide ${wiring ? 'active' : ''}`} onClick={onToggleWire}>
            {wiring ? '전선 그리는 중 (누르면 그만)' : '전선 그리기'}
          </button>
          <p className="hint">평면을 차례로 눌러 전선이 지나갈 길을 그려요. 콘센트·멀티탭 근처에서는 착 붙어요.</p>
        </>
      )}
    </section>
  )
}
