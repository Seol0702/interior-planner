import type { ViewMode, ViewName } from '../types'

type Props = {
  mode: ViewMode
  onMode: (mode: ViewMode) => void
  onView: (view: ViewName) => void
}

const MODES: { id: ViewMode; name: string }[] = [
  { id: '3d', name: '3D' },
  { id: '2d', name: '2D 평면도' },
  { id: 'split', name: '나란히' },
]

const VIEWS: { id: ViewName; name: string; title: string }[] = [
  { id: 'iso', name: '입체', title: '비스듬히 내려다보기' },
  { id: 'top', name: '위', title: '바로 위에서 보기' },
  { id: 'side0', name: '앞 0°', title: '앞(남쪽)에서 보기' },
  { id: 'side90', name: '90°', title: '오른쪽(동쪽)에서 보기' },
  { id: 'side180', name: '180°', title: '뒤(북쪽)에서 보기' },
  { id: 'side270', name: '270°', title: '왼쪽(서쪽)에서 보기' },
]

/** 화면 위쪽 도구 막대: 보기 방식(3D/2D/나란히) + 시점 바로가기 */
export default function ViewBar({ mode, onMode, onView }: Props) {
  return (
    <div className="viewbar">
      <div className="segmented">
        {MODES.map((m) => (
          <button key={m.id} className={mode === m.id ? 'active' : ''} onClick={() => onMode(m.id)}>
            {m.name}
          </button>
        ))}
      </div>
      {mode !== '2d' && (
        <div className="segmented">
          <span className="segmented-label">시점</span>
          {VIEWS.map((v) => (
            <button key={v.id} title={v.title} onClick={() => onView(v.id)}>
              {v.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
