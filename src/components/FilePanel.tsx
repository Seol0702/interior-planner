import { useRef, useState } from 'react'
import type { Project } from '../types'
import { downloadProject, parseProject } from '../project'

type Props = {
  project: Project
  onLoad: (project: Project) => void
  onReset: () => void
}

/** JSON 파일로 저장 / 불러오기 */
export default function FilePanel({ project, onLoad, onReset }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  const openFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일을 다시 골라도 동작하도록 비우기
    if (!file) return
    try {
      onLoad(parseProject(await file.text()))
      setMessage({ text: `"${file.name}" 불러옴`, error: false })
    } catch (err) {
      setMessage({ text: (err as Error).message, error: true })
    }
  }

  const reset = () => {
    if (confirm('방과 가구를 모두 처음 상태로 되돌릴까요?')) {
      onReset()
      setMessage(null)
    }
  }

  return (
    <section className="panel">
      <h2>저장</h2>
      <div className="row wrap">
        <button onClick={() => downloadProject(project)}>JSON 저장</button>
        <button onClick={() => fileInput.current?.click()}>불러오기</button>
        <button className="danger" onClick={reset}>
          새로 시작
        </button>
      </div>
      {/* 실제 파일 선택 칸은 숨기고, 위 [불러오기] 버튼이 대신 눌러준다 */}
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={openFile} />
      {message && <p className={message.error ? 'error' : 'hint'}>{message.text}</p>}
      <p className="hint">작업 내용은 이 브라우저에 자동 저장돼요.</p>
    </section>
  )
}
