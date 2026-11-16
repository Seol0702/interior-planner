import { useRef, useState } from 'react'
import type { Project, ViewMode } from '../types'
import { downloadProject, parseProject } from '../project'
import Icon from '../icons'

type Props = {
  mode: ViewMode
  project: Project
  onMode: (mode: ViewMode) => void
  onLoad: (project: Project) => void
  onReset: () => void
  onToast: (text: string, error?: boolean) => void
}

const MODES: { id: ViewMode; name: string }[] = [
  { id: '3d', name: '3D' },
  { id: '2d', name: '평면도' },
  { id: 'split', name: '나란히' },
]

const SHORTCUTS: [string, string][] = [
  ['가구 드래그', '이동 (정렬 자리에 붙음)'],
  ['방향키', '1cm 이동 (Shift: 10cm)'],
  ['R', '가구 회전'],
  ['Delete', '선택한 것 삭제'],
  ['V', '보기 전환 (전체·가구·전기·구조)'],
  ['Esc', '선택·도구 취소'],
  ['빈 곳 왼쪽 드래그', '시점 이동'],
  ['오른쪽 드래그', '시점 회전 (Ctrl+드래그도 가능)'],
  ['휠', '확대·축소'],
  ['Enter', '전선 그리기 끝'],
]

/** 맨 위 막대: 이름, 보기 방식, 파일 저장·불러오기, 도움말 */
export default function Header({ mode, project, onMode, onLoad, onReset, onToast }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [help, setHelp] = useState(false)

  const openFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일을 다시 골라도 동작하도록 비우기
    if (!file) return
    try {
      onLoad(parseProject(await file.text()))
      onToast(`"${file.name}"을 불러왔어요`)
    } catch (err) {
      onToast((err as Error).message, true)
    }
  }

  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l9-7 9 7 M5 10v10h14V10 M10 20v-6h4v6" />
          </svg>
        </span>
        인테리어 플래너
      </div>

      <div className="seg" role="tablist" aria-label="보기 방식">
        {MODES.map((m) => (
          <button key={m.id} role="tab" aria-selected={mode === m.id} className={mode === m.id ? 'on' : ''} onClick={() => onMode(m.id)}>
            {m.name}
          </button>
        ))}
      </div>

      <div className="header-actions">
        <span className="saved">자동 저장됨</span>
        <button className="btn ghost" onClick={() => setHelp(!help)} aria-expanded={help}>
          <Icon name="help" />
          조작법
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            if (confirm('방과 가구를 모두 처음 상태로 되돌릴까요?')) onReset()
          }}
        >
          <Icon name="reset" />
          새로 시작
        </button>
        <button className="btn ghost" onClick={() => fileInput.current?.click()}>
          <Icon name="open" />
          불러오기
        </button>
        <button className="btn primary" onClick={() => downloadProject(project)}>
          <Icon name="save" />
          저장
        </button>
        {/* 실제 파일 선택 칸은 숨기고, 위 [불러오기] 버튼이 대신 눌러준다 */}
        <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={openFile} />
      </div>

      {help && (
        <div className="popover" role="dialog" aria-label="조작법">
          <div className="popover-head">
            <strong>조작법</strong>
            <button className="btn ghost icon-only" aria-label="닫기" onClick={() => setHelp(false)}>
              <Icon name="close" size={16} />
            </button>
          </div>
          <dl className="shortcuts">
            {SHORTCUTS.map(([key, what]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{what}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </header>
  )
}
