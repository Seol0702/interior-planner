import type { Issue } from '../drc'

const LEVEL_NAME = { error: '오류', warn: '주의', info: '참고' }

/** 배치 규칙 검사 결과 목록. 항목을 누르면 문제가 된 것이 선택된다 */
export default function DrcPanel({ issues, onPick }: { issues: Issue[]; onPick: (issue: Issue) => void }) {
  const count = (level: Issue['level']) => issues.filter((i) => i.level === level).length
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>배치 검사</h2>
        <span className="total">
          오류 <strong>{count('error')}</strong> · 주의 <strong>{count('warn')}</strong> · 참고 <strong>{count('info')}</strong>
        </span>
      </div>
      {issues.length === 0 ? (
        <p className="hint">문제를 찾지 못했어요. 가구를 옮기면 자동으로 다시 검사해요.</p>
      ) : (
        <ul className="issues">
          {issues.map((issue) => (
            <li key={issue.id}>
              <button onClick={() => onPick(issue)}>
                <span className={`badge ${issue.level}`}>{LEVEL_NAME[issue.level]}</span>
                <span>{issue.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">검사 항목: 가구 겹침, 문 열림 충돌, 창문·콘센트 가림, 좁은 틈, 문 앞 전선, 문 없는 방</p>
    </section>
  )
}
