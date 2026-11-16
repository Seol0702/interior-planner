import type { LayerView, Tool, ViewMode, ViewName } from '../types'

type Props = {
  mode: ViewMode
  layer: LayerView
  tool: Tool
  onMode: (mode: ViewMode) => void
  onView: (view: ViewName) => void
  onLayer: (layer: LayerView) => void
  onTool: (tool: Tool) => void
}

const MODES: { id: ViewMode; name: string }[] = [
  { id: '3d', name: '3D' },
  { id: '2d', name: '2D 평면도' },
  { id: 'split', name: '나란히' },
]

const VIEWS: { id: ViewName; name: string; title: string }[] = [
  { id: 'iso', name: '입체', title: '비스듬히 내려다보기' },
  { id: 'top', name: '위', title: '바로 위에서 보기' },
  { id: 'side0', name: '앞 0°', title: '앞(아래쪽)에서 보기' },
  { id: 'side90', name: '90°', title: '오른쪽에서 보기' },
  { id: 'side180', name: '180°', title: '뒤(위쪽)에서 보기' },
  { id: 'side270', name: '270°', title: '왼쪽에서 보기' },
]

export const LAYERS: { id: LayerView; name: string; title: string }[] = [
  { id: 'all', name: '전체', title: '모두 보기' },
  { id: 'furniture', name: '가구', title: '벽과 가구만 보기' },
  { id: 'electric', name: '전기', title: '벽과 콘센트·멀티탭·전선만 보기' },
  { id: 'structure', name: '구조', title: '벽·문·창문만 보기' },
]

/** 화면 위쪽 도구 막대: 보기 방식 + 시점 바로가기 + 레이어 + 도구 */
export default function ViewBar({ mode, layer, tool, onMode, onView, onLayer, onTool }: Props) {
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
      <div className="segmented">
        <span className="segmented-label">보기 (V)</span>
        {LAYERS.map((l) => (
          <button key={l.id} title={l.title} className={layer === l.id ? 'active' : ''} onClick={() => onLayer(l.id)}>
            {l.name}
          </button>
        ))}
      </div>
      <div className="segmented">
        <button className={tool === 'wire' ? 'active' : ''} onClick={() => onTool(tool === 'wire' ? 'select' : 'wire')}>
          전선 그리기
        </button>
        <button className={tool === 'note' ? 'active' : ''} onClick={() => onTool(tool === 'note' ? 'select' : 'note')}>
          메모 찍기
        </button>
      </div>
    </div>
  )
}
