import { useState } from 'react'
import type { Finish } from '../types'
import { FURNITURE_CATEGORIES, LIBRARY } from '../library'
import { FLOORS, FLOOR_PATTERNS, WALLPAPERS, WALL_PATTERNS } from '../finishes'
import FinishPicker from './FinishPicker'

type Tab = 'furniture' | 'wall' | 'floor'

type Props = {
  targetLabel: string // 벽지·장판을 어디에 바르는지 ("거실" 또는 "모든 방")
  wall: Finish // 지금 발라져 있는 벽지
  floor: Finish
  onAddFurniture: (libraryId: string) => void
  onApplyFinish: (kind: 'wall' | 'floor', finish: Finish) => void
}

const TABS: { id: Tab; name: string }[] = [
  { id: 'furniture', name: '가구' },
  { id: 'wall', name: '벽지' },
  { id: 'floor', name: '장판' },
]

/** 라이브러리: 큰 분류(가구·벽지·장판)를 고르면 아래에 목록이 펼쳐진다 */
export default function LibraryPanel({ targetLabel, wall, floor, onAddFurniture, onApplyFinish }: Props) {
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
    </section>
  )
}
