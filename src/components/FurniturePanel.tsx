import { useState } from 'react'
import { FURNITURE_CATEGORIES, LIBRARY } from '../library'
import Icon from '../icons'

type Props = {
  thumbs: Record<string, string> // 가구 미리보기 그림 (id → 그림 주소)
  targetName: string // 놓일 방 이름
  onAdd: (libraryId: string) => void
}

/** 가구 라이브러리: 검색·분류로 찾고, 그림을 눌러 방에 놓는다 */
export default function FurniturePanel({ thumbs, targetName, onAdd }: Props) {
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
    <>
      <div className="panel-head">
        <div>
          <h2>가구</h2>
          <p className="sub">누르면 {targetName}에 놓여요</p>
        </div>
      </div>
      <label className="search">
        <Icon name="search" size={16} />
        <input type="search" placeholder="가구 검색" aria-label="가구 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className="chips">
        <button className={`chip ${category === null ? 'on' : ''}`} onClick={() => setCategory(null)}>
          전체
        </button>
        {FURNITURE_CATEGORIES.map((c) => (
          <button key={c} className={`chip ${category === c ? 'on' : ''}`} onClick={() => setCategory(category === c ? null : c)}>
            {c}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="empty">"{query}"에 맞는 가구가 없어요.</p>
      ) : (
        <div className="cards">
          {items.map((item) => (
            <button key={item.id} className="card" onClick={() => onAdd(item.id)}>
              <span className="thumb">
                {thumbs[item.id] ? <img src={thumbs[item.id]} alt="" /> : <span className="thumb-fallback" style={{ background: item.color }} />}
              </span>
              <span className="card-name">{item.name}</span>
              <span className="card-meta">
                {item.width / 10}×{item.depth / 10}×{item.height / 10}cm
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
