import type { Issue } from '../drc'

const LEVEL_NAME = { error: '오류', warn: '주의', info: '참고' }

/** 배치 규칙 검사 결과 목록. 항목을 누르면 문제가 된 것이 선택된다 */
type Props = { issues: Issue[]; visible: boolean; onVisible: () => void; onPick: (issue: Issue) => void }

export default function DrcPanel({ issues, visible, onVisible, onPick }: Props) {
  const count = (level: Issue['level']) => issues.filter((i) => i.level === level).length
  return (
    <>
      <div className="panel-head">
        <div>
          <h2>배치 검사</h2>
          <p className="sub">가구를 옮길 때마다 자동으로 검사해요</p>
        </div>
      </div>
      <label className="switch">
        <input type="checkbox" checked={visible} onChange={onVisible} />
        <span className="track" />
        화면에 검사 표시(!) 보이기
      </label>
      <div className="stats">
        {(['error', 'warn', 'info'] as const).map((level) => (
          <div key={level} className={`stat ${level}`}>
            <strong>{count(level)}</strong>
            <span>{LEVEL_NAME[level]}</span>
          </div>
        ))}
      </div>
      {issues.length === 0 ? (
        <p className="empty">문제를 찾지 못했어요.</p>
      ) : (
        <ul className="rows">
          {issues.map((issue) => (
            <li key={issue.id}>
              <button className="row" onClick={() => onPick(issue)}>
                <span className={`badge ${issue.level}`}>{LEVEL_NAME[issue.level]}</span>
                <span>{issue.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">검사 항목: 가구 겹침, 문 열림 충돌, 창문·콘센트 가림, 좁은 틈, 문 앞을 지나는 전선, 문 없는 방</p>
    </>
  )
}
