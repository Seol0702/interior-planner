import type { Note, Selection } from '../types'

type Props = {
  notes: Note[]
  selection: Selection
  placing: boolean // 메모 찍기 도구가 켜져 있는가
  visible: boolean
  expanded: boolean
  onTogglePlacing: () => void
  onVisible: (on: boolean) => void
  onExpanded: (on: boolean) => void
  onSelect: (id: string) => void
}

/** 메모 목록과 켜기/끄기 */
export default function NotesPanel(props: Props) {
  const { notes, selection, placing, visible, expanded, onTogglePlacing, onVisible, onExpanded, onSelect } = props
  return (
    <section className="panel">
      <h2>메모</h2>
      <button className={`wide ${placing ? 'active' : ''}`} onClick={onTogglePlacing}>
        {placing ? '메모할 자리를 눌러 주세요 (누르면 취소)' : '+ 메모 찍기'}
      </button>
      <label className="check">
        <input type="checkbox" checked={visible} onChange={(e) => onVisible(e.target.checked)} />
        메모 점 보이기
      </label>
      <label className="check">
        <input type="checkbox" checked={expanded} disabled={!visible} onChange={(e) => onExpanded(e.target.checked)} />
        모든 메모 내용 펼치기
      </label>
      {notes.length === 0 ? (
        <p className="hint">아직 메모가 없어요. 점을 찍고 내용을 적어 보세요.</p>
      ) : (
        <ul className="issues">
          {notes.map((note, i) => (
            <li key={note.id}>
              <button className={selection?.type === 'note' && selection.id === note.id ? 'active' : ''} onClick={() => onSelect(note.id)}>
                <span className="badge note">{i + 1}</span>
                <span className="clip">{note.text.split('\n')[0] || '(내용 없음)'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
