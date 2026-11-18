import type { LayerView, ViewMode, ViewName } from '../types'
import Icon from '../icons'

type Props = {
  mode: ViewMode
  layer: LayerView
  onView: (view: ViewName) => void
  onLayer: (layer: LayerView) => void
  measuring: boolean // 줄자 도구를 들고 있나
  measureCount: number // 남아 있는 줄자 개수
  onMeasure: () => void
  onClearMeasures: () => void
  issuesShown: boolean // 검사 표시(!)를 보이는 중인가
  issueCount: number
  onToggleIssues: () => void
  onWalk: () => void
}

const VIEWS: { id: ViewName; name: string; title: string }[] = [
  { id: 'iso', name: '입체', title: '비스듬히 내려다보기' },
  { id: 'top', name: '위', title: '바로 위에서 보기' },
  { id: 'side0', name: '0°', title: '앞(평면도 아래쪽)에서 보기' },
  { id: 'side90', name: '90°', title: '오른쪽에서 보기' },
  { id: 'side180', name: '180°', title: '뒤(평면도 위쪽)에서 보기' },
  { id: 'side270', name: '270°', title: '왼쪽에서 보기' },
]

export const LAYERS: { id: LayerView; name: string; title: string }[] = [
  { id: 'all', name: '전체', title: '모두 보기' },
  { id: 'furniture', name: '가구', title: '벽과 가구만 보기' },
  { id: 'electric', name: '전기', title: '벽과 콘센트·멀티탭·전선만 보기' },
  { id: 'structure', name: '구조', title: '벽·문·창문만 보기' },
]

/** 화면 아래에 떠 있는 막대: 시점 바로가기 + 보기(레이어) 전환 */
export default function CanvasBar({ mode, layer, measuring, measureCount, issuesShown, issueCount, onView, onLayer, onMeasure, onClearMeasures, onToggleIssues, onWalk }: Props) {
  return (
    <div className="pill-bar">
      <div className="pill-group" role="group" aria-label="도구">
        <button className={`pill ${measuring ? 'on' : ''}`} title="두 점 사이의 거리 재기" onClick={onMeasure}>
          <Icon name="ruler" size={15} /> 줄자 <kbd>M</kbd>
        </button>
        {measureCount > 0 && (
          <button className="pill" title="잰 줄자를 모두 지우기 (Ctrl+Z로 되돌릴 수 있어요)" onClick={onClearMeasures}>
            <Icon name="close" size={13} /> 줄자 {measureCount}개 지우기
          </button>
        )}
        <button
          className={`pill ${issuesShown ? 'on' : ''}`}
          title={issuesShown ? '배치 검사 표시(!) 숨기기' : '배치 검사 표시(!) 보이기'}
          aria-pressed={issuesShown}
          onClick={onToggleIssues}
        >
          <Icon name="check" size={15} /> 검사{issueCount > 0 ? ` ${issueCount}` : ''}
        </button>
      </div>
      {mode !== '2d' && (
        <div className="pill-group" role="group" aria-label="시점">
          <span className="pill-label">시점</span>
          {VIEWS.map((v) => (
            <button key={v.id} className="pill" title={v.title} onClick={() => onView(v.id)}>
              {v.name}
            </button>
          ))}
          <button className="pill walk-pill" title="사람 눈높이로 집 안을 걸어 다니기" onClick={onWalk}>
            <Icon name="walk" size={15} /> 걷기
          </button>
        </div>
      )}
      <div className="pill-group" role="group" aria-label="보기">
        <span className="pill-label">
          보기 <kbd>V</kbd>
        </span>
        {LAYERS.map((l) => (
          <button key={l.id} className={`pill ${layer === l.id ? 'on' : ''}`} title={l.title} onClick={() => onLayer(l.id)}>
            {l.name}
          </button>
        ))}
      </div>
    </div>
  )
}
