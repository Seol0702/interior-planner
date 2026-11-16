import { LIBRARY } from '../library'

type Props = { onAdd: (libraryId: string) => void }

/** 가구 라이브러리 목록. 누르면 방 가운데에 추가된다 */
export default function LibraryPanel({ onAdd }: Props) {
  return (
    <section className="panel">
      <h2>가구 라이브러리</h2>
      <ul className="library">
        {LIBRARY.map((item) => (
          <li key={item.id}>
            <button onClick={() => onAdd(item.id)}>
              <span className="swatch" style={{ background: item.color }} />
              <span className="name">{item.name}</span>
              <span className="dims">
                {item.width}×{item.depth}×{item.height}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
