import type { Note, Selection } from '../types'
import Icon from '../icons'

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
    <>
      <div className="panel-head">
        <div>
          <h2>메모</h2>
          <p className="sub">원하는 자리에 점을 찍고 적어 두기</p>
        </div>
      </div>
      <button className={`btn block ${placing ? 'primary' : ''}`} onClick={onTogglePlacing}>
        <Icon name="pin" />
        {placing ? '메모할 자리를 눌러 주세요 · 취소' : '메모 찍기'}
      </button>
      <label className="switch">
        <input type="checkbox" checked={visible} onChange={(e) => onVisible(e.target.checked)} />
        <span className="track" />
        메모 점 보이기
      </label>
      <label className="switch">
        <input type="checkbox" checked={expanded} disabled={!visible} onChange={(e) => onExpanded(e.target.checked)} />
        <span className="track" />
        모든 메모 내용 펼치기
      </label>

      <div className="divider" />
      {notes.length === 0 ? (
        <p className="empty">아직 메모가 없어요.</p>
      ) : (
        <ul className="rows">
          {notes.map((note, i) => (
            <li key={note.id}>
              <button className={`row ${selection?.type === 'note' && selection.id === note.id ? 'on' : ''}`} onClick={() => onSelect(note.id)}>
                <span className="badge note">{i + 1}</span>
                <span className="clip">{note.text.split('\n')[0] || '(내용 없음)'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
