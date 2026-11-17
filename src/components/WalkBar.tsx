import { useEffect, useState, type RefObject } from 'react'
import type { WalkAction, WalkView } from './WalkControls'
import { bodySize } from '../walk'
import Icon from '../icons'

type Props = {
  view: WalkView
  bodyHeight: number // mm
  input: RefObject<Set<WalkAction>>
  onView: (view: WalkView) => void
  onBodyHeight: (height: number) => void
  onExit: () => void
}

/** 걷기 모드일 때 화면 아래에 뜨는 막대: 1·3인칭 전환, 키, 조작법, 나가기 + 터치용 방향 단추 */
export default function WalkBar({ view, bodyHeight, input, onView, onBodyHeight, onExit }: Props) {
  const body = bodySize(bodyHeight)
  const [draft, setDraft] = useState(String(bodyHeight / 10))
  useEffect(() => setDraft(String(bodyHeight / 10)), [bodyHeight])
  const commit = () => {
    const cm = Math.round(Number(draft))
    if (cm >= 100 && cm <= 220) onBodyHeight(cm * 10)
    else setDraft(String(bodyHeight / 10))
  }

  // 누르고 있는 동안 걷는 단추 (휴대폰·태블릿용)
  const hold = (action: WalkAction) => ({
    onPointerDown: (e: React.PointerEvent) => {
      input.current.add(action)
      try {
        ;(e.currentTarget as Element).setPointerCapture(e.pointerId) // 손가락이 단추 밖으로 미끄러져도 계속 걷게
      } catch {
        // 붙잡기에 실패해도 걷기는 된다
      }
    },
    onPointerUp: () => input.current.delete(action),
    onPointerCancel: () => input.current.delete(action),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  })

  return (
    <>
      <div className="walk-pad" aria-label="걷기 단추">
        <button className="pad up" aria-label="앞으로" {...hold('forward')}>▲</button>
        <button className="pad left" aria-label="왼쪽으로 돌기" {...hold('turnLeft')}>⟲</button>
        <button className="pad down" aria-label="뒤로" {...hold('back')}>▼</button>
        <button className="pad right" aria-label="오른쪽으로 돌기" {...hold('turnRight')}>⟳</button>
      </div>

      <div className="pill-bar walk-bar">
        <div className="pill-group" role="group" aria-label="시점">
          <span className="pill-label">
            시점 <kbd>C</kbd>
          </span>
          <button className={`pill ${view === 'first' ? 'on' : ''}`} title="내 눈으로 보기" onClick={() => onView('first')}>
            <Icon name="eye" size={15} /> 1인칭
          </button>
          <button className={`pill ${view === 'third' ? 'on' : ''}`} title="내 뒤에서 나를 보기" onClick={() => onView('third')}>
            <Icon name="person" size={15} /> 3인칭
          </button>
        </div>
        <label className="pill-group walk-height" title={`눈높이 ${body.eye / 10}cm · 몸 폭 ${body.width / 10}cm (이보다 좁은 틈은 못 지나가요)`}>
          <span className="pill-label">키</span>
          <input
            type="number"
            min={100}
            max={220}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          <span className="pill-label">cm · 폭 {body.width / 10}</span>
        </label>
        <button className="pill exit" onClick={onExit}>
          <Icon name="exit" size={15} /> 나가기 <kbd>Esc</kbd>
        </button>
      </div>

      <div className="walk-help" role="note">
        <b>W A S D</b> 또는 <b>↑ ↓</b> 걷기 · <b>← →</b> 돌기 · <b>드래그</b> 둘러보기 · <b>Shift</b> 빨리 · <b>휠</b> 3인칭 거리
      </div>
    </>
  )
}
